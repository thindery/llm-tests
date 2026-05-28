/**
 * Legal Basis Documentation Page
 * Public-facing transparency for GDPR compliance
 * Shows all processing activities and their legal bases
 * 
 * Ticket: REMY-261
 */

import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Legal Basis for Processing | GDPR Transparency',
  description: 'Complete documentation of our legal basis for processing personal data under GDPR Article 6.',
};

// Types
interface ProcessingActivity {
  activity_id: string;
  activity_name: string;
  activity_description: string;
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interest';
  legal_basis_justification: string;
  processing_purpose: string;
  data_categories: string[];
  data_subjects: string[];
  retention_period_days: number;
  storage_locations: string[];
  recipients?: string[];
  consent_withdrawal_mechanism?: string;
  approved_at: string | null;
  version: string;
  status: 'active' | 'suspended' | 'deprecated';
}

const LEGAL_BASIS_ARTICLES: Record<ProcessingActivity['legal_basis'], { article: string; name: string }> = {
  consent: { article: 'Art 6(1)(a)', name: 'Consent' },
  contract: { article: 'Art 6(1)(b)', name: 'Contract' },
  legal_obligation: { article: 'Art 6(1)(c)', name: 'Legal Obligation' },
  vital_interests: { article: 'Art 6(1)(d)', name: 'Vital Interests' },
  public_task: { article: 'Art 6(1)(e)', name: 'Public Task' },
  legitimate_interest: { article: 'Art 6(1)(f)', name: 'Legitimate Interest' },
};

// Fetch processing activities from API
async function getProcessingActivities(): Promise<{ activities: ProcessingActivity[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/v1/legal-basis?status=active`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch processing activities');
    }

    const data = await res.json();
    return { activities: data.success ? data.data.activities : [] };
  } catch {
    // Return fallback data
    return {
      activities: [
        {
          activity_id: 'AUTH-001',
          activity_name: 'User Authentication',
          activity_description: 'Processing user credentials to provide access to the platform',
          legal_basis: 'contract',
          legal_basis_justification: 'Processing is necessary for the performance of the contract to provide platform services (GDPR Art 6(1)(b))',
          processing_purpose: 'service_delivery',
          data_categories: ['email', 'password_hash', 'session_tokens'],
          data_subjects: ['registered_users'],
          retention_period_days: 90,
          storage_locations: ['us-east-1', 'eu-west-1'],
          approved_at: new Date().toISOString(),
          version: '1.0',
          status: 'active',
        },
        {
          activity_id: 'ANALYTICS-001',
          activity_name: 'Usage Analytics',
          activity_description: 'Collecting anonymized usage data to improve platform performance',
          legal_basis: 'consent',
          legal_basis_justification: 'User has provided explicit consent through banner (GDPR Art 6(1)(a))',
          processing_purpose: 'analytics',
          data_categories: ['usage_patterns', 'device_info'],
          data_subjects: ['users', 'visitors'],
          retention_period_days: 365,
          storage_locations: ['us-east-1'],
          consent_withdrawal_mechanism: '/settings/privacy',
          approved_at: new Date().toISOString(),
          version: '1.0',
          status: 'active',
        },
        {
          activity_id: 'LEGAL-001',
          activity_name: 'Regulatory Compliance',
          activity_description: 'Processing required to comply with legal obligations',
          legal_basis: 'legal_obligation',
          legal_basis_justification: 'Processing is necessary for compliance with legal obligations (GDPR Art 6(1)(c))',
          processing_purpose: 'legal_compliance',
          data_categories: ['transaction_data', 'identity_verification'],
          data_subjects: ['customers'],
          retention_period_days: 2555,
          storage_locations: ['us-east-1'],
          approved_at: new Date().toISOString(),
          version: '1.0',
          status: 'active',
        },
        {
          activity_id: 'SUPPORT-001',
          activity_name: 'Customer Support',
          activity_description: 'Processing user data to provide customer support',
          legal_basis: 'legitimate_interest',
          legal_basis_justification: 'Processing is based on legitimate interest to provide quality support (GDPR Art 6(1)(f)). Impact assessed: minimal privacy impact.',
          processing_purpose: 'customer_support',
          data_categories: ['contact_history', 'account_data'],
          data_subjects: ['customers'],
          retention_period_days: 365,
          storage_locations: ['us-east-1'],
          approved_at: new Date().toISOString(),
          version: '1.0',
          status: 'active',
        },
      ],
    };
  }
}

// Format retention period
function formatRetention(days: number): string {
  if (days >= 365) {
    const years = days / 365;
    return years === 1 ? '1 year' : `${years.toFixed(1)} years`;
  }
  if (days >= 30) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
  return days === 1 ? '1 day' : `${days} days`;
}

// Get legal basis badge color
function getBadgeColor(legalBasis: ProcessingActivity['legal_basis']): string {
  const colors: Record<ProcessingActivity['legal_basis'], string> = {
    consent: 'bg-green-100 text-green-800 border-green-200',
    contract: 'bg-blue-100 text-blue-800 border-blue-200',
    legal_obligation: 'bg-amber-100 text-amber-800 border-amber-200',
    vital_interests: 'bg-red-100 text-red-800 border-red-200',
    public_task: 'bg-purple-100 text-purple-800 border-purple-200',
    legitimate_interest: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };
  return colors[legalBasis] || 'bg-gray-100 text-gray-800';
}

export default async function LegalBasisDocumentationPage() {
  const { activities } = await getProcessingActivities();

  // Group by legal basis
  const grouped = activities.reduce((acc, activity) => {
    if (!acc[activity.legal_basis]) {
      acc[activity.legal_basis] = [];
    }
    acc[activity.legal_basis].push(activity);
    return acc;
  }, {} as Record<ProcessingActivity['legal_basis'], ProcessingActivity[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-gray-700">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/legal" className="hover:text-gray-700">Legal</Link>
              </li>
              <li>/</li>
              <li className="text-gray-900">Legal Basis</li>
            </ol>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900">Legal Basis for Processing</h1>
          <p className="mt-2 text-gray-600">
            Under GDPR Article 6, we must have a documented legal basis before processing personal data.
            This page outlines each processing activity and its legal basis.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Overview Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview of Processing Activities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {<div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">{activities.filter(a => a.status === 'active').length}</div>
              <div className="text-sm text-blue-700">Active Processing Activities</div>
            </div>}
            
            {<div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{activities.filter(a => a.legal_basis === 'consent').length}</div>
              <div className="text-sm text-green-700">Based on Consent (Withdrawable)</div>
            </div>}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium">GDPR Article 6 Requirement</p>
                <p className="mt-1">
                  Processing of personal data is lawful only if and to the extent that at least one of the 
                  legal bases applies. We document our legal basis <strong>before</strong> any processing begins.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Sections */}
        <div className="space-y-8">
          {Object.entries(grouped).map(([legalBasis, basisActivities]) => {
            const info = LEGAL_BASIS_ARTICLES[legalBasis as ProcessingActivity['legal_basis']];
            
            return (
              <section key={legalBasis} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor(legalBasis as ProcessingActivity['legal_basis'])}`}>
                      {info.article}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">{info.name}</h2>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {getLegalBasisDescription(legalBasis as ProcessingActivity['legal_basis'])}
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {basisActivities.map((activity) => (
                    <div key={activity.activity_id} className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {activity.activity_id}
                            </span>
                            <span className="text-xs text-gray-400">v{activity.version}</span>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mt-1">{activity.activity_name}</h3>
                        </div>
                        
                        {activity.legal_basis === 'consent' && activity.consent_withdrawal_mechanism && (
                          <Link 
                            href={activity.consent_withdrawal_mechanism}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            Manage Consent
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{activity.activity_description}</p>

                      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
                        <div>
                          <span className="font-medium text-gray-700">Justification:</span>
                          <p className="text-gray-600 mt-1">{activity.legal_basis_justification}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-gray-700">Data Categories:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activity.data_categories.map((cat) => (
                                <span key={cat} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="font-medium text-gray-700">Data Subjects:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activity.data_subjects.map((subject) => (
                                <span key={subject} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                  {subject}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-gray-700">Retention:</span>
                            <span className="text-gray-600 ml-2">{formatRetention(activity.retention_period_days)}</span>
                          </div>

                          <div>
                            <span className="font-medium text-gray-700">Storage:</span>
                            <span className="text-gray-600 ml-2">{activity.storage_locations.join(', ')}</span>
                          </div>
                        </div>

                        {activity.approved_at && (
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 mt-2">
                            Document approved: {new Date(activity.approved_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Summary Section */}
        <section className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Your Rights Under GDPR</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Right to be informed</strong> - We document all processing before it occurs</span>
              </div>
              
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Right to withdraw consent</strong> - As easy as giving it</span>
              </div>
              
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Right to object</strong> - To legitimate interest processing</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Right to erasure</strong> - Request deletion of your data</span>
              </div>

              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Right to data portability</strong> - Export your data</span>
              </div>

              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Right to complain</strong> - To supervisory authority</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <Link 
              href="/settings/privacy" 
              className="text-sm text-blue-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              Manage your privacy settings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Related Links */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Documentation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/legal/privacy-policy"
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900">Privacy Policy</h3>
              <p className="text-sm text-gray-500 mt-1">How we handle your personal data</p>
            </Link>

            <Link 
              href="/legal/subprocessors"
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900">Subprocessors</h3>
              <p className="text-sm text-gray-500 mt-1">Third parties we use for processing</p>
            </Link>

            <Link 
              href="/legal/dpa"
              className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900">Data Processing Agreement</h3>
              <p className="text-sm text-gray-500 mt-1">Article 28 DPA for business customers</p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          This documentation is maintained in accordance with GDPR Article 6. 
          Last updated: {new Date().toLocaleDateString()}.
        </p>
      </footer>
    </div>
  );
}

function getLegalBasisDescription(basis: ProcessingActivity['legal_basis']): string {
  const descriptions: Record<ProcessingActivity['legal_basis'], string> = {
    consent: 'Data subject has given consent to the processing of their personal data for one or more specific purposes.',
    contract: 'Processing is necessary for the performance of a contract or to take steps at the request of the data subject.',
    legal_obligation: 'Processing is necessary for compliance with a legal obligation that the controller is subject to.',
    vital_interests: 'Processing is necessary to protect the vital interests of the data subject or another person.',
    public_task: 'Processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority.',
    legitimate_interest: 'Processing is necessary for the purposes of legitimate interests pursued by the controller, except where overridden by the interests of the data subject.',
  };
  return descriptions[basis];
}
