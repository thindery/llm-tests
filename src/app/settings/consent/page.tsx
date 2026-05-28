/**
 * Consent Management Settings Page
 * Route: /settings/consent
 * Ticket: REMY-258
 * 
 * Features:
 * - View consent statistics
 * - Configure consent banner settings
 * - Export consent records
 * - View individual consent status
 * - Manage withdrawal requests
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Download,
  Settings,
  BarChart3,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  FileJson,
  Table,
} from 'lucide-react';
import {
  ConsentRecord,
  ConsentStatus,
  ConsentStatistics,
  ConsentBannerSettings,
  ConsentType,
  CONSENT_TYPES,
} from '../../../lib/consent/types';

// Types
interface ConsentPageState {
  loading: boolean;
  error: string | null;
  statistics: ConsentStatistics | null;
  settings: ConsentBannerSettings | null;
  records: ConsentRecord[];
  recordsLoading: boolean;
}

interface BannerFormState {
  banner_title: string;
  banner_text: string;
  accept_button_text: string;
  reject_button_text: string;
  customize_button_text: string;
  background_color: string;
  text_color: string;
  button_primary_color: string;
  button_secondary_color: string;
  position: 'bottom' | 'top' | 'center';
  show_banner: boolean;
  consent_expiration_days: number;
}

// Consent type display config
const CONSENT_TYPE_CONFIG: Record<ConsentType, { label: string; description: string; color: string; bg: string }> = {
  analytics: {
    label: 'Analytics',
    description: 'Website traffic and usage patterns',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  marketing: {
    label: 'Marketing',
    description: 'Personalized ads and promotions',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  functional: {
    label: 'Functional',
    description: 'Essential site functionality',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
};

// StatCard component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color: string;
}> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {trend && (
          <p className={`text-sm mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// ConsentTypeCard component
const ConsentTypeCard: React.FC<{
  type: ConsentType;
  granted: number;
  withdrawn: number;
  total: number;
}> = ({ type, granted, withdrawn, total }) => {
  const config = CONSENT_TYPE_CONFIG[type];
  const grantedPercent = total > 0 ? Math.round((granted / total) * 100) : 0;
  const withdrawnPercent = total > 0 ? Math.round((withdrawn / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </div>
        <span className="text-xs text-gray-500">{total} records</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Granted</span>
            <span className="font-medium text-green-600">{granted}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${grantedPercent}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Withdrawn</span>
            <span className="font-medium text-red-600">{withdrawn}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${withdrawnPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ConsentRecordRow component
const ConsentRecordRow: React.FC<{
  record: ConsentRecord;
  onWithdraw?: (record: ConsentRecord) => void;
}> = ({ record, onWithdraw }) => {
  const [expanded, setExpanded] = useState(false);
  const config = CONSENT_TYPE_CONFIG[record.consent_type];
  const isWithdrawn = !!record.withdrawal_timestamp;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className="flex items-center justify-between py-4 px-2 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${isWithdrawn ? 'bg-red-500' : record.consent_granted ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{record.user_id.substring(0, 16)}...</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(record.consent_timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isWithdrawn ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <XCircle className="w-3 h-3 mr-1" />
              Withdrawn
            </span>
          ) : record.consent_granted ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Granted
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700">
              Denied
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      
      {expanded && (
        <div className="px-6 pb-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Version</p>
              <p className="text-sm font-medium">{record.consent_version}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">IP Hash</p>
              <p className="text-sm font-medium font-mono">{record.ip_address_hash?.substring(0, 16)}...</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">User Agent Hash</p>
              <p className="text-sm font-medium font-mono">{record.user_agent_hash?.substring(0, 16)}...</p>
            </div>
            {isWithdrawn && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Withdrawn On</p>
                <p className="text-sm font-medium text-red-600">
                  {new Date(record.withdrawal_timestamp!).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          
          {!isWithdrawn && record.consent_granted && onWithdraw && (
            <div className="mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWithdraw(record);
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                Withdraw Consent
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Banner Preview component
const BannerPreview: React.FC<{ settings: BannerFormState }> = ({ settings }) => {
  const positionClass = {
    bottom: 'bottom-0 left-0 right-0',
    top: 'top-0 left-0 right-0',
    center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md',
  }[settings.position];

  return (
    <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
      {/* Mock page content */}
      <div className="p-8 opacity-30">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-4" />
        <div className="h-3 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
      
      {/* Banner */}
      {settings.show_banner && (
        <div 
          className={`absolute ${positionClass} p-6 shadow-lg border`}
          style={{ backgroundColor: settings.background_color }}
        >
          <p 
            className="text-lg font-semibold mb-2"
            style={{ color: settings.text_color }}
          >
            {settings.banner_title}
          </p>
          <p className="text-sm mb-4 opacity-80" style={{ color: settings.text_color }}>
            {settings.banner_text}
          </p>
          <div className="flex gap-3">
            <button 
              className="px-4 py-2 rounded text-white text-sm font-medium"
              style={{ backgroundColor: settings.button_primary_color }}
            >
              {settings.accept_button_text}
            </button>
            <button 
              className="px-4 py-2 rounded text-white text-sm font-medium"
              style={{ backgroundColor: settings.button_secondary_color }}
            >
              {settings.reject_button_text}
            </button>
            <button 
              className="px-4 py-2 rounded border text-sm font-medium"
              style={{ borderColor: settings.text_color, color: settings.text_color }}
            >
              {settings.customize_button_text}
            </button>
          </div>
        </div>
      )}
      
      {!settings.show_banner && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <EyeOff className="w-8 h-8 mx-auto mb-2" />
            <p>Banner is hidden</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
const ConsentSettingsPage: React.FC = () => {
  const [state, setState] = useState<ConsentPageState>({
    loading: true,
    error: null,
    statistics: null,
    settings: null,
    records: [],
    recordsLoading: false,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'records'>('overview');
  const [savingSettings, setSavingSettings] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ConsentType | 'all'>('all');
  
  const [bannerForm, setBannerForm] = useState<BannerFormState>({
    banner_title: 'Cookie Consent',
    banner_text: 'We use cookies to improve your experience and analyze site usage.',
    accept_button_text: 'Accept All',
    reject_button_text: 'Reject',
    customize_button_text: 'Customize',
    background_color: '#ffffff',
    text_color: '#1f2937',
    button_primary_color: '#3b82f6',
    button_secondary_color: '#6b7280',
    position: 'bottom',
    show_banner: true,
    consent_expiration_days: 365,
  });

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/consent/stats/project_123'); // Replace with actual project ID
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const data = await response.json();
      setState(prev => ({ ...prev, statistics: data.data }));
    } catch (error) {
      // Use mock data for development
      setState(prev => ({
        ...prev,
        statistics: {
          total_consents: 1247,
          granted_by_type: { analytics: 892, marketing: 456, functional: 1234 },
          withdrawn_by_type: { analytics: 23, marketing: 67, functional: 5 },
          unique_users: 1034,
          last_30_days: { granted: 89, withdrawn: 12 },
        },
      }));
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/consent/settings/project_123');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setState(prev => ({ ...prev, settings: data.data }));
      setBannerForm(data.data);
    } catch (error) {
      // Use defaults for development
      setState(prev => ({ ...prev, settings: null }));
    }
  }, []);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setState(prev => ({ ...prev, recordsLoading: true }));
    try {
      const response = await fetch('/api/consent?project_id=project_123');
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      setState(prev => ({ ...prev, records: data.data }));
    } catch (error) {
      // Use mock data for development
      setState(prev => ({
        ...prev,
        records: [
          {
            id: '1',
            project_id: 'project_123',
            user_id: 'user_abc_123',
            consent_type: 'analytics',
            consent_granted: true,
            consent_timestamp: new Date().toISOString(),
            consent_version: '1.0',
            ip_address_hash: 'abc123def456',
            user_agent_hash: 'xyz789uvw012',
            withdrawal_timestamp: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: '2',
            project_id: 'project_123',
            user_id: 'user_def_456',
            consent_type: 'marketing',
            consent_granted: true,
            consent_timestamp: new Date(Date.now() - 86400000).toISOString(),
            consent_version: '1.0',
            ip_address_hash: 'def456ghi789',
            user_agent_hash: 'uvw012rst345',
            withdrawal_timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setState(prev => ({ ...prev, recordsLoading: false }));
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      await Promise.all([fetchStatistics(), fetchSettings(), fetchRecords()]);
      setState(prev => ({ ...prev, loading: false }));
    };
    loadData();
  }, [fetchStatistics, fetchSettings, fetchRecords]);

  // Save banner settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/consent/settings/project_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerForm),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      // Show success message
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  // Export data
  const handleExport = async (format: 'json' | 'csv') => {
    setExportLoading(true);
    try {
      const endpoint = format === 'json' 
        ? '/api/consent/export/user_123?project_id=project_123'
        : '/api/consent/export/csv/project_123';
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consent-export-${format === 'json' ? new Date().toISOString().split('T')[0] : 'project_123'}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Withdraw consent
  const handleWithdraw = async (record: ConsentRecord) => {
    try {
      const response = await fetch('/api/consent/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: record.user_id,
          project_id: record.project_id,
          consent_type: record.consent_type,
        }),
      });
      if (!response.ok) throw new Error('Failed to withdraw consent');
      
      // Refresh records
      await fetchRecords();
      await fetchStatistics();
    } catch (error) {
      console.error('Withdraw error:', error);
    }
  };

  // Filter records
  const filteredRecords = state.records
    .filter(r => filterType === 'all' || r.consent_type === filterType)
    .filter(r => searchQuery === '' || r.user_id.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.consent_timestamp).getTime() - new Date(a.consent_timestamp).getTime());

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading consent settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Consent Management</h1>
        </div>
        <p className="text-gray-600">
          Manage GDPR-compliant consent records, configure banner settings, and export data.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {(['overview', 'settings', 'records'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Consents"
              value={state.statistics?.total_consents?.toLocaleString() || '0'}
              icon={<Shield className="w-6 h-6 text-blue-600" />}
              color="bg-blue-50"
            />
            <StatCard
              title="Unique Users"
              value={state.statistics?.unique_users?.toLocaleString() || '0'}
              icon={<Users className="w-6 h-6 text-purple-600" />}
              trend={{ value: 12, label: 'vs last month' }}
              color="bg-purple-50"
            />
            <StatCard
              title="Granted (30d)"
              value={state.statistics?.last_30_days?.granted || 0}
              icon={<CheckCircle className="w-6 h-6 text-green-600" />}
              trend={{ value: 8, label: 'vs last month' }}
              color="bg-green-50"
            />
            <StatCard
              title="Withdrawn (30d)"
              value={state.statistics?.last_30_days?.withdrawn || 0}
              icon={<XCircle className="w-6 h-6 text-red-600" />}
              color="bg-red-50"
            />
          </div>

          {/* Consent Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['analytics', 'marketing', 'functional'] as ConsentType[]).map((type) => (
              <ConsentTypeCard
                key={type}
                type={type}
                granted={state.statistics?.granted_by_type?.[type] || 0}
                withdrawn={state.statistics?.withdrawn_by_type?.[type] || 0}
                total={(state.statistics?.granted_by_type?.[type] || 0) + (state.statistics?.withdrawn_by_type?.[type] || 0)}
              />
            ))}
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-500" />
              Data Export
            </h3>
            <p className="text-gray-600 mb-4">
              Export consent records for GDPR data portability requests or audits.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('json')}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'Export JSON'}
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Table className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              Banner Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Title</label>
                <input
                  type="text"
                  value={bannerForm.banner_title}
                  onChange={(e) => setBannerForm({ ...bannerForm, banner_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Text</label>
                <textarea
                  value={bannerForm.banner_text}
                  onChange={(e) => setBannerForm({ ...bannerForm, banner_text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accept Text</label>
                  <input
                    type="text"
                    value={bannerForm.accept_button_text}
                    onChange={(e) => setBannerForm({ ...bannerForm, accept_button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reject Text</label>
                  <input
                    type="text"
                    value={bannerForm.reject_button_text}
                    onChange={(e) => setBannerForm({ ...bannerForm, reject_button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customize Text</label>
                  <input
                    type="text"
                    value={bannerForm.customize_button_text}
                    onChange={(e) => setBannerForm({ ...bannerForm, customize_button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={bannerForm.position}
                    onChange={(e) => setBannerForm({ ...bannerForm, position: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration (days)</label>
                  <input
                    type="number"
                    value={bannerForm.consent_expiration_days}
                    onChange={(e) => setBannerForm({ ...bannerForm, consent_expiration_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show_banner"
                  checked={bannerForm.show_banner}
                  onChange={(e) => setBannerForm({ ...bannerForm, show_banner: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="show_banner" className="text-sm font-medium text-gray-700">
                  Show consent banner
                </label>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-500" />
              Live Preview
            </h3>
            <BannerPreview settings={bannerForm} />
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ConsentType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All Types</option>
                <option value="analytics">Analytics</option>
                <option value="marketing">Marketing</option>
                <option value="functional">Functional</option>
              </select>
            </div>
          </div>
          
          {/* Records List */}
          <div className="divide-y divide-gray-100">
            {state.recordsLoading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No consent records found</p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <ConsentRecordRow 
                  key={record.id} 
                  record={record}
                  onWithdraw={handleWithdraw}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentSettingsPage;