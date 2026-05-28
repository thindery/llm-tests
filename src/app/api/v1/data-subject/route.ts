/**
 * Data Subject Rights API
 * GDPR Articles 15-22 Implementation
 * Ticket: REMY-256
 * 
 * Endpoints:
 * GET /api/v1/data-subject/access - Right of Access (Article 15)
 * PUT /api/v1/data-subject/rectify - Right to Rectification (Article 16)
 * DELETE /api/v1/data-subject/erasure - Right to Erasure (Article 17)
 * POST /api/v1/data-subject/restrict - Right to Restriction (Article 18)
 * GET /api/v1/data-subject/portability - Data Portability (Article 20)
 * POST /api/v1/data-subject/object - Right to Object (Article 21)
 * GET /api/v1/data-subject/decisions - Automated Decision-Making Info (Article 22)
 * GET /api/v1/data-subject/requests - List user's DSR requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types
interface DataSubjectRequest {
  id: string;
  user_id: string;
  project_id: string;
  request_type: 'access' | 'rectify' | 'erasure' | 'restrict' | 'portability' | 'object';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  data_export_url: string | null;
  admin_notes: string | null;
}

interface AccessRequest {
  user_id: string;
  projects: string[]; // Array of project IDs or 'all'
}

interface RectifyRequest {
  user_id: string;
  project_id: string;
  corrections: {
    field: string;
    old_value: string;
    new_value: string;
  }[];
}

interface ErasureRequest {
  user_id: string;
  projects: string[];
  exclude_from_marketing?: boolean;
}

interface RestrictionRequest {
  user_id: string;
  project_id: string;
  reason: 'contest_data' | 'unlawful_processing' | 'no_longer_needed' | 'pending_verification';
  restrict_types: string[];
}

interface ObjectionRequest {
  user_id: string;
  project_id: string;
  objection_type: 'direct_marketing' | 'legitimate_interest' | 'research';
  description: string;
}

// Helper: Get authenticated user from request
async function getUserFromRequest(req: NextRequest): Promise<{ userId: string; isServiceRole: boolean } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // Check for service role
  if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const userId = req.headers.get('X-User-ID');
    if (!userId) return null;
    return { userId, isServiceRole: true };
  }

  // Validate JWT with Supabase (simplified - in production use proper validation)
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return { userId: user.id, isServiceRole: false };
}

// Helper: Create DSR record
type DsrType = 'access' | 'rectify' | 'erasure' | 'restrict' | 'portability' | 'object';

async function createDSRRecord(
  userId: string,
  projectId: string | null,
  requestType: DsrType,
  status: 'pending' | 'processing' | 'completed' | 'rejected' = 'pending'
): Promise<DataSubjectRequest> {
  const { data, error } = await supabase
    .from('data_subject_requests')
    .insert({
      user_id: userId,
      project_id: projectId,
      request_type: requestType,
      status,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Log DSR activity
async function logDSRActivity(
  dsrId: string,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await supabase
    .from('dsr_audit_log')
    .insert({
      dsr_id: dsrId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
}

// ========== ARTICLE 15: RIGHT OF ACCESS ==========
async function handleAccessRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');
    const { userId } = user;

    // Create DSR record
    const dsr = await createDSRRecord(userId, projectId, 'access');

    // Gather all personal data
    const personalData: Record<string, unknown> = {
      export_metadata: {
        dsr_id: dsr.id,
        export_timestamp: new Date().toISOString(),
        user_id: userId,
        exported_by: user.isServiceRole ? 'admin' : 'user',
      },
    };

    // 1. Get consent records
    const { data: consentRecords, error: consentError } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId);

    if (!consentError) {
      personalData.consent_records = consentRecords;
    }

    // 2. Get consent exports if available
    const { data: consentExport } = await supabase.rpc('export_user_consent_data', {
      p_project_id: projectId || null,
      p_user_id: userId,
    });
    if (consentExport) {
      personalData.consent_export = consentExport;
    }

    // 3. Get events data (only if project specified)
    if (projectId) {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!eventsError) {
        personalData.events = events;
        personalData.events_count = events?.length || 0;
      }

      // 4. Get sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId);

      if (!sessionsError) {
        personalData.sessions = sessions;
        personalData.sessions_count = sessions?.length || 0;
      }
    }

    // 5. Get DPA agreements
    const { data: dpaAgreements, error: dpaError } = await supabase
      .from('dpa_agreements')
      .select('id, dpa_version, signed_at, status')
      .eq('customer_id', userId);

    if (!dpaError) {
      personalData.dpa_agreements = dpaAgreements;
    }

    // Update DSR as completed
    await supabase
      .from('data_subject_requests')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
      })
      .eq('id', dsr.id);

    await logDSRActivity(dsr.id, 'access_completed', { 
      data_categories: Object.keys(personalData),
      project_id: projectId,
    });

    return NextResponse.json({
      success: true,
      dsr_id: dsr.id,
      data: personalData,
      rights: {
        right_to_rectification: true,
        right_to_erasure: true,
        right_to_restrict: true,
        right_to_portability: true,
        right_to_object: true,
        complaint_rights: 'You have the right to lodge a complaint with a supervisory authority.',
      },
    });

  } catch (error) {
    console.error('Access request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== ARTICLE 16: RIGHT TO RECTIFICATION ==========
async function handleRectifyRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RectifyRequest = await req.json();
    const { user_id, project_id, corrections } = body;

    // Verify user can only rectify their own data (or admin)
    if (!user.isServiceRole && user.userId !== user_id) {
      return NextResponse.json({ error: 'Forbidden: Can only rectify own data' }, { status: 403 });
    }

    // Create DSR record
    const dsr = await createDSRRecord(user_id, project_id, 'rectify', 'processing');

    // Process corrections
    const results: Array<{ field: string; status: string; error?: string }> = [];

    for (const correction of corrections) {
      try {
        // Note: In session recording analytics, most data is immutable audit trail
        // We store correction requests for non-audit data
        await supabase.from('data_corrections').insert({
          dsr_id: dsr.id,
          user_id,
          project_id,
          field: correction.field,
          old_value: correction.old_value,
          new_value: correction.new_value,
          correction_timestamp: new Date().toISOString(),
          status: 'pending_review',
        });

        results.push({ field: correction.field, status: 'submitted_for_review' });
      } catch (error) {
        results.push({ 
          field: correction.field, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Complete DSR
    await supabase
      .from('data_subject_requests')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        admin_notes: `Correction requests submitted: ${results.filter(r => r.status === 'submitted_for_review').length} / ${corrections.length}`,
      })
      .eq('id', dsr.id);

    await logDSRActivity(dsr.id, 'rectify_completed', { corrections_count: corrections.length });

    return NextResponse.json({
      success: true,
      dsr_id: dsr.id,
      message: 'Correction requests submitted for review',
      results,
      note: 'Audit trail data (session recordings, events) cannot be modified. Correction will be applied to user profile data.',
    });

  } catch (error) {
    console.error('Rectify request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== ARTICLE 17: RIGHT TO ERASURE ==========
async function handleErasureRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ErasureRequest = await req.json();
    const { user_id, projects, exclude_from_marketing = true } = body;

    // Verify user can only delete their own data (or admin)
    if (!user.isServiceRole && user.userId !== user_id) {
      return NextResponse.json({ error: 'Forbidden: Can only erase own data' }, { status: 403 });
    }

    // Create DSR record
    const isAllProjects = projects.includes('all');
    const dsr = await createDSRRecord(user_id, isAllProjects ? null : projects[0], 'erasure', 'processing');

    const deletionResults: Record<string, number> = {};

    // 1. Delete events
    let eventsQuery = supabase
      .from('events')
      .delete()
      .eq('user_id', user_id);
    
    if (!isAllProjects && projects.length > 0) {
      eventsQuery = eventsQuery.in('project_id', projects);
    }
    
    const { count: eventsDeleted } = await eventsQuery;
    deletionResults.events_deleted = eventsDeleted || 0;

    // 2. Delete sessions
    let sessionsQuery = supabase
      .from('sessions')
      .delete()
      .eq('user_id', user_id);
    
    if (!isAllProjects && projects.length > 0) {
      sessionsQuery = sessionsQuery.in('project_id', projects);
    }
    
    const { count: sessionsDeleted } = await sessionsQuery;
    deletionResults.sessions_deleted = sessionsDeleted || 0;

    // 3. Delete consent records
    let consentQuery = supabase
      .from('consent_records')
      .delete()
      .eq('user_id', user_id);
    
    if (!isAllProjects && projects.length > 0) {
      consentQuery = consentQuery.in('project_id', projects);
    }
    
    const { count: consentDeleted } = await consentQuery;
    deletionResults.consent_records_deleted = consentDeleted || 0;

    // 4. Add to marketing exclusion list if requested
    if (exclude_from_marketing) {
      await supabase.from('marketing_exclusions').insert({
        user_id,
        excluded_at: new Date().toISOString(),
        reason: 'dsr_erasure_request',
        dsr_id: dsr.id,
      });
      deletionResults.marketing_excluded = 1;
    }

    // Complete DSR
    await supabase
      .from('data_subject_requests')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        admin_notes: `Deleted: ${JSON.stringify(deletionResults)}`,
      })
      .eq('id', dsr.id);

    await logDSRActivity(dsr.id, 'erasure_completed', deletionResults);

    return NextResponse.json({
      success: true,
      dsr_id: dsr.id,
      message: 'Data erasure request completed',
      deletion_summary: deletionResults,
      exclusions: exclude_from_marketing ? 'User added to marketing exclusion list' : undefined,
      note: 'Audit logs and backup data may be retained as required by law (up to 90 days).',
    });

  } catch (error) {
    console.error('Erasure request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== ARTICLE 18: RIGHT TO RESTRICTION ==========
async function handleRestrictRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RestrictionRequest = await req.json();
    const { user_id, project_id, reason, restrict_types } = body;

    // Verify authorization
    if (!user.isServiceRole && user.userId !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create DSR record
    const dsr = await createDSRRecord(user_id, project_id, 'restrict', 'completed');

    // Create restriction record
    await supabase.from('processing_restrictions').insert({
      dsr_id: dsr.id,
      user_id,
      project_id,
      restriction_reason: reason,
      restricted_types: restrict_types,
      restricted_at: new Date().toISOString(),
      status: 'active',
    });

    // Mark existing events as restricted
    await supabase
      .from('events')
      .update({ processing_restricted: true })
      .eq('user_id', user_id)
      .eq('project_id', project_id);

    // Also update sessions
    await supabase
      .from('sessions')
      .update({ processing_restricted: true })
      .eq('user_id', user_id)
      .eq('project_id', project_id);

    await logDSRActivity(dsr.id, 'restrict_completed', { reason, restrict_types });

    return NextResponse.json({
      success: true,
      dsr_id: dsr.id,
      message: 'Processing restriction applied',
      restriction: {
        user_id,
        project_id,
        restricted_types: restrict_types,
        status: 'active',
        note: 'New data is collected but marked as restricted. Processing continues only for legal claims or consent storage.',
      },
    });

  } catch (error) {
    console.error('Restriction request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== ARTICLE 20: DATA PORTABILITY ==========
async function handlePortabilityRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');
    const format = url.searchParams.get('format') || 'json'; // json or csv
    const { userId } = user;

    // Create DSR record
    const dsr = await createDSRRecord(userId, projectId, 'portability', 'processing');

    // Get consented data for export
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId || '')
      .eq('consent_valid', true)
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId || '');

    if (sessionsError) throw sessionsError;

    // Include only user-provided data (not derived/profiles)
    const portableData = {
      metadata: {
        export_timestamp: new Date().toISOString(),
        format,
        dsr_id: dsr.id,
        data_categories: ['events', 'sessions'],
      },
      user_id: userId,
      project_id: projectId,
      events: events?.map(e => ({
        event_type: e.event_type,
        timestamp: e.timestamp_ms,
        data: e.data,
        session_id: e.session_id,
      })) || [],
      sessions: sessions?.map(s => ({
        started_at: s.started_at,
        source_url: s.source_url,
        user_agent: s.user_agent,
        consent_analytics: s.consent_analytics,
      })) || [],
    };

    // Complete DSR
    await supabase
      .from('data_subject_requests')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
      })
      .eq('id', dsr.id);

    await logDSRActivity(dsr.id, 'portability_completed', { 
      events_count: events?.length || 0,
      sessions_count: sessions?.length || 0,
      format,
    });

    if (format === 'csv') {
      // Generate CSV format
      const headers = 'event_type,timestamp,session_id,data\n';
      const rows = events?.map(e => 
        `${e.event_type},${e.timestamp_ms},${e.session_id},${JSON.stringify(e.data)}`
      ).join('\n') || '';
      
      return new Response(headers + rows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="data-export-${userId.substring(0, 8)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      dsr_id: dsr.id,
      format,
      data: portableData,
    });

  } catch (error) {
    console.error('Portability request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== ARTICLE 21: RIGHT TO OBJECT ==========
async function handleObjectionRequest(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ObjectionRequest = await req.json();
    const { user_id, project_id, objection_type, description } = body;

    // Verify authorization
    if (!user.isServiceRole && user.userId !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create DSR record
    const dsr = await createDSRRecord(user_id, project_id, 'object', 'completed');

    // Create objection record
    await supabase.from('processing_objections').insert({
      dsr_id: dsr.id,
      user_id,
      project_id,
      objection_type,
      description,
      objected_at: new Date().toISOString(),
      status: 'active',
    });

    // For direct marketing objections, immediately stop processing
    if (objection_type === 'direct_marketing') {
      await supabase.from('marketing_exclusions').insert({
        user_id,
        excluded_at: new Date().toISOString(),
        reason: 'direct_marketing_objection',
        dsr_id: dsr.id,
      });
    }

    // For legitimate interest objections, mark existing data
    if (objection_type === 'legitimate_interest') {
      await supabase
        .from('events')
        .update({ legitimate_interest_objected: true })
        .eq('user_id', user_id)
        .eq('project_id', project_id);
    }

    await logDSRActivity(dsr.id, 'object_completed', { objection_type });

    return NextResponse.json({
      success: true,
      dsr_id: dsr.id,
      message: 'Objection recorded',
      objection: {
        user_id,
        project_id,
        objection_type,
        status: 'active',
        effective_immediately: objection_type === 'direct_marketing',
        note: 'Direct marketing objections take effect immediately. Legitimate interest objections require review.',
      },
    });

  } catch (error) {
    console.error('Objection request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== ARTICLE 22: AUTOMATED DECISION-MAKING INFO ==========
async function handleDecisionsInfo(req: NextRequest): Promise<NextResponse> {
  // REMY Analytics does not engage in solely automated decision-making
  // that produces legal or similarly significant effects
  return NextResponse.json({
    success: true,
    profiling_status: 'No automated decision-making',
    profiling_description: 'REMY Analytics does not engage in automated decision-making using personal data that produces legal effects or similarly significant effects on individuals.',
    data_usage: {
      purposes: ['Session recording', 'Analytics', 'Error tracking'],
      automated_decisions: false,
      human_review: true,
    },
    rights: {
      article_22_applies: false,
      right_to_human_intervention: 'N/A - No automated decisions',
      right_to_express_ones_view: 'Available via objection mechanism',
      right_to_contest_decision: 'Available via DSR process',
    },
    contact: 'dpo@remyanalytics.com',
  });
}

// ========== LIST DSR REQUESTS ==========
async function handleListRequests(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');

    let query = supabase
      .from('data_subject_requests')
      .select('*')
      .eq('user_id', user.userId)
      .order('requested_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      requests: data,
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('List DSR error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========== MAIN ROUTER ==========
export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/access')) {
    return handleAccessRequest(req);
  }
  if (pathname.endsWith('/portability')) {
    return handlePortabilityRequest(req);
  }
  if (pathname.endsWith('/decisions')) {
    return handleDecisionsInfo(req);
  }
  if (pathname.endsWith('/requests')) {
    return handleListRequests(req);
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/rectify')) {
    return handleRectifyRequest(req);
  }
  if (pathname.endsWith('/restrict')) {
    return handleRestrictRequest(req);
  }
  if (pathname.endsWith('/object')) {
    return handleObjectionRequest(req);
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/erasure')) {
    return handleErasureRequest(req);
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

export async function PUT(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.endsWith('/rectify')) {
    return handleRectifyRequest(req);
  }

  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

// Export for testing
export {
  handleAccessRequest,
  handleRectifyRequest,
  handleErasureRequest,
  handleRestrictRequest,
  handlePortabilityRequest,
  handleObjectionRequest,
  handleDecisionsInfo,
};
