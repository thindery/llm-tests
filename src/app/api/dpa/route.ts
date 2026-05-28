/**
 * DPA API Routes
 * GET /api/v1/dpa - List customer's DPA agreements
 * GET /api/v1/dpa/current - Get current DPA version
 * POST /api/v1/dpa/accept - Accept DPA
 * GET /api/v1/dpa/{id}/certificate - Download signed PDF (handled via query param)
 * 
 * Ticket: REMY-257
 */

import { 
  CURRENT_DPA_VERSION, 
  DpaAgreement,
  DpaStatus,
  ValidateSignatureRequest,
  validateSignatureRequest,
  hashIpAddress,
  generateSignatureHash,
  generateDocumentId,
  getTemplateVariables,
  processTemplate,
  DpaAcceptanceResponse,
  DpaStatusResponse 
} from '../../../lib/dpa/utils';
import { generatePdfHtml } from '../../../lib/dpa/pdf-generator';
import * as fs from 'fs';
import * as path from 'path';

// In-memory storage for development (replace with Supabase in production)
const dpaAgreements: Map<string, DpaAgreement> = new Map();
const dpaVersions: Map<string, { version: string; content: string; effectiveDate: string }> = new Map();

// Initialize with current version
const templatePath = path.join(process.cwd(), 'legal', 'dpa-template.md');
let dpaTemplateContent = '';
try {
  dpaTemplateContent = fs.readFileSync(templatePath, 'utf-8');
  dpaVersions.set(CURRENT_DPA_VERSION, {
    version: CURRENT_DPA_VERSION,
    content: dpaTemplateContent,
    effectiveDate: new Date().toISOString(),
  });
} catch (e) {
  console.warn('DPA template not found, using fallback content');
  dpaTemplateContent = '# Data Processing Agreement\n\nTemplate content pending.';
  dpaVersions.set(CURRENT_DPA_VERSION, {
    version: CURRENT_DPA_VERSION,
    content: dpaTemplateContent,
    effectiveDate: new Date().toISOString(),
  });
}

// Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Mock customer data (in production, get from Supabase/auth)
function getCustomerName(userId: string): string {
  return 'Customer Organization';
}

function getCustomerFromRequest(req: Request): { userId: string; name: string } | null {
  // In production, extract from auth session/JWT
  // For now, return mock data or extract from header
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    return { userId, name: getCustomerName(userId) };
  }
  // Mock user for development
  return { userId: 'mock-user-id', name: 'Demo Customer' };
}

// GET /api/v1/dpa - List customer's DPA agreements
async function handleGetDpas(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Filter agreements for this customer
  const agreements: DpaAgreement[] = [];
  for (const agreement of dpaAgreements.values()) {
    if (agreement.customer_id === customer.userId) {
      agreements.push(agreement);
    }
  }

  // Sort by signed_at descending
  agreements.sort((a, b) => {
    if (!a.signed_at) return 1;
    if (!b.signed_at) return -1;
    return new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime();
  });

  const latestSigned = agreements.find(a => a.status === 'signed') || null;

  const response: ApiResponse<DpaStatusResponse> = {
    success: true,
    data: {
      hasSignedDpa: latestSigned !== null,
      currentVersion: CURRENT_DPA_VERSION,
      latestAgreement: latestSigned,
      agreementHistory: agreements,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/v1/dpa/current - Get current DPA version
async function handleGetCurrentVersion(req: Request): Promise<Response> {
  const currentVersion = dpaVersions.get(CURRENT_DPA_VERSION);
  
  if (!currentVersion) {
    return new Response(
      JSON.stringify({ success: false, error: 'DPA version not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const response: ApiResponse<{
    version: string;
    content: string;
    effectiveDate: string;
    required: boolean;
  }> = {
    success: true,
    data: {
      version: currentVersion.version,
      content: currentVersion.content,
      effectiveDate: currentVersion.effectiveDate,
      required: true,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/v1/dpa/accept - Accept DPA
async function handleAcceptDpa(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate signature request
  const validation = validateSignatureRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ success: false, error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { name, title } = validation.data;

  // Check if already has a signed DPA
  let existingSigned = false;
  for (const agreement of dpaAgreements.values()) {
    if (agreement.customer_id === customer.userId && agreement.status === 'signed') {
      existingSigned = true;
      break;
    }
  }

  if (existingSigned) {
    return new Response(
      JSON.stringify({ success: false, error: 'DPA already signed for current version' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get client IP (in production, use proper IP detection)
  const clientIp = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   '127.0.0.1';
  const ipHash = hashIpAddress(clientIp);

  // Create signature data
  const signedAt = new Date().toISOString();
  const signatureData = {
    customerId: customer.userId,
    version: CURRENT_DPA_VERSION,
    signedAt,
    name,
    title,
    ipAddress: clientIp,
  };
  const signatureHash = generateSignatureHash(signatureData);
  const documentId = generateDocumentId();

  // Check for expired DPAs with the same customer and update their status
  for (const [id, agreement] of dpaAgreements) {
    if (agreement.customer_id === customer.userId && agreement.status === 'signed') {
      // Expire old DPA
      agreement.status = 'expired' as DpaStatus;
      agreement.updated_at = new Date().toISOString();
    }
  }

  // Create new agreement
  const agreement: DpaAgreement = {
    id: crypto.randomUUID(),
    customer_id: customer.userId,
    dpa_version: CURRENT_DPA_VERSION,
    signed_at: signedAt,
    ip_address_hash: ipHash,
    signature_hash: signatureHash,
    signing_metadata: {
      name,
      title,
      customerName: customer.name,
      documentId,
    },
    status: 'signed' as DpaStatus,
    created_at: signedAt,
    updated_at: signedAt,
    expires_at: null,
    pdf_url: null,
  };

  // Store agreement
  dpaAgreements.set(agreement.id, agreement);

  // Generate PDF (store reference)
  const templateVars = getTemplateVariables(
    customer.name,
    name,
    title,
    documentId,
    signatureHash
  );
  const processedTemplate = processTemplate(dpaTemplateContent, templateVars);
  
  // In production, upload to S3 and store URL
  // For now, store locally
  const pdfPath = `/dpa-certificates/${agreement.id}.html`;
  agreement.pdf_url = pdfPath;

  const response: ApiResponse<DpaAcceptanceResponse> = {
    success: true,
    data: {
      success: true,
      agreementId: agreement.id,
      documentId,
      signedAt,
      version: CURRENT_DPA_VERSION,
      pdfUrl: pdfPath,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/v1/dpa/certificate - Download certificate (accepts id as query param)
async function handleGetCertificate(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const agreementId = url.searchParams.get('id');
  
  if (!agreementId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Agreement ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const agreement = dpaAgreements.get(agreementId);
  if (!agreement) {
    return new Response(
      JSON.stringify({ success: false, error: 'Agreement not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (agreement.customer_id !== customer.userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Generate PDF/HTML content
  const currentVersion = dpaVersions.get(agreement.dpa_version);
  const template = currentVersion?.content || dpaTemplateContent;
  
  const metadata = agreement.signing_metadata as { 
    name?: string; 
    title?: string; 
    customerName?: string;
    documentId?: string;
  };
  
  const templateVars = getTemplateVariables(
    metadata?.customerName || customer.name,
    metadata?.name || 'Authorized Signatory',
    metadata?.title || 'Administrator',
    metadata?.documentId || generateDocumentId(),
    agreement.signature_hash
  );
  const processedTemplate = processTemplate(template, templateVars);
  
  const htmlContent = generatePdfHtml(
    processedTemplate,
    agreement,
    metadata?.customerName || customer.name
  );

  // Return HTML content
  return new Response(htmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="dpa-certificate-${agreementId.substring(0, 8)}.html"`,
    },
  });
}

// Main handler - route to appropriate sub-handler
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Route based on path
  if (pathname.endsWith('/current')) {
    return handleGetCurrentVersion(req);
  }
  
  if (pathname.endsWith('/certificate') || url.searchParams.has('certificate')) {
    return handleGetCertificate(req);
  }
  
  // Default: list DPAs
  return handleGetDpas(req);
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  if (pathname.endsWith('/accept')) {
    return handleAcceptDpa(req);
  }
  
  return new Response(
    JSON.stringify({ success: false, error: 'Invalid endpoint' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

// Export for testing
export { dpaAgreements, dpaVersions, getCustomerFromRequest };
