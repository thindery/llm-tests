/**
 * Events API Route with GDPR Consent Filtering
 * POST /api/v1/events - Receive events with consent validation
 * POST /api/v1/events/batch - Batch event processing
 * GET /api/v1/events/sessions - Session management
 * Ticket: REMY-258
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  canProcessEvent, 
  getConsentTypeForEvent,
  ConsentType,
} from '@/lib/consent/utils';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Event types and their required consent
const EVENT_CONSENT_MAP: Record<string, ConsentType> = {
  'page_view': 'analytics',
  'click': 'analytics',
  'scroll': 'analytics',
  'custom_event': 'analytics',
  'form_submit': 'functional',
  'track_conversion': 'marketing',
  'personalization': 'marketing',
  'ad_impression': 'marketing',
  'user_identify': 'functional',
};

/**
 * Check consent status for a user
 */
async function checkUserConsent(projectId: string, userId: string, consentType: ConsentType): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .is('withdrawal_timestamp', null)
      .order('consent_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;
    
    // Check if still valid (not expired)
    const consentExpirationDays = 365; // Could be configurable
    const expirationDate = new Date(data.consent_timestamp);
    expirationDate.setDate(expirationDate.getDate() + consentExpirationDays);
    
    return data.consent_granted && new Date() < expirationDate;
  } catch (error) {
    console.error('Error checking consent:', error);
    return false;
  }
}

/**
 * Store event with consent validation
 */
async function storeEvent(event: any, projectId: string, userId: string) {
  const consentType = EVENT_CONSENT_MAP[event.event_type];
  
  // Check if event requires consent
  if (consentType) {
    const hasConsent = await checkUserConsent(projectId, userId, consentType);
    
    if (!hasConsent) {
      // Log rejection for audit
      await supabase.from('event_rejections').insert({
        project_id: projectId,
        user_id: userId,
        event_type: event.event_type,
        reason: 'consent_not_granted',
        timestamp: new Date().toISOString(),
      });
      
      return { allowed: false, reason: 'consent_not_granted' };
    }
    
    // Add consent metadata to event
    event.consent_valid = true;
    event.consent_type = consentType;
  }

  // Store the event
  const { data, error } = await supabase
    .from('events')
    .insert({
      project_id: projectId,
      user_id: userId,
      session_id: event.session_id,
      event_type: event.event_type,
      event_subtype: event.event_subtype,
      timestamp_ms: event.timestamp_ms,
      data: event.data,
      x: event.x,
      y: event.y,
      selector: event.selector,
      legal_basis_id: event.legal_basis_id,
      consent_valid: event.consent_valid || false,
      consent_type: event.consent_type || null,
      consent_timestamp: event.consent_timestamp || null,
      created_at: new Date().toISOString(),
    });

  if (error) throw error;
  
  return { allowed: true, data };
}

/**
 * Create session with consent status
 */
async function createSession(body: any) {
  const { project_id, user_id, consent_status, source_url, user_agent } = body;

  // Determine if we can create session based on consent
  const hasAnalytics = consent_status?.analytics === true;
  const hasFunctional = consent_status?.functional === true;
  
  // Can create session if at least functional consent
  if (!hasFunctional && !hasAnalytics) {
    return { success: false, error: 'No valid consent for session creation' };
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      project_id,
      user_id,
      consent_analytics: hasAnalytics,
      consent_functional: hasFunctional,
      consent_marketing: consent_status?.marketing === true,
      source_url,
      user_agent,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Session creation error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

// POST /api/v1/events/batch - Process batch events
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Check for batch endpoint
    if (pathname.includes('/batch')) {
      const body = await req.json();
      const events = body.events || [];
      
      // Get project/user from headers
      const projectId = req.headers.get('X-Project-ID');
      const userId = req.headers.get('X-User-ID') || 'anonymous';
      
      if (!projectId) {
        return NextResponse.json(
          { success: false, error: 'X-Project-ID header required' },
          { status: 400 }
        );
      }

      const results = {
        success_count: 0,
        failed_count: 0,
        rejected_count: 0,
        rejected_events: [] as string[],
      };

      for (const event of events) {
        try {
          const result = await storeEvent(event, projectId, userId);
          
          if (result.allowed) {
            results.success_count++;
          } else {
            results.rejected_count++;
            results.rejected_events.push(event.event_type);
          }
        } catch (error) {
          results.failed_count++;
          console.error('Event storage error:', error);
        }
      }

      return NextResponse.json({ success: true, ...results });
    }

    // Single event
    const body = await req.json();
    const projectId = req.headers.get('X-Project-ID') || body.project_id;
    const userId = req.headers.get('X-User-ID') || body.user_id || 'anonymous';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID required' },
        { status: 400 }
      );
    }

    const result = await storeEvent(body, projectId, userId);
    
    if (!result.allowed) {
      return NextResponse.json(
        { success: false, error: 'Event rejected: ' + result.reason },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/v1/events - List events (with consent filtering)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');
    const userId = url.searchParams.get('user_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('events')
      .select('*')
      .eq('project_id', projectId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filter out events without valid consent
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Events GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}