/**
 * DPA Gate - Prevents project creation until DPA is signed
 * Wraps project creation components
 * Ticket: REMY-257
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, ChevronRight } from 'lucide-react';

interface DpaGateProps {
  children: React.ReactNode;
  userId: string;
}

const DpaGate: React.FC<DpaGateProps> = ({ children, userId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasDpa, setHasDpa] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkDpaStatus();
  }, []);

  const checkDpaStatus = async () => {
    try {
      setChecking(true);
      const response = await fetch('/api/v1/dpa', {
        headers: { 'Authorization': `Bearer ${userId}` },
      });
      const data = await response.json();

      if (data.success && data.data?.hasSignedDpa) {
        setHasDpa(true);
      } else {
        setHasDpa(false);
      }
    } catch (err) {
      console.error('Failed to check DPA status:', err);
      // Default to false on error for safety
      setHasDpa(false);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const handleNavigateToOnboarding = () => {
    navigate('/onboarding');
  };

  const handleNavigateToSettings = () => {
    navigate('/settings/legal');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking DPA status...</p>
        </div>
      </div>
    );
  }

  if (!hasDpa) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 border-b border-red-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-900">Data Processing Agreement Required</h2>
                <p className="text-red-700">
                  Before creating a new project, you must sign the Data Processing Agreement
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Why is this required?</h3>
                  <p className="text-gray-600 text-sm">
                    REMY Analytics collects and processes personal data (such as session recordings 
                    and user interactions) on behalf of your organization. Under GDPR Article 28, 
                    we need a Data Processing Agreement in place before we can begin processing 
                    this data.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">You cannot create projects until you've signed the DPA</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This is a one-time requirement. Once signed, you can create unlimited projects.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleNavigateToOnboarding}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Complete Onboarding
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleNavigateToSettings}
                className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Sign DPA in Settings
              </button>
            </div>

            {/* Recheck */}
            <div className="mt-4 text-center">
              <button
                onClick={checkDpaStatus}
                disabled={checking}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {checking ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin inline-block">⟳</span> Checking...
                  </span>
                ) : (
                  "Already signed? Click to recheck"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DPA signed - render children
  return <>{children}</>;
};

export default DpaGate;
