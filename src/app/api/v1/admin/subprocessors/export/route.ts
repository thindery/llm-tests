/**
 * Subprocessor Export API
 * GET /api/v1/admin/subprocessors/export
 * 
 * Returns complete subprocessor inventory for:
 * - GDPR Article 28 compliance audits
 * - Data Protection Authority inspections
 * - Customer due diligence requests
 * 
 * Ticket: REMY-259
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SubprocessorExport {
  export_metadata: {
    generated_at: string;
    format_version: string;
    total_subprocessors: number;
    active_subprocessors: number;
    gdpr_compliant_count: number;
    export_type: 'full' | 'public' | 'audit';
  };
  organization: {
    name: string;
    dpo_contact?: string;
    last_updated: string;
  };
  subprocessors: Array<{
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
    contract_status: string;
    contract_signed_date?: string;
    contract_expiry_date?: string;
    dpa_version?: string;
    security_certifications: string[];
    security_measures: Record<string, unknown>;
    encryption_at_rest: boolean;
    encryption_in_transit: boolean;
    audit_trail_available: boolean;
    gdpr_compliant: boolean;
    data_processing_agreement_signed: boolean;
    standard_contractual_clauses: boolean;
    binding_corporate_rules?: boolean;
    status: string;
    onboarded_at?: string;
    notes?: string;
  }>;
  compliance_summary: {
    total_active: number;
    with_signed_dpa: number;
    with_sccs: number;
    gdpr_compliant: number;
    by_jurisdiction: Record<string, number>;
    security_certifications: Record<string, number>;
    contracts_expiring_soon: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Verify admin access
async function verifyAccess(req: Request): Promise<{ authorized: boolean; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  
  // In development, allow access
  if (process.env.NODE_ENV === 'development' && !authHeader) {
    return { authorized: true };
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false };
  }

  // Check admin role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const isAuthorized = ['admin', 'service_role', 'dpo'].includes(userRole?.role);
  return { authorized: isAuthorized, userId: user.id };
}

// GET - Export subprocessors
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const exportType = (url.searchParams.get('type') || 'full') as 'full' | 'public' | 'audit';

  // Verify access
  const { authorized, userId } = await verifyAccess(req);
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


  // Build query based on export type
  let query = supabase.from('subprocessors').select('*');

  switch (exportType) {
    case 'public':
      // Public export: only active subprocessors with limited fields
      query = query.eq('status', 'active');
      break;
    case 'audit':
      // Audit export: all subprocessors including deprecated
      // No filter applied
      break;
    case 'full':
    default:
      // Full export: active + pending review
      query = query.in('status', ['active', 'pending_review']);
      break;
  }

  const { data: subprocessors, error } = await query.order('name');

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

  // Calculate compliance summary
  const activeCount = subprocessors?.filter(s => s.status === 'active').length || 0;
  const withDpa = subprocessors?.filter(s => s.data_processing_agreement_signed).length || 0;
  const withSccs = subprocessors?.filter(s => s.standard_contractual_clauses).length || 0;
  const gdprCompliant = subprocessors?.filter(s => s.gdpr_compliant).length || 0;

  // Jurisdiction breakdown
  const byJurisdiction: Record<string, number> = {};
  subprocessors?.forEach(s => {
    if (s.status === 'active') {
      byJurisdiction[s.jurisdiction] = (byJurisdiction[s.jurisdiction] || 0) + 1;
    }
  });

  // Security certifications breakdown
  const certCounts: Record<string, number> = {};
  subprocessors?.forEach(s => {
    s.security_certifications?.forEach((cert: string) => {
      certCounts[cert] = (certCounts[cert] || 0) + 1;
    });
  });

  // Contracts expiring in 90 days
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
  const expiringSoon = subprocessors?.filter(s => {
    if (!s.contract_expiry_date) return false;
    const expiry = new Date(s.contract_expiry_date);
    return expiry <= ninetyDaysFromNow && expiry > new Date();
  }).length || 0;

  const exportData: SubprocessorExport = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      format_version: '1.0.0',
      total_subprocessors: subprocessors?.length || 0,
      active_subprocessors: activeCount,
      gdpr_compliant_count: gdprCompliant,
      export_type: exportType,
    },
    organization: {
      name: process.env.ORGANIZATION_NAME || 'Your Organization',
      dpo_contact: process.env.DPO_EMAIL,
      last_updated: subprocessors?.reduce((latest, s) => {
        const sDate = new Date(s.updated_at || s.created_at || 0);
        return sDate > latest ? sDate : latest;
      }, new Date(0)).toISOString() || new Date().toISOString(),
    },
    subprocessors: (subprocessors || []).map(s => ({
      name: s.name,
      legal_name: s.legal_name,
      website_url: s.website_url,
      privacy_policy_url: s.privacy_policy_url,
      purpose: s.purpose,
      processing_activities: s.processing_activities || [],
      data_categories: s.data_categories || [],
      headquarters_location: s.headquarters_location,
      data_storage_locations: s.data_storage_locations || [],
      jurisdiction: s.jurisdiction,
      contract_status: s.contract_status,
      contract_signed_date: s.contract_signed_date,
      contract_expiry_date: s.contract_expiry_date,
      dpa_version: s.dpa_version,
      security_certifications: s.security_certifications || [],
      security_measures: s.security_measures || {},
      encryption_at_rest: s.encryption_at_rest || false,
      encryption_in_transit: s.encryption_in_transit || false,
      audit_trail_available: s.audit_trail_available || false,
      gdpr_compliant: s.gdpr_compliant || false,
      data_processing_agreement_signed: s.data_processing_agreement_signed || false,
      standard_contractual_clauses: s.standard_contractual_clauses || false,
      binding_corporate_rules: s.binding_corporate_rules,
      status: s.status,
      onboarded_at: s.onboarded_at,
      notes: exportType === 'audit' ? s.notes : undefined, // Only include notes in audit exports
    })),
    compliance_summary: {
      total_active: activeCount,
      with_signed_dpa: withDpa,
      with_sccs: withSccs,
      gdpr_compliant: gdprCompliant,
      by_jurisdiction: byJurisdiction,
      security_certifications: certCounts,
      contracts_expiring_soon: expiringSoon,
    },
  };

  // Handle different formats
  switch (format) {
    case 'csv':
      return exportAsCSV(exportData);
    case 'json':
    default:
      return exportAsJSON(exportData);
  }
}

function exportAsJSON(data: SubprocessorExport): Response {
  const filename = `subprocessor-inventory-${new Date().toISOString().split('T')[0]}.json`;
  
  const response: ApiResponse<SubprocessorExport> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function exportAsCSV(data: SubprocessorExport): Response {
  const filename = `subprocessor-inventory-${new Date().toISOString().split('T')[0]}.csv`;
  
  // CSV headers
  const headers = [
    'Name',
    'Legal Name',
    'Website',
    'Purpose',
    'Processing Activities',
    'Data Categories',
    'Headquarters',
    'Data Storage Locations',
    'Jurisdiction',
    'Contract Status',
    'Contract Signed Date',
    'Contract Expiry Date',
    'DPA Version',
    'Security Certifications',
    'Encryption at Rest',
    'Encryption in Transit',
    'GDPR Compliant',
    'DPA Signed',
    'Standard Contractual Clauses',
    'Status',
    'Onboarded At',
  ].join(',');

  // CSV rows
  const rows = data.subprocessors.map(s => {
    const values = [
      s.name,
      s.legal_name || '',
      s.website_url || '',
      s.purpose,
      (s.processing_activities || []).join('; '),
      (s.data_categories || []).join('; '),
      s.headquarters_location,
      (s.data_storage_locations || []).join('; '),
      s.jurisdiction,
      s.contract_status,
      s.contract_signed_date || '',
      s.contract_expiry_date || '',
      s.dpa_version || '',
      (s.security_certifications || []).join('; '),
      s.encryption_at_rest ? 'Yes' : 'No',
      s.encryption_in_transit ? 'Yes' : 'No',
      s.gdpr_compliant ? 'Yes' : 'No',
      s.data_processing_agreement_signed ? 'Yes' : 'No',
      s.standard_contractual_clauses ? 'Yes' : 'No',
      s.status,
      s.onboarded_at || '',
    ];

    // Escape values for CSV
    return values.map(v => {
      const str = String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
