/**
 * Consent Collection Flow Component
 * GDPR Article 7 Compliant Consent Collection
 * 
 * Requirements:
 * - Freely given, specific, informed, unambiguous
 * - Must explain legal basis for each purpose
 * - Must document what user is consenting to
 * - Must track presentation details
 * 
 * Ticket: REMY-261
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =====================================================
// Types
// =====================================================

export type ConsentType = 'analytics' | 'marketing' | 'functional';
export type LegalBasisType = 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';

export interface ConsentPurpose {
  id: string;
  type: ConsentType;
  legal_basis: LegalBasisType;
  title: string;
  description: string;
  details: string[];
  data_categories: string[];
  retention_period: string;
  recipients: string[];
  required: boolean;
}

export interface ConsentChoice {
  purpose_id: string;
  granted: boolean;
}

export interface ConsentCollectionData {
  user_id: string;
  project_id: string;
  choices: ConsentChoice[];
  timestamps: {
    presented_at: string;
    first_interaction_at?: string;
    decided_at: string;
  };
  metadata: {
    ui_component: string;
    ui_variant?: string;
    information_shown: Record<string, unknown>;
    time_to_decision_ms: number;
    decision_method: 'accept_all' | 'reject_all' | 'customize';
    device_info: {
      type?: string;
      screen_size?: string;
      language?: string;
      timezone?: string;
    };
  };
}

export interface ConsentCollectionFlowProps {
  userId: string;
  projectId: string;
  purposes: ConsentPurpose[];
  onComplete: (data: ConsentCollectionData) => void;
  onDismiss?: () => void;
  variant?: 'banner' | 'modal' | 'page';
  title?: string;
  description?: string;
  className?: string;
  showCustomize?: boolean;
  showReject?: boolean;
  requireAllPurposes?: boolean;
}

// =====================================================
// Component
// =====================================================

export const ConsentCollectionFlow: React.FC<ConsentCollectionFlowProps> = ({
  userId,
  projectId,
  purposes,
  onComplete,
  onDismiss,
  variant = 'banner',
  title = 'Before We Proceed',
  description,
  className = '',
  showCustomize = true,
  showReject = true,
  requireAllPurposes = false,
}) => {
  // State
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for tracking
  const presentedAtRef = useRef<string>(new Date().toISOString());
  const firstInteractionRef = useRef<string | undefined>();
  const decisionStartedAtRef = useRef<number>(Date.now());

  // Initialize choices
  useEffect(() => {
    const initialChoices: Record<string, boolean> = {};
    purposes.forEach(purpose => {
      initialChoices[purpose.id] = purpose.required;
    });
    setChoices(initialChoices);
  }, [purposes]);

  // Track first interaction
  const trackInteraction = useCallback(() => {
    if (!hasInteracted) {
      firstInteractionRef.current = new Date().toISOString();
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  // Handle choice change
  const handleChoiceChange = useCallback((purposeId: string, granted: boolean) => {
    trackInteraction();
    setChoices(prev => ({
      ...prev,
      [purposeId]: granted,
    }));
  }, [trackInteraction]);

  // Toggle details visibility
  const toggleDetails = useCallback((purposeId: string) => {
    trackInteraction();
    setShowDetails(prev => {
      const next = new Set(prev);
      if (next.has(purposeId)) {
        next.delete(purposeId);
      } else {
        next.add(purposeId);
      }
      return next;
    });
  }, [trackInteraction]);

  // Handle accept all
  const handleAcceptAll = useCallback(() => {
    trackInteraction();
    const allGranted: Record<string, boolean> = {};
    purposes.forEach(p => {
      allGranted[p.id] = true;
    });
    setChoices(allGranted);
    submitConsent(allGranted, 'accept_all');
  }, [purposes, trackInteraction]);

  // Handle reject all (non-required only)
  const handleRejectAll = useCallback(() => {
    trackInteraction();
    const allRejected: Record<string, boolean> = {};
    purposes.forEach(p => {
      allRejected[p.id] = p.required;
    });
    setChoices(allRejected);
    submitConsent(allRejected, 'reject_all');
  }, [purposes, trackInteraction]);

  // Handle save preferences
  const handleSavePreferences = useCallback(() => {
    submitConsent(choices, 'customize');
  }, [choices]);

  // Submit consent
  const submitConsent = useCallback((finalChoices: Record<string, boolean>, method: 'accept_all' | 'reject_all' | 'customize') => {
    setIsSubmitting(true);
    
    const timeToDecisionMs = Date.now() - decisionStartedAtRef.current;
    
    const consentData: ConsentCollectionData = {
      user_id: userId,
      project_id: projectId,
      choices: purposes.map(p => ({
        purpose_id: p.id,
        granted: finalChoices[p.id] ?? false,
      })),
      timestamps: {
        presented_at: presentedAtRef.current,
        first_interaction_at: firstInteractionRef.current,
        decided_at: new Date().toISOString(),
      },
      metadata: {
        ui_component: `consent-collection-${variant}`,
        information_shown: {
          purposes: purposes.map(p => p.id),
          legal_bases: purposes.map(p => p.legal_basis),
          data_categories: [...new Set(purposes.flatMap(p => p.data_categories))],
          retention_periods: purposes.map(p => p.retention_period),
        },
        time_to_decision_ms: timeToDecisionMs,
        decision_method: method,
        device_info: {
          type: getDeviceType(),
          screen_size: getScreenSize(),
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    };

    onComplete(consentData);
    setIsSubmitting(false);
  }, [purposes, userId, projectId, variant, onComplete]);

  // Get device type
  function getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  // Get screen size category
  function getScreenSize(): string {
    const width = window.innerWidth;
    if (width < 640) return 'small';
    if (width < 1024) return 'medium';
    return 'large';
  }

  // Check if any required purposes are not granted
  const hasUngrantedRequired = purposes.some(
    p => p.required && !choices[p.id]
  );

  // Get grouped purposes by consent type
  const groupedPurposes = purposes.reduce((acc, purpose) => {
    if (!acc[purpose.type]) acc[purpose.type] = [];
    acc[purpose.type].push(purpose);
    return acc;
  }, {} as Record<ConsentType, ConsentPurpose[]>);

  // =====================================================
  // RENDER
  // =====================================================

  const containerClasses = `
    ${getVariantClasses(variant)}
    ${className}
  `;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-sm text-gray-600">
            {description || getDefaultDescription(purposes)}
          </p>
        </div>
        {onDismiss && variant === 'modal' && (
          <button
            onClick={onDismiss}
            className="ml-4 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Legal Basis Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Your Rights Under GDPR:</p>
            <ul className="mt-1 ml-4 list-disc list-outside">
              <li>You can change these settings at any time</li>
              <li>Withdrawing consent is as easy as giving it</li>
              <li>Required processing is necessary for our contract</li>
            </ul>
            <p className="mt-2 text-xs">
              Legal basis: {getLegalBasisNotice(purposes)}
            </p>
          </div>
        </div>
      </div>

      {/* Consent Options */}
      {!isCustomizing ? (
        <div className="space-y-3">
          {/* Simplified View */}
          {Object.entries(groupedPurposes).map(([type, typePurposes]) => (
            <cdiv key={type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900 capitalize">{type} Cookies</h3>
                  <p className="text-sm text-gray-500">{typePurposes.length} purpose{typePurposes.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {typePurposes.some(p => p.required) ? (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Required</span>
                  ) : (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={typePurposes.every(p => choices[p.id])}
                        onChange={(e) => {
                          trackInteraction();
                          const newValue = e.target.checked;
                          const newChoices = { ...choices };
                          typePurposes.forEach(p => {
                            if (!p.required) newChoices[p.id] = newValue;
                          });
                          setChoices(newChoices);
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Customization View */}
          {purposes.map((purpose) => (
            <div key={purpose.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{purpose.title}</h3>
                      {purpose.required && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{purpose.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Legal basis: <span className="font-medium">{getLegalBasisDisplayName(purpose.legal_basis)}</span>
                      {' • '}
                      Retention: {purpose.retention_period}
                    </p>
                  </div>
                  
                  <div className="ml-4">
                    {purpose.required ? (
                      <span className="text-sm text-gray-500">Always on</span>
                    ) : (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={choices[purpose.id] || false}
                          onChange={(e) => handleChoiceChange(purpose.id, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                <button
                  onClick={() => toggleDetails(purpose.id)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {showDetails.has(purpose.id) ? 'Hide details' : 'Show details'}
                  <svg 
                    className={`w-4 h-4 transition-transform ${showDetails.has(purpose.id) ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDetails.has(purpose.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">What we collect:</span>
                        <ul className="mt-1 ml-4 list-disc list-outside text-gray-600">
                          {purpose.data_categories.map((cat, i) => (
                            <li key={i}>{cat}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="font-medium">Why:</span><span className="text-gray-600"> {purpose.details.join('; ')}</span>
                      </div>
                      
                      {purpose.recipients.length > 0 && (
                        <div>
                          <span className="font-medium">Recipients:</span><span className="text-gray-600"> {purpose.recipients.join(', ')}</span>
                        </div>
                      )}

                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">Legal basis justification:</span>
                        <p className="text-gray-600 mt-1 text-xs">{purpose.legal_basis}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {hasUngrantedRequired && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <div className="flex gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Some required purposes are not enabled. You must accept required processing to continue.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={`mt-6 ${variant === 'banner' ? 'flex flex-col sm:flex-row gap-3' : 'flex flex-col gap-3'}`}>
        {!isCustomizing ? (
          <>
            <button
              onClick={handleAcceptAll}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'Accept All'}
            </button>
            
            {showReject && (
              <button
                onClick={handleRejectAll}
                disabled={isSubmitting || hasUngrantedRequired}
                className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject Non-Essential
              </button>
            )}
            
            {showCustomize && (
              <button
                onClick={() => {
                  trackInteraction();
                  setIsCustomizing(true);
                }}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-white text-blue-600 border border-blue-200 font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Customize Preferences
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleSavePreferences}
              disabled={isSubmitting || hasUngrantedRequired}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Preferences'}
            </button>
            
            <button
              onClick={() => setIsCustomizing(false)}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back to Simple View
            </button>
          </>
        )}
      </div>

      {/* Footer Links */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a href="/legal/privacy-policy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a>
          <a href="/legal/cookies" target="_blank" className="text-blue-600 hover:underline">Cookie Policy</a>
          <a href="/settings/privacy" className="text-blue-600 hover:underline">Privacy Settings</a>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          You can change your preferences at any time in your account settings.
        </p>
      </div>
    </div>
  );
};

// =====================================================
// Helper Functions
// =====================================================

function getVariantClasses(variant: 'banner' | 'modal' | 'page'): string {
  const baseClasses = 'bg-white';
  
  switch (variant) {
    case 'banner':
      return `${baseClasses} fixed bottom-0 left-0 right-0 border-t border-gray-200 shadow-lg p-6 z-50`;
    case 'modal':
      return `${baseClasses} rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto`;
    case 'page':
      return `${baseClasses} max-w-3xl mx-auto p-8`;
    default:
      return baseClasses;
  }
}

function getDefaultDescription(purposes: ConsentPurpose[]): string {
  const hasRequired = purposes.some(p => p.required);
  const hasOptional = purposes.some(p => !p.required);
  
  const parts: string[] = [];
  if (hasRequired) parts.push('We process some data that is necessary for our service (contractual basis)');
  if (hasOptional) parts.push('and ask for your consent for additional processing options');
  
  return parts.join(' ') + '. You can manage your preferences below.';
}

function getLegalBasisDisplayName(basis: LegalBasisType): string {
  const names: Record<LegalBasisType, string> = {
    consent: 'Consent (Art 6(1)(a))',
    contract: 'Contract (Art 6(1)(b))',
    legitimate_interest: 'Legitimate Interest (Art 6(1)(f))',
    legal_obligation: 'Legal Obligation (Art 6(1)(c))',
  };
  return names[basis] || basis;
}

function getLegalBasisNotice(purposes: ConsentPurpose[]): string {
  const bases = new Set(purposes.map(p => p.legal_basis));
  const parts: string[] = [];
  
  if (bases.has('consent')) parts.push('consent for optional processing');
  if (bases.has('contract')) parts.push('contractual necessity for essential features');
  if (bases.has('legitimate_interest')) parts.push('legitimate interest for improvements');
  if (bases.has('legal_obligation')) parts.push('legal obligations we must comply with');
  
  return parts.join('; ') || 'various legal bases under GDPR;';
}

export default ConsentCollectionFlow;
