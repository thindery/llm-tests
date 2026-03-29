/**
 * Consent API Routes
 * POST /api/v1/consent - Record consent
 * GET /api/v1/consent/{user_id} - Check consent status
 * POST /api/v1/consent/withdraw - Withdraw consent
 * GET /api/v1/consent/export/{user_id} - Export user consent data
 * GET /api/v1/consent/settings/{project_id} - Get banner settings
 * PUT /api/v1/consent/settings/{project_id} - Update banner settings
 * GET /api/v1/consent/stats/{project_id} - Get consent statistics
 * 
 * Ticket: REMY-258
 */

import { 
  ConsentRecord,
  ConsentStatus,
  ConsentStatistics,
  ConsentDataExport,
  ConsentBannerSettings,
  RecordConsentRequest,
  WithdrawConsentRequest,
  validateConsentRequest,
  validateWithdrawRequest,
  hashIpAddress,
  hashUserAgent,
  getDefaultBannerSettings
} from '../../../lib/consent/utils';

// In-memory storage for development (replace with Supabase in production)
const consentRecords: Map<string, ConsentRecord> = new Map();
const bannerSettings: Map<string, ConsentBannerSettings> = new Map();

// Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Extract user info from request
function getUserFromRequest(req: Request): { userId: string; projectId?: string } | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    const projectHeader = req.headers.get('X-Project-ID');
    return { userId, projectId: projectHeader || undefined };
  }
  // Mock user for development
  return { userId: 'mock-user-id' };
}

// Get client IP address
function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         '127.0.0.1';
}

// Get user agent
function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'Unknown';
}

// POST /api/v1/consent - Record consent
async function handleRecordConsent(req: Request): Promise<Response> {
  const user = getUserFromRequest(req);
  if (!user) {
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

  // Validate request
  const validation = validateConsentRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ success: false, error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { user_id, project_id, consent_type, consent_granted, consent_version } = validation.data;

  // Create consent record
  const now = new Date().toISOString();
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  const record: ConsentRecord = {
    id: crypto.randomUUID(),
    project_id,
    user_id,
    consent_type,
    consent_granted,
    consent_timestamp: now,
    consent_version: consent_version || '1.0',
    ip_address_hash: hashIpAddress(clientIp),
    user_agent_hash: hashUserAgent(userAgent),
    withdrawal_timestamp: null,
    created_at: now,
    updated_at: now,
  };

  // Store record
  consentRecords.set(record.id, record);

  const response: ApiResponse<ConsentRecord> = {
    success: true,
    data: record,
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/v1/consent/{user_id} - Check consent status
async function handleGetConsentStatus(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const userId = parts[parts.length - 1]; // Get last segment

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'User ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'project_id query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get user's latest consent records for each type
  const userRecords: ConsentRecord[] = [];
  const seenTypes = new Set();

  // Sort records by timestamp desc
  const sorted = Array.from(consentRecords.values())
    .filter(r => r.user_id === userId && r.project_id === projectId)
    .sort((a, b) => new Date(b.consent_timestamp).getTime() - new Date(a.consent_timestamp).getTime());

  for (const record of sorted) {
    if (!seenTypes.has(record.consent_type)) {
      userRecords.push(record);
      seenTypes.add(record.consent_type);
    }
  }

  // Map to status objects
  const consents: ConsentStatus[] = userRecords.map(r => ({
    consent_type: r.consent_type,
    consent_granted: r.consent_granted,
    consent_timestamp: r.consent_timestamp,
    consent_version: r.consent_version,
    is_withdrawn: !!r.withdrawal_timestamp,
  }));

  const response: ApiResponse<{
    user_id: string;
    project_id: string;
    consents: ConsentStatus[];
  }> = {
    success: true,
    data: {
      user_id: userId,
      project_id: projectId,
      consents,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/v1/consent/withdraw - Withdraw consent
async function handleWithdrawConsent(req: Request): Promise<Response> {
  const user = getUserFromRequest(req);
  if (!user) {
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

  // Validate request
  const validation = validateWithdrawRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ success: false, error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { user_id, project_id, consent_type } = validation.data;

  // Find the latest active consent record
  let recordToWithdraw: ConsentRecord | null = null;
  
  const sorted = Array.from(consentRecords.values())
    .filter(r => r.user_id === user_id && r.project_id === project_id && r.consent_type === consent_type)
    .sort((a, b) => new Date(b.consent_timestamp).getTime() - new Date(a.consent_timestamp).getTime());

  for (const record of sorted) {
    if (!record.withdrawal_timestamp) {
      recordToWithdraw = record;
      break;
    }
  }

  if (!recordToWithdraw) {
    return new Response(
      JSON.stringify({ success: false, error: 'No active consent found to withdraw' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Mark as withdrawn
  recordToWithdraw.withdrawal_timestamp = new Date().toISOString();
  recordToWithdraw.updated_at = new Date().toISOString();

  const response: ApiResponse<ConsentRecord> = {
    success: true,
    data: recordToWithdraw,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/v1/consent/export/{user_id} - Export user consent data
async function handleExportConsentData(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const userId = parts[parts.length - 1]; // Get last segment (user_id)

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'User ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'project_id query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get all consent records for this user in this project
  const userRecords = Array.from(consentRecords.values())
    .filter(r => r.user_id === userId && r.project_id === projectId)
    .sort((a, b) => new Date(b.consent_timestamp).getTime() - new Date(a.consent_timestamp).getTime());

  const exportData: ConsentDataExport = {
    user_id: userId,
    project_id: projectId,
    export_timestamp: new Date().toISOString(),
    consent_records: userRecords.map(r => ({
      id: r.id,
      consent_type: r.consent_type,
      consent_granted: r.consent_granted,
      consent_timestamp: r.consent_timestamp,
      consent_version: r.consent_version,
      withdrawal_timestamp: r.withdrawal_timestamp,
      ip_address_hash: r.ip_address_hash,
      user_agent_hash: r.user_agent_hash,
    })),
  };

  const response: ApiResponse<ConsentDataExport> = {
    success: true,
    data: exportData,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="consent-export-${userId.substring(0, 8)}.json"`,
    },
  });
}

// GET /api/v1/consent/settings/{project_id} - Get banner settings
async function handleGetSettings(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1]; // Get last segment

  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Project ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get or create default settings
  let settings = bannerSettings.get(projectId);
  if (!settings) {
    settings = {
      ...getDefaultBannerSettings(projectId),
      id: crypto.randomUUID(),
    };
    bannerSettings.set(projectId, settings);
  }

  const response: ApiResponse<ConsentBannerSettings> = {
    success: true,
    data: settings,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/v1/consent/settings/{project_id} - Update banner settings
async function handleUpdateSettings(req: Request): Promise<Response> {
  const user = getUserFromRequest(req);
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1];

  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Project ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
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

  if (!body || typeof body !== 'object') {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid settings data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get existing settings or create new
  let settings = bannerSettings.get(projectId);
  if (!settings) {
    settings = {
      ...getDefaultBannerSettings(projectId),
      id: crypto.randomUUID(),
    };
  }

  // Update allowed fields
  const updates = body as Partial<ConsentBannerSettings>;
  const now = new Date().toISOString();

  settings = {
    ...settings,
    ...updates,
    project_id: projectId,
    id: settings.id,
    updated_at: now,
  };

  bannerSettings.set(projectId, settings);

  const response: ApiResponse<ConsentBannerSettings> = {
    success: true,
    data: settings,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/v1/consent/stats/{project_id} - Get consent statistics
async function handleGetStats(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1];

  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Project ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Calculate statistics
  const projectRecords = Array.from(consentRecords.values())
    .filter(r => r.project_id === projectId);

  const grantedByType: Record<string, number> = {
    analytics: 0,
    marketing: 0,
    functional: 0,
  };

  const withdrawnByType: Record<string, number> = {
    analytics: 0,
    marketing: 0,
    functional: 0,
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let grantedLast30Days = 0;
  let withdrawnLast30Days = 0;
  const uniqueUsers = new Set<string>();

  for (const record of projectRecords) {
    uniqueUsers.add(record.user_id);
    
    if (record.consent_granted && !record.withdrawal_timestamp) {
      grantedByType[record.consent_type] = (grantedByType[record.consent_type] || 0) + 1;
    }

    if (record.withdrawal_timestamp) {
      withdrawnByType[record.consent_type] = (withdrawnByType[record.consent_type] || 0) + 1;
    }

    if (record.consent_granted && !record.withdrawal_timestamp && 
        new Date(record.consent_timestamp) > thirtyDaysAgo) {
      grantedLast30Days++;
    }

    if (record.withdrawal_timestamp && new Date(record.withdrawal_timestamp) > thirtyDaysAgo) {
      withdrawnLast30Days++;
    }
  }

  const stats: ConsentStatistics = {
    total_consents: projectRecords.length,
    granted_by_type: grantedByType as { analytics: number; marketing: number; functional: number },
    withdrawn_by_type: withdrawnByType as { analytics: number; marketing: number; functional: number },
    unique_users: uniqueUsers.size,
    last_30_days: {
      granted: grantedLast30Days,
      withdrawn: withdrawnLast30Days,
    },
  };

  const response: ApiResponse<ConsentStatistics> = {
    success: true,
    data: stats,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET /api/v1/consent/export/csv/{project_id} - Export CSV
async function handleExportCSV(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1];

  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Project ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get records for this project
  const records = Array.from(consentRecords.values())
    .filter(r => r.project_id === projectId)
    .sort((a, b) => new Date(b.consent_timestamp).getTime() - new Date(a.consent_timestamp).getTime());

  // Generate CSV
  const headers = [
    'id', 'user_id', 'consent_type', 'consent_granted',
    'consent_timestamp', 'consent_version', 'withdrawal_timestamp',
  ].join(',');

  const rows = records.map(record => [
    record.id,
    record.user_id,
    record.consent_type,
    record.consent_granted,
    record.consent_timestamp,
    record.consent_version,
    record.withdrawal_timestamp || '',
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

  const csv = [headers, ...rows].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="consent-export-${projectId}.csv"`,
    },
  });
}

// GET /api/v1/consent - List consent records (for project admin)
async function handleListConsents(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  const projectId = url.searchParams.get('project_id');

  let records = Array.from(consentRecords.values());

  if (userId) {
    records = records.filter(r => r.user_id === userId);
  }

  if (projectId) {
    records = records.filter(r => r.project_id === projectId);
  }

  // Sort by timestamp desc
  records.sort((a, b) => new Date(b.consent_timestamp).getTime() - new Date(a.consent_timestamp).getTime());

  const response: ApiResponse<ConsentRecord[]> = {
    success: true,
    data: records,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Main handler - route to appropriate sub-handler
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Route based on path
  if (pathname.includes('/settings/')) {
    return handleGetSettings(req);
  }

  if (pathname.includes('/stats/')) {
    return handleGetStats(req);
  }

  if (pathname.includes('/export/csv/')) {
    return handleExportCSV(req);
  }

  if (pathname.includes('/export/')) {
    return handleExportConsentData(req);
  }

  // Check if path ends with user_id (last segment)
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 3 && parts[2] !== 'settings' && parts[2] !== 'stats' &&
      parts[2] !== 'export' && parts[2] !== 'withdraw') {
    return handleGetConsentStatus(req);
  }

  // Default: list consents
  return handleListConsents(req);
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('/withdraw')) {
    return handleWithdrawConsent(req);
  }

  return handleRecordConsent(req);
}

export async function PUT(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('/settings/')) {
    return handleUpdateSettings(req);
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Invalid endpoint' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

// Export for testing
export { consentRecords, bannerSettings, getUserFromRequest };