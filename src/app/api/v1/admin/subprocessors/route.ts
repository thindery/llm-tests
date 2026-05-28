/**
 * Admin Subprocessor API Routes
 * CRUD operations for subprocessor management
 * GET /api/v1/admin/subprocessors - List subprocessors
 * POST /api/v1/admin/subprocessors - Create subprocessor
 * PUT /api/v1/admin/subprocessors - Update subprocessor
 * DELETE /api/v1/admin/subprocessors - Delete subprocessor (soft delete via status)
 * 
 * Ticket: REMY-259
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types
interface Subprocessor {
  id?: string;
  name: string;
  legal_name?: string;
  website_url?: string;
  privacy_policy_url?: string;
  purpose: string;
  processing_activities: string[];
  data_categories: string[];
  headquarters_location: string;
  data_storage_locations: string[];
  jurisdiction: string;
  contract_status: 'pending' | 'draft' | 'signed' | 'under_review' | 'expired' | 'terminated';
  contract_signed_date?: string;
  contract_expiry_date?: string;
  dpa_version?: string;
  security_certifications: string[];
  security_measures: Record<string, unknown>;
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  access_controls?: string;
  audit_trail_available: boolean;
  gdpr_compliant: boolean;
  data_processing_agreement_signed: boolean;
  standard_contractual_clauses: boolean;
  binding_corporate_rules?: boolean;
  status: 'active' | 'pending_review' | 'deprecated' | 'terminated';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

// Validate subprocessor data
function validateSubprocessorData(data: unknown): { valid: boolean; error?: string; data?: Subprocessor } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  const d = data as Partial<Subprocessor>;

  // Required fields
  if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (!d.purpose || typeof d.purpose !== 'string' || d.purpose.trim().length === 0) {
    return { valid: false, error: 'Purpose is required' };
  }

  if (!d.headquarters_location || typeof d.headquarters_location !== 'string') {
    return { valid: false, error: 'Headquarters location is required' };
  }

  if (!d.jurisdiction || typeof d.jurisdiction !== 'string') {
    return { valid: false, error: 'Jurisdiction is required' };
  }

  // Validate arrays
  if (d.processing_activities && !Array.isArray(d.processing_activities)) {
    return { valid: false, error: 'Processing activities must be an array' };
  }

  if (d.data_categories && !Array.isArray(d.data_categories)) {
    return { valid: false, error: 'Data categories must be an array' };
  }

  if (d.data_storage_locations && !Array.isArray(d.data_storage_locations)) {
    return { valid: false, error: 'Data storage locations must be an array' };
  }

  if (d.security_certifications && !Array.isArray(d.security_certifications)) {
    return { valid: false, error: 'Security certifications must be an array' };
  }

  // Validate contract_status
  const validContractStatuses = ['pending', 'draft', 'signed', 'under_review', 'expired', 'terminated'];
  if (d.contract_status && !validContractStatuses.includes(d.contract_status)) {
    return { valid: false, error: 'Invalid contract status' };
  }

  // Validate status
  const validStatuses = ['active', 'pending_review', 'deprecated', 'terminated'];
  if (d.status && !validStatuses.includes(d.status)) {
    return { valid: false, error: 'Invalid status' };
  }

  return { valid: true, data: d as Subprocessor };
}

// Check if user is admin
async function isAdmin(req: Request): Promise<boolean> {
  // In production, verify JWT token and check role
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    // For development, allow mock auth
    return process.env.NODE_ENV === 'development';
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

  // Check if user has admin role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return userRole?.role === 'admin' || userRole?.role === 'service_role';
}

// GET - List subprocessors
async function handleListSubprocessors(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const gdprCompliant = url.searchParams.get('gdpr_compliant');
  const jurisdiction = url.searchParams.get('jurisdiction');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const perPage = parseInt(url.searchParams.get('per_page') || '50', 10);
  const includeDeprecated = url.searchParams.get('include_deprecated') === 'true';

  // Build query
  let query = supabase
    .from('subprocessors')
    .select('*', { count: 'exact' });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  } else if (!includeDeprecated) {
    query = query.eq('status', 'active');
  }

  if (gdprCompliant) {
    query = query.eq('gdpr_compliant', gdprCompliant === 'true');
  }

  if (jurisdiction) {
    query = query.ilike('jurisdiction', `%${jurisdiction}%`);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  // Ordering
  query = query.order('name', { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error.message,
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response: ApiResponse<Subprocessor[]> = {
    success: true,
    data: data || [],
    meta: {
      total: count || 0,
      page,
      per_page: perPage,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST - Create subprocessor
async function handleCreateSubprocessor(req: Request): Promise<Response> {
  // Check admin permissions
  const isAdminUser = await isAdmin(req);
  if (!isAdminUser) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized - Admin access required',
    };
    return new Response(JSON.stringify(response), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
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

  // Validate data
  const validation = validateSubprocessorData(body);
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

  const subprocessorData = validation.data!;

  // Get current user for created_by
  const { data: { user } } = await supabase.auth.getUser();

  // Prepare data
  const insertData = {
    ...subprocessorData,
    onboarded_at: subprocessorData.status === 'active' ? new Date().toISOString() : null,
    created_by: user?.id,
    updated_by: user?.id,
  };

  const { data, error } = await supabase
    .from('subprocessors')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error.message,
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response: ApiResponse<Subprocessor> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT - Update subprocessor
async function handleUpdateSubprocessor(req: Request): Promise<Response> {
  // Check admin permissions
  const isAdminUser = await isAdmin(req);
  if (!isAdminUser) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized - Admin access required',
    };
    return new Response(JSON.stringify(response), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
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

  const data = body as { id?: string } & Partial<Subprocessor>;

  if (!data.id) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Subprocessor ID is required',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  // Get current user for updated_by
  const { data: { user } } = await supabase.auth.getUser();

  // Prepare update data
  const updateData: Partial<Subprocessor> & { updated_at: string; updated_by?: string } = {
    ...data,
    updated_at: new Date().toISOString(),
    updated_by: user?.id,
  };

  // Remove id from update data
  delete (updateData as { id?: string }).id;

  // Handle status change timestamps
  if (data.status === 'active' && !data.id) {
    (updateData as { onboarded_at?: string }).onboarded_at = new Date().toISOString();
  }

  if (data.status === 'deprecated' || data.status === 'terminated') {
    (updateData as { deprecated_at?: string }).deprecated_at = new Date().toISOString();
  }

  const { data: result, error } = await supabase
    .from('subprocessors')
    .update(updateData)
    .eq('id', data.id)
    .select()
    .single();

  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error.message,
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response: ApiResponse<Subprocessor> = {
    success: true,
    data: result,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// DELETE - Remove subprocessor (soft delete)
async function handleDeleteSubprocessor(req: Request): Promise<Response> {
  // Check admin permissions
  const isAdminUser = await isAdmin(req);
  if (!isAdminUser) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized - Admin access required',
    };
    return new Response(JSON.stringify(response), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Subprocessor ID is required',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Soft delete by updating status
  const { data, error } = await supabase
    .from('subprocessors')
    .update({
      status: 'deprecated',
      deprecated_at: new Date().toISOString(),
      deprecated_reason: url.searchParams.get('reason') || 'Administrative removal',
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error.message,
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response: ApiResponse<Subprocessor> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Main handler - route to appropriate sub-handler
export async function GET(req: Request): Promise<Response> {
  // Check auth
  const isAdminUser = await isAdmin(req);
  if (!isAdminUser) {
    const response: ApiResponse<never> = {
      success: false,
      error: 'Unauthorized',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return handleListSubprocessors(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleCreateSubprocessor(req);
}

export async function PUT(req: Request): Promise<Response> {
  return handleUpdateSubprocessor(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handleDeleteSubprocessor(req);
}
