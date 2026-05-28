/**
 * Legal Basis Utilities - GDPR Article 6 Compliance
 * Processing activity documentation and legal basis management
 * Ticket: REMY-261
 */

import { createHash } from 'crypto';

// =====================================================
// Types
// =====================================================

export type LegalBasisType = 
  | 'consent' 
  | 'contract' 
  | 'legal_obligation' 
  | 'vital_interests' 
  | 'public_task' 
  | 'legitimate_interest';

export type ProcessingPurpose = 
  | 'authentication'
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'service_delivery'
  | 'customer_support'
  | 'legal_compliance'
  | 'fraud_prevention'
  | 'research'
  | 'data_portability';

export type LegalBasisStatus = 'active' | 'suspended' | 'deprecated';
export type ConsentMechanism = 'explicit' | 'implied' | 'opt_out' | 'not_required';

export interface ProcessingActivity {
  id: string;
  activity_id: string;
  activity_name: string;
  activity_description: string;
  legal_basis: LegalBasisType;
  legal_basis_justification: string;
  processing_purpose: ProcessingPurpose;
  data_categories: string[];
  data_subjects: string[];
  internal_recipients?: string[];
  external_recipients?: string[];
  retention_period_days: number;
  storage_locations?: string[];
  legitimate_interest_description?: string;
  legitimate_interest_impact_assessment?: string;
  legitimate_interest_balancing_completed?: boolean;
  consent_mechanism?: ConsentMechanism;
  consent_collection_ui_component?: string;
  consent_withdrawal_mechanism?: string;
  document_reference?: string;
  approved_by?: string;
  approved_at?: string;
  version: string;
  status: LegalBasisStatus;
  deprecated_at?: string;
  deprecated_reason?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface LegalBasisAuditEntry {
  id: string;
  activity_id: string;
  change_type: 'created' | 'updated' | 'deprecated' | 'approved';
  legal_basis?: LegalBasisType;
  legal_basis_justification?: string;
  status?: LegalBasisStatus;
  version?: string;
  previous_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changed_by?: string;
  changed_at: string;
  ip_address_hash?: string;
  user_agent_hash?: string;
}

export interface ConsentCollectionEvent {
  id: string;
  consent_record_id?: string;
  event_type: 'presented' | 'accepted' | 'rejected' | 'customized';
  user_id: string;
  project_id: string;
  session_id?: string;
  ui_component: string;
  ui_variant?: string;
  information_shown: {
    legal_basis: LegalBasisType;
    purposes: string[];
    data_retention?: string;
    recipients?: string[];
    [key: string]: unknown;
  };
  time_to_decision_ms?: number;
  decision_method?: string;
  device_type?: string;
  screen_size?: string;
  accessibility_features_enabled?: boolean;
  ip_address_hash?: string;
  user_agent_hash?: string;
  language?: string;
  timezone?: string;
  occurred_at: string;
}

export interface ConsentWithdrawalEvent {
  id: string;
  consent_record_id?: string;
  user_id: string;
  project_id: string;
  withdrawal_timestamp: string;
  withdrawal_channel: string;
  withdrawal_method: string;
  steps_required: number;
  time_to_withdraw_seconds?: number;
  processed_at?: string;
  processed_by?: string;
  confirmation_sent?: boolean;
  confirmation_sent_at?: string;
  withdrawal_reason?: string;
  user_feedback?: string;
  ip_address_hash?: string;
  user_agent_hash?: string;
}

export interface UserConsentHistory {
  user_id: string;
  project_id?: string;
  consent_records: Array<{
    consent_type: string;
    consent_granted: boolean;
    consent_timestamp: string;
    withdrawal_timestamp?: string;
    legal_basis?: LegalBasisType;
    purpose?: ProcessingPurpose;
    activity_name?: string;
  }>;
  collection_events: Array<{
    event_type: string;
    occurred_at: string;
    ui_component: string;
  }>;
  withdrawal_events: Array<{
    withdrawal_timestamp: string;
    withdrawal_method: string;
    steps_required: number;
  }>;
}

export interface LegalBasisComplianceReport {
  generated_at: string;
  project_id?: string;
  processing_activities_summary: {
    total_activities: number;
    by_legal_basis: Record<string, number>;
    active_count: number;
    deprecated_count: number;
    without_approval: number;
  };
  consent_compliance: {
    total_consents: number;
    with_documented_legal_basis: number;
    without_legal_basis: number;
    withdrawal_availability: {
      has_withdrawal_mechanism: boolean;
      withdrawal_methods_available: string[];
    };
  };
  audit_trail_completeness: {
    total_audit_entries: number;
    activities_with_audit_history: number;
  };
}

export interface CreateProcessingActivityRequest {
  activity_id: string;
  activity_name: string;
  activity_description: string;
  legal_basis: LegalBasisType;
  legal_basis_justification: string;
  processing_purpose: ProcessingPurpose;
  data_categories?: string[];
  data_subjects?: string[];
  retention_period_days: number;
  legitimate_interest_description?: string;
  legitimate_interest_impact_assessment?: string;
  consent_mechanism?: ConsentMechanism;
  consent_withdrawal_mechanism?: string;
  document_reference?: string;
}

export interface WithdrawalEaseCheck {
  consent_type: string;
  can_withdraw: boolean;
  withdrawal_steps: number;
  withdrawal_methods: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// GDPR Article 6: Legal Basis Descriptions
// =====================================================

export const LEGAL_BASIS_DESCRIPTIONS: Record<LegalBasisType, {
  article: string;
  name: string;
  description: string;
  requirements: string[];
}> = {
  consent: {
    article: 'Art 6(1)(a)',
    name: 'Consent',
    description: 'Data subject has given consent to the processing',
    requirements: [
      'Freely given',
      'Specific',
      'Informed',
      'Unambiguous',
      'Demonstrable withdrawal mechanism',
      'As easy to withdraw as to give',
    ],
  },
  contract: {
    article: 'Art 6(1)(b)',
    name: 'Contractual Necessity',
    description: 'Processing is necessary for the performance of a contract',
    requirements: [
      'Contract must be in place or requested',
      'Processing must be objectively necessary',
      'Not applicable to pre-contractual marketing',
    ],
  },
  legal_obligation: {
    article: 'Art 6(1)(c)',
    name: 'Legal Obligation',
    description: 'Processing is necessary for compliance with a legal obligation',
    requirements: [
      'Must be EU or Member State law',
      'Must be a specific legal obligation',
      'Document the applicable law',
    ],
  },
  vital_interests: {
    article: 'Art 6(1)(d)',
    name: 'Vital Interests',
    description: 'Processing is necessary to protect vital interests',
    requirements: [
      'Life or physical integrity at stake',
      'For the data subject or another person',
      'Typically emergency scenarios',
    ],
  },
  public_task: {
    article: 'Art 6(1)(e)',
    name: 'Public Task',
    description: 'Processing necessary for public interest or official authority',
    requirements: [
      'Must be public interest under law',
      'Or exercise of official authority',
      'Typically for public bodies',
    ],
  },
  legitimate_interest: {
    article: 'Art 6(1)(f)',
    name: 'Legitimate Interest',
    description: 'Processing necessary for legitimate interests (balancing test required)',
    requirements: [
      'Must conduct Legitimate Interest Assessment',
      'Balance controller interests vs individual rights',
      'Cannot override fundamental rights',
      'Must document the balancing',
    ],
  },
};

// =====================================================
// Processing Purpose Descriptions
// =====================================================

export const PROCESSING_PURPOSE_DESCRIPTIONS: Record<ProcessingPurpose, {
  description: string;
  typical_legal_bases: LegalBasisType[];
  typical_retention: string;
}> = {
  authentication: {
    description: 'Verifying user identity for account access',
    typical_legal_bases: ['contract', 'legitimate_interest'],
    typical_retention: 'Duration of account plus legal retention period',
  },
  analytics: {
    description: 'Collecting usage data to improve services',
    typical_legal_bases: ['consent', 'legitimate_interest'],
    typical_retention: '26 months',
  },
  marketing: {
    description: 'Promotional communications and advertising',
    typical_legal_bases: ['consent', 'legitimate_interest'],
    typical_retention: 'Until withdrawal + legal retention',
  },
  personalization: {
    description: 'Customizing user experience based on preferences',
    typical_legal_bases: ['consent', 'contract', 'legitimate_interest'],
    typical_retention: 'Duration of account',
  },
  service_delivery: {
    description: 'Providing core platform functionality',
    typical_legal_bases: ['contract', 'legitimate_interest'],
    typical_retention: 'Duration of contract plus legal period',
  },
  customer_support: {
    description: 'Support and issue resolution',
    typical_legal_bases: ['contract', 'legitimate_interest'],
    typical_retention: '2 years from issue closure',
  },
  legal_compliance: {
    description: 'Compliance with legal obligations',
    typical_legal_bases: ['legal_obligation'],
    typical_retention: 'As required by applicable law',
  },
  fraud_prevention: {
    description: 'Detecting and preventing fraudulent activity',
    typical_legal_bases: ['legitimate_interest', 'legal_obligation'],
    typical_retention: '5 years from detection',
  },
  research: {
    description: 'Statistical and research purposes',
    typical_legal_bases: ['consent', 'legitimate_interest'],
    typical_retention: 'As specified in research protocol',
  },
  data_portability: {
    description: 'Facilitating data subject rights',
    typical_legal_bases: ['legal_obligation', 'contract'],
    typical_retention: 'Duration of request processing',
  },
};

// =====================================================
// Validation Functions
// =====================================================

/**
 * Validate processing activity creation request
 * Art 6: Legal basis must be documented before processing
 */
export function validateProcessingActivityRequest(
  data: unknown
): { valid: true; data: CreateProcessingActivityRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  // Required fields
  if (!req.activity_id || typeof req.activity_id !== 'string' || req.activity_id.trim().length === 0) {
    return { valid: false, error: 'activity_id is required' };
  }

  if (!req.activity_name || typeof req.activity_name !== 'string' || req.activity_name.trim().length === 0) {
    return { valid: false, error: 'activity_name is required' };
  }

  if (!req.activity_description || typeof req.activity_description !== 'string' || req.activity_description.trim().length === 0) {
    return { valid: false, error: 'activity_description is required' };
  }

  const validLegalBases: LegalBasisType[] = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interest'];
  if (!req.legal_basis || !validLegalBases.includes(req.legal_basis as LegalBasisType)) {
    return { valid: false, error: 'legal_basis must be one of: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interest' };
  }

  if (!req.legal_basis_justification || typeof req.legal_basis_justification !== 'string' || req.legal_basis_justification.trim().length === 0) {
    return { valid: false, error: 'legal_basis_justification is required (Art 6: Why this basis applies)' };
  }

  if (req.legal_basis_justification.length < 50) {
    return { valid: false, error: 'legal_basis_justification must be at least 50 characters' };
  }

  const validPurposes: ProcessingPurpose[] = [
    'authentication', 'analytics', 'marketing', 'personalization', 
    'service_delivery', 'customer_support', 'legal_compliance', 
    'fraud_prevention', 'research', 'data_portability'
  ];
  if (!req.processing_purpose || !validPurposes.includes(req.processing_purpose as ProcessingPurpose)) {
    return { valid: false, error: 'processing_purpose is required and must be valid' };
  }

  if (typeof req.retention_period_days !== 'number' || req.retention_period_days < 1) {
    return { valid: false, error: 'retention_period_days must be a positive number' };
  }

  // Art 6(1)(f): Legitimate Interest requires assessment
  if (req.legal_basis === 'legitimate_interest') {
    if (!req.legitimate_interest_description || typeof req.legitimate_interest_description !== 'string') {
      return { valid: false, error: 'legitimate_interest_description is required for Art 6(1)(f)' };
    }
    if (!req.legitimate_interest_impact_assessment || typeof req.legitimate_interest_impact_assessment !== 'string') {
      return { valid: false, error: 'legitimate_interest_impact_assessment is required for Art 6(1)(f)' };
    }
  }

  // Consent requires withdrawal mechanism
  if (req.legal_basis === 'consent') {
    if (!req.consent_mechanism) {
      return { valid: false, error: 'consent_mechanism is required when legal_basis is consent' };
    }
    if (!req.consent_withdrawal_mechanism || typeof req.consent_withdrawal_mechanism !== 'string') {
      return { valid: false, error: 'consent_withdrawal_mechanism is required (Art 7: Must be as easy to withdraw)' };
    }
  }

  return {
    valid: true,
    data: {
      activity_id: req.activity_id.trim().toUpperCase(),
      activity_name: req.activity_name.trim(),
      activity_description: req.activity_description.trim(),
      legal_basis: req.legal_basis as LegalBasisType,
      legal_basis_justification: req.legal_basis_justification.trim(),
      processing_purpose: req.processing_purpose as ProcessingPurpose,
      data_categories: Array.isArray(req.data_categories) ? req.data_categories : ['personal'],
      data_subjects: Array.isArray(req.data_subjects) ? req.data_subjects : ['users'],
      retention_period_days: req.retention_period_days,
      legitimate_interest_description: req.legitimate_interest_description as string | undefined,
      legitimate_interest_impact_assessment: req.legitimate_interest_impact_assessment as string | undefined,
      consent_mechanism: req.consent_mechanism as ConsentMechanism | undefined,
      consent_withdrawal_mechanism: req.consent_withdrawal_mechanism as string | undefined,
      document_reference: req.document_reference as string | undefined,
    },
  };
}

// =====================================================
// Compliance Helper Functions
// =====================================================

/**
 * Check if processing activity is ready to begin
 * Art 6: Legal basis must be documented BEFORE processing
 */
export function isProcessingAuthorized(activity: ProcessingActivity): {
  authorized: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (activity.status !== 'active') {
    reasons.push(`Activity status is '${activity.status}', must be 'active'`);
  }

  if (!activity.approved_at) {
    reasons.push('Activity must be approved before processing begins');
  }

  if (!activity.legal_basis) {
    reasons.push('Legal basis must be documented (Art 6 requirement)');
  }

  if (!activity.legal_basis_justification || activity.legal_basis_justification.length < 50) {
    reasons.push('Legal basis justification must be at least 50 characters');
  }

  // Art 6(1)(f): Check LIA for legitimate interest
  if (activity.legal_basis === 'legitimate_interest') {
    if (!activity.legitimate_interest_balancing_completed) {
      reasons.push('Legitimate Interest Assessment must be completed (Art 6(1)(f))');
    }
  }

  // Art 7: Consent requires withdrawal mechanism
  if (activity.legal_basis === 'consent') {
    if (!activity.consent_withdrawal_mechanism) {
      reasons.push('Consent withdrawal mechanism is required (Art 7 requirement)');
    }
  }

  return {
    authorized: reasons.length === 0,
    reasons,
  };
}

/**
 * Verify Article 7 compliance for consent
 * Consent must be freely given, specific, informed, unambiguous
 */
export function verifyConsentCompliance(
  consentEvent: ConsentCollectionEvent
): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check if information was shown
  if (!consentEvent.information_shown || Object.keys(consentEvent.information_shown).length === 0) {
    violations.push('Consent not informed: No information was shown to user');
  }

  // Check if purposes were disclosed
  if (!consentEvent.information_shown.purposes || consentEvent.information_shown.purposes.length === 0) {
    violations.push('Consent not specific: No purposes disclosed');
  }

  // Check if legal basis was disclosed
  if (!consentEvent.information_shown.legal_basis) {
    violations.push('Consent not informed: Legal basis not disclosed');
  }

  // Check decision method
  if (!consentEvent.decision_method || consentEvent.decision_method === 'implied') {
    violations.push('Consent not unambiguous: Decision method is unclear');
  }

  // Check UI component was used
  if (!consentEvent.ui_component) {
    violations.push('Consent mechanism not documented');
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

/**
 * Calculate ease of withdrawal score
 * Art 7: Must be as easy to withdraw as to give
 */
export function calculateWithdrawalEaseScore(
  collectionEvent: ConsentCollectionEvent,
  withdrawalEvent: ConsentWithdrawalEvent
): {
  ease_score: number; // 1-10, 10 being easiest
  is_as_easy: boolean;
  comparison: {
    consent_steps: number;
    withdrawal_steps: number;
    consent_time_ms?: number;
    withdrawal_time_seconds?: number;
  };
} {
  // Estimate consent steps based on decision time and method
  const consentSteps = collectionEvent.decision_method === 'click' ? 1 : 
                      collectionEvent.decision_method === 'form_submit' ? 2 : 1;
  const withdrawalSteps = withdrawalEvent.steps_required;

  // Calculate based on steps
  const stepRatio = withdrawalSteps <= consentSteps ? 1 : consentSteps / withdrawalSteps;
  
  // Score out of 10
  let easeScore = Math.round(stepRatio * 10);
  if (easeScore < 1) easeScore = 1;
  if (easeScore > 10) easeScore = 10;

  return {
    ease_score: easeScore,
    is_as_easy: withdrawalSteps <= consentSteps,
    comparison: {
      consent_steps: consentSteps,
      withdrawal_steps: withdrawalSteps,
      consent_time_ms: collectionEvent.time_to_decision_ms,
      withdrawal_time_seconds: withdrawalEvent.time_to_withdraw_seconds,
    },
  };
}

/**
 * Generate Legitimate Interest Assessment template
 * Art 6(1)(f) requires balancing test
 */
export function generateLIATemplate(
  purpose: string,
  dataCategories: string[],
  recipients: string[]
): {
  template: string;
  sections: string[];
} {
  const sections = [
    '1. Purpose Test: Why is this processing necessary?',
    '2. Necessity Test: Is processing actually necessary for this purpose?',
    '3. Balancing Test: Do individual rights override our interests?',
    '4. Safeguards: What measures protect data subjects?',
    '5. Conclusion: Can we proceed under Art 6(1)(f)?',
  ];

  const template = `# Legitimate Interest Assessment (Art 6(1)(f))

## Processing Activity
**Purpose**: ${purpose}
**Data Categories**: ${dataCategories.join(', ')}
**Recipients**: ${recipients.join(', ')}

## 1. Purpose Test
*Describe why this processing is necessary for your legitimate interests*

## 2. Necessity Test
*Explain why this processing is actually necessary to achieve the stated purpose*
- Could the purpose be achieved without this processing?
- Is there a less intrusive way?

## 3. Balancing Test
### Controller Interests
*What legitimate interest do you have?*

### Individual Rights Impact
*How does this processing affect data subjects?*
- What data is collected?
- How sensitive is it?
- What is the impact on privacy?

### Balance
*Do the individual's rights override the controller's interests?*

## 4. Safeguards
*What measures protect data subjects?*
- Data minimization
- Encryption
- Limited retention
- Transparency
- Opt-out mechanisms

## 5. Conclusion
**Can we proceed under Art 6(1)(f)?** [ ] Yes / [ ] No

**Decision Date**: ___________
**Assessed By**: ___________
**Review Date**: ___________
`;

  return { template, sections };
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Generate activity ID from name
 */
export function generateActivityId(name: string): string {
  const sanitized = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  
  // Get category prefix
  const prefix = name.toLowerCase().includes('analytics') ? 'ANALYTICS' :
                 name.toLowerCase().includes('marketing') ? 'MARKETING' :
                 name.toLowerCase().includes('auth') ? 'AUTH' :
                 name.toLowerCase().includes('support') ? 'SUPPORT' :
                 name.toLowerCase().includes('legal') ? 'LEGAL' :
                 'PROC';
  
  // Find next available number
  return `${prefix}-001`;
}

/**
 * Format retention period for display
 */
export function formatRetentionPeriod(days: number): string {
  if (days >= 365) {
    const years = days / 365;
    return years === 1 ? '1 year' : `${years.toFixed(1)} years`;
  }
  if (days >= 30) {
    const months = days / 30;
    return months === 1 ? '1 month' : `${months.toFixed(0)} months`;
  }
  return days === 1 ? '1 day' : `${days} days`;
}

/**
 * Hash value for audit trail
 */
export function hashForAudit(value: string, salt?: string): string {
  const data = salt ? `${value}:${salt}` : value;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Get required document fields for a legal basis
 */
export function getRequiredFieldsForLegalBasis(basis: LegalBasisType): string[] {
  const common = ['activity_id', 'activity_name', 'activity_description', 'legal_basis_justification'];
  
  switch (basis) {
    case 'consent':
      return [...common, 'consent_mechanism', 'consent_withdrawal_mechanism', 'data_categories', 'data_subjects'];
    case 'contract':
      return [...common, 'data_categories', 'data_subjects', 'retention_period_days'];
    case 'legitimate_interest':
      return [...common, 'legitimate_interest_description', 'legitimate_interest_impact_assessment'];
    case 'legal_obligation':
      return [...common, 'document_reference'];
    default:
      return common;
  }
}

/**
 * Export processing activities to CSV for compliance reports
 */
export function exportActivitiesToCSV(activities: ProcessingActivity[]): string {
  const headers = [
    'activity_id',
    'activity_name',
    'legal_basis',
    'legal_basis_article',
    'processing_purpose',
    'status',
    'approved_at',
    'version',
    'retention_period_days',
    'storage_locations',
  ].join(',');

  const rows = activities.map(activity => [
    activity.activity_id,
    activity.activity_name,
    activity.legal_basis,
    LEGAL_BASIS_DESCRIPTIONS[activity.legal_basis]?.article || '',
    activity.processing_purpose,
    activity.status,
    activity.approved_at || '',
    activity.version,
    activity.retention_period_days,
    (activity.storage_locations || []).join(';'),
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

  return [headers, ...rows].join('\n');
}
