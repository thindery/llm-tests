import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET /api/v1/processing/export/csv?project_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch processing activities with legal basis
    const { data: activities, error } = await supabase
      .from('processing_activities')
      .select(`
        *,
        legal_basis:legal_basis_id (*)
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching processing activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch processing activities' },
        { status: 500 }
      );
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json(
        { error: 'No processing activities found' },
        { status: 404 }
      );
    }

    // Generate CSV content
    const headers = [
      'Activity Name',
      'Purpose',
      'Legal Basis Type',
      'Legal Basis Name',
      'Data Categories',
      'Retention Days',
      'Recipients',
      'Safeguards',
      'Created At'
    ];

    const rows = activities.map((activity: any) => [
      escapeCSV(activity.name),
      escapeCSV(activity.purpose),
      escapeCSV(activity.legal_basis?.basis_type || 'N/A'),
      escapeCSV(activity.legal_basis?.name || 'N/A'),
      escapeCSV(activity.data_categories?.join('; ') || ''),
      activity.data_retention_days?.toString() || 'N/A',
      escapeCSV(activity.recipients || ''),
      escapeCSV(activity.safeguards || ''),
      escapeCSV(new Date(activity.created_at).toISOString())
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Return CSV with proper headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gdpr_ropa_${projectId}_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/v1/processing/export/csv:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, newline, or quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
