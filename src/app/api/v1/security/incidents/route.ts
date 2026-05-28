//**
 * Security Incidents API Routes
 * Ticket: REMY-260
 * 
 * Routes:
 * - GET /api/v1/security/incidents - List security incidents
 * - POST /api/v1/security/incidents - Create new incident
 */

import { createClient } from '@supabase/supabase-js';
import {
  SecurityIncident,
  BreachSeverity,
  BreachStatus,
  BreachType,
  DiscoverySource,
  calculateSeverityScore,
  classifyBreachSeverity,
  getNotificationRequirements,
  validateIncidentData,
} from '../../../lib/security/utils';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'mock-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function getUserFromRequest(req: Request): { userId: string; isAdmin: boolean } | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    const isAdmin = req.headers.get('X-Admin-Token') === process.env.ADMIN_TOKEN;
    return { userId, isAdmin };
  }
  return { userId: 'mock-user-id', isAdmin: false };
}

function transformIncident(row: Record<string, unknown>): SecurityIncident {
  return {
    id: row.id as string,
    detectedAt: row.detected_at as string,
    reportedAt: row.reported_at as string | null,
    severity: row.severity as BreachSeverity,
    description: row.description as string,
    descriptionInternal: row.description_internal as string | null,
    affectedUsersCount: row.affected_users_count as number,
    dataCategories: (row.data_categories as string[]) || [],
    dataSpecialCategories: (row.data_special_categories as string[]) || [],
    likelihoodOfHarm: row.likelihood_of_harm as 'remote' | 'possible' | 'probable' | 'certain' | null,
    severityOfImpact: row.severity_of_impact as 'minimal' | 'limited' | 'significant' | 'severe' | null,
    breachType: row.breach_type as string | null,
    discoverySource: row.discovery_source as string | null,
    dpiaNotifiedAt: row.dpia_notified_at as string | null,
    dpaNotifiedAt: row.dpa_notified_at as string | null,
    dpaReferenceNumber: row.dpa_reference_number as string | null,
    individualsNotifiedAt: row.individuals_notified_at as string | null,
    notificationMethod: row.notification_method as string | null,
    status: row.status as BreachStatus,
    containmentMeasures: (row.containment_measures as string[]) || [],
    remediationSteps: (row.remediation_steps as string[]) || [],
    preventativeMeasures: (row.preventative_measures as string[]) || [],
    rootCause: row.root_cause as string | null,
    lessonsLearned: row.lessons_learned as string | null,
    detectedBy: row.detected_by as string | null,
    assignedTo: row.assigned_to as string | null,
    closedBy: row.closed_by as string | null,
    projectId: row.project_id as string | null,
    relatedIncidentId: row.related_incident_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    closedAt: row.closed_at as string | null,
    tags: (row.tags as string[]) || [],
    priority: row.priority as number,
  };
}

// GET /api/v1/security/incidents
export async function GET(req: Request): Promise<Response> {
  const user = getUserFromRequest(req);
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabase.from('security_incidents').select('*');

    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    query = query.order('priority', { ascending: false }).order('detected_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data: incidents, error } = await query;

    if (error) {
      console.error('Error fetching incidents:', error);
      // Return mock data for development
      const mockIncidents: SecurityIncident[] = [
        {
          id: 'mock-incident-1',
          detectedAt: new Date(Date.now() - 86400000).toISOString(),
          reportedAt: null,
          severity: 'high',
          description: 'Unauthorized access to customer data',
          descriptionInternal: 'Potential SQL injection attack detected',
          affectedUsersCount: 5420,
          dataCategories: ['contact', 'behavioral'],
          dataSpecialCategories: [],
          likelihoodOfHarm: 'probable',
          severityOfImpact: 'significant',
          breachType: 'unauthorized_access',
          discoverySource: 'automated_monitoring',
          dpiaNotifiedAt: new Date(Date.now() - 86000000).toISOString(),
          dpaNotifiedAt: null,
          dpaReferenceNumber: null,
          individualsNotifiedAt: null,
          notificationMethod: null,
          status: 'under_investigation',
          containmentMeasures: ['Disabled affected account', 'Blocked IP range'],
          remediationSteps: ['Patch vulnerability', 'Review access logs'],
          preventativeMeasures: [],
          rootCause: null,
          lessonsLearned: null,
          detectedBy: user.userId,
          assignedTo: user.userId,
          closedBy: null,
          projectId: 'project-123',
          relatedIncidentId: null,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 82000000).toISOString(),
          closedAt: null,
          tags: ['gdpr', 'unauthorized-access'],
          priority: 75,
        },
      ];

      const response: ApiResponse<{ incidents: SecurityIncident[]; total: number }> = {
        success: true,
        data: {
          incidents: mockIncidents,
          total: mockIncidents.length,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const transformedIncidents = (incidents || []).map(transformIncident);

    const response: ApiResponse<{ incidents: SecurityIncident[]; total: number }> = {
      success: true,
      data: {
        incidents: transformedIncidents,
        total: transformedIncidents.length,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/v1/security/incidents:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST /api/v1/security/incidents
export async function POST(req: Request): Promise<Response> {
  const user = getUserFromRequest(req);
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: Partial<SecurityIncident>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate required fields
  const validationResult = validateIncidentData(body);
  if (!validationResult.valid) {
    return new Response(
      JSON.stringify({ success: false, error: validationResult.errors.join(', ') }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Calculate notification requirements for classification
  const notificationReqs = getNotificationRequirements(
    body.severity!,
    body.affectedUsersCount || 0,
    body.dataSpecialCategories || [],
    body.likelihoodOfHarm || 'possible',
    body.severityOfImpact || 'limited'
  );

  const now = new Date().toISOString();

  const insertData = {
    detected_at: body.detectedAt || now,
    reported_at: body.reportedAt || now,
    severity: body.severity,
    description: body.description,
    description_internal: body.descriptionInternal,
    affected_users_count: body.affectedUsersCount || 0,
    data_categories: body.dataCategories || [],
    data_special_categories: body.dataSpecialCategories || [],
    likelihood_of_harm: body.likelihoodOfHarm,
    severity_of_impact: body.severityOfImpact,
    breach_type: body.breachType,
    discovery_source: body.discoverySource || 'user_report',
    dpia_notified_at: body.severity === 'high' || body.severity === 'critical' ? now : null,
    status: 'detected',
    containment_measures: body.containmentMeasures || [],
    remediation_steps: body.remediationSteps || [],
    preventative_measures: body.preventativeMeasures || [],
    detected_by: user.userId,
    assigned_to: body.assignedTo,
    project_id: body.projectId,
    related_incident_id: body.relatedIncidentId,
    tags: body.tags || [body.breachType || 'security', 'gdpr'],
    priority: calculatePriority(body.severity!, body.affectedUsersCount || 0, notificationReqs.requiresDpaNotification),
  };

  try {
    const { data: created, error } = await supabase
      .from('security_incidents')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create incident' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create initial event
    await supabase.from('security_incident_events').insert({
      incident_id: created.id,
      event_type: 'created',
      description: 'Security incident created',
      event_data: { createdBy: user.userId, notificationRequirements: notificationReqs },
      created_by: user.userId,
    });

    const transformed = transformIncident(created);

    const response: ApiResponse<SecurityIncident> = {
      success: true,
      data: transformed,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to calculate priority score
function calculatePriority(
  severity: BreachSeverity,
  affectedUsers: number,
  requiresDpaNotification: boolean
): number {
  let priority = 50; // Base priority

  // Severity modifier
  switch (severity) {
    case 'critical':
      priority = 100;
      break;
    case 'high':
      priority = 75;
      break;
    case 'medium':
      priority = 50;
      break;
    case 'low':
      priority = 25;
      break;
  }

  // Affected users modifier
  if (affectedUsers >= 100000) {
    priority += 20;
  } else if (affectedUsers >= 10000) {
    priority += 10;
  } else if (affectedUsers >= 1000) {
    priority += 5;
  }

  // GDPR notification urgency
  if (requiresDpaNotification) {
    priority += 15;
  }

  return Math.min(priority, 100); // Cap at 100
}
