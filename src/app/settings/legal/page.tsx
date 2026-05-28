/**
 * Legal Settings Page - DPA Management
 * Route: /settings/legal
 * Ticket: REMY-257
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Clock,
  Shield,
  History,
  ChevronRight,
  X
} from 'lucide-react';
import {
  DpaAgreement,
  DpaStatusResponse,
  DpaAcceptanceResponse,
  CURRENT_DPA_VERSION,
} from '../../../lib/dpa/utils';

// Types
interface DpaState {
  loading: boolean;
  error: string | null;
  status: DpaStatusResponse | null;
  currentVersion: { version: string; content: string; effectiveDate: string } | null;
}

interface SignatureForm {
  name: string;
  title: string;
  acceptTerms: boolean;
}

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    signed: 'bg-green-100 text-green-800 border-green-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    expired: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  const icons: Record<string, React.ReactNode> = {
    signed: <CheckCircle className="w-4 h-4 mr-1" />,
    pending: <Clock className="w-4 h-4 mr-1" />,
    expired: <AlertCircle className="w-4 h-4 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || styles.pending}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Main component
const LegalSettingsPage: React.FC = () => {
  const [state, setState] = useState<DpaState>({
    loading: true,
    error: null,
    status: null,
    currentVersion: null,
  });

  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState<SignatureForm>({
    name: '',
    title: '',
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch DPA status
  const fetchDpaStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Fetch status
      const statusRes = await fetch('/api/v1/dpa', {
        headers: { 'Authorization': 'Bearer mock-user-id' },
      });
      const statusData = await statusRes.json();

      if (!statusData.success) {
        throw new Error(statusData.error || 'Failed to load DPA status');
      }

      // Fetch current version
      const versionRes = await fetch('/api/v1/dpa/current', {
        headers: { 'Authorization': 'Bearer mock-user-id' },
      });
      const versionData = await versionRes.json();

      setState({
        loading: false,
        error: null,
        status: statusData.data,
        currentVersion: versionData.data,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    fetchDpaStatus();
  }, [fetchDpaStatus]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      setSubmitError('You must accept the DPA terms to continue');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/v1/dpa/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-user-id',
        },
        body: JSON.stringify(formData),
      });

      const data: DpaAcceptanceResponse | { success: false; error: string } = await response.json();

      if (!response.ok || !('success' in data) || !data.success) {
        throw new Error('error' in data ? data.error : 'Failed to accept DPA');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
        fetchDpaStatus();
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to accept DPA');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download certificate
  const handleDownload = async (agreementId: string) => {
    try {
      const response = await fetch(`/api/v1/dpa/certificate?id=${agreementId}`, {
        headers: { 'Authorization': 'Bearer mock-user-id' },
      });

      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dpa-certificate-${agreementId.substring(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download certificate. Please try again.');
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format datetime
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading DPA status...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading DPA</h2>
          <p className="text-gray-600 mb-4">{state.error}</p>
          <button
            onClick={fetchDpaStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasSignedDpa = state.status?.hasSignedDpa ?? false;
  const latestAgreement = state.status?.latestAgreement;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal Settings</h1>
          <p className="text-gray-600">Manage your Data Processing Agreements and legal documents</p>
        </div>

        {/* DPA Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${hasSignedDpa ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Shield className={`w-6 h-6 ${hasSignedDpa ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Data Processing Agreement</h2>
                  <p className="text-sm text-gray-600">
                    GDPR Article 28 compliant processing agreement for session recording and analytics
                  </p>
                </div>
              </div>
              <StatusBadge status={hasSignedDpa ? 'signed' : 'pending'} />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-b border-gray-200">
            {hasSignedDpa && latestAgreement ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Version</p>
                  <p className="font-medium">{latestAgreement.dpa_version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Signed Date</p>
                  <p className="font-medium">{formatDate(latestAgreement.signed_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Agreement ID</p>
                  <p className="font-mono text-sm">{latestAgreement.id.substring(0, 16)}...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <p>You have not yet signed the required Data Processing Agreement</p>
              </div>
            )}
          </div>

          <div className="p-6 flex flex-wrap gap-3">
            {hasSignedDpa && latestAgreement ? (
              <>
                <button
                  onClick={() => handleDownload(latestAgreement.id)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Certificate
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <History className="w-4 h-4" />
                  View History
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Review & Sign DPA
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <History className="w-4 h-4" />
                  View History
                </button>
              </>
            )}
          </div>
        </div>

        {/* Current Version Info */}
        {state.currentVersion && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Current DPA Version</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Version {state.currentVersion.version} • Effective {formatDate(state.currentVersion.effectiveDate)}
                </p>
                <p className="text-sm text-blue-700">
                  This Data Processing Agreement complies with GDPR Article 28 requirements for data processors.
                  It covers session recording, analytics processing, and data subject rights handling.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DPA Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Review Data Processing Agreement</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {submitSuccess ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-900 mb-2">DPA Signed Successfully!</h3>
                  <p className="text-gray-600">You can now create projects and use all REMY features.</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-64 overflow-auto text-sm text-gray-700">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {state.currentVersion?.content.substring(0, 2000)}
                      {state.currentVersion?.content.length > 2000 && '...'}
                    </pre>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Data Protection Officer"
                        required
                      />
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                        I have read and agree to the Data Processing Agreement. I understand that by signing,
                        I am authorizing REMY Analytics to process personal data on behalf of my organization
                        in accordance with GDPR Article 28.
                      </label>
                    </div>

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.acceptTerms}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? 'Signing...' : 'Sign DPA'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">DPA Agreement History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {state.status?.agreementHistory && state.status.agreementHistory.length > 0 ? (
                <div className="space-y-3">
                  {state.status.agreementHistory.map((agreement) => (
                    <div
                      key={agreement.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">Version {agreement.dpa_version}</span>
                          <StatusBadge status={agreement.status} />
                        </div>
                        {agreement.status === 'signed' && (
                          <button
                            onClick={() => handleDownload(agreement.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Signed: {formatDateTime(agreement.signed_at)}</p>
                        {agreement.expires_at && (
                          <p>Expires: {formatDate(agreement.expires_at)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No DPA agreement history found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalSettingsPage;
