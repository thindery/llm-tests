/**
 * Subprocessors API Routes
 * GET /api/v1/subprocessors - List all active subprocessors
 * Ticket: REMY-259
 */

import { NextRequest, NextResponse } from 'next/server';

interface Subprocessor {
  id: string;
  name: string;
  legal_name: string | null;
  service_provided: string;
  service_category: string;
  location: string;
  data_center_locations: string[] | null;
  data_types: string[];
  data_sensitivity: string;
  security_certifications: string[] | null;
  contract_status: string;
  dpa_signed: boolean;
  scc_signed: boolean;
  transfer_mechanism: string | null;
  vendor_privacy_url: string | null;
  vendor_security_url: string | null;
  vendor_dpa_url: string | null;
  annual_review_date: string | null;
  created_at: string;
}

interface SubprocessorCategory {
  category: string;
  description: string;
  subprocessors: Subprocessor[];
}

const categoryDescriptions: Record<string, string> = {
  hosting: 'Cloud infrastructure and compute services',
  storage: 'Object storage and data persistence',
  database: 'Database management systems and authentication',
  cdn: 'Content delivery networks and edge caching',
  monitoring: 'Application monitoring and error tracking',
  analytics: 'Product analytics and reporting',
};

const transferSafeguards = [
  'Standard Contractual Clauses (2021 EU version)',
  'Adequacy decisions where applicable',
  'Binding Corporate Rules (BCRs) where applicable',
  'Additional technical measures: TLS 1.3 encryption in transit',
  'AES-256 encryption at rest',
  'IP anonymization options',
  'Field-level data masking',
];

const mockSubprocessors: Subprocessor[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Railway',
    legal_name: 'Railway Technologies Inc.',
    service_provided: 'Cloud hosting and compute infrastructure for application deployment',
    service_category: 'hosting',
    location: 'United States',
    data_center_locations: ['US West (California)', 'US East (Virginia)', 'EU West (Amsterdam)'],
    data_types: ['Infrastructure metadata', 'Application logs', 'System metrics'],
    data_sensitivity: 'standard',
    security_certifications: ['SOC 2 Type II', 'ISO 27001'],
    contract_status: 'active',
    dpa_signed: true,
    scc_signed: true,
    transfer_mechanism: 'Standard Contractual Clauses (2021 version)',
    vendor_privacy_url: 'https://railway.app/legal/privacy',
    vendor_security_url: 'https://railway.app/legal/security',
    vendor_dpa_url: 'https://railway.app/legal/dpa',
    annual_review_date: '2026-12-31',
    created_at: '2026-03-29T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Vercel',
    legal_name: 'Vercel Inc.',
    service_provided: 'Edge network and frontend deployment platform',
    service_category: 'hosting',
    location: 'United States',
    data_center_locations: ['Global Edge Network', 'US (Virginia)', 'EU (Dublin)'],
    data_types: ['Static assets', 'Edge function logs', 'Deployment metadata'],
    data_sensitivity: 'standard',
    security_certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR'],
    contract_status: 'active',
    dpa_signed: true,
    scc_signed: true,
    transfer_mechanism: 'Standard Contractual Clauses (2021 version) + Data Processing Agreement',
    vendor_privacy_url: 'https://vercel.com/legal/privacy-policy',
    vendor_security_url: 'https://vercel.com/security',
    vendor_dpa_url: 'https://vercel.com/legal/data-processing-agreement',
    annual_review_date: '2026-12-31',
    created_at: '2026-03-29T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Cloudflare R2',
    legal_name: 'Cloudflare, Inc.',
    service_provided: 'Object storage for session recordings and asset storage',
    service_category: 'storage',
    location: 'United States',
    data_center_locations: ['Global (200+ cities)', 'North America', 'Europe', 'Asia-Pacific'],
    data_types: ['Session recordings', 'Asset files', 'Backup data'],
    data_sensitivity: 'high',
    security_certifications: ['SOC 2 Type II', 'ISO 27001', 'ISO 27018', 'GDPR'],
    contract_status: 'active',
    dpa_signed: true,
    scc_signed: true,
    transfer_mechanism: 'Standard Contractual Clauses + EU Standard Contractual Clauses for transfers',
    vendor_privacy_url: 'https://www.cloudflare.com/privacy/',
    vendor_security_url: 'https://www.cloudflare.com/security/',
    vendor_dpa_url: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    annual_review_date: '2026-12-31',
    created_at: '2026-03-29T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Supabase',
    legal_name: 'Supabase Inc.',
    service_provided: 'Managed PostgreSQL database and authentication services',
    service_category: 'database',
    location: 'United States',
    data_center_locations: ['AWS US East', 'AWS US West', 'AWS EU West', 'AWS Asia Pacific'],
    data_types: ['User data', 'Session metadata', 'Application data', 'Authentication data'],
    data_sensitivity: 'high',
    security_certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR'],
    contract_status: 'active',
    dpa_signed: true,
    scc_signed: true,
    transfer_mechanism: 'Standard Contractual Clauses',
    vendor_privacy_url: 'https://supabase.com/privacy',
    vendor_security_url: 'https://supabase.com/security',
    vendor_dpa_url: 'https://supabase.com/legal/dpa',
    annual_review_date: '2026-12-31',
    created_at: '2026-03-29T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Cloudflare CDN',
    legal_name: 'Cloudflare, Inc.',
    service_provided: 'Content delivery network and DDoS protection',
    service_category: 'cdn',
    location: 'United States',
    data_center_locations: ['Global (200+ cities)'],
    data_types: ['Cached content', 'TLS termination data', 'Access logs'],
    data_sensitivity: 'standard',
    security_certifications: ['SOC 2 Type II', 'ISO 27001', 'ISO 27701'],
    contract_status: 'active',
    dpa_signed: true,
    scc_signed: true,
    transfer_mechanism: 'Standard Contractual Clauses + adequacy where applicable',
    vendor_privacy_url: 'https://www.cloudflare.com/privacy/',
    vendor_security_url: 'https://www.cloudflare.com/trust-hub/compliance-resources/',
    vendor_dpa_url: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    annual_review_date: '2026-12-31',
    created_at: '2026-03-29T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Sentry',
    legal_name: 'Functional Software, Inc.',
    service_provided: 'Error monitoring and application performance tracking',
    service_category: 'monitoring',
    location: 'United States',
    data_center_locations: ['US (Iowa)', 'EU (Belgium)'],
    data_types: ['Error logs', 'Stack traces', 'Device information', 'User context'],
    data_sensitivity: 'standard',
    security_certifications: ['SOC 2 Type II', 'ISO 27001'],
    contract_status: 'active',
    dpa_signed: true,
    scc_signed: true,
    transfer_mechanism: 'Standard Contractual Clauses (2021 version)',
    vendor_privacy_url: 'https://sentry.io/privacy/',
    vendor_security_url: 'https://sentry.io/security/',
    vendor_dpa_url: 'https://sentry.io/legal/dpa/',
    annual_review_date: '2026-12-31',
    created_at: '2026-03-29T00:00:00Z',
  },
];

function groupByCategory(subprocessors: Subprocessor[]): SubprocessorCategory[] {
  const groups: Record<string, Subprocessor[]> = {};
  
  for (const sub of subprocessors) {
    if (!groups[sub.service_category]) {
      groups[sub.service_category] = [];
    }
    groups[sub.service_category].push(sub);
  }
  
  return Object.entries(groups).map(([category, subs]) => ({
    category,
    description: categoryDescriptions[category] || 'Miscellaneous services',
    subprocessors: subs,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const locationFilter = searchParams.get('location');
    
    let subprocessors = mockSubprocessors;
    
    if (categoryFilter) {
      subprocessors = subprocessors.filter(
        s => s.service_category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    
    if (locationFilter) {
      subprocessors = subprocessors.filter(
        s => s.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    
    const categories = groupByCategory(subprocessors);
    
    return NextResponse.json({
      success: true,
      data: {
        lastUpdated: '2026-03-29',
        version: '1.0',
        categories,
        totalCount: subprocessors.length,
        transferSafeguards,
      },
    });
  } catch (error) {
    console.error('Error fetching subprocessors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subprocessors' },
      { status: 500 }
    );
  }
}

export { mockSubprocessors, transferSafeguards, categoryDescriptions };
