/**
 * Consent Withdrawal Component
 * GDPR Article 7 Compliance: Withdrawal as Easy as Giving Consent
 * 
 * Ticket: REMY-261
 */

import React, { useState, useEffect, useCallback } from 'react';

// =====================================================
// Types
// =====================================================

type ConsentType = 'analytics' | 'marketing' | 'functional';
type WithdrawalMethod = 'one_click' | 'two_step' | 'email_request';

export interface UserConsent {
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_timestamp: string;
  consent_version: string;
  withdrawal_timestamp?: string;
  legal_basis_description: string;
  purpose_description: string;
}

export interface WithdrawalRequest {
  user_id: string;
  project_id: string;
  consent_types: ConsentType[];
  withdrawal_method: WithdrawalMethod;
  withdrawal_timestamp: string;
  steps_required: number;
  time_to_withdraw_seconds: number;
  confirmation_email?: string;
  feedback?: string;
}

export interface ConsentWithdrawalProps {
  userId: string;
  projectId: string;
  consents: UserConsent[];
  onWithdraw: (request: WithdrawalRequest) => Promise<void>;
  onCancel?: () => void;
  variant?: 'settings' | 'modal' | 'page';
  showFeedback?: boolean;
  requireConfirmation?: boolean;
}

interface WithdrawalStep {
  number: number;
  title: string;
  description: string;
}

// =====================================================
// Component
// =====================================================

export const ConsentWithdrawal: React.FC<ConsentWithdrawalProps> = ({
  userId,
  projectId,
  consents,
  onWithdraw,
  onCancel,
  variant = 'settings',
  showFeedback = true,
  requireConfirmation = true,
}) => {
  // State
  const [selectedConsents, setSelectedConsents] = useState<Set<ConsentType>>(new Set());
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [totalSteps, setTotalSteps] = useState<number>(requireConfirmation ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawn, setIsWithdrawn] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [withdrawalMethod, setWithdrawalMethod] = useState<WithdrawalMethod>('one_click');
  
  // Filter to only active consents
  const activeConsents = consents.filter(
    c => c.consent_granted && !c.withdrawal_timestamp
  );

  // Calculate withdrawal method based on selection
  useEffect(() => {
    if (selectedConsents.size > 1 && requireConfirmation) {
      setWithdrawalMethod('one_click');
    } else if (requireConfirmation) {
      setWithdrawalMethod('two_step');
    } else {
      setWithdrawalMethod('one_click');
    }
    setTotalSteps(requireConfirmation ? 2 : 1);
  }, [selectedConsents.size, requireConfirmation]);

  // Handle consent selection
  const handleConsentToggle = useCallback((consentType: ConsentType) => {
    setSelectedConsents(prev => {
      const next = new Set(prev);
      if (next.has(consentType)) {
        next.delete(consentType);
      } else {
        next.add(consentType);
      }
      return next;
    });
  }, []);

  // Handle select all (only withdrawable types)
  const handleSelectAll = useCallback(() => {
    const allTypes = activeConsents.map(c => c.consent_type);
    setSelectedConsents(new Set(allTypes));
  }, [activeConsents]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setSelectedConsents(new Set());
  }, []);

  // Handle withdrawal submission
  const handleWithdraw = useCallback(async () => {
    if (selectedConsents.size === 0) return;

    setIsSubmitting(true);
    const timeToWithdraw = Math.floor((Date.now() - startTime) / 1000);

    const request: WithdrawalRequest = {
      user_id: userId,
      project_id: projectId,
      consent_types: Array.from(selectedConsents),
      withdrawal_method: withdrawalMethod,
      withdrawal_timestamp: new Date().toISOString(),
      steps_required: currentStep,
      time_to_withdraw_seconds: timeToWithdraw,
      feedback: feedback || undefined,
    };

    try {
      await onWithdraw(request);
      setIsWithdrawn(true);
    } catch (error) {
      // Error handled by caller
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedConsents,
    userId,
    projectId,
    withdrawalMethod,
    currentStep,
    startTime,
    feedback,
    onWithdraw,
  ]);

  // Go to confirmation step
  const handleProceedToConfirm = useCallback(() => {
    if (selectedConsents.size > 0) {
      setCurrentStep(2);
    }
  }, [selectedConsents.size]);

  // Go back to selection
  const handleBackToSelection = useCallback(() => {
    setCurrentStep(1);
  }, []);

  // Reset & close
  const handleClose = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // =====================================================
  // Success State
  // =====================================================

  if (isWithdrawn) {
    return (
      <div className={getContainerClasses(variant)}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Consent Withdrawn</h2>
          <p className="text-gray-600 mb-6">
            {selectedConsents.size === 1 
              ? `You have successfully withdrawn consent for ${Array.from(selectedConsents)[0]}.`
              : `You have successfully withdrawn consent for ${selectedConsents.size} processing categories.`
            }
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-blue-900 mb-2">Your Rights</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>Your withdrawal has been recorded</li>
              <li>We will stop processing based on this consent immediately</li>
              <li>This does not affect processing based on other legal bases (e.g., contractual necessity)</li>
              <li>You can re-grant consent at any time</li>
            </ul>
          </div>

          <div className="text-sm text-gray-500">
            <p>A confirmation email has been sent to your registered address.</p>
            <p className="mt-2">Withdrew in {(Date.now() - startTime) / 1000}s via {withdrawalMethod.replace('_', ' ')} method.</p>
          </div>

          <button
            onClick={handleClose}
            className="mt-6 px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // Confirmation Step
  // =====================================================

  if (currentStep === 2) {
    return (
      <div className={getContainerClasses(variant)}>
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <span>Step 2 of {totalSteps}</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full ml-3">
              <div className="h-full bg-blue-600 rounded-full w-full"></div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Withdrawal</h2>
          <p className="text-gray-600">
            Please confirm you want to withdraw consent for the following:
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-amber-800">
              <p className="font-medium">Impact of Withdrawal:</p>
              <ul className="mt-1 ml-4 list-disc list-outside space-y-1">
                <li>We will immediately stop collecting and processing data based on this consent</li>
                <li>Your experience may be affected (e.g., no personalization, analytics-based recommendations)</li>
                <li>This does not affect data processed before withdrawal</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="font-medium text-gray-700">Selected for Withdrawal:</span>
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from(selectedConsents).map(consentType => {
              const consent = activeConsents.find(c => c.consent_type === consentType);
              return (
                <div key={consentType} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium capitalize">{consentType}</span>
                    {consent && (
                      <p className="text-sm text-gray-500">{consent.purpose_description}</p>
                    )}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">To be withdrawn</span>
                </div>
              );
            })}
          </div>
        </div>

        {showFeedback && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Why are you withdrawing consent? This helps us improve."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleBackToSelection}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Back to Selection
          </button>
          
          <button
            onClick={handleWithdraw}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // Selection Step (Default)
  // =====================================================

  return (
    <div className={getContainerClasses(variant)}>
      <div className="mb-6">
        {totalSteps > 1 && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <span>Step 1 of {totalSteps}</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full ml-3">
              <div className="h-full bg-blue-600 rounded-full w-1/2"></div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-2">Privacy Settings</h2>
        <p className="text-gray-600">
          You can view and manage your consent preferences here. Withdrawing consent is as easy as giving it.
        </p>
      </div>

      {activeConsents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p>You haven't granted any optional consents.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear Selection
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {activeConsents.map((consent) => (
              <div
                key={consent.consent_type}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedConsents.has(consent.consent_type)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleConsentToggle(consent.consent_type)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedConsents.has(consent.consent_type)
                            ? 'border-red-500 bg-red-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedConsents.has(consent.consent_type) && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium capitalize">{consent.consent_type}</h3>
                        <p className="text-sm text-gray-500">{consent.purpose_description}</p>
                      </div>
                    </div>

                    <div className="mt-2 ml-8 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {consent.legal_basis_description}
                        </span>
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded">
                          Consent v{consent.consent_version}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Granted: {new Date(consent.consent_timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedConsents.size > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>{selectedConsents.size}</strong> consent{selectedConsents.size !== 1 ? 's' : ''} selected for withdrawal
                    </p>
                    <p className="mt-1">You can withdraw all at once (1 step) or proceed to review.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleWithdraw}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Processing...' : `Withdraw Now (1 step)`}
                </button>

                {requireConfirmation && (
                  <button
                    onClick={handleProceedToConfirm}
                    className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Review Before Withdrawal
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Non-withdrawable consents info */}
      {<div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-2">Why can't I withdraw some processing?</p>
          <p>
            Some processing is based on other legal grounds under GDPR (such as contractual necessity 
            or legal obligations). These cannot be withdrawn but are limited to what's absolutely necessary.
          </p>
          <a href="/legal/privacy-policy" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 mt-2">
            Learn more about legal bases
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>}
    </div>
  );
};

// =====================================================
// Helper Functions
// =====================================================

function getContainerClasses(variant: 'settings' | 'modal' | 'page'): string {
  const baseClasses = 'bg-white';
  
  switch (variant) {
    case 'settings':
      return `${baseClasses} max-w-2xl mx-auto`;
    case 'modal':
      return `${baseClasses} rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto`;
    case 'page':
      return `${baseClasses} max-w-3xl mx-auto py-8`;
    default:
      return baseClasses;
  }
}

export default ConsentWithdrawal;
