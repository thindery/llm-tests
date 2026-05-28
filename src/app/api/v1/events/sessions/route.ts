/**
 * Session API with Consent Support
 * POST /api/v1/events/sessions - Create new session
 * POST /api/v1/events/sessions/{id}/end - End session
 * Ticket: REMY-258
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      project_id, 
      user_id, 
      consent_status,
      source_url, 
      user_agent 
    } = body;

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: 'project_id required' },
        { status: 400 }
      );
    }

    // Check if we have at least one consent type granted
    const hasConsent = Object.values(consent_status || {}).some(v => v === true);
    
    // Create session record
    const sessionId = randomUUID();
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        project_id,
        user_id: user_id || 'anonymous',
        consent_analytics: consent_status?.analytics || false,
        consent_functional: consent_status?.functional || false,
        consent_marketing: consent_status?.marketing || false,
        source_url: source_url || null,
        user_agent: user_agent || null,
        started_at: new Date().toISOString(),
        has_valid_consent: hasConsent,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Session creation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      id: data.id,
      message: 'Session created with consent tracking'
    });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}