/**
 * Consent Settings Page - GDPR Consent Management
 * Route: /settings/consent
 * Ticket: REMY-258
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Settings,
  BarChart2,
  Users,
  Clock,
  Layout,
  Type,
  Palette,
  Save,
  RefreshCw,
  Search,
  ChevronRight
} from 'lucide-react';
import {
  ConsentRecord,
  ConsentStatus,
  ConsentStatistics,
  ConsentBannerSettings,
  ConsentType,
  ApiResponse
} from '../../../lib/consent/utils';

// Components
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-500 text-sm font-medium">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

const ConsentSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'banner' | 'records'>('stats');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ConsentStatistics | null>(null);
  const [bannerSettings, setBannerSettings] = useState<ConsentBannerSettings | null>(null);
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = 'mock-project-id'; // In production, get from context

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, settingsRes, recordsRes] = await Promise.all([
        fetch(`/api/v1/consent/stats/${projectId}`),
        fetch(`/api/v1/consent/settings/${projectId}`),
        fetch(`/api/v1/consent?project_id=${projectId}`)
      ]);

      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();
      const recordsData = await recordsRes.json();

      if (statsData.success) setStats(statsData.data);
      if (settingsData.success) setBannerSettings(settingsData.data);
      if (recordsData.success) setRecords(recordsData.data);
    } catch (err) {
      setError('Failed to load consent data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    if (!bannerSettings) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/consent/settings/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerSettings)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Success notification would go here
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/v1/consent/export/csv/${projectId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            GDPR Consent Management
          </h1>
          <p className="text-gray-500">Track and manage user consent for GDPR Article 7 compliance.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export All Records (CSV)
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 className="w-4 h-4 mr-2" />
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('banner')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === 'banner' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Banner Configuration
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === 'records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4 mr-2" />
          Consent Records
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard 
              title="Total Records" 
              value={stats.total_consents} 
              icon={<Shield className="w-5 h-5 text-blue-600" />} 
              color="bg-blue-50"
            />
            <StatCard 
              title="Unique Users" 
              value={stats.unique_users} 
              icon={<Users className="w-5 h-5 text-purple-600" />} 
              color="bg-purple-50"
            />
            <StatCard 
              title="Granted (30d)" 
              value={stats.last_30_days.granted} 
              icon={<CheckCircle className="w-5 h-5 text-green-600" />} 
              color="bg-green-50"
            />
            <StatCard 
              title="Withdrawn (30d)" 
              value={stats.last_30_days.withdrawn} 
              icon={<AlertCircle className="w-5 h-5 text-red-600" />} 
              color="bg-red-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-6">Consents by Type</h3>
              <div className="space-y-4">
                {(Object.keys(stats.granted_by_type) as ConsentType[]).map(type => (
                  <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="capitalize font-medium text-gray-700">{type}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-green-600 font-bold">{stats.granted_by_type[type]} granted</span>
                      <span className="text-red-500">{stats.withdrawn_by_type[type]} withdrawn</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <Shield className="w-16 h-16 text-blue-100 mb-4" />
              <h3 className="text-lg font-semibold mb-2">GDPR Article 7 Compliance</h3>
              <p className="text-gray-500 mb-4 max-w-sm">
                The data processor must be able to demonstrate that the data subject has consented to processing of his or her personal data.
              </p>
              <div className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                Records are being maintained
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Tab */}
      {activeTab === 'banner' && bannerSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Type className="w-5 h-5 mr-2 text-gray-400" />
                Content & Text
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Title</label>
                  <input 
                    type="text" 
                    value={bannerSettings.banner_title}
                    onChange={e => setBannerSettings({...bannerSettings, banner_title: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Text</label>
                  <textarea 
                    rows={3}
                    value={bannerSettings.banner_text}
                    onChange={e => setBannerSettings({...bannerSettings, banner_text: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accept Button</label>
                    <input 
                      type="text" 
                      value={bannerSettings.accept_button_text}
                      onChange={e => setBannerSettings({...bannerSettings, accept_button_text: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reject Button</label>
                    <input 
                      type="text" 
                      value={bannerSettings.reject_button_text}
                      onChange={e => setBannerSettings({...bannerSettings, reject_button_text: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Palette className="w-5 h-5 mr-2 text-gray-400" />
                Style & Position
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <div className="flex space-x-2">
                    <input 
                      type="color" 
                      value={bannerSettings.background_color}
                      onChange={e => setBannerSettings({...bannerSettings, background_color: e.target.value})}
                      className="h-10 w-10 p-1 rounded border border-gray-300"
                    />
                    <input 
                      type="text" 
                      value={bannerSettings.background_color}
                      onChange={e => setBannerSettings({...bannerSettings, background_color: e.target.value})}
                      className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                  <div className="flex space-x-2">
                    <input 
                      type="color" 
                      value={bannerSettings.text_color}
                      onChange={e => setBannerSettings({...bannerSettings, text_color: e.target.value})}
                      className="h-10 w-10 p-1 rounded border border-gray-300"
                    />
                    <input 
                      type="text" 
                      value={bannerSettings.text_color}
                      onChange={e => setBannerSettings({...bannerSettings, text_color: e.target.value})}
                      className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Color</label>
                  <div className="flex space-x-2">
                    <input 
                      type="color" 
                      value={bannerSettings.button_primary_color}
                      onChange={e => setBannerSettings({...bannerSettings, button_primary_color: e.target.value})}
                      className="h-10 w-10 p-1 rounded border border-gray-300"
                    />
                    <input 
                      type="text" 
                      value={bannerSettings.button_primary_color}
                      onChange={e => setBannerSettings({...bannerSettings, button_primary_color: e.target.value})}
                      className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Position</label>
                  <select 
                    value={bannerSettings.position}
                    onChange={e => setBannerSettings({...bannerSettings, position: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="bottom">Bottom Overlay</option>
                    <option value="top">Top Bar</option>
                    <option value="center">Center Modal</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-400" />
                Consent Expiration
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (Days)</label>
                <div className="flex items-center space-x-4">
                  <input 
                    type="number" 
                    value={bannerSettings.consent_expiration_days}
                    onChange={e => setBannerSettings({...bannerSettings, consent_expiration_days: parseInt(e.target.value)})}
                    className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-gray-500">Users will be asked for consent again after this period.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Layout className="w-5 h-5 mr-2 text-gray-400" />
              Live Preview
            </h3>
            <div className="bg-gray-100 rounded-xl border border-dashed border-gray-300 p-4 h-[500px] relative overflow-hidden">
              <div className="bg-white w-full h-full rounded shadow-sm p-4 text-[10px] space-y-2 opacity-30">
                <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                <div className="h-2 w-full bg-gray-100 rounded"></div>
                <div className="h-2 w-full bg-gray-100 rounded"></div>
                <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="h-20 bg-gray-50 rounded"></div>
                  <div className="h-20 bg-gray-50 rounded"></div>
                  <div className="h-20 bg-gray-50 rounded"></div>
                </div>
              </div>
              
              {/* Actual Banner Preview */}
              <div 
                className={`absolute left-4 right-4 p-4 rounded-lg shadow-xl border border-gray-200 transition-all ${
                  bannerSettings.position === 'top' ? 'top-4' : 
                  bannerSettings.position === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-4'
                }`}
                style={{ backgroundColor: bannerSettings.background_color, color: bannerSettings.text_color }}
              >
                <h4 className="font-bold mb-1 text-sm">{bannerSettings.banner_title}</h4>
                <p className="text-xs mb-4 opacity-90">{bannerSettings.banner_text}</p>
                <div className="flex space-x-2">
                  <button 
                    className="flex-1 px-3 py-2 rounded text-[10px] font-bold"
                    style={{ backgroundColor: bannerSettings.button_primary_color, color: '#ffffff' }}
                  >
                    {bannerSettings.accept_button_text}
                  </button>
                  <button 
                    className="px-3 py-2 rounded text-[10px] font-bold"
                    style={{ backgroundColor: bannerSettings.button_secondary_color, color: '#ffffff' }}
                  >
                    {bannerSettings.reject_button_text}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">SDK Integration</h4>
              <p className="text-xs text-blue-800 mb-2">
                Changes saved here will be automatically applied to the banner rendered by loader.js on your site.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by User ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{record.user_id}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                        {record.consent_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {record.withdrawal_timestamp ? (
                        <span className="flex items-center text-red-600 font-medium">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Withdrawn
                        </span>
                      ) : record.consent_granted ? (
                        <span className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Granted
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-400 font-medium">
                          <X className="w-3 h-3 mr-1" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(record.consent_timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{record.consent_version}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center ml-auto">
                        Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No consent records found for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
            <span>Showing {records.length} records</span>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentSettingsPage;
