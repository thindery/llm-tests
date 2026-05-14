/**
 * Consent API Routes - GDPR-P0 Enhanced with Cryptographic Integrity
 * 
 * POST /api/v1/consent - Record consent with integrity
 * GET /api/v1/consent/{user_id} - Check consent status with verification
 * POST /api/v1/consent/withdraw - Withdraw consent
 * POST /api/v1/consent/parental - Record parental consent (Article 8)
 * GET /api/v1/consent/export/{user_id} - Export user data with proofs
 * GET /api/v1/consent/proof/{consent_id} - Generate/get proof document
 * GET /api/v1/consent/verify/{consent_id} - Verify integrity of record
 * GET /api/v1/consent/chain/{user_id} - Verify entire chain
 * GET /api/v1/consent/settings/{project_id} - Get banner settings
 * PUT /api/v1/consent/settings/{project_id} - Update banner settings
 * GET /api/v1/consent/stats/{project_id} - Get consent statistics
 * 
 * Ticket: REMY-258
 * Compliance: GDPR Articles 7, 8
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ConsentRecord,
  ConsentStatus,
  ConsentStatistics,
  ConsentDataExport,
  ConsentBannerSettings,
  ConsentProof,
  RecordConsentRequest,
  WithdrawConsentRequest,
  ParentalConsentRequest,
  validateConsentRequest,
  validateWithdrawRequest,
  validateParentalConsentRequest,
  hashIpAddress,
  hashUserAgent,
  calculateConsentRecordHash,
  verifyConsentRecordIntegrity,
  generateConsentProofDocument,
  getDefaultBannerSettings,
  verifyArticle7Compliance,
  isConsentValid,
  GDPR_RETENTION_DAYS,
  type ConsentType,
} from '../../../lib/consent/utils';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// REQUEST UTILITIES
// =====================================================

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         '127.0.0.1';
}

function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'Unknown';
}

async function verifyAuth(req: NextRequest): Promise<{ userId: string; projectId?: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Verify JWT and extract user info
    // For now, return the token as userId
    const projectHeader = req.headers.get('X-Project-ID');
    return { userId: token, projectId: projectHeader || undefined };
  }
  return { userId: 'mock-user-id' };
}

// =====================================================
// CONSENT RECORDING WITH INTEGRITY
// =====================================================

async function handleRecordConsent(req: NextRequest): Promise<Response> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Validate request
  const validation = validateConsentRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const { 
    user_id, 
    project_id, 
    consent_type, 
    consent_granted, 
    consent_version,
    purpose_description,
    third_parties,
    legal_basis,
  } = validation.data;

  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);
  const now = new Date().toISOString();

  // Get previous record hash for chain integrity
  const { data: previousRecord } = await supabase
    .from('consent_records')
    .select('record_hash')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .eq('consent_type', consent_type)
    .order('consent_timestamp', { ascending: false })
    .limit(1)
    .single();

  const previousHash = previousRecord?.record_hash || null;

  // Generate new record ID
  const recordId = crypto.randomUUID();

  // Calculate cryptographic hash
  const recordHash = calculateConsentRecordHash(
    recordId,
    project_id,
    user_id,
    consent_type,
    consent_granted,
    now,
    consent_version || '1.0',
    previousHash
  );

  // Calculate retention date (7 years)
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 7);

  // Create record
  const record: Omit<ConsentRecord, 'id' | 'created_at' | 'updated_at' | 'integrity_proof'> = {
    project_id,
    user_id,
    consent_type,
    consent_granted,
    consent_timestamp: now,
    consent_version: consent_version || '1.0',
    ip_address_hash: hashIpAddress(clientIp),
    user_agent_hash: hashUserAgent(userAgent),
    withdrawal_timestamp: null,
    record_hash: recordHash,
    previous_record_hash: previousHash,
    retention_until_date: retentionDate.toISOString().split('T')[0],
    legal_basis: legal_basis || 'consent',
    purpose_description: purpose_description || `${consent_type} services`,
    data_controller: 'Data Controller',
    storage_location: 'EU',
    third_parties: third_parties || [],
    automated_decision_making: false,
  };

  // Insert record
  const { data: inserted, error: insertError } = await supabase
    .from('consent_records')
    .insert(record)
    .select()
    .single();

  if (insertError) {
    console.error('Failed to insert consent record:', insertError);
    return NextResponse.json(
      { success: false, error: 'Failed to record consent' },
      { status: 500 }
    );
  }

  // Generate proof document
  const { document: proofDoc, hash: proofHash, proofId } = generateConsentProofDocument(inserted);

  // Store proof
  const { error: proofError } = await supabase
    .from('consent_proofs')
    .insert({
      proof_id: proofId,
      consent_record_id: inserted.id,
      project_id,
      user_id,
      proof_document: proofDoc,
      proof_hash: proofHash,
      expires_at: retentionDate.toISOString(),
    });

  if (proofError) {
    console.error('Failed to store proof:', proofError);
  }

  // Update record with proof reference
  const { error: updateError } = await supabase
    .from('consent_records')
    .update({
      integrity_proof: {
        proof_id: proofId,
        proof_hash: proofHash,
        generated_at: now,
      }
    })
    .eq('id', inserted.id);

  if (updateError) {
    console.error('Failed to update record with proof:', updateError);
  }

  // Verify Article 7 compliance
  const compliance = verifyArticle7Compliance({ ...inserted, integrity_proof: { proof_id: proofId, proof_hash: proofHash, generated_at: now } });

  const response: ApiResponse<{
    record: ConsentRecord;
    proof: { proof_id: string; proof_hash: string };
    article_7_compliance: typeof compliance;
  }> = {
    success: true,
    data: {
      record: inserted,
      proof: { proof_id: proofId, proof_hash: proofHash },
      article_7_compliance: compliance,
    },
  };

  return NextResponse.json(response, { status: 201 });
}

// =====================================================
// GET CONSENT STATUS
// =====================================================

async function handleGetConsentStatus(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const userId = parts[parts.length - 1];

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'project_id query parameter is required' },
      { status: 400 }
    );
  }

  // Get latest consent records for each type
  const { data: records, error } = await supabase
    .from('consent_records')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('consent_timestamp', { ascending: false });

  if (error) {
    console.error('Failed to fetch consent records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch consent status' },
      { status: 500 }
    );
  }

  // Get unique latest records per consent type
  const seenTypes = new Set<ConsentType>();
  const latestRecords: ConsentRecord[] = [];
  
  for (const record of records || []) {
    if (!seenTypes.has(record.consent_type)) {
      latestRecords.push(record);
      seenTypes.add(record.consent_type);
    }
  }

  // Map to status with integrity verification
  const consents: ConsentStatus[] = latestRecords.map(r => {
    const integrity = verifyConsentRecordIntegrity(r);
    return {
      consent_type: r.consent_type,
      consent_granted: r.consent_granted,
      consent_timestamp: r.consent_timestamp,
      consent_version: r.consent_version,
      is_withdrawn: !!r.withdrawal_timestamp,
      retention_until: r.retention_until_date,
      integrity_verified: integrity.valid,
    };
  });

  // Verify chain integrity
  let chainIntegrityValid = true;
  for (const record of latestRecords) {
    if (!verifyConsentRecordIntegrity(record).valid) {
      chainIntegrityValid = false;
      break;
    }
  }

  const response: ApiResponse<{
    user_id: string;
    project_id: string;
    consents: ConsentStatus[];
    chain_integrity_valid: boolean;
    last_verified_at: string;
  }> = {
    success: true,
    data: {
      user_id: userId,
      project_id: projectId,
      consents,
      chain_integrity_valid: chainIntegrityValid,
      last_verified_at: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// WITHDRAW CONSENT
// =====================================================

async function handleWithdrawConsent(req: NextRequest): Promise<Response> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validation = validateWithdrawRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const { user_id, project_id, consent_type, reason } = validation.data;

  // Find the latest active consent
  const { data: existing, error: fetchError } = await supabase
    .from('consent_records')
    .select('*')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .eq('consent_type', consent_type)
    .is('withdrawal_timestamp', null)
    .order('consent_timestamp', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { success: false, error: 'No active consent found to withdraw' },
      { status: 404 }
    );
  }

  // Update with withdrawal timestamp
  const withdrawalTime = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('consent_records')
    .update({
      withdrawal_timestamp: withdrawalTime,
      updated_at: withdrawalTime,
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to withdraw consent:', updateError);
    return NextResponse.json(
      { success: false, error: 'Failed to withdraw consent' },
      { status: 500 }
    );
  }

  // Log withdrawal to audit log
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);
  
  await supabase
    .from('consent_audit_log')
    .insert({
      action: 'consent_withdrawn',
      consent_record_id: existing.id,
      project_id,
      user_id,
      consent_type,
      record_snapshot: { before: existing, after: updated },
      record_hash: existing.record_hash,
      chain_hash: calculateConsentRecordHash(
        existing.id,
        project_id,
        user_id,
        consent_type,
        false,
        withdrawalTime,
        existing.consent_version,
        existing.previous_record_hash
      ),
      ip_address_hash: hashIpAddress(clientIp),
      user_agent_hash: hashUserAgent(userAgent),
      performed_by: user_id,
      reason: reason || 'User initiated withdrawal',
    });

  const response: ApiResponse<{
    withdrawn: boolean;
    withdrawal_timestamp: string;
    consent_type: ConsentType;
  }> = {
    success: true,
    data: {
      withdrawn: true,
      withdrawal_timestamp: withdrawalTime,
      consent_type,
    },
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// PARENTAL CONSENT (GDPR Article 8)
// =====================================================

async function handleParentalConsent(req: NextRequest): Promise<Response> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const validation = validateParentalConsentRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const { 
    child_user_id, 
    parent_user_id, 
    parent_email, 
    consent_type,
    verification_method 
  } = validation.data;

  // Use the database function for parental consent
  const { data: consentId, error: rpcError } = await supabase.rpc(
    'record_parental_consent',
    {
      p_project_id: user.projectId,
      p_child_user_id: child_user_id,
      p_parent_user_id: parent_user_id,
      p_consent_type: consent_type,
      p_parent_email: parent_email,
      p_verification_method: verification_method,
    }
  );

  if (rpcError) {
    console.error('Failed to record parental consent:', rpcError);
    return NextResponse.json(
      { success: false, error: 'Failed to record parental consent' },
      { status: 500 }
    );
  }

  const response: ApiResponse<{
    consent_id: string;
    parent_email: string;
    verification_pending: boolean;
  }> = {
    success: true,
    data: {
      consent_id: consentId,
      parent_email,
      verification_pending: verification_method === 'email',
    },
  };

  return NextResponse.json(response, { status: 201 });
}

// =====================================================
// EXPORT USER DATA WITH PROOFS (GDPR Portability)
// =====================================================

async function handleExportUserData(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const userId = parts[parts.length - 1];

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'project_id query parameter is required' },
      { status: 400 }
    );
  }

  // Call the enhanced export function
  const { data: exportData, error } = await supabase.rpc(
    'export_user_consent_data_with_proof',
    {
      p_project_id: projectId,
      p_user_id: userId,
    }
  );

  if (error) {
    console.error('Failed to export user data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export user data' },
      { status: 500 }
    );
  }

  const response: ApiResponse<ConsentDataExport> = {
    success: true,
    data: exportData as ConsentDataExport,
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// VERIFY CONSENT INTEGRITY
// =====================================================

async function handleVerifyIntegrity(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const consentId = parts[parts.length - 1];

  if (!consentId) {
    return NextResponse.json(
      { success: false, error: 'Consent ID is required' },
      { status: 400 }
    );
  }

  // Call the verification function
  const { data: verification, error } = await supabase.rpc(
    'verify_consent_integrity',
    { p_consent_record_id: consentId }
  );

  if (error) {
    console.error('Failed to verify integrity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify consent integrity' },
      { status: 500 }
    );
  }

  const response: ApiResponse<{
    valid: boolean;
    record_id: string;
    stored_hash: string;
    calculated_hash: string;
    audit_trail_count: number;
  }> = {
    success: true,
    data: {
      ...(verification as Record<string, unknown>),
      audit_trail_count: (verification as { audit_trail?: unknown[] })?.audit_trail?.length || 0,
    } as { valid: boolean; record_id: string; stored_hash: string; calculated_hash: string; audit_trail_count: number },
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// VERIFY CHAIN FOR USER
// =====================================================

async function handleVerifyChain(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const userId = parts[parts.length - 1];

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'project_id query parameter is required' },
      { status: 400 }
    );
  }

  const { data: result, error } = await supabase.rpc(
    'verify_user_consent_chain',
    {
      p_project_id: projectId,
      p_user_id: userId,
    }
  );

  if (error) {
    console.error('Failed to verify chain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify consent chain' },
      { status: 500 }
    );
  }

  const response: ApiResponse<unknown> = {
    success: true,
    data: result,
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// GET/UPDATE BANNER SETTINGS
// =====================================================

async function handleGetSettings(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1];

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  const { data: settings, error } = await supabase
    .from('consent_banner_settings')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }

  const response: ApiResponse<ConsentBannerSettings> = {
    success: true,
    data: settings || getDefaultBannerSettings(projectId),
  };

  return NextResponse.json(response, { status: 200 });
}

async function handleUpdateSettings(req: NextRequest): Promise<Response> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1];

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const settings = body as Partial<ConsentBannerSettings>;

  // Ensure retention policy is at least 7 years
  if (settings.consent_expiration_days && settings.consent_expiration_days < GDPR_RETENTION_DAYS) {
    settings.consent_expiration_days = GDPR_RETENTION_DAYS;
  }

  const { data: updated, error } = await supabase
    .from('consent_banner_settings')
    .upsert({
      project_id: projectId,
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }

  const response: ApiResponse<ConsentBannerSettings> = {
    success: true,
    data: updated,
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// GET STATISTICS
// =====================================================

async function handleGetStats(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const projectId = parts[parts.length - 1];

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );
  }

  const { data: stats, error } = await supabase.rpc(
    'get_consent_statistics',
    { p_project_id: projectId }
  );

  if (error) {
    console.error('Failed to get statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get statistics' },
      { status: 500 }
    );
  }

  // Get integrity status
  const { data: integrityStats } = await supabase
    .from('consent_audit_log')
    .select('verification_status')
    .eq('project_id', projectId);

  const verified = integrityStats?.filter(s => s.verification_status === 'verified').length || 0;
  const pending = integrityStats?.filter(s => s.verification_status === 'pending').length || 0;
  const tampered = integrityStats?.filter(s => s.verification_status === 'tampered').length || 0;

  const response: ApiResponse<ConsentStatistics> = {
    success: true,
    data: {
      ...(stats as ConsentStatistics),
      integrity_status: {
        verified,
        pending,
        tampered,
      },
    },
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// GET PROOF DOCUMENT
// =====================================================

async function handleGetProof(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const consentId = parts[parts.length - 1];

  if (!consentId) {
    return NextResponse.json(
      { success: false, error: 'Consent ID is required' },
      { status: 400 }
    );
  }

  // First check if proof exists
  const { data: existingProof, error: proofError } = await supabase
    .from('consent_proofs')
    .select('*')
    .eq('consent_record_id', consentId)
    .single();

  if (proofError && proofError.code !== 'PGRST116') {
    console.error('Failed to fetch proof:', proofError);
  }

  // If no proof exists, generate one
  if (!existingProof) {
    const { data: proofData, error: generateError } = await supabase.rpc(
      'generate_consent_proof',
      { p_consent_record_id: consentId }
    );

    if (generateError) {
      console.error('Failed to generate proof:', generateError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate consent proof' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: proofData,
    }, { status: 200 });
  }

  // Increment verification count
  await supabase
    .from('consent_proofs')
    .update({
      verification_count: (existingProof.verification_count || 0) + 1,
      verified_at: new Date().toISOString(),
    })
    .eq('id', existingProof.id);

  const response: ApiResponse<ConsentProof> = {
    success: true,
    data: existingProof as ConsentProof,
  };

  return NextResponse.json(response, { status: 200 });
}

// =====================================================
// ROUTE HANDLER
// =====================================================

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Route based on path structure
  if (pathname.includes('/export/')) {
    return handleExportUserData(req);
  }
  
  if (pathname.includes('/verify/')) {
    return handleVerifyIntegrity(req);
  }
  
  if (pathname.includes('/chain/')) {
    return handleVerifyChain(req);
  }
  
  if (pathname.includes('/proof/')) {
    return handleGetProof(req);
  }
  
  if (pathname.includes('/stats/')) {
    return handleGetStats(req);
  }
  
  if (pathname.includes('/settings/')) {
    return handleGetSettings(req);
  }

  // Default: get consent status
  return handleGetConsentStatus(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('/withdraw')) {
    return handleWithdrawConsent(req);
  }

  if (pathname.includes('/parental')) {
    return handleParentalConsent(req);
  }

  // Default: record consent
  return handleRecordConsent(req);
}

export async function PUT(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('/settings/')) {
    return handleUpdateSettings(req);
  }

  return NextResponse.json(
    { success: false, error: 'Invalid endpoint' },
    { status: 404 }
  );
}