/**
 * Event Batch API - Process multiple events with consent filtering
 * POST /api/v1/events/batch
 * Ticket: REMY-258
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ConsentType } from '@/lib/consent/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function checkUserConsent(projectId: string, userId: string, consentType: ConsentType): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('consent_records')
      .select('consent_granted, consent_timestamp, withdrawal_timestamp')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .order('consent_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;
    if (data.withdrawal_timestamp) return false;
    if (!data.consent_granted) return false;
    
    // Check expiration
    const expirationDays = 365;
    const expirationDate = new Date(data.consent_timestamp);
    expirationDate.setDate(expirationDate.getDate() + expirationDays);
    
    return new Date() < expirationDate;
  } catch (error) {
    console.error('Consent check error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];
    
    const projectId = req.headers.get('X-Project-ID') || body.project_id;
    const userId = req.headers.get('X-User-ID') || body.user_id || 'anonymous';
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'X-Project-ID header required' },
        { status: 400 }
      );
    }

    const results = {
      success_count: 0,
      rejected_count: 0,
      failed_count: 0,
      rejected_events: [] as any[],
    };

    for (const event of events) {
      try {
        const consentType = EVENT_CONSENT_MAP[event.event_type];
        
        if (consentType) {
          const hasConsent = await checkUserConsent(projectId, userId, consentType);
          
          if (!hasConsent) {
            results.rejected_count++;
            results.rejected_events.push({
              event_type: event.event_type,
              reason: 'consent_not_granted_or_withdrawn',
            });
            continue;
          }
        }

        // Store event
        const { error } = await supabase.from('events').insert({
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
          consent_valid: !!consentType,
          consent_type: consentType || null,
          consent_timestamp: event.consent_timestamp || new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        results.success_count++;

      } catch (error) {
        console.error('Event processing error:', error);
        results.failed_count++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      ...results,
      message: `Processed ${events.length} events: ${results.success_count} stored, ${results.rejected_count} rejected (no consent), ${results.failed_count} failed` 
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch' },
      { status: 500 }
    );
  }
}