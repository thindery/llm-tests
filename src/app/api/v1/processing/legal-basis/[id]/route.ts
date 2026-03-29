import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET /api/v1/processing/legal-basis/{id}?project_id=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const { id } = params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('legal_basis')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Legal basis not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching legal basis:', error);
      return NextResponse.json(
        { error: 'Failed to fetch legal basis' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/v1/processing/legal-basis/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/processing/legal-basis/{id}?project_id=xxx
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const { id } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Validate legitimate_interest_reason if basis_type is being changed
    if (body.basis_type === 'legitimate_interest' && 
        body.legitimate_interest_reason !== undefined &&
        !body.legitimate_interest_reason?.trim()) {
      return NextResponse.json(
        { error: 'legitimate_interest_reason is required for legitimate_interest basis type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('legal_basis')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating legal basis:', error);
      return NextResponse.json(
        { error: 'Failed to update legal basis' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/v1/processing/legal-basis/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/processing/legal-basis/{id}?project_id=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const { id } = params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Check if legal basis is being used by any processing activities
    const { data: activities, error: checkError } = await supabase
      .from('processing_activities')
      .select('id')
      .eq('legal_basis_id', id)
      .is('deleted_at', null)
      .limit(1);

    if (checkError) {
      console.error('Error checking processing activities:', checkError);
      return NextResponse.json(
        { error: 'Failed to check dependencies' },
        { status: 500 }
      );
    }

    if (activities && activities.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete legal basis that is in use by processing activities' },
        { status: 409 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from('legal_basis')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting legal basis:', error);
      return NextResponse.json(
        { error: 'Failed to delete legal basis' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/v1/processing/legal-basis/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
