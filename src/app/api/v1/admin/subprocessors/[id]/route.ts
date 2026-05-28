/**
 * Individual Subprocessor API
 * GET /api/v1/admin/subprocessors/{id}
 * GET /api/v1/admin/subprocessors/{id}/audit-log
 * 
 * Ticket: REMY-259
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Verify admin access
async function verifyAccess(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  
  if (process.env.NODE_ENV === 'development' && !authHeader) {
    return true;
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  
  // Check for service role
  if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return true;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return false;
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return ['admin', 'service_role', 'dpo'].includes(userRole?.role);
}

// GET - Get subprocessor by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const url = new URL(req.url);
  const includeAuditLog = url.searchParams.get('include_audit') === 'true';

  // Verify access
  const authorized = await verifyAccess(req);
  if (!authorized) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = await createClient();

  // Get subprocessor
  const { data: subprocessor, error } = await supabase
    .from('subprocessors')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !subprocessor) {
    const response: ApiResponse<never> = {
      success: false,
      error: error?.message || 'Subprocessor not found',
    };
    return new Response(JSON.stringify(response), {
      status: error?.code === 'PGRST116' ? 404 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let auditLog = null;

  // Get audit log if requested
  if (includeAuditLog) {
    const { data: auditData } = await supabase
      .from('subprocessor_audit_log')
      .select('*')
      .eq('subprocessor_id', id)
      .order('performed_at', { ascending: false })
      .limit(50);

    auditLog = auditData;
  }

  const response: ApiResponse<unknown> = {
    success: true,
    data: {
      ...subprocessor,
      audit_log: auditLog,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
