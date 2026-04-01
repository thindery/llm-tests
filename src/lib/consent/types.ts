/**
 * Consent Types - GDPR Article 7 & 8 Compliance (P0 Enhanced)
 * Ticket: REMY-258
 * 
 * Features:
 * - Immutable server-side consent storage with cryptographic integrity
 * - Tamper-evident audit logging with blockchain-style chain hashes
 * - Consent proof generation for data subject rights
 * - 7+ year retention management
 * - GDPR Article 8 (child protection) support
 */

// Consent types as per GDPR
export type ConsentType = 'analytics' | 'marketing' | 'functional';

export const CONSENT_TYPES: ConsentType[] = ['analytics', 'marketing', 'functional'];

// Legal basis types
export type LegalBasis = 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'parental_consent';

// Consent record with cryptographic integrity
export interface ConsentRecord {
  id: string;
  project_id: string;
  user_id: string;
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_timestamp: string;
  consent_version: string;
  
  // PII protection (hashed)
  ip_address_hash: string | null;
  user_agent_hash: string | null;
  
  // Cryptographic integrity (GDPR-P0)
  record_hash: string;
  previous_record_hash: string | null;
  integrity_proof: ConsentIntegrityProof | null;
  
  // Retention (GDPR-P0: 7+ years)
  retention_until_date: string;
  
  // GDPR compliance fields
  legal_basis: LegalBasis;
  purpose_description: string | null;
  data_controller: string;
  storage_location: string;
  third_parties: ThirdPartyDisclosure[];
  automated_decision_making: boolean;
  
  // Withdrawal
  withdrawal_timestamp: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Consent integrity proof (cryptographic verification)
export interface ConsentIntegrityProof {
  proof_id: string;
  proof_hash: string;
  generated_at: string;
  
  // Parental consent (Article 8)
  parental_consent?: boolean;
  parent_user_id?: string;
  parent_email?: string;
  verification_method?: string;
}

// Third party disclosure
export interface ThirdPartyDisclosure {
  name: string;
  purpose: string;
  location: string;
  legal_basis: string;
}

// Consent status for a specific type
export interface ConsentStatus {
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_timestamp: string;
  consent_version: string;
  is_withdrawn: boolean;
  retention_until: string;
  integrity_verified?: boolean;
}

// Full user consent status
export interface UserConsentStatus {
  user_id: string;
  project_id: string;
  consents: ConsentStatus[];
  chain_integrity_valid: boolean;
  last_verified_at?: string;
}

// Tamper-evident audit log entry
export interface ConsentAuditLogEntry {
  id: string;
  audit_timestamp: string;
  action: 'consent_granted' | 'consent_withdrawn' | 'consent_updated' | 'consent_exported' | 'consent_verified' | 'consent_archived';
  consent_record_id: string;
  project_id: string;
  user_id: string;
  consent_type: ConsentType;
  
  // Snapshot of record at time of action
  record_snapshot: unknown;
  
  // Cryptographic verification
  record_hash: string;
  previous_audit_hash: string | null;
  chain_hash: string;
  
  // Action metadata
  ip_address_hash: string | null;
  user_agent_hash: string | null;
  performed_by: string;
  reason: string | null;
  
  // Article 8 compliance
  user_age_verified: boolean;
  parental_consent_obtained: boolean;
  parental_consent_record_id: string | null;
  
  // Tamper detection
  verified_at: string | null;
  verification_status: 'pending' | 'verified' | 'tampered';
  
  created_at: string;
}

// Consent proof document (for data subject rights)
export interface ConsentProof {
  id: string;
  proof_id: string;
  consent_record_id: string;
  project_id: string;
  user_id: string;
  
  // Proof document content
  proof_document: ConsentProofDocument;
  proof_hash: string;
  
  // Digital signature
  signature_algorithm?: string;
  signature_value?: string;
  
  // Validity
  generated_at: string;
  expires_at: string;
  verified_at: string | null;
  verification_count: number;
  
  created_at: string;
  updated_at: string;
}

// Consent proof document structure
export interface ConsentProofDocument {
  proof_id: string;
  proof_generated_at: string;
  proof_version: string;
  record: {
    id: string;
    project_id: string;
    user_id: string;
    consent_type: ConsentType;
    consent_granted: boolean;
    consent_timestamp: string;
    consent_version: string;
    legal_basis: LegalBasis;
    purpose_description: string | null;
  };
  verification: {
    record_hash: string;
    previous_record_hash: string | null;
    integrity_verified: boolean;
  };
  gdpr_article_7_compliance: {
    freely_given: boolean;
    specific: boolean;
    informed: boolean;
    unambiguous: boolean;
    withdrawable: boolean;
    demonstrable: boolean;
  };
  retention: {
    expires_at: string;
    retention_basis: string;
  };
}

// Consent banner settings
export interface ConsentBannerSettings {
  id: string;
  project_id: string;
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
  created_at: string;
  updated_at: string;
}

// Consent statistics
export interface ConsentStatistics {
  total_consents: number;
  granted_by_type: Record<ConsentType, number>;
  withdrawn_by_type: Record<ConsentType, number>;
  unique_users: number;
  last_30_days: {
    granted: number;
    withdrawn: number;
  };
  integrity_status?: {
    verified: number;
    pending: number;
    tampered: number;
  };
}

// Chain verification result
export interface ConsentChainVerificationResult {
  user_id: string;
  project_id: string;
  chain_valid: boolean;
  total_records: number;
  tampered_count: number;
  tampered_record_ids: string[];
  verified_at: string;
}

// Data export for GDPR portability (P0 Enhanced)
export interface ConsentDataExport {
  user_id: string;
  project_id: string;
  export_timestamp: string;
  export_version: string;
  retention_until: string;
  
  consent_records: Array<{
    id: string;
    consent_type: ConsentType;
    consent_granted: boolean;
    consent_timestamp: string;
    consent_version: string;
    withdrawal_timestamp: string | null;
    legal_basis: LegalBasis;
    purpose_description: string | null;
    record_hash: string;
    previous_hash: string | null;
    integrity_proof: ConsentIntegrityProof | null;
    third_parties: ThirdPartyDisclosure[];
  }>;
  
  consent_proofs: Array<{
    record_id: string;
    proof_id: string;
    proof_hash: string;
    generated_at: string;
  }>;
  
  audit_trail: Array<{
    audit_id: string;
    action: string;
    timestamp: string;
    record_hash: string;
    chain_hash: string;
  }>;
}

// Parental consent request (Article 8)
export interface ParentalConsentRequest {
  child_user_id: string;
  parent_user_id: string;
  parent_email: string;
  consent_type: ConsentType;
  verification_method: 'email' | 'phone' | 'id_verification' | 'credit_card';
}

// Request types
export interface RecordConsentRequest {
  user_id: string;
  project_id: string;
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_version?: string;
  ip_address?: string;
  user_agent?: string;
  purpose_description?: string;
  third_parties?: ThirdPartyDisclosure[];
  legal_basis?: LegalBasis;
  
  // Article 8 fields
  user_age_verified?: boolean;
  parental_consent_id?: string;
}

export interface WithdrawConsentRequest {
  user_id: string;
  project_id: string;
  consent_type: ConsentType;
  reason?: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Integrity verification result
export interface IntegrityVerificationResult {
  valid: boolean;
  record_id: string;
  stored_hash: string;
  calculated_hash: string;
  previous_hash: string | null;
  audit_trail: Array<{
    audit_id: string;
    action: string;
    timestamp: string;
    hash: string;
    chain_hash: string;
  }>;
}

// Event consent requirements mapping
export const EVENT_CONSENT_REQUIREMENTS: Record<string, ConsentType> = {
  'page_view': 'analytics',
  'click': 'analytics',
  'scroll': 'analytics',
  'form_submit': 'functional',
  'custom_event': 'analytics',
  'track_conversion': 'marketing',
  'personalization': 'marketing',
};

// Retention period (7 years in days)
export const GDPR_RETENTION_DAYS = 2555; // 7 years * 365 + leap days

// Default retention date
export function getDefaultRetentionDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 7);
  return date;
}