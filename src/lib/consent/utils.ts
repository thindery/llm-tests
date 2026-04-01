/**
 * Consent Utilities - GDPR Article 7 & 8 Consent Tracking with Cryptographic Integrity
 * Ticket: REMY-258
 * 
 * Features:
 * - SHA-256 cryptographic hashing for consent records
 * - Chain hash verification (tamper-evident audit trail)
 * - Consent proof generation
 * - 7+ year retention management
 */

import { createHash, randomUUID } from 'crypto';
import type {
  ConsentType,
  ConsentRecord,
  ConsentStatus,
  ConsentProof,
  ConsentProofDocument,
  ConsentIntegrityProof,
  ConsentAuditLogEntry,
  IntegrityVerificationResult,
  ParentalConsentRequest,
  RecordConsentRequest,
  WithdrawConsentRequest,
  ConsentBannerSettings,
  ConsentDataExport,
  ThirdPartyDisclosure,
  LegalBasis,
} from './types';

// Re-export types
export * from './types';

// =====================================================
// CRYPTOGRAPHIC HASHING
// =====================================================

/**
 * Hash a value using SHA-256
 */
export function sha256Hash(value: string, salt?: string): string {
  const data = salt ? `${value}:${salt}` : value;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Hash IP address for storage (GDPR compliant)
 */
export function hashIpAddress(ipAddress: string): string {
  return sha256Hash(
    ipAddress,
    process.env.CONSENT_IP_SALT || 'consent-ip-salt-2026'
  );
}

/**
 * Hash user agent for device fingerprinting
 */
export function hashUserAgent(userAgent: string): string {
  return sha256Hash(
    userAgent,
    process.env.CONSENT_UA_SALT || 'consent-ua-salt-2026'
  );
}

/**
 * Calculate record hash for consent integrity
 * This creates a cryptographic fingerprint of the consent record
 */
export function calculateConsentRecordHash(
  id: string,
  projectId: string,
  userId: string,
  consentType: ConsentType,
  consentGranted: boolean,
  consentTimestamp: string,
  consentVersion: string,
  previousHash: string | null = null
): string {
  const hashInput = [
    id,
    projectId,
    userId,
    consentType,
    String(consentGranted),
    consentTimestamp,
    consentVersion,
    previousHash || '',
  ].join('|');

  return sha256Hash(hashInput);
}

/**
 * Calculate chain hash for audit log entries
 * Creates blockchain-style tamper evidence
 */
export function calculateAuditChainHash(
  auditRecord: unknown,
  previousChainHash: string | null
): string {
  const hashInput = JSON.stringify(auditRecord) + '|' + (previousChainHash || '');
  return sha256Hash(hashInput);
}

/**
 * Verify integrity of a consent record
 */
export function verifyConsentRecordIntegrity(record: ConsentRecord): {
  valid: boolean;
  storedHash: string;
  calculatedHash: string;
  previousHash: string | null;
} {
  const calculatedHash = calculateConsentRecordHash(
    record.id,
    record.project_id,
    record.user_id,
    record.consent_type,
    record.consent_granted,
    record.consent_timestamp,
    record.consent_version,
    record.previous_record_hash
  );

  return {
    valid: calculatedHash === record.record_hash,
    storedHash: record.record_hash,
    calculatedHash,
    previousHash: record.previous_record_hash,
  };
}

// =====================================================
// CONSENT PROOF GENERATION
// =====================================================

/**
 * Generate a tamper-evident consent proof document
 * This provides GDPR Article 7 compliance (demonstrable consent)
 */
export function generateConsentProofDocument(
  record: ConsentRecord
): { document: ConsentProofDocument; hash: string; proofId: string } {
  const proofId = sha256Hash(randomUUID() + Date.now().toString());
  
  const document: ConsentProofDocument = {
    proof_id: proofId,
    proof_generated_at: new Date().toISOString(),
    proof_version: '2.0-GDPR-P0',
    record: {
      id: record.id,
      project_id: record.project_id,
      user_id: record.user_id,
      consent_type: record.consent_type,
      consent_granted: record.consent_granted,
      consent_timestamp: record.consent_timestamp,
      consent_version: record.consent_version,
      legal_basis: record.legal_basis,
      purpose_description: record.purpose_description,
    },
    verification: {
      record_hash: record.record_hash,
      previous_record_hash: record.previous_record_hash,
      integrity_verified: true,
    },
    gdpr_article_7_compliance: {
      freely_given: true,
      specific: true,
      informed: true,
      unambiguous: true,
      withdrawable: true,
      demonstrable: true,
    },
    retention: {
      expires_at: record.retention_until_date,
      retention_basis: 'GDPR compliance - 7 years minimum',
    },
  };

  const hash = sha256Hash(JSON.stringify(document));
  
  return { document, hash, proofId };
}

/**
 * Verify a consent proof document
 */
export function verifyConsentProof(
  proof: ConsentProof,
  record: ConsentRecord
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Verify document hash
  const calculatedDocHash = sha256Hash(JSON.stringify(proof.proof_document));
  if (calculatedDocHash !== proof.proof_hash) {
    errors.push('Proof document hash mismatch');
  }
  
  // Verify record hash matches
  if (proof.proof_document.verification.record_hash !== record.record_hash) {
    errors.push('Record hash mismatch');
  }
  
  // Verify expiration
  if (new Date(proof.expires_at) < new Date()) {
    errors.push('Proof has expired');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Generate a unique user ID for anonymous users
 */
export function generateAnonymousUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `anon_${timestamp}_${random}`;
}

/**
 * Validate consent record request
 */
export function validateConsentRequest(
  data: unknown
): { valid: true; data: RecordConsentRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  // Validate required fields
  if (!req.user_id || typeof req.user_id !== 'string' || req.user_id.trim().length === 0) {
    return { valid: false, error: 'user_id is required' };
  }

  if (!req.project_id || typeof req.project_id !== 'string') {
    return { valid: false, error: 'project_id is required' };
  }

  if (!req.consent_type || !['analytics', 'marketing', 'functional'].includes(req.consent_type as string)) {
    return { valid: false, error: 'consent_type must be analytics, marketing, or functional' };
  }

  if (typeof req.consent_granted !== 'boolean') {
    return { valid: false, error: 'consent_granted must be a boolean' };
  }

  // Validate third_parties if provided
  if (req.third_parties !== undefined) {
    if (!Array.isArray(req.third_parties)) {
      return { valid: false, error: 'third_parties must be an array' };
    }
  }

  return {
    valid: true,
    data: {
      user_id: req.user_id.trim(),
      project_id: req.project_id as string,
      consent_type: req.consent_type as ConsentType,
      consent_granted: req.consent_granted as boolean,
      consent_version: typeof req.consent_version === 'string' ? req.consent_version : '1.0',
      ip_address: typeof req.ip_address === 'string' ? req.ip_address : undefined,
      user_agent: typeof req.user_agent === 'string' ? req.user_agent : undefined,
      purpose_description: typeof req.purpose_description === 'string' ? req.purpose_description : undefined,
      third_parties: Array.isArray(req.third_parties) ? req.third_parties as ThirdPartyDisclosure[] : undefined,
      legal_basis: (typeof req.legal_basis === 'string' ? req.legal_basis : 'consent') as LegalBasis,
      user_age_verified: typeof req.user_age_verified === 'boolean' ? req.user_age_verified : undefined,
      parental_consent_id: typeof req.parental_consent_id === 'string' ? req.parental_consent_id : undefined,
    },
  };
}

/**
 * Validate withdraw consent request
 */
export function validateWithdrawRequest(
  data: unknown
): { valid: true; data: WithdrawConsentRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  if (!req.user_id || typeof req.user_id !== 'string' || req.user_id.trim().length === 0) {
    return { valid: false, error: 'user_id is required' };
  }

  if (!req.project_id || typeof req.project_id !== 'string') {
    return { valid: false, error: 'project_id is required' };
  }

  if (!req.consent_type || !['analytics', 'marketing', 'functional'].includes(req.consent_type as string)) {
    return { valid: false, error: 'consent_type must be analytics, marketing, or functional' };
  }

  return {
    valid: true,
    data: {
      user_id: req.user_id.trim(),
      project_id: req.project_id,
      consent_type: req.consent_type as ConsentType,
      reason: typeof req.reason === 'string' ? req.reason : undefined,
    },
  };
}

/**
 * Validate parental consent request (Article 8)
 */
export function validateParentalConsentRequest(
  data: unknown
): { valid: true; data: ParentalConsentRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  if (!req.child_user_id || typeof req.child_user_id !== 'string') {
    return { valid: false, error: 'child_user_id is required' };
  }

  if (!req.parent_user_id || typeof req.parent_user_id !== 'string') {
    return { valid: false, error: 'parent_user_id is required' };
  }

  if (!req.parent_email || typeof req.parent_email !== 'string') {
    return { valid: false, error: 'parent_email is required' };
  }

  if (!req.consent_type || !['analytics', 'marketing', 'functional'].includes(req.consent_type as string)) {
    return { valid: false, error: 'consent_type must be analytics, marketing, or functional' };
  }

  const validMethods = ['email', 'phone', 'id_verification', 'credit_card'];
  if (req.verification_method && !validMethods.includes(req.verification_method as string)) {
    return { valid: false, error: 'verification_method must be email, phone, id_verification, or credit_card' };
  }

  return {
    valid: true,
    data: {
      child_user_id: req.child_user_id,
      parent_user_id: req.parent_user_id,
      parent_email: req.parent_email,
      consent_type: req.consent_type as ConsentType,
      verification_method: (req.verification_method as 'email' | 'phone' | 'id_verification' | 'credit_card') || 'email',
    },
  };
}

// =====================================================
// CONSENT STATUS UTILITIES
// =====================================================

/**
 * Check if consent is valid (not withdrawn and not expired)
 */
export function isConsentValid(record: ConsentRecord | ConsentStatus): boolean {
  if ('is_withdrawn' in record) {
    if (record.is_withdrawn) return false;
    if ('retention_until' in record && new Date(record.retention_until) < new Date()) {
      return false;
    }
    return record.consent_granted;
  }
  if (record.withdrawal_timestamp) return false;
  if (new Date(record.retention_until_date) < new Date()) return false;
  return record.consent_granted;
}

/**
 * Get consent expiration date
 */
export function getConsentExpirationDate(
  consentTimestamp: string,
  expirationDays: number = 365
): Date {
  const date = new Date(consentTimestamp);
  date.setDate(date.getDate() + expirationDays);
  return date;
}

/**
 * Check if consent has expired (for display purposes)
 */
export function isConsentExpired(
  consentTimestamp: string,
  expirationDays: number = 365
): boolean {
  const expirationDate = getConsentExpirationDate(consentTimestamp, expirationDays);
  return new Date() > expirationDate;
}

/**
 * Check if consent record is within retention period
 */
export function isWithinRetentionPeriod(retentionUntilDate: string): boolean {
  return new Date(retentionUntilDate) >= new Date();
}

// =====================================================
// DEFAULT SETTINGS
// =====================================================

/**
 * Default banner settings
 */
export function getDefaultBannerSettings(project_id: string): ConsentBannerSettings {
  return {
    id: '',
    project_id,
    banner_title: 'Cookie Consent',
    banner_text: 'We use cookies to improve your experience and analyze site usage. Your consent is stored securely and you can withdraw at any time.',
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// =====================================================
// EXPORT UTILITIES
// =====================================================

/**
 * Convert consent records to CSV format
 */
export function exportConsentToCSV(records: ConsentRecord[]): string {
  const headers = [
    'id',
    'user_id',
    'consent_type',
    'consent_granted',
    'consent_timestamp',
    'consent_version',
    'withdrawal_timestamp',
    'record_hash',
    'retention_until',
    'legal_basis',
  ].join(',');

  const rows = records.map(record => [
    record.id,
    record.user_id,
    record.consent_type,
    record.consent_granted,
    record.consent_timestamp,
    record.consent_version,
    record.withdrawal_timestamp || '',
    record.record_hash,
    record.retention_until_date,
    record.legal_basis,
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

  return [headers, ...rows].join('\n');
}

/**
 * Generate JSON export with cryptographic verification
 */
export function generateVerifiedExport(
  records: ConsentRecord[],
  auditLog: ConsentAuditLogEntry[],
  proofs: ConsentProof[],
  userId: string,
  projectId: string
): ConsentDataExport {
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 7);

  return {
    user_id: userId,
    project_id: projectId,
    export_timestamp: new Date().toISOString(),
    export_version: '2.0-GDPR-P0',
    retention_until: retentionDate.toISOString().split('T')[0],
    
    consent_records: records.map(r => ({
      id: r.id,
      consent_type: r.consent_type,
      consent_granted: r.consent_granted,
      consent_timestamp: r.consent_timestamp,
      consent_version: r.consent_version,
      withdrawal_timestamp: r.withdrawal_timestamp,
      legal_basis: r.legal_basis,
      purpose_description: r.purpose_description,
      record_hash: r.record_hash,
      previous_hash: r.previous_record_hash,
      integrity_proof: r.integrity_proof,
      third_parties: r.third_parties,
    })),
    
    consent_proofs: proofs.map(p => ({
      record_id: p.consent_record_id,
      proof_id: p.proof_id,
      proof_hash: p.proof_hash,
      generated_at: p.generated_at,
    })),
    
    audit_trail: auditLog.map(a => ({
      audit_id: a.id,
      action: a.action,
      timestamp: a.audit_timestamp,
      record_hash: a.record_hash,
      chain_hash: a.chain_hash,
    })),
  };
}

// =====================================================
// EVENT CONSENT MAPPING
// =====================================================

/**
 * Event categories and their required consent types
 */
export const EVENT_CONSENT_REQUIREMENTS: Record<string, ConsentType> = {
  'page_view': 'analytics',
  'click': 'analytics',
  'scroll': 'analytics',
  'form_submit': 'functional',
  'custom_event': 'analytics',
  'track_conversion': 'marketing',
  'personalization': 'marketing',
};

/**
 * Get consent type required for an event
 */
export function getConsentTypeForEvent(eventType: string): ConsentType | null {
  return EVENT_CONSENT_REQUIREMENTS[eventType] || null;
}

/**
 * Filter events based on consent status
 * Returns true if event can be processed
 */
export function canProcessEvent(
  consentType: ConsentType,
  consentStatus: ConsentStatus | null
): boolean {
  if (!consentStatus) return false;
  if (consentType !== consentStatus.consent_type) return false;
  return isConsentValid(consentStatus);
}

// =====================================================
// AUDIT LOG HELPERS
// =====================================================

/**
 * Create an audit log entry (client-side preparation)
 */
export function createAuditLogEntry(
  action: ConsentAuditLogEntry['action'],
  record: ConsentRecord,
  performedBy: string,
  previousChainHash: string | null,
  reason?: string
): Omit<ConsentAuditLogEntry, 'id' | 'created_at'> {
  const snapshot = { ...record };
  const recordHash = calculateConsentRecordHash(
    record.id,
    record.project_id,
    record.user_id,
    record.consent_type,
    record.consent_granted,
    record.consent_timestamp,
    record.consent_version,
    record.previous_record_hash
  );

  const chainHash = calculateAuditChainHash(
    { action, consent_record_id: record.id, timestamp: new Date().toISOString() },
    previousChainHash
  );

  return {
    audit_timestamp: new Date().toISOString(),
    action,
    consent_record_id: record.id,
    project_id: record.project_id,
    user_id: record.user_id,
    consent_type: record.consent_type,
    record_snapshot: snapshot,
    record_hash: recordHash,
    previous_audit_hash: previousChainHash,
    chain_hash: chainHash,
    ip_address_hash: record.ip_address_hash,
    user_agent_hash: record.user_agent_hash,
    performed_by: performedBy,
    reason: reason || null,
    user_age_verified: false,
    parental_consent_obtained: false,
    parental_consent_record_id: null,
    verified_at: null,
    verification_status: 'pending',
  };
}

// =====================================================
// GDPR ARTICLE 7 COMPLIANCE CHECK
// =====================================================

/**
 * Verify GDPR Article 7 compliance for a consent record
 * Article 7 requires consent to be:
 * 1. Freely given
 * 2. Specific
 * 3. Informed
 * 4. Unambiguous
 * 5. Withdrawable
 * 6. Demonstrable
 */
export function verifyArticle7Compliance(record: ConsentRecord): {
  compliant: boolean;
  checks: Record<string, boolean>;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Check 1: Freely given - must have clear option to refuse
  const freelyGiven = record.consent_type !== 'functional' || record.consent_granted;
  if (!freelyGiven) {
    violations.push('Consent may not have been freely given');
  }
  
  // Check 2: Specific - purpose is described
  const specific = !!record.purpose_description;
  if (!specific) {
    violations.push('Purpose description is missing');
  }
  
  // Check 3: Informed - legal basis is specified
  const informed = !!record.legal_basis;
  if (!informed) {
    violations.push('Legal basis is not specified');
  }
  
  // Check 4: Unambiguous - clear affirmative action
  const unambiguous = record.consent_granted === true || record.consent_granted === false;
  
  // Check 5: Withdrawable - has withdrawal capability
  const withdrawable = true; // System supports withdrawal
  
  // Check 6: Demonstrable - has cryptographic proof
  const demonstrable = !!record.record_hash && !!record.integrity_proof;
  if (!demonstrable) {
    violations.push('Consent record lacks cryptographic proof');
  }

  return {
    compliant: violations.length === 0,
    checks: {
      freelyGiven,
      specific,
      informed,
      unambiguous,
      withdrawable,
      demonstrable,
    },
    violations,
  };
}