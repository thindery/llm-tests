/**
 * Subprocessor Settings Page - GDPR Subprocessor Disclosure
 * Route: /settings/subprocessors
 * Ticket: REMY-259
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Shield, Globe, Server, Database, FileText, ExternalLink, CheckCircle, Search, Lock, Download } from 'lucide-react';

interface Subprocessor {
  id: string;
  name: string;
  legal_name: string | null;
  service_provided: string;
  service_category: string;
  location: string;
  data_types: string[];
  data_sensitivity: string;
  security_certifications: string[] | null;
  dpa_signed: boolean;
  scc_signed: boolean;
  transfer_mechanism: string | null;
  vendor_privacy_url: string | null;
  vendor_dpa_url: string | null;
}

interface SubprocessorCategory {
  category: string;
  description: string;
  subprocessors: Subprocessor[];
}

interface ApiResponse {
  success: boolean;
  data?: {
    lastUpdated: string;
    version: string;
    categories: SubprocessorCategory[];
    totalCount: number;
    transferSafeguards: string[];
  };
  error?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  hosting: <Server className="w-5 h-5" />,
  storage: <Database className="w-5 h-5" />,
  database: <Database className="w-5 h-5" />,
  cdn: <Globe className="w-5 h-5" />,
  monitoring: <Shield className="w-5 h-5" />,
  analytics: <Shield className="w-5 h-5" />,
};

const categoryNames: Record<string, string> = {
  hosting: 'Infrastructure & Hosting',
  storage: 'Data Storage',
  database: 'Database Services',
  cdn: 'Content Delivery & Security',
  monitoring: 'Monitoring & Logging',
  analytics: 'Analytics',
};

export default function SubprocessorSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse['data'] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/subprocessors');
      const result: ApiResponse = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to load');
      setData(result.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = React.useMemo(() => {
    if (!data) return [];
    if (!searchQuery) return data.categories;

    const query = searchQuery.toLowerCase();
    return data.categories.map(cat => ({
      ...cat,
      subprocessors: cat.subprocessors.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.service_provided.toLowerCase().includes(query) ||
          s.location.toLowerCase().includes(query)
      ),
    })).filter(cat => cat.subprocessors.length > 0);
  }, [data, searchQuery]);

  const exportToCSV = () => {
    if (!data) return;
    const rows = [['Name', 'Category', 'Service', 'Location', 'DPA', 'SCC']];
    data.categories.forEach(cat => {
      cat.subprocessors.forEach(sub => {
        rows.push([sub.name, cat.category, sub.service_provided, sub.location, sub.dpa_signed ? 'Yes' : 'No', sub.scc_signed ? 'Yes' : 'No']);
      });
    });
    const csv = rows.map(row => row.join(',')).join('n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subprocessors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading subprocessor information...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subprocessor Disclosure</h1>
          <p className="text-gray-600">Third-party service providers who process data on our behalf</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-500">Total Subprocessors</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.totalCount || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg"><FileText className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-500">With DPAs</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.categories.reduce((acc, cat) => acc + cat.subprocessors.filter(s => s.dpa_signed).length, 0) || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg"><Lock className="w-5 h-5 text-purple-600" /></div>
              <span className="text-sm text-gray-500">With SCCs</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.categories.reduce((acc, cat) => acc + cat.subprocessors.filter(s => s.scc_signed).length, 0) || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search subprocessors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button onClick={exportToCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="w-full px-6 py-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{categoryIcons[category.category]}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{categoryNames[category.category] || category.category}</h3>
                      <p className="text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{category.subprocessors.length} subprocessor{category.subprocessors.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {category.subprocessors.map((sub) => (
                  <div key={sub.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{sub.name}</h4>
                        {sub.legal_name && sub.legal_name !== sub.name && <p className="text-sm text-gray-500">{sub.legal_name}</p>}
                      </div>
                      <div className="flex gap-2">
                        {sub.dpa_signed && <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">DPA</span>}
                        {sub.scc_signed && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">SCC</span>}
                        {sub.data_sensitivity === 'high' && <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded">High Sensitivity</span>}
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4">{sub.service_provided}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Location</p>
                        <div className="flex items-center gap-1 text-sm"><Globe className="w-4 h-4 text-gray-400" />{sub.location}</div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Data Types</p>
                        <div className="flex flex-wrap gap-1">{sub.data_types.slice(0, 3).map(t => <span key={t} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{t}</span>)}…</div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Certifications</p>
                        <div className="flex flex-wrap gap-1">{sub.security_certifications?.slice(0, 2).map(c => <span key={c} className="flex items-center px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded"><CheckCircle className="w-3 h-3 mr-1" />{c}</span>)}</div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Transfer</p>
                        <p className="text-sm text-gray-700">{sub.transfer_mechanism || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t mt-4">
                      {sub.vendor_privacy_url && <a href={sub.vendor_privacy_url} target="_blank" rel="noopener" className="text-sm text-blue-600 flex items-center gap-1">Privacy Policy <ExternalLink className="w-3 h-3" /></a>}
                      {sub.vendor_dpa_url && <a href={sub.vendor_dpa_url} target="_blank" rel="noopener" className="text-sm text-blue-600 flex items-center gap-1">DPA <ExternalLink className="w-3 h-3" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {data?.transferSafeguards && (
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg"><Shield className="w-6 h-6 text-blue-600" /></div>
              <h3 className="text-lg font-semibold">Data Transfer Safeguards</h3>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.transferSafeguards.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {data?.lastUpdated || 'N/A'} • Version {data?.version || '1.0'}</p>
          <p className="mt-1">Questions? Contact <a href="mailto:privacy@remyanalytics.com" className="text-blue-600">privacy@remyanalytics.com</a></p>
        </div>
      </div>
    </div>
  );
}
