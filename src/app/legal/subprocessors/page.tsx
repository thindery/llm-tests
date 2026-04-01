/**
 * Subprocessor Disclosure Page
 * Public-facing transparency page for GDPR compliance
 * URL: /legal/subprocessors
 * 
 * Ticket: REMY-259
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Subprocessor List | GDPR Transparency',
  description: 'Complete list of subprocessors who process personal data on our behalf, in accordance with GDPR Article 28.',
};

// Types
interface Subprocessor {
  id: string;
  name: string;
  legal_name?: string;
  website_url?: string;
  privacy_policy_url?: string;
  purpose: string;
  headquarters_location: string;
  data_storage_locations: string[];
  jurisdiction: string;
  security_certifications: string[];
  gdpr_compliant: boolean;
  standard_contractual_clauses: boolean;
  data_processing_agreement_signed: boolean;
}

// Fetch subprocessors from API
async function getActiveSubprocessors(): Promise<Subprocessor[]> {
  try {
    // In production, this would call the actual API
    // For now, we'll return the seeded data directly
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const res = await fetch(`${baseUrl}/api/v1/subprocessors/public`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      // Fallback: return empty array if API fails
      return [];
    }

    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    // Return empty array on error
    return [];
  }
}

// Format location string
function formatLocation(location: string): string {
  return location;
}

// Format security certifications
function formatCertifications(certs: string[]): string {
  if (!certs || certs.length === 0) return 'None listed';
  
  const certMap: Record<string, string> = {
    'SOC_1_Type_II': 'SOC 1 Type II',
    'SOC_2_Type_II': 'SOC 2 Type II',
    'ISO_27001': 'ISO 27001',
    'ISO_27018': 'ISO 27018',
    'PCI_DSS_Level_1': 'PCI DSS Level 1',
  };

  return certs.map(c => certMap[c] || c).join(', ');
}

export default async function SubprocessorDisclosurePage() {
  const subprocessors = await getActiveSubprocessors();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-gray-700">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/legal" className="hover:text-gray-700">
                  Legal
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900">Subprocessors</li>
            </ol>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">
            Subprocessor List
          </h1>
          <p className="mt-2 text-gray-600">
            A complete list of third-party subprocessors who process personal data on our behalf.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Introduction */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            GDPR Transparency
          </h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600">
              Under the General Data Protection Regulation (GDPR), specifically Article 28, 
              we are required to inform you about any subprocessors who process personal data 
              on our behalf. This page provides a complete and up-to-date list of all 
              subprocessors we use.
            </p>
            <p className="text-gray-600 mt-4">
              We have entered into Data Processing Agreements (DPAs) with each subprocessor 
              listed below, ensuring they meet the same data protection standards we uphold. 
              All subprocessors are subject to regular security and compliance reviews.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="/legal/dpa"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Data Processing Agreement →
            </a>
            <a
              href="/legal/privacy"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Privacy Policy →
            </a>
          </div>
        </section>

        {/* Subprocessor Table */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Subprocessors
              </h2>
              <span className="text-sm text-gray-500">
                {subprocessors.length} active subprocessors
              </span>
            </div>
          </div>

          {subprocessors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Subprocessor
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Purpose
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Certifications
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      GDPR Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subprocessors.map((subprocessor) => (
                    <tr key={subprocessor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {subprocessor.website_url ? (
                                <a
                                  href={subprocessor.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600"
                                >
                                  {subprocessor.name}
                                </a>
                              ) : (
                                subprocessor.name
                              )}
                            </div>
                            {subprocessor.legal_name &&
                              subprocessor.legal_name !== subprocessor.name && (
                                <div className="text-xs text-gray-500">
                                  {subprocessor.legal_name}
                                </div>
                              )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {subprocessor.purpose}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatLocation(subprocessor.headquarters_location)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subprocessor.data_storage_locations?.length > 0 && (
                            <span>
                              Data: {subprocessor.data_storage_locations.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatCertifications(subprocessor.security_certifications)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {subprocessor.gdpr_compliant && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ GDPR Compliant
                            </span>
                          )}
                          {subprocessor.data_processing_agreement_signed && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              DPA Signed
                            </span>
                          )}
                          {subprocessor.standard_contractual_clauses && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              SCCs
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4 text-sm">
                  Subprocessor data is currently unavailable.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Please check back later or contact our Data Protection Officer.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Security Measures Summary */}
        <section className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Security & Compliance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Technical Measures
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Encryption at rest for all stored personal data
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  TLS 1.3 encryption for data in transit
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Role-based access controls with MFA
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Regular security audits and penetration testing
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Organizational Measures
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Data Processing Agreements with all subprocessors
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Standard Contractual Clauses for international transfers
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Regular compliance reviews and due diligence
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Incident response and data breach procedures
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Notification Section */}
        <section className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">
                Notification of Changes
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  We will notify you at least 30 days in advance of:
                </p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Adding a new subprocessor</li>
                  <li>Removing or replacing an existing subprocessor</li>
                  <li>Material changes to a subprocessor's data processing activities</li>
                </ul>
                <p className="mt-4">
                  To receive notifications, ensure your contact information is up to date 
                  in your account settings, or contact our Data Protection Officer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Questions about our subprocessors?{' '}
            <a
              href="mailto:dpo@example.com"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Contact our Data Protection Officer
            </a>
          </p>
          
          <div className="mt-4 flex justify-center space-x-4 text-sm">
            <a
              href="/api/v1/subprocessors/public?format=json"
              className="text-gray-500 hover:text-gray-700"
            >
              Download JSON
            </a>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
