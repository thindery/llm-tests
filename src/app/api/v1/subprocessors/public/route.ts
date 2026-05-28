/**
 * Public Subprocessor API
 * GET /api/v1/subprocessors/public
 * 
 * Returns publicly disclosable subprocessor information
 * for GDPR Article 28 transparency requirements.
 * 
 * No authentication required - this is public data.
 * 
 * Ticket: REMY-259
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PublicSubprocessor {
  id: string;
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
  security_certifications: string[];
  gdpr_compliant: boolean;
  standard_contractual_clauses: boolean;
  data_processing_agreement_signed: boolean;
  onboarded_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    last_updated: string;
    version: string;
  };
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const jurisdiction = url.searchParams.get('jurisdiction');


  // Build query - only active subprocessors for public disclosure
  let query = supabase
    .from('subprocessors')
    .select('*')
    .eq('status', 'active')
    .order('name');

  // Optional jurisdiction filter
  if (jurisdiction) {
    query = query.ilike('jurisdiction', `%${jurisdiction}%`);
  }

  const { data: subprocessors, error } = await query;

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

  // Map to public-safe format
  const publicData: PublicSubprocessor[] = (subprocessors || []).map(s => ({
    id: s.id,
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
    security_certifications: s.security_certifications || [],
    gdpr_compliant: s.gdpr_compliant || false,
    standard_contractual_clauses: s.standard_contractual_clauses || false,
    data_processing_agreement_signed: s.data_processing_agreement_signed || false,
    onboarded_at: s.onboarded_at,
  }));

  const lastUpdated = subprocessors?.length > 0
    ? subprocessors.reduce((latest, s) => {
        const sDate = new Date(s.updated_at || s.created_at || 0);
        return sDate > latest ? sDate : latest;
      }, new Date(0)).toISOString()
    : new Date().toISOString();

  const response: ApiResponse<PublicSubprocessor[]> = {
    success: true,
    data: publicData,
    meta: {
      total: publicData.length,
      last_updated: lastUpdated,
      version: '1.0.0',
    },
  };

  // Handle different response formats
  switch (format) {
    case 'csv':
      return exportAsCSV(publicData, lastUpdated);
    case 'json':
    default:
      return exportAsJSON(response);
  }
}

function exportAsJSON(response: ApiResponse<PublicSubprocessor[]>): Response {
  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function exportAsCSV(data: PublicSubprocessor[], lastUpdated: string): Response {
  const filename = `subprocessors-${new Date().toISOString().split('T')[0]}.csv`;
  
  const headers = [
    'Name',
    'Legal Name',
    'Website',
    'Privacy Policy',
    'Purpose',
    'Processing Activities',
    'Data Categories',
    'Headquarters',
    'Data Storage Locations',
    'Jurisdiction',
    'Security Certifications',
    'GDPR Compliant',
    'DPA Signed',
    'Standard Contractual Clauses',
  ].join(',');

  const rows = data.map(s => {
    const values = [
      s.name,
      s.legal_name || '',
      s.website_url || '',
      s.privacy_policy_url || '',
      s.purpose,
      (s.processing_activities || []).join('; '),
      (s.data_categories || []).join('; '),
      s.headquarters_location,
      (s.data_storage_locations || []).join('; '),
      s.jurisdiction,
      (s.security_certifications || []).join('; '),
      s.gdpr_compliant ? 'Yes' : 'No',
      s.data_processing_agreement_signed ? 'Yes' : 'No',
      s.standard_contractual_clauses ? 'Yes' : 'No',
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

  // Add metadata row
  const metadataRow = [
    `# Export Date: ${new Date().toISOString()}`,
    `# Last Updated: ${lastUpdated}`,
    `# Total Subprocessors: ${data.length}`,
  ].join('\n');

  const csv = `${metadataRow}\n${headers}\n${rows.join('\n')}`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Revalidate every hour
export const revalidate = 3600;
