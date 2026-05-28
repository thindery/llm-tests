/**
 * Security Settings Dashboard
 * Route: /settings/security
 * Ticket: REMY-260
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, AlertCircle, Clock, CheckCircle, RefreshCw, Plus, FileText, Users } from 'lucide-react';

// Import types from utils
type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
type BreachStatus = 'detected' | 'under_investigation' | 'contained' | 'remediated' | 'closed' | 'false_positive';

interface SecurityIncident {
  id: string;
  severity: BreachSeverity;
  status: BreachStatus;
  description: string;
  detectedAt: string;
  affectedUsersCount: number;
  dpaNotifiedAt: string | null;
  individualsNotifiedAt: string | null;
}

export default function SecurityDashboardPage() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incidents' | 'compliance'>('incidents');

  
  

  useEffect(() => {
    // Fetch mock data
    const mockIncidents: SecurityIncident[] = [
      {
        id: 'SEC-2026-0001',
        severity: 'critical',
        status: 'under_investigation',
        description: 'Unauthorized database access exposing customer PII',
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
        affectedUsersCount: 12500,
        dpaNotifiedAt: new Date().toISOString(),
        individualsNotifiedAt: null,
      },
      {
        id: 'SEC-2026-0002',
        severity: 'high',
        status: 'contained',
        description: 'Misconfigured S3 bucket exposing data',
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        affectedUsersCount: 8500,
        dpaNotifiedAt: new Date().toISOString(),
        individualsNotifiedAt: null,
      },
      {
        id: 'SEC-2026-0003',
        severity: 'medium',
        status: 'remediated',
        description: 'Failed login spike from single IP',
        detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        affectedUsersCount: 1,
        dpaNotifiedAt: null,
        individualsNotifiedAt: null,
      },
    ];
    setIncidents(mockIncidents);
    setLoading(false);
  }, []);

  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    open: incidents.filter(i => !['closed', 'false_positive'].includes(i.status)).length,
    dpaNotified: incidents.filter(i => i.dpaNotifiedAt).length,
  };

  const getSeverityColor = (severity: BreachSeverity) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-amber-100 text-amber-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600 mt-1">GDPR breach notification and incident management</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Incident
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Incidents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.open}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg"><Shield className="w-6 h-6 text-blue-600" /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical/High</p>
              <p className="text-3xl font-bold text-red-600">{stats.critical + 1}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">DPA Notified</p>
              <p className="text-3xl font-bold text-green-600">{stats.dpaNotified}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Incidents</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg"><Clock className="w-6 h-6 text-gray-600" /></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('incidents')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'incidents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Incidents
                </div>
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'compliance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  GDPR Compliance
                </div>
              </button>
            </nav>
          </div>

          {activeTab === 'incidents' && (
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Incident</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Severity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Affected</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Detected</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">GDPR Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{incident.id}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{incident.description}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 capitalize">{incident.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {incident.affectedUsersCount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {formatDate(incident.detectedAt)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          {incident.dpaNotifiedAt ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> DPA Notified
                            </span>
                          ) : (incident.severity !== 'low' ? (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> DPA Required
                            </span>
                          ) : null)}
                          {incident.individualsNotifiedAt ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Individuals Notified
                            </span>
                          ) : (['high', 'critical'].includes(incident.severity) ? (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Individual Required
                            </span>
                          ) : null)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Article 33 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Article 33 Compliance (DPA)</h3>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">72h Notification Rate</span>
                      <span className="text-2xl font-bold text-green-600">100%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    All medium+ severity incidents have been notified to the supervisory authority within 72 hours as required by GDPR Article 33.
                  </p>
                </div>

                {/* Article 34 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Article 34 Compliance (Individuals)</h3>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">High Risk Notification Rate</span>
                      <span className="text-2xl font-bold text-amber-600">50%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '50%' }} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    1 incident still requires individual notification for high-risk breaches affecting data subjects.
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
                <div className="flex flex-wrap gap-3">
                  <a href="/legal/breach-templates/dpa-notification.md" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    <FileText className="w-4 h-4" /> DPA Template
                  </a>
                  <a href="/legal/breach-templates/individual-notification.md" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    <Users className="w-4 h-4" /> Individual Template
                  </a>
                  <a href="/docs/security/incident-response.md" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    <Shield className="w-4 h-4" /> Response Plan
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
