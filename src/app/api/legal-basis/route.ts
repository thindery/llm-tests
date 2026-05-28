/**
 * Legal Basis API Routes
 * GET  /api/v1/legal-basis - List processing activities
 * GET  /api/v1/legal-basis/{activity_id} - Get specific activity
 * POST /api/v1/legal-basis - Create processing activity (Art 6: Document BEFORE processing)
 * PUT  /api/v1/legal-basis/{id} - Update processing activity
 * POST /api/v1/legal-basis/{id}/approve - Approve activity (processing can begin)
 * POST /api/v1/legal-basis/{id}/deprecate - Deprecate activity
 * GET  /api/v1/legal-basis/audit/{activity_id} - Get audit trail
 * GET  /api/v1/legal-basis/compliance-report - Get compliance report
 * POST /api/v1/legal-basis/check-authorized - Check if processing is authorized
 * 
 * Ticket: REMY-261
 */

import { 
  ProcessingActivity,
  LegalBasisAuditEntry,
  LegalBasisComplianceReport,
  CreateProcessingActivityRequest,
  ApiResponse,
  validateProcessingActivityRequest,
  isProcessingAuthorized,
  LEGAL_BASIS_DESCRIPTIONS,
  generateActivityId,
} from '../../../lib/legal-basis/utils';

// In-memory storage for development (replace with Supabase in production)
const processingActivities: Map<string, ProcessingActivity> = new Map();
const auditLog: Map<string, LegalBasisAuditEntry> = new Map();

// Initialize with seed data
const seedActivities: ProcessingActivity[] = [
  {
    id: 'seed-auth-001',
    activity_id: 'AUTH-001',
    activity_name: 'User Authentication',
    activity_description: 'Processing user credentials to provide access to the platform',
    legal_basis: 'contract',
    legal_basis_justification: 'Processing is necessary for the performance of the contract to provide platform services (GDPR Art 6(1)(b))',
    processing_purpose: 'service_delivery',
    data_categories: ['email', 'password_hash', 'session_tokens'],
    data_subjects: ['registered_users'],
    retention_period_days: 90,
    storage_locations: ['us-east-1', 'eu-west-1'],
    consent_mechanism: undefined,
    consent_withdrawal_mechanism: undefined,
    document_reference: '/legal/privacy-policy#authentication',
    approved_at: new Date().toISOString(),
    version: '1.0',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-analytics-001',
    activity_id: 'ANALYTICS-001',
    activity_name: 'Usage Analytics',
    activity_description: 'Collecting anonymized usage data to improve platform performance and features',
    legal_basis: 'consent',
    legal_basis_justification: 'User has provided explicit consent through banner (GDPR Art 6(1)(a). Consent can be withdrawn at any time.',
    processing_purpose: 'analytics',
    data_categories: ['usage_patterns', 'device_info', 'interaction_data'],
    data_subjects: ['users', 'visitors'],
    retention_period_days: 365,
    storage_locations: ['us-east-1'],
    consent_mechanism: 'explicit',
    consent_withdrawal_mechanism: '/settings/privacy#withdraw-consent',
    document_reference: '/legal/privacy-policy#analytics',
    approved_at: new Date().toISOString(),
    version: '1.0',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-marketing-001',
    activity_id: 'MARKETING-001',
    activity_name: 'Marketing Communications',
    activity_description: 'Sending promotional emails and product updates to users who have opted in',
    legal_basis: 'consent',
    legal_basis_justification: 'User has provided explicit consent for marketing communications (GDPR Art 6(1)(a)). Consent can be withdrawn at any time via unsubscribe link or settings.',
    processing_purpose: 'marketing',
    data_categories: ['email_address', 'preferences'],
    data_subjects: ['subscribers'],
    retention_period_days: 730,
    storage_locations: ['us-east-1', 'eu-west-1'],
    consent_mechanism: 'explicit',
    consent_withdrawal_mechanism: '/settings/notifications#unsubscribe OR email unsubscribe link',
    document_reference: '/legal/privacy-policy#marketing',
    approved_at: new Date().toISOString(),
    version: '1.0',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Populate seed data
seedActivities.forEach(activity => {
  processingActivities.set(activity.id, activity);
});

// Helper: Get customer from request
function getCustomerFromRequest(req: Request): { userId: string; role: string } | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    // In production, verify JWT and extract role
    return { userId, role: 'admin' }; // Mock admin role
  }
  return { userId: 'mock-user-id', role: 'admin' };
}

// Helper: Get client IP
function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         '127.0.0.1';
}

/**
 * Helper: Add audit log entry
 */
function addAuditEntry(
  activityId: string,
  changeType: string,
  changedBy: string,
  previousValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): LegalBasisAuditEntry {
  const entry: LegalBasisAuditEntry = {
    id: crypto.randomUUID(),
    activity_id: activityId,
    change_type: changeType as 'created' | 'updated' | 'deprecated' | 'approved',
    previous_values: previousValues,
    new_values: newValues,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
  };

  auditLog.set(entry.id, entry);
  return entry;
}

/**
 * =====================================================
 * ROUTE HANDLERS
 * =====================================================
 */

// GET /api/v1/legal-basis - List processing activities
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  // GET /api/v1/legal-basis/compliance-report
  if (lastSegment === 'compliance-report') {
    return handleGetComplianceReport(req);
  }

  // GET /api/v1/legal-basis/audit/{activity_id}
  if (segments.length > 2 && segments[segments.length - 2] === 'audit') {
    return handleGetAuditTrail(req, lastSegment);
  }

  // GET /api/v1/legal-basis/{activity_id}
  if (segments.length > 1 && lastSegment !== 'legal-basis') {
    return handleGetActivity(req, lastSegment);
  }

  // GET /api/v1/legal-basis - List all
  return handleListActivities(req);
}

// POST /api/v1/legal-basis - Create processing activity
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const secondLast = segments[segments.length - 2];

  // POST /api/v1/legal-basis/{id}/approve
  if (lastSegment === 'approve') {
    return handleApproveActivity(req, secondLast);
  }

  // POST /api/v1/legal-basis/{id}/deprecate
  if (lastSegment === 'deprecate') {
    return handleDeprecateActivity(req, secondLast);
  }

  // POST /api/v1/legal-basis/check-authorized
  if (lastSegment === 'check-authorized') {
    return handleCheckAuthorized(req);
  }

  // POST /api/v1/legal-basis - Create new
  return handleCreateActivity(req);
}

// PUT /api/v1/legal-basis/{id} - Update processing activity
export async function PUT(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const activityId = segments[segments.length - 1];

  return handleUpdateActivity(req, activityId);
}

/**
 * =====================================================
 * HANDLER FUNCTIONS
 * =====================================================
 */

// List all processing activities
async function handleListActivities(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') as 'active' | 'suspended' | 'deprecated' | null;
  const legalBasis = url.searchParams.get('legal_basis') as string | null;

  let activities = Array.from(processingActivities.values());

  // Filter by status if provided
  if (status) {
    activities = activities.filter(a => a.status === status);
  }

  // Filter by legal basis if provided
  if (legalBasis) {
    activities = activities.filter(a => a.legal_basis === legalBasis);
  }

  // Sort by name
  activities.sort((a, b) => a.activity_name.localeCompare(b.activity_name));

  const response: ApiResponse<{ activities: ProcessingActivity[]; total: number }> = {
    success: true,
    data: { activities, total: activities.length },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Get specific activity
async function handleGetActivity(req: Request, activityIdOrActivityId: string): Promise<Response> {
  // Try to find by activity_id first, then by id
  let activity = Array.from(processingActivities.values()).find(
    a => a.activity_id === activityIdOrActivityId.toUpperCase()
  );
  
  if (!activity) {
    activity = processingActivities.get(activityIdOrActivityId);
  }

  if (!activity) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Processing activity not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Enhance with legal basis description
  const enhancedActivity = {
    ...activity,
    legal_basis_details: LEGAL_BASIS_DESCRIPTIONS[activity.legal_basis],
    is_authorized: isProcessingAuthorized(activity).authorized,
  };

  const response: ApiResponse<typeof enhancedActivity> = {
    success: true,
    data: enhancedActivity,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Create processing activity (Art 6: Document BEFORE processing)
async function handleCreateActivity(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid JSON body',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate the request
  const validation = validateProcessingActivityRequest(body);
  if (!validation.valid) {
    const response: ApiResponse<never> = {
      success: false,
      error: validation.error,
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = validation.data;

  // Check for duplicate activity_id
  const existingByActivityId = Array.from(processingActivities.values()).find(
    a => a.activity_id === data.activity_id
  );
  if (existingByActivityId) {
    const response: ApiResponse<never> = {
      success: false,
      error: `Processing activity with activity_id '${data.activity_id}' already exists`,
    };
    return new Response(JSON.stringify(response), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date().toISOString();
  
  // Create the activity (NOT approved yet - processing cannot begin)
  const activity: ProcessingActivity = {
    id: crypto.randomUUID(),
    ...data,
    data_categories: data.data_categories || ['personal'],
    data_subjects: data.data_subjects || ['users'],
    storage_locations: data.storage_locations || ['us-east-1'],
    internal_recipients: data.internal_recipients || [],
    external_recipients: data.external_recipients || [],
    status: 'suspended', // Not active until approved
    created_at: now,
    updated_at: now,
    created_by: customer.userId,
    legitimate_interest_balancing_completed: data.legal_basis === 'legitimate_interest' ? false : undefined,
  };

  // Store activity
  processingActivities.set(activity.id, activity);

  // Log audit entry
  addAuditEntry(activity.id, 'created', customer.userId, undefined, activity as Record<string, unknown>);

  const response: ApiResponse<ProcessingActivity> = {
    success: true,
    data: activity,
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Update processing activity
async function handleUpdateActivity(req: Request, activityId: string): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activity = processingActivities.get(activityId);
  if (!activity) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Processing activity not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cannot update if deprecated
  if (activity.status === 'deprecated') {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Cannot modify deprecated activity',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid JSON body',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updates = body as Record<string, unknown>;

  // Store previous values for audit
  const previousValues = { ...activity };

  // Apply allowed updates
  if (typeof updates.activity_name === 'string') {
    activity.activity_name = updates.activity_name;
  }
  if (typeof updates.activity_description === 'string') {
    activity.activity_description = updates.activity_description;
  }
  if (typeof updates.legal_basis_justification === 'string') {
    activity.legal_basis_justification = updates.legal_basis_justification;
  }
  if (typeof updates.document_reference === 'string') {
    activity.document_reference = updates.document_reference;
  }
  if (typeof updates.retention_period_days === 'number') {
    activity.retention_period_days = updates.retention_period_days;
  }
  if (Array.isArray(updates.storage_locations)) {
    activity.storage_locations = updates.storage_locations as string[];
  }
  if (typeof updates.legitimate_interest_description === 'string') {
    activity.legitimate_interest_description = updates.legitimate_interest_description;
  }
  if (typeof updates.legitimate_interest_impact_assessment === 'string') {
    activity.legitimate_interest_impact_assessment = updates.legitimate_interest_impact_assessment as string;
  }
  if (typeof updates.legitimate_interest_balancing_completed === 'boolean') {
    activity.legitimate_interest_balancing_completed = updates.legitimate_interest_balancing_completed;
  }
  if (typeof updates.consent_withdrawal_mechanism === 'string') {
    activity.consent_withdrawal_mechanism = updates.consent_withdrawal_mechanism;
  }

  activity.updated_at = new Date().toISOString();

  // Log audit entry
  addAuditEntry(activity.id, 'updated', customer.userId, previousValues as Record<string, unknown>, activity as Record<string, unknown>);

  const response: ApiResponse<ProcessingActivity> = {
    success: true,
    data: activity,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Approve processing activity (processing can begin)
async function handleApproveActivity(req: Request, activityId: string): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activity = processingActivities.get(activityId);
  if (!activity) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Processing activity not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if already approved
  if (activity.status === 'active') {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Activity is already approved',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate compliance before approval
  const authorization = isProcessingAuthorized(activity);
  if (!authorization.authorized) {
    const response: ApiResponse<never> = {
      success: false,
      error: `Activity not ready for approval: ${authorization.reasons.join(', ')}`,
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Store previous values for audit
  const previousValues = { ...activity };

  // Approve the activity
  const now = new Date().toISOString();
  activity.approved_at = now;
  activity.approved_by = customer.userId;
  activity.status = 'active';
  activity.updated_at = now;

  // Log audit entry
  addAuditEntry(activity.id, 'approved', customer.userId, previousValues as Record<string, unknown>, activity as Record<string, unknown>);

  const response: ApiResponse<ProcessingActivity> = {
    success: true,
    data: activity,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Deprecate processing activity
async function handleDeprecateActivity(req: Request, activityId: string): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activity = processingActivities.get(activityId);
  if (!activity) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Processing activity not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body for reason
  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body optional
  }

  const previousValues = { ...activity };

  const now = new Date().toISOString();
  activity.status = 'deprecated';
  activity.deprecated_at = now;
  activity.deprecated_reason = body.reason || 'Activity deprecated';
  activity.updated_at = now;

  // Log audit entry
  addAuditEntry(activity.id, 'deprecated', customer.userId, previousValues as Record<string, unknown>, activity as Record<string, unknown>);

  const response: ApiResponse<ProcessingActivity> = {
    success: true,
    data: activity,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Get audit trail for an activity
async function handleGetAuditTrail(req: Request, activityId: string): Promise<Response> {
  const activity = processingActivities.get(activityId) || 
    Array.from(processingActivities.values()).find(a => a.activity_id === activityId.toUpperCase());

  if (!activity) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Processing activity not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get audit entries for this activity
  const entries = Array.from(auditLog.values())
    .filter(entry => entry.activity_id === activity.id)
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

  const response: ApiResponse<{ activity: ProcessingActivity; audit_trail: LegalBasisAuditEntry[] }> = {
    success: true,
    data: {
      activity,
      audit_trail: entries,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Get compliance report
async function handleGetComplianceReport(req: Request): Promise<Response> {
  const activities = Array.from(processingActivities.values());
  
  const byLegalBasis: Record<string, number> = {};
  activities.forEach(a => {
    byLegalBasis[a.legal_basis] = (byLegalBasis[a.legal_basis] || 0) + 1;
  });

  const report: LegalBasisComplianceReport = {
    generated_at: new Date().toISOString(),
    processing_activities_summary: {
      total_activities: activities.length,
      by_legal_basis: byLegalBasis,
      active_count: activities.filter(a => a.status === 'active').length,
      deprecated_count: activities.filter(a => a.status === 'deprecated').length,
      without_approval: activities.filter(a => !a.approved_at).length,
    },
    consent_compliance: {
      total_consents: 0, // Would query consent_records in production
      with_documented_legal_basis: 0,
      without_legal_basis: 0,
      withdrawal_availability: {
        has_withdrawal_mechanism: activities
          .filter(a => a.legal_basis === 'consent')
          .every(a => a.consent_withdrawal_mechanism != null),
        withdrawal_methods_available: ['settings_page', 'api_endpoint', 'email'],
      },
    },
    audit_trail_completeness: {
      total_audit_entries: auditLog.size,
      activities_with_audit_history: new Set(auditLog.values().map(e => e.activity_id)).size,
    },
  };

  // Check for compliance issues
  const issues: string[] = [];
  activities.forEach(activity => {
    const auth = isProcessingAuthorized(activity);
    if (!auth.authorized) {
      issues.push(`${activity.activity_id}: ${auth.reasons.join(', ')}`);
    }
  });

  const response: ApiResponse<LegalBasisComplianceReport & { issues?: string[] }> = {
    success: true,
    data: {
      ...report,
      ...(issues.length > 0 && { issues }),
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Check if processing is authorized
async function handleCheckAuthorized(req: Request): Promise<Response> {
  let body: { activity_id?: string; user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Invalid JSON body',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.activity_id) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'activity_id is required',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activity = processingActivities.get(body.activity_id) ||
    Array.from(processingActivities.values()).find(
      a => a.activity_id === body.activity_id?.toUpperCase() || a.id === body.activity_id
    );

  if (!activity) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Processing activity not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authorization = isProcessingAuthorized(activity);

  const response: ApiResponse<{
    activity_id: string;
    authorized: boolean;
    reasons: string[];
    legal_basis: LegalBasisType;
    status: LegalBasisStatus;
    approved_at?: string;
  }> = {
    success: true,
    data: {
      activity_id: activity.activity_id,
      authorized: authorization.authorized,
      reasons: authorization.reasons,
      legal_basis: activity.legal_basis,
      status: activity.status,
      approved_at: activity.approved_at,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
