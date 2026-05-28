/**
 * DPA Onboarding Step
 * Required step for GDPR compliance
 * Ticket: REMY-257
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DpaStatusResponse } from '../../lib/dpa/utils';

interface DpaStepProps {
  onComplete: () => void;
  onSkip?: () => void;
  userId: string;
}

interface SignatureForm {
  name: string;
  title: string;
  acceptTerms: boolean;
}

const DpaStep: React.FC<DpaStepProps> = ({ onComplete, onSkip, userId }) => {
  const [loading, setLoading] = useState(true);
  const [hasDpa, setHasDpa] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<{ version: string; content: string }> | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [formData, setFormData] = useState<SignatureForm>({
    name: '',
    title: '',
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check DPA status on mount
  useEffect(() => {
    checkDpaStatus();
  }, []);

  const checkDpaStatus = async () => {
    try {
      setLoading(true);
      
      // Check if user already has signed DPA
      const statusRes = await fetch('/api/v1/dpa', {
        headers: { 'Authorization': `Bearer ${userId}` },
      });
      const statusData = await statusRes.json();

      if (statusData.success && statusData.data?.hasSignedDpa) {
        setHasDpa(true);
        setLoading(false);
        // Auto-complete if already signed
        onComplete();
        return;
      }

      // Fetch current version
      const versionRes = await fetch('/api/v1/dpa/current', {
        headers: { 'Authorization': `Bearer ${userId}` },
      });
      const versionData = await versionRes.json();

      if (versionData.success) {
        setCurrentVersion(versionData.data);
      }
    } catch (err) {
      console.error('Failed to check DPA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      setError('You must accept the DPA terms to continue');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/dpa/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept DPA');
      }

      setSuccess(true);
      setHasDpa(true);
      
      // Delay to show success message
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept DPA');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Checking DPA status...</p>
      </div>
    );
  }

  // If already signed, show completion state
  if (hasDpa) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-green-900 mb-2">DPA Already Signed! ✓</h2>
          <p className="text-green-700 mb-6">
            Your Data Processing Agreement is already on file. You can proceed to create projects.
          </p>
          <button
            onClick={onComplete}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Processing Agreement</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Before you can create projects, we need you to review and accept our 
          Data Processing Agreement to comply with GDPR requirements.
        </p>
      </div>

      {/* Required Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800 font-medium">Required for Project Creation</p>
          <p className="text-sm text-amber-700">
            You won't be able to create projects until you sign the DPA. This is a one-time requirement.
          </p>
        </div>
      </div>

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-900 mb-2">DPA Signed Successfully!</h2>
          <p className="text-green-700">Redirecting you to continue...</p>
        </div>
      ) : (
        <>
          {/* Agreement Preview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="font-medium">DPA Version {currentVersion?.version || '1.0'}</span>
              </div>
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {showFullText ? (
                  <>Hide <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>Read Full Text <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            </div>
            
            <div 
              className={`${showFullText ? 'max-h-96' : 'max-h-40'} overflow-hidden transition-all duration-300`}
            >
              <div className="p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap overflow-auto h-full">
                {currentVersion?.content || 'Loading DPA content...'}
              </div>
            </div>
            
            {!showFullText && (
              <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                <button
                  onClick={() => setShowFullText(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
                >
                  Show Full Agreement
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              {
                title: 'Processing Subject',
                content: 'Session recording, analytics, error tracking for website optimization',
              },
              {
                title: 'Data Types',
                content: 'IP address (hashed), user agent, page interactions, timestamps',
              },
              {
                title: 'Data Subjects',
                content: 'Website visitors and users of your sites',
              },
              {
                title: 'Security Measures',
                content: 'TLS 1.3, AES-256 encryption, SOC 2 Type II certification',
              },
            ].map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.content}</p>
              </div>
            ))}
          </div>

          {/* Signature Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign the Agreement</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title/Role *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Data Protection Officer"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="acceptTermsOnboarding"
                  checked={formData.acceptTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                  className="mt-1 w-4 h-4 text-blue-600 rounded"
                  required
                />
                <label htmlFor="acceptTermsOnboarding" className="text-sm text-gray-700">
                  I have read and agree to the Data Processing Agreement (Version {currentVersion?.version || '1.0'}).
                  I confirm that I have the authority to sign this agreement on behalf of my organization.
                  I understand this creates a legally binding contract under GDPR Article 28.
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Skip for Now
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.acceptTerms || !formData.name || !formData.title}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⌛</span>
                      Signing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Sign DPA Agreement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default DpaStep;
