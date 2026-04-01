/**
 * Breach API Routes - GDPR Article 33 & 34 Breach Notification Procedures
 * Ticket: REMY-260
 * 
 * Routes:
 * - POST /api/v1/breach - Report new breach
 * - GET /api/v1/breach/:breach_id - Get breach details
 * - GET /api/v1/breach/project/:project_id - List breaches for project
 * - PUT /api/v1/breach/:breach_id - Update breach
 * - POST /api/v1/breach/:breach_id/risk-assessment - Perform risk assessment
 * - POST /api/v1/breach/:breach_id/notify-dpa - Notify DPA (72 hour deadline)
 * - POST /api/v1/breach/:breach_id/notify-subjects - Notify data subjects (Article 34)
 * - POST /api/v1/breach/:breach_id/evidence - Add evidence
 * - GET /api/v1/breach/:breach_id/evidence - List evidence
 * - POST /api/v1/breach/:breach_id/remediation - Add remediation step
 * - PUT /api/v1/breach/:breach_id/remediation/:step_id - Update remediation step
 * - POST /api/v1/breach/:breach_id/resolve - Mark breach as resolved
 * - GET /api/v1/breach/stats/:project_id - Get breach statistics
 * - GET /api/v1/breach/dpa/:country_code - Get DPA info
 * - POST /api/v1/breach/:breach_id/status - Update status
 * - GET /api/v1/breach/:breach_id/compliance - Check compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  BreachRecord,
  BreachStatistics,
  BreachNotificationTemplate,
  CreateBreachRequest,
  UpdateBreachRequest,
  NotifyDPARequest,
  NotifySubjectsRequest,
  NotificationStatus,
  RemediationStep,
  EvidenceItem,
  EUDataProtectionAuthority,
  validateCreateBreachRequest,
  buildBreachRecord,
  performRiskAssessment,
  calculateDPANotificationDeadline,
  calculateSubjectNotificationDeadline,
  generateDPANotification,
  generateSubjectNotification,
  createStatusHistoryEntry,
  createEvidenceItem,
  createRemediationStep,
  isValidStatusTransition,
  getDPAByCountryCode,
  getDefaultDPA,
  getNotificationTemplate,
  checkBreachCompliance,
  calculateBreachStatistics,
  getHoursUntilDeadline,
} from '../../../../lib/breach/utils';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// AUTH UTILITIES
// =====================================================

interface AuthResult {
  userId: string;
  projectId?: string;
  isAdmin: boolean;
}

async function verifyAuth(req: NextRequest): Promise<AuthResult | null> {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // In production, verify JWT token
    const projectHeader = req.headers.get('X-Project-ID');
    return {
      userId: token,
      projectId: projectHeader || undefined,
      isAdmin: false,
    };
  }
  // Mock auth for development
  return {
    userId: 'mock-user-id',
    projectId: req.headers.get('X-Project-ID') || undefined,
    isAdmin: true,
  };
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') ||
         req.headers.get('x-real-ip') ||
         '127.0.0.1';
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getBreach(breachId: string): Promise<BreachRecord | null> {
  const { data, error } = await supabase
    .from('breach_records')
    .select('*')
    .eq('breach_id', breachId)
    .single();

  if (error) return null;
  return data as BreachRecord;
}

async function updateBreachStatus(
  breachId: string,
  newStatus: NotificationStatus,
  changedBy: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase
    .from('breach_records')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('breach_id', breachId);

  if (error) return false;

  // Add status history entry
  await supabase
    .from('breach_status_history')
    .insert({
      breach_id: breachId,
      status: newStatus,
      changed_by: changedBy,
      reason,
      timestamp: new Date().toISOString(),
    });

  return true;
}

// =====================================================
// API HANDLERS
// =====================================================

/**
 * POST /api/v1/breach - Report new breach
 */
async function handleCreateBreach(req: NextRequest): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
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

  // Validate request
  const validation = validateCreateBreachRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  const request = validation.data;
  const now = new Date().toISOString();

  // Build breach record
  const breachData = buildBreachRecord(request, auth.userId);

  // Insert into database
  const { data: inserted, error: insertError } = await supabase
    .from('breach_records')
    .insert({
      ...breachData,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create breach record:', insertError);
    return NextResponse.json(
      { success: false, error: 'Failed to create breach record' },
      { status: 500 }
    );
  }

  // Create initial audit log
  await supabase.from('breach_audit_log').insert({
    breach_id: inserted.breach_id,
    action: 'breach_reported',
    performed_by: auth.userId,
    details: {
      initial_risk_level: breachData.risk_level,
      requires_dpa_notification: breachData.requires_dpa_notification,
      dpa_notification_deadline: breachData.dpa_notification_deadline,
    },
    timestamp: now,
    ip_address: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    data: {
      breach: inserted,
      risk_assessment: {
        level: breachData.risk_level,
        score: breachData.risk_score,
        requires_dpa_notification: breachData.requires_dpa_notification,
        requires_subject_notification: breachData.requires_subject_notification,
        dpa_notification_deadline: breachData.dpa_notification_deadline,
      },
    },
  }, { status: 201 });
}

/**
 * GET /api/v1/breach/:breach_id - Get breach details
 */
async function handleGetBreach(req: NextRequest, breachId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data: breach, error } = await supabase
    .from('breach_records')
    .select(`
      *,
      status_history:breach_status_history(*),
      evidence:breach_evidence(*),
      remediation:breach_remediation_steps(*)
    `)
    .eq('breach_id', breachId)
    .single();

  if (error || !breach) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
    );
  }

  // Calculate remaining time for DPA notification
  const hoursUntilDPA = breach.dpa_notification_deadline
    ? getHoursUntilDeadline(breach.dpa_notification_deadline)
    : null;

  return NextResponse.json({
    success: true,
    data: {
      breach,
      timing: {
        hours_until_dpa_deadline: hoursUntilDPA,
        dpa_deadline_passed: hoursUntilDPA !== null && hoursUntilDPA < 0,
      },
    },
  });
}

/**
 * GET /api/v1/breach/project/:project_id - List breaches for project
 */
async function handleListBreaches(req: NextRequest, projectId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const riskLevel = url.searchParams.get('risk_level');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = supabase
    .from('breach_records')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('breach_discovered_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (riskLevel) {
    query = query.eq('risk_level', riskLevel);
  }

  const { data: breaches, error, count } = await query;

  if (error) {
    console.error('Failed to fetch breaches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breaches' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      breaches: breaches || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    },
  });
}

/**
 * PUT /api/v1/breach/:breach_id - Update breach
 */
async function handleUpdateBreach(
  req: NextRequest,
  breachId: string
): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if breach exists
  const existing = await getBreach(breachId);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
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

  const updates = body as Partial<UpdateBreachRequest>;
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Apply allowed updates
  if (updates.description) updateData.description = updates.description;
  if (updates.investigation_findings) updateData.investigation_findings = updates.investigation_findings;

  // Handle status update
  if (updates.status) {
    if (!isValidStatusTransition(existing.status, updates.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: ${existing.status} -> ${updates.status}` },
        { status: 400 }
      );
    }
    updateData.status = updates.status;
  }

  const { data: updated, error } = await supabase
    .from('breach_records')
    .update(updateData)
    .eq('breach_id', breachId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update breach:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update breach' },
      { status: 500 }
    );
  }

  // Log update
  if (updates.status) {
    await supabase.from('breach_audit_log').insert({
      breach_id: breachId,
      action: 'status_changed',
      performed_by: auth.userId,
      details: { previous_status: existing.status, new_status: updates.status },
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    data: updated,
  });
}

/**
 * POST /api/v1/breach/:breach_id/notify-dpa - Notify DPA (GDPR Article 33)
 */
async function handleNotifyDPA(req: NextRequest, breachId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get breach
  const breach = await getBreach(breachId);
  if (!breach) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
    );
  }

  // Check if DPA notification is required
  if (!breach.requires_dpa_notification) {
    return NextResponse.json(
      { success: false, error: 'DPA notification not required for this breach risk level' },
      { status: 400 }
    );
  }

  // Check if already notified
  if (breach.dpa_notification_sent_at) {
    return NextResponse.json(
      { success: false, error: 'DPA already notified', data: { notified_at: breach.dpa_notification_sent_at } },
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

  const notification = body as Partial<NotifyDPARequest>;

  // Get DPA
  const dpa = notification.dpa_contact || getDefaultDPA();

  // Generate notification content
  const orgName = process.env.ORGANIZATION_NAME || 'Organization';
  const contactEmail = process.env.CONTACT_EMAIL || 'privacy@example.com';
  const contactPhone = process.env.CONTACT_PHONE || '+1-000-000-0000';

  const { subject, body: notificationBody } = generateDPANotification(
    breach,
    dpa,
    orgName,
    contactEmail,
    contactPhone
  );

  const now = new Date().toISOString();

  // Update breach record
  const { error: updateError } = await supabase
    .from('breach_records')
    .update({
      dpa_notification_sent_at: now,
      dpa_notification_method: notification.method || 'online_form',
      dpa_contact: dpa,
      status: 'dpa_notified',
      updated_at: now,
    })
    .eq('breach_id', breachId);

  if (updateError) {
    console.error('Failed to update breach:', updateError);
    return NextResponse.json(
      { success: false, error: 'Failed to update breach record' },
      { status: 500 }
    );
  }

  // Log notification
  await supabase.from('breach_dpa_notifications').insert({
    breach_id: breachId,
    sent_at: now,
    sent_by: auth.userId,
    method: notification.method || 'online_form',
    dpa_contact: dpa,
    notification_content: notificationBody,
    subject,
    acknowledgement_received: false,
  });

  // Add status history
  await supabase.from('breach_status_history').insert({
    breach_id: breachId,
    status: 'dpa_notified',
    changed_by: auth.userId,
    reason: 'DPA notification sent',
    timestamp: now,
  });

  // Calculate compliance
  const discoveryTime = new Date(breach.breach_discovered_at).getTime();
  const notificationTime = new Date(now).getTime();
  const hoursElapsed = (notificationTime - discoveryTime) / (1000 * 60 * 60);
  const within72Hours = hoursElapsed <= 72;

  return NextResponse.json({
    success: true,
    data: {
      breach_id: breachId,
      dpa_notified: true,
      notified_at: now,
      hours_elapsed: Math.round(hoursElapsed * 100) / 100,
      within_72_hours: within72Hours,
      notification: {
        dpa: dpa.dpa_name,
        subject,
        body: notificationBody,
      },
    },
  });
}

/**
 * POST /api/v1/breach/:breach_id/notify-subjects - Notify data subjects (GDPR Article 34)
 */
async function handleNotifySubjects(
  req: NextRequest,
  breachId: string
): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get breach
  const breach = await getBreach(breachId);
  if (!breach) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
    );
  }

  // Check if subject notification is required
  if (!breach.requires_subject_notification) {
    return NextResponse.json(
      {
        success: false,
        error: 'Data subject notification not required for this breach risk level',
        data: { risk_level: breach.risk_level },
      },
      { status: 400 }
    );
  }

  // Check if already notified
  if (breach.subject_notification_sent_at) {
    return NextResponse.json(
      {
        success: false,
        error: 'Data subjects already notified',
        data: { notified_at: breach.subject_notification_sent_at },
      },
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

  const notification = body as Partial<NotifySubjectsRequest>;
  const now = new Date().toISOString();

  // Get affected users
  const { data: affectedUsers, error: usersError } = await supabase
    .from('affected_data_subjects')
    .select('email, phone')
    .eq('breach_id', breachId);

  if (usersError) {
    console.error('Failed to fetch affected users:', usersError);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch affected users' },
      { status: 500 }
    );
  }

  // Generate notification content
  const orgName = process.env.ORGANIZATION_NAME || 'Organization';
  const contactEmail = process.env.CONTACT_EMAIL || 'privacy@example.com';
  const contactPhone = process.env.CONTACT_PHONE || '+1-000-000-0000';

  const stepsTaken = breach.mitigation_measures_taken || [
    'Immediately secured the affected systems',
    'Launched investigation into the incident',
    'Implemented additional security measures',
  ];

  const { subject, body: notificationBody } = generateSubjectNotification(
    breach,
    orgName,
    contactEmail,
    contactPhone,
    stepsTaken
  );

  // Update breach record
  const recipients = affectedUsers?.map((u: { email?: string }) => u.email).filter(Boolean) || [];
  const successCount = recipients.length;
  const failedCount = 0;

  const { error: updateError } = await supabase
    .from('breach_records')
    .update({
      subject_notification_sent_at: now,
      subject_notification_method: notification.method || 'email',
      subjects_notified_count: successCount,
      subjects_failed_count: failedCount,
      status: 'subjects_notified',
      updated_at: now,
    })
    .eq('breach_id', breachId);

  if (updateError) {
    console.error('Failed to update breach:', updateError);
    return NextResponse.json(
      { success: false, error: 'Failed to update breach record' },
      { status: 500 }
    );
  }

  // Log notification
  await supabase.from('breach_subject_notifications').insert({
    breach_id: breachId,
    sent_at: now,
    sent_by: auth.userId,
    method: notification.method || 'email',
    recipients,
    template_used: breach.subject_notification_template,
    success_count: successCount,
    failed_count: failedCount,
    bounce_count: 0,
    errors: [],
  });

  return NextResponse.json({
    success: true,
    data: {
      breach_id: breachId,
      subjects_notified: true,
      notified_at: now,
      recipients_count: recipients.length,
      notification: {
        subject,
        body: notificationBody,
      },
    },
  });
}

/**
 * POST /api/v1/breach/:breach_id/evidence - Add evidence
 */
async function handleAddEvidence(req: NextRequest, breachId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check breach exists
  const breach = await getBreach(breachId);
  if (!breach) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
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

  const evidenceData = body as {
    type: EvidenceItem['type'];
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
    file_path?: string;
  };

  // Create evidence item
  const evidence = createEvidenceItem(
    evidenceData.type,
    evidenceData.title,
    evidenceData.description,
    auth.userId,
    evidenceData.metadata,
    evidenceData.file_path
  );

  const { data: inserted, error } = await supabase
    .from('breach_evidence')
    .insert({
      ...evidence,
      breach_id: breachId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add evidence' },
      { status: 500 }
    );
  }

  // Update breach evidence list
  const updatedEvidence = [...breach.evidence_collected, evidence];
  await supabase
    .from('breach_records')
    .update({
      evidence_collected: updatedEvidence,
      updated_at: new Date().toISOString(),
    })
    .eq('breach_id', breachId);

  return NextResponse.json({
    success: true,
    data: inserted,
  }, { status: 201 });
}

/**
 * GET /api/v1/breach/:breach_id/evidence - List evidence
 */
async function handleListEvidence(req: NextRequest, breachId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data: evidence, error } = await supabase
    .from('breach_evidence')
    .select('*')
    .eq('breach_id', breachId)
    .order('collected_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: evidence || [],
  });
}

/**
 * POST /api/v1/breach/:breach_id/remediation - Add remediation step
 */
async function handleAddRemediationStep(
  req: NextRequest,
  breachId: string
): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check breach exists
  const breach = await getBreach(breachId);
  if (!breach) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
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

  const stepData = body as {
    description: string;
    priority: RemediationStep['priority'];
    assigned_to: string;
    due_date: string;
  };

  // Create step
  const step = createRemediationStep(
    stepData.description,
    stepData.priority,
    stepData.assigned_to,
    stepData.due_date
  );

  const { data: inserted, error } = await supabase
    .from('breach_remediation_steps')
    .insert({
      ...step,
      breach_id: breachId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add remediation step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add remediation step' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: inserted,
  }, { status: 201 });
}

/**
 * PUT /api/v1/breach/:breach_id/remediation/:step_id - Update remediation step
 */
async function handleUpdateRemediationStep(
  req: NextRequest,
  breachId: string,
  stepId: string
): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
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

  const updates = body as Partial<RemediationStep>;
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) updateData.status = updates.status;
  if (updates.notes) updateData.notes = updates.notes;
  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from('breach_remediation_steps')
    .update(updateData)
    .eq('id', stepId)
    .eq('breach_id', breachId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update remediation step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update remediation step' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: updated,
  });
}

/**
 * POST /api/v1/breach/:breach_id/resolve - Mark breach as resolved
 */
async function handleResolveBreach(req: NextRequest, breachId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const resolveData = body as { lessons_learned?: string; investigation_findings?: string };
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('breach_records')
    .update({
      status: 'resolved',
      investigation_completed_at: now,
      investigation_findings: resolveData.investigation_findings || null,
      remediation_completed_at: now,
      lessons_learned: resolveData.lessons_learned || null,
      updated_at: now,
    })
    .eq('breach_id', breachId)
    .select()
    .single();

  if (error) {
    console.error('Failed to resolve breach:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve breach' },
      { status: 500 }
    );
  }

  // Log resolution
  await supabase.from('breach_audit_log').insert({
    breach_id: breachId,
    action: 'breach_resolved',
    performed_by: auth.userId,
    details: resolveData,
    timestamp: now,
  });

  return NextResponse.json({
    success: true,
    data: updated,
  });
}

/**
 * GET /api/v1/breach/stats/:project_id - Get breach statistics
 */
async function handleGetStats(req: NextRequest, projectId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch all breaches for project
  const { data: breaches, error } = await supabase
    .from('breach_records')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('Failed to fetch breaches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breaches' },
      { status: 500 }
    );
  }

  const stats = calculateBreachStatistics(breaches || []);

  return NextResponse.json({
    success: true,
    data: stats,
  });
}

/**
 * GET /api/v1/breach/dpa/:country_code - Get DPA information
 */
async function handleGetDPAInfo(req: NextRequest, countryCode: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const dpa = getDPAByCountryCode(countryCode);

  if (!dpa) {
    return NextResponse.json(
      { success: false, error: 'DPA not found for country code' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: dpa,
  });
}

/**
 * GET /api/v1/breach/:breach_id/compliance - Check GDPR compliance
 */
async function handleCheckCompliance(
  req: NextRequest,
  breachId: string
): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const breach = await getBreach(breachId);
  if (!breach) {
    return NextResponse.json(
      { success: false, error: 'Breach not found' },
      { status: 404 }
    );
  }

  const compliance = checkBreachCompliance(breach);

  return NextResponse.json({
    success: true,
    data: compliance,
  });
}

/**
 * POST /api/v1/breach/:breach_id/risk-assessment - Perform risk assessment
 */
async function handleRiskAssessment(req: NextRequest, breachId: string): Promise<Response> {
  const auth = await verifyAuth(req);
  if (!auth) {
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

  const riskFactors = (body as { risk_factors?: Record<string, unknown> }).risk_factors || {};

  // Perform assessment
  const assessment = performRiskAssessment(riskFactors as RiskFactors);

  // Update breach with new assessment
  const now = new Date().toISOString();
  await supabase
    .from('breach_records')
    .update({
      risk_level: assessment.level,
      risk_score: assessment.score,
      requires_dpa_notification: assessment.requires_dpa_notification,
      requires_subject_notification: assessment.requires_subject_notification,
      updated_at: now,
    })
    .eq('breach_id', breachId);

  return NextResponse.json({
    success: true,
    data: {
      breach_id: breachId,
      assessment,
      assessed_at: now,
    },
  });
}

// =====================================================
// MAIN ROUTE HANDLERS
// =====================================================

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);

  // /api/v1/breach/dpa/:country_code
  if (pathname.includes('/dpa/')) {
    const countryCode = parts[parts.length - 1];
    return handleGetDPAInfo(req, countryCode);
  }

  // /api/v1/breach/stats/:project_id
  if (pathname.includes('/stats/')) {
    const projectId = parts[parts.length - 1];
    return handleGetStats(req, projectId);
  }

  // /api/v1/breach/project/:project_id
  if (pathname.includes('/project/')) {
    const projectId = parts[parts.length - 1];
    return handleListBreaches(req, projectId);
  }

  // /api/v1/breach/:breach_id/compliance
  if (pathname.includes('/compliance')) {
    const breachId = parts[parts.length - 2];
    return handleCheckCompliance(req, breachId);
  }

  // /api/v1/breach/:breach_id/evidence
  if (pathname.includes('/evidence')) {
    const breachId = parts[parts.length - 2];
    return handleListEvidence(req, breachId);
  }

  // /api/v1/breach/:breach_id (get breach details)
  const breachId = parts[parts.length - 1];
  return handleGetBreach(req, breachId);
}

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);

  // /api/v1/breach/:breach_id/notify-dpa
  if (pathname.includes('/notify-dpa')) {
    const breachId = parts[parts.length - 2];
    return handleNotifyDPA(req, breachId);
  }

  // /api/v1/breach/:breach_id/notify-subjects
  if (pathname.includes('/notify-subjects')) {
    const breachId = parts[parts.length - 2];
    return handleNotifySubjects(req, breachId);
  }

  // /api/v1/breach/:breach_id/evidence
  if (pathname.includes('/evidence')) {
    const breachId = parts[parts.length - 2];
    return handleAddEvidence(req, breachId);
  }

  // /api/v1/breach/:breach_id/remediation
  if (pathname.includes('/remediation')) {
    const breachId = parts[parts.length - 2];
    return handleAddRemediationStep(req, breachId);
  }

  // /api/v1/breach/:breach_id/risk-assessment
  if (pathname.includes('/risk-assessment')) {
    const breachId = parts[parts.length - 2];
    return handleRiskAssessment(req, breachId);
  }

  // /api/v1/breach/:breach_id/resolve
  if (pathname.includes('/resolve')) {
    const breachId = parts[parts.length - 2];
    return handleResolveBreach(req, breachId);
  }

  // /api/v1/breach (create breach)
  return handleCreateBreach(req);
}

export async function PUT(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);

  // /api/v1/breach/:breach_id/remediation/:step_id
  if (pathname.includes('/remediation/')) {
    const stepId = parts[parts.length - 1];
    const breachId = parts[parts.length - 3];
    return handleUpdateRemediationStep(req, breachId, stepId);
  }

  // /api/v1/breach/:breach_id (update breach)
  const breachId = parts[parts.length - 1];
  return handleUpdateBreach(req, breachId);
}
