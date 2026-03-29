/**
 * Security Settings Dashboard
 * Route: /settings/security
 * Ticket: REMY-260
 *
 * Features:
 * - Security incidents overview
 * - GDPR compliance tracking (72h notification deadlines)
 * - Incident timeline and status
 * - Quick incident creation
 * - Automated monitoring status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Bell,
  TrendingUp,
  Activity,
  FileWarning,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Mail,
  User,
  BarChart3,
  Settings,
  Lock,
  Eye,
  X,
  Calendar,
} from 'lucide-react';
import {
  SecurityIncident,
  BreachSeverity,
  BreachStatus,
  getSeverityBadge,
  getStatusBadge,
  formatDateTime,
  formatTimeSince,
  formatNumber,
  NotificationRequirements,
  GDPR_TIMELINE,
  getDpaDeadlineHoursRemaining,
  getIndividualDeadlineHoursRemaining,
  isDpaOverdue,
  isIndividualNotificationOverdue,
} from '../../../lib/security/utils';
import {
  MONITORING_CONFIG,
  runMonitoringCheck,
  SecurityAlert,
} from '../../../lib/security/monitoring';

// Types
interface SecurityDashboardState {
  loading: boolean;
  error: string | null;
  incidents: SecurityIncident[];
  stats: SecurityStats | null;
  compliance: ComplianceMetrics | null;
  alerts: SecurityAlert[];
}

interface SecurityStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  highIncidents: number;
  mediumIncidents: number;
  lowIncidents: number;
  notificationsSent: number;
  avgResolutionHours: number;
}

interface ComplianceMetrics {
  dpa72hCompliance: number;
  individualNotificationCompliance: number;
  overdueDpaNotifications: number;
  overdueIndividualNotifications: number;
  incidentsRequiringDpa: number;
  incidentsRequiringIndividual: number;
}

interface CreateIncidentModalState {
  shown: boolean;
  step: 'details' | 'assessment' | 'summary';
  formData: Partial<SecurityIncident>;
}

// StatusBadge component
const SeverityBadge: React.FC<{ severity: BreachSeverity }> = ({ severity }) => {
  const badge = getSeverityBadge(severity);
  const styles: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[badge.color]}`}
    >
      {severity === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {severity === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {severity === 'medium' && <AlertCircle className="w-3 h-3 mr-1" />}
      {severity === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
      {badge.label}
    </span>
  );
};

const StatusBadgeComponent: React.FC<{ status: BreachStatus }> = ({ status }) => {
  const badge = getStatusBadge(status);
  const styles: Record<string, string> = {
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles[badge.color]}`}>
      {badge.label}
    </span>
  );
};

// Deadline indicator
const DeadlineIndicator: React.FC<{ incident: SecurityIncident }> = ({ incident }) => {
  const dpaHours = getDpaDeadlineHoursRemaining(incident.detectedAt);
  const individualHours = getIndividualDeadlineHoursRemaining(incident.detectedAt);
  const dpaOverdue = isDpaOverdue(incident.detectedAt, incident.dpaNotifiedAt);
  const individualOverdue = isIndividualNotificationOverdue(
    incident.severity,
    incident.detectedAt,
    incident.individualsNotifiedAt
  );

  if (incident.status === 'closed' || incident.status === 'false_positive') {
    return <span className="text-xs text-gray-500">Closed</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {incident.severity !== 'low' && !incident.dpaNotifiedAt && (
        <div className={`flex items-center text-xs ${dpaOverdue ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
          <Clock className="w-3 h-3 mr-1" />
          DPA: {dpaOverdue ? 'OVERDUE' : `${dpaHours}h left`}
        </div>
      )}
      {(incident.severity === 'high' || incident.severity === 'critical') &&
        !incident.individualsNotifiedAt && (
          <div className={`flex items-center text-xs ${individualOverdue ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
            <Bell className="w-3 h-3 mr-1" />
            Individual: {individualOverdue ? 'OVERDUE' : `${individualHours}h`}
          </div>
        )}
      {incident.dpaNotifiedAt && incident.individualsNotifiedAt && (
        <span className="text-xs text-green-600 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Notified
        </span>
      )}
    </div>
  );
};

// Main component
const SecurityDashboardPage: React.FC = () => {
  const [state, setState] = useState<SecurityDashboardState>({
    loading: true,
    error: null,
    incidents: [],
    stats: null,
    compliance: null,
    alerts: [],
  });

  const [filters, setFilters] = useState({
    status: 'all' as BreachStatus | 'all',
    severity: 'all' as BreachSeverity | 'all',
    showOverdueOnly: false,
  });

  const [createModal, setCreateModal] = useState<CreateIncidentModalState>({
    shown: false,
    step: 'details',
    formData: {},
  });

  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'incidents' | 'compliance' | 'monitoring'>('incidents');

  // Fetch security data
  const fetchSecurityData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Fetch incidents
      const response = await fetch('/api/v1/security/incidents', {
        headers: { Authorization: 'Bearer mock-user-id' },
      });
      const data = await response.json();

      if (!data.success) {
        // Use mock data for development
        const mockIncidents = getMockIncidents();
        const mockStats = calculateStats(mockIncidents);
        const mockCompliance = calculateCompliance(mockIncidents);

        setState({
          loading: false,
          error: null,
          incidents: mockIncidents,
          stats: mockStats,
          compliance: mockCompliance,
          alerts: getMockAlerts(),
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { incidents } = data.data;
      const stats = calculateStats(incidents);
      const compliance = calculateCompliance(incidents);

      setState({
        loading: false,
        error: null,
        incidents: incidents,
        stats: stats,
        compliance: compliance,
        alerts: getMockAlerts(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  // Mock data generators
  function getMockIncidents(): SecurityIncident[] {
    return [
      {
        id: 'sec-001',
        detectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
        reportedAt: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
        severity: 'critical',
        description: 'Unauthorized access to production database containing user PII',
        descriptionInternal: 'SQL injection vector exploited via legacy API endpoint',
        affectedUsersCount: 12500,
        dataCategories: ['contact', 'financial', 'identity'],
        dataSpecialCategories: ['health'],
        likelihoodOfHarm: 'certain',
        severityOfImpact: 'severe',
        breachType: 'unauthorized_access',
        discoverySource: 'automated_monitoring',
        dpiaNotifiedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        dpaNotifiedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
        dpaReferenceNumber: 'ICO-2026-12345',
        individualsNotifiedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        notificationMethod: 'email',
        status: 'remediated',
        containmentMeasures: ['Disabled vulnerable endpoint', 'Revoked API keys', 'Blocked IP range'],
        remediationSteps: ['Patched SQL injection', 'Updated WAF rules', 'Reviewed access logs'],
        preventativeMeasures: ['Code review process updated', 'SAST implemented', 'Penetration testing scheduled'],
        rootCause: 'Unpatched legacy API with known vulnerability',
        lessonsLearned: 'Need for better legacy system inventory and patch management',
        detectedBy: 'user-001',
        assignedTo: 'user-002',
        closedBy: null,
        projectId: 'proj-001',
        relatedIncidentId: null,
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        closedAt: null,
        tags: ['gdpr', 'sql-injection', 'api', 'critical'],
        priority: 100,
      },
      {
        id: 'sec-002',
        detectedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), // 15 hours ago
        reportedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        severity: 'high',
        description: 'Misconfigured S3 bucket exposed customer data',
        descriptionInternal: 'Bucket had public read permissions enabled',
        affectedUsersCount: 8500,
        dataCategories: ['contact', 'behavioral'],
        dataSpecialCategories: [],
        likelihoodOfHarm: 'probable',
        severityOfImpact: 'significant',
        breachType: 'misconfiguration',
        discoverySource: 'security_scan',
        dpiaNotifiedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        dpaNotifiedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        dpaReferenceNumber: 'ICO-2026-12346',
        individualsNotifiedAt: null,
        notificationMethod: null,
        status: 'contained',
        containmentMeasures: ['Secured S3 bucket', 'Audited bucket permissions'],
        remediationSteps: ['Implementing IaC for all buckets'],
        preventativeMeasures: ['SCP policies updated'],
        rootCause: 'Manual bucket creation without security review',
        lessonsLearned: null,
        detectedBy: 'user-003',
        assignedTo: 'user-002',
        closedBy: null,
        projectId: 'proj-002',
        relatedIncidentId: null,
        createdAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        closedAt: null,
        tags: ['gdpr', 's3', 'cloud', 'high'],
        priority: 75,
      },
      {
        id: 'sec-003',
        detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        severity: 'high',
        description: 'Potential unauthorized data export by compromised account',
        descriptionInternal: 'Employee account accessed 50k records in bulk download',
        affectedUsersCount: 50000,
        dataCategories: ['contact', 'financial'],
        dataSpecialCategories: [],
        likelihoodOfHarm: 'possible',
        severityOfImpact: 'significant',
        breachType: 'insider_threat',
        discoverySource: 'automated_monitoring',
        dpiaNotifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        dpaNotifiedAt: null,
        dpaReferenceNumber: null,
        individualsNotifiedAt: null,
        notificationMethod: null,
        status: 'under_investigation',
        containmentMeasures: ['Disabled user account', 'Revoked API tokens'],
        remediationSteps: [],
        preventativeMeasures: [],
        rootCause: null,
        lessonsLearned: null,
        detectedBy: 'system',
        assignedTo: 'user-002',
        closedBy: null,
        projectId: 'proj-001',
        relatedIncidentId: null,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        closedAt: null,
        tags: ['gdpr', 'insider', 'bulk-export'],
        priority: 80,
      },
      {
        id: 'sec-004',
        detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        severity: 'medium',
        description: 'Unusual access pattern from new geographic location',
        descriptionInternal: 'User login from country not in typical travel pattern',
        affectedUsersCount: 1,
        dataCategories: [],
        dataSpecialCategories: [],
        likelihoodOfHarm: 'possible',
        severityOfImpact: 'limited',
        breachType: 'unauthorized_access',
        discoverySource: 'user_report',
        dpiaNotifiedAt: null,
        dpaNotifiedAt: null,
        dpaReferenceNumber: null,
        individualsNotifiedAt: null,
        notificationMethod: null,
        status: 'false_positive',
        containmentMeasures: ['Required MFA re-authentication'],
        remediationSteps: ['User confirmed legitimate travel'],
        preventativeMeasures: [],
        rootCause: 'False positive - legitimate user travel',
        lessonsLearned: 'Improve geo-anomaly detection sensitivity',
        detectedBy: 'user-005',
        assignedTo: 'user-002',
        closedBy: 'user-002',
        projectId: null,
        relatedIncidentId: null,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
        tags: ['geo-anomaly', 'false-positive'],
        priority: 25,
      },
      {
        id: 'sec-005',
        detectedAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(), // 4+ days ago
        reportedAt: new Date(Date.now() - 99 * 60 * 60 * 1000).toISOString(),
        severity: 'high',
        description: 'Ransomware attack on internal file server',
        descriptionInternal: 'File server encrypted, backups intact',
        affectedUsersCount: 350,
        dataCategories: ['contact', 'professional'],
        dataSpecialCategories: [],
        likelihoodOfHarm: 'certain',
        severityOfImpact: 'significant',
        breachType: 'ransomware',
        discoverySource: 'user_report',
        dpiaNotifiedAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        dpaNotifiedAt: null,
        dpaReferenceNumber: null,
        individualsNotifiedAt: null,
        notificationMethod: null,
        status: 'under_investigation',
        containmentMeasures: ['Isolated affected systems', 'Disabled network access'],
        remediationSteps: ['Restoring from backups', 'Implementing endpoint detection'],
        preventativeMeasures: [],
        rootCause: null,
        lessonsLearned: null,
        detectedBy: 'user-006',
        assignedTo: 'user-007',
        closedBy: null,
        projectId: 'proj-003',
        relatedIncidentId: null,
        createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 90 * 60 * 60 * 1000).toISOString(),
        closedAt: null,
        tags: ['ransomware', 'malware', 'critical-overdue'],
        priority: 95,
      },
    ];
  }

  function getMockAlerts(): SecurityAlert[] {
    return [
      {
        id: 'alert-001',
        type: 'bulk_export_detected',
        severity: 'high',
        userId: 'user-010',
        userEmail: 'admin@remyanalytics.com',
        description: 'Bulk export detected: 25,000 records accessed',
        details: { recordsExported: 25000, exportType: 'api' },
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'open',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'alert-002',
        type: 'failed_login_spike',
        severity: 'warning',
        userId: 'user-015',
        userEmail: 'user@example.com',
        description: '12 failed login attempts within 5 minutes',
        details: { failedAttempts: 12, timeWindowMinutes: 5 },
        detectedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'false_positive',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ];
  }

  function calculateStats(incidents: SecurityIncident[]): SecurityStats {
    const openIncidents = incidents.filter(
      (i) => i.status !== 'closed' && i.status !== 'false_positive'
    );
    const closedIncidents = incidents.filter((i) => i.status === 'closed');

    const totalResolutionTime = closedIncidents.reduce((sum, i) => {
      if (i.closedAt && i.detectedAt) {
        return (
          sum + (new Date(i.closedAt).getTime() - new Date(i.detectedAt).getTime())
        );
      }
      return sum;
    }, 0);

    const avgResolutionHours =
      closedIncidents.length > 0
        ? Math.round(totalResolutionTime / closedIncidents.length / (1000 * 60 * 60))
        : 0;

    return {
      totalIncidents: incidents.length,
      openIncidents: openIncidents.length,
      criticalIncidents: incidents.filter((i) => i.severity === 'critical').length,
      highIncidents: incidents.filter((i) => i.severity === 'high').length,
      mediumIncidents: incidents.filter((i) => i.severity === 'medium').length,
      lowIncidents: incidents.filter((i) => i.severity === 'low').length,
      notificationsSent: incidents.filter((i) => i.dpaNotifiedAt !== null).length,
      avgResolutionHours,
    };
  }

  function calculateCompliance(incidents: SecurityIncident[]): ComplianceMetrics {
    const openIncidents = incidents.filter(
      (i) => i.status !== 'closed' && i.status !== 'false_positive'
    );

    const requiringDpa = openIncidents.filter(
      (i) => i.severity !== 'low' && !i.dpaNotifiedAt
    );

    const requiringIndividual = openIncidents.filter(
      (i) =>
        (i.severity === 'high' || i.severity === 'critical') && !i.individualsNotifiedAt
    );

    const dpaOverdue = requiringDpa.filter((i) =>
      isDpaOverdue(i.detectedAt, i.dpaNotifiedAt)
    );

    const individualOverdue = requiringIndividual.filter((i) =>
      isIndividualNotificationOverdue(i.severity, i.detectedAt, i.individualsNotifiedAt)
    );

    return {
      dpa72hCompliance:
        requiringDpa.length > 0
          ? Math.round(
              ((requiringDpa.length - dpaOverdue.length) / requiringDpa.length) * 100
            )
          : 100,
      individualNotificationCompliance:
        requiringIndividual.length > 0
          ? Math.round(
              ((requiringIndividual.length - individualOverdue.length) /
                requiringIndividual.length) *
                100
            )
          : 100,
      overdueDpaNotifications: dpaOverdue.length,
      overdueIndividualNotifications: individualOverdue.length,
      incidentsRequiringDpa: requiringDpa.length,
      incidentsRequiringIndividual: requiringIndividual.length,
    };
  }

  // Filter incidents
  const filteredIncidents = state.incidents.filter((i) => {
    if (filters.status !== 'all' && i.status !== filters.status) return false;
    if (filters.severity !== 'all' && i.severity !== filters.severity) return false;
    if (filters.showOverdueOnly) {
      const dpaOverdue = isDpaOverdue(i.detectedAt, i.dpaNotifiedAt);
      const individualOverdue = isIndividualNotificationOverdue(
        i.severity,
        i.detectedAt,
        i.individualsNotifiedAt
      );
      return dpaOverdue || individualOverdue;
    }
    return true;
  });

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSecurityData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{state.error}</p>
          <button
            onClick={fetchSecurityData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Dashboard</h1>
              <p className="text-gray-600">GDPR breach notification and incident management</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() =>
                  setCreateModal({ shown: true, step: 'details', formData: {} })
                }
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Incident
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Open Incidents</p>
                <p className="text-3xl font-bold text-gray-900">{state.stats?.openIncidents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Critical/High</p>
                <p className="text-3xl font-bold text-red-600">
                  {(state.stats?.criticalIncidents || 0) + (state.stats?.highIncidents || 0)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">DPA Notifications</p>
                <p className="text-3xl font-bold text-green-600">
                  {state.stats?.notificationsSent}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Avg Resolution</p>
                <p className="text-3xl font-bold text-gray-900">
                  {state.stats?.avgResolutionHours}h
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
                  <FileWarning className="w-4 h-4" />
                  Incidents
                  {state.stats?.openIncidents > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                      {state.stats?.openIncidents}
                    </span>
                  )}
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
                  {(state.compliance?.overdueDpaNotifications || 0) > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                      {state.compliance?.overdueDpaNotifications} overdue
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'monitoring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Automated Monitoring
                </div>
              </button>
            </nav>
          </div>

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as BreachStatus | 'all' })
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="detected">Detected</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="contained">Contained</option>
                  <option value="remediated">Remediated</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={filters.severity}
                  onChange={(e) =>
                    setFilters({ ...filters, severity: e.target.value as BreachSeverity | 'all' })
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Severity</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showOverdueOnly}
                    onChange={(e) =>
                      setFilters({ ...filters, showOverdueOnly: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Show overdue only</span>
                </label>
              </div>

              {/* Incidents Table */}
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No incidents found</h3>
                  <p className="text-gray-500">All security incidents are resolved.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Incident
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Severity
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Affected Users
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Detected
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          GDPR Timeline
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map((incident) => (
                        <tr
                          key={incident.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="max-w-xs">
                              <a
                                href={`/settings/security/incidents/${incident.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                {incident.id}
                              </a>
                              <p className="text-sm text-gray-600 truncate" title={incident.description}>
                                {incident.description}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <SeverityBadge severity={incident.severity} />
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadgeComponent status={incident.status} />
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-900">
                              {formatNumber(incident.affectedUsersCount)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-900">
                              {formatDateTime(incident.detectedAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTimeSince(incident.detectedAt)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <DeadlineIndicator incident={incident} />
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setSelectedIncident(incident)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DPA Notification Compliance */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Article 33 Compliance
                      </h3>
                      <p className="text-sm text-gray-600">
                        DPA notification within 72 hours
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">72h Compliance Rate</span>
                      <span
                        className={`text-2xl font-bold ${
                          (state.compliance?.dpa72hCompliance || 0) >= 95
                            ? 'text-green-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {state.compliance?.dpa72hCompliance}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (state.compliance?.dpa72hCompliance || 0) >= 95
                            ? 'bg-green-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${state.compliance?.dpa72hCompliance}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Open incidents requiring DPA</span>
                      <span className="font-semibold">
                        {state.compliance?.incidentsRequiringDpa}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-600">Overdue notifications</span>
                      <span className="font-semibold text-red-700">
                        {state.compliance?.overdueDpaNotifications}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Individual Notification Compliance */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Article 34 Compliance
                      </h3>
                      <p className="text-sm text-gray-600">
                        Individual notification for high risk
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Bell className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Compliance Rate</span>
                      <span
                        className={`text-2xl font-bold ${
                          (state.compliance?.individualNotificationCompliance || 0) >= 95
                            ? 'text-green-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {state.compliance?.individualNotificationCompliance}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (state.compliance?.individualNotificationCompliance || 0) >= 95
                            ? 'bg-green-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${state.compliance?.individualNotificationCompliance}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Requiring notification</span>
                      <span className="font-semibold">
                        {state.compliance?.incidentsRequiringIndividual}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-600">Overdue notifications</span>
                      <span className="font-semibold text-red-700">
                        {state.compliance?.overdueIndividualNotifications}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/legal/breach-templates/dpa-notification.md"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    DPA Notification Template
                  </a>
                  <a
                    href="/legal/breach-templates/individual-notification.md"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Individual Notification Template
                  </a>
                  <a
                    href="/docs/security/incident-response.md"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Incident Response Plan
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Bulk Export Thresholds */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Bulk Export Thresholds
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Warning</span>
                      <span className="font-medium">{MONITORING_CONFIG.BULK_EXPORT.WARNING.toLocaleString()} records</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">High Alert</span>
                      <span className="font-medium">{MONITORING_CONFIG.BULK_EXPORT.HIGH.toLocaleString()} records</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">Critical</span>
                      <span className="font-medium text-red-600">
                        {MONITORING_CONFIG.BULK_EXPORT.CRITICAL.toLocaleString()} records
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detection Rules */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Detection Rules</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Bulk exports</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Failed login spikes</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Geographic anomalies</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">After-hours access</span>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Recent Alerts */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
                  {state.alerts.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent alerts</p>
                  ) : (
                    <div className="space-y-3">
                      {state.alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-lg ${
                            alert.severity === 'critical'
                              ? 'bg-red-50'
                              : alert.severity === 'high'
                              ? 'bg-amber-50'
                              : 'bg-blue-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {alert.severity === 'critical' && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium">{alert.type}</span>
                          </div>
                          <p className="text-xs text-gray-600">{alert.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeSince(alert.detectedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Incident Modal (placeholder) */}
      {createModal.shown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Security Incident
              </h3>
              <button
                onClick={() => setCreateModal({ shown: false, step: 'details', formData: {} })}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Security incidents should be created when a personal data breach is detected.
              This will trigger the GDPR incident response workflow.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCreateModal({ shown: false, step: 'details', formData: {} })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Would normally redirect to incident creation form
                  setCreateModal({ shown: false, step: 'details', formData: {} });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Detail Modal (placeholder) */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Incident Details</h3>
              <button onClick={() => setSelectedIncident(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <SeverityBadge severity={selectedIncident.severity} />
                <StatusBadgeComponent status={selectedIncident.status} />
                <span className="text-sm text-gray-500">{selectedIncident.id}</span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-sm text-gray-900">{selectedIncident.description}</p>
                {selectedIncident.descriptionInternal && (
                  <p className="text-sm text-gray-600 mt-1">
                    Internal: {selectedIncident.descriptionInternal}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Affected Users</h4>
                  <p className="text-sm text-gray-900">
                    {formatNumber(selectedIncident.affectedUsersCount)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Detected</h4>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(selectedIncident.detectedAt)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <a
                  href={`/settings/security/incidents/${selectedIncident.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Full Details
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboardPage;
