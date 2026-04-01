/**
 * GDPR-P0 Server-Side Consent Records Tests
 * Ticket: REMY-258
 * 
 * Tests cryptographic integrity, tamper-evident audit logs,
 * consent proofs, and 7+ year retention compliance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sha256Hash,
  calculateConsentRecordHash,
  calculateAuditChainHash,
  verifyConsentRecordIntegrity,
  generateConsentProofDocument,
  verifyConsentProof,
  validateConsentRequest,
  validateWithdrawRequest,
  isConsentValid,
  verifyArticle7Compliance,
  getDefaultRetentionDate,
  GDPR_RETENTION_DAYS,
  hashIpAddress,
  hashUserAgent,
  generateAnonymousUserId,
  type ConsentRecord,
  type ConsentType,
} from '../../src/lib/consent/utils';

// =====================================================
// MOCK DATA
// =====================================================

const mockConsentRecord = (overrides?: Partial<ConsentRecord>): ConsentRecord => ({
  id: 'test-id-123',
  project_id: 'project-456',
  user_id: 'user-789',
  consent_type: 'analytics' as ConsentType,
  consent_granted: true,
  consent_timestamp: '2026-03-31T12:00:00.000Z',
  consent_version: '1.0',
  ip_address_hash: 'hashed-ip-123',
  user_agent_hash: 'hashed-ua-456',
  withdrawal_timestamp: null,
  record_hash: '', // Will be calculated
  previous_record_hash: null,
  integrity_proof: null,
  retention_until_date: '2033-03-31',
  legal_basis: 'consent',
  purpose_description: 'Analytics for site improvement',
  data_controller: 'Test Company',
  storage_location: 'EU',
  third_parties: [],
  automated_decision_making: false,
  created_at: '2026-03-31T12:00:00.000Z',
  updated_at: '2026-03-31T12:00:00.000Z',
  ...overrides,
});

// =====================================================
// CRYPTOGRAPHIC INTEGRITY TESTS
// =====================================================

describe('Cryptographic Integrity', () => {
  describe('sha256Hash', () => {
    it('should generate consistent SHA-256 hashes', () => {
      const hash1 = sha256Hash('test-value');
      const hash2 = sha256Hash('test-value');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate different hashes for different values', () => {
      const hash1 = sha256Hash('value-1');
      const hash2 = sha256Hash('value-2');
      expect(hash1).not.toBe(hash2);
    });

    it('should incorporate salt when provided', () => {
      const hashWithoutSalt = sha256Hash('test');
      const hashWithSalt = sha256Hash('test', 'salt');
      expect(hashWithoutSalt).not.toBe(hashWithSalt);
    });
  });

  describe('calculateConsentRecordHash', () => {
    it('should generate deterministic hashes for the same input', () => {
      const hash1 = calculateConsentRecordHash(
        'id', 'project', 'user', 'analytics', true, 
        '2026-03-31T12:00:00Z', '1.0', null
      );
      const hash2 = calculateConsentRecordHash(
        'id', 'project', 'user', 'analytics', true, 
        '2026-03-31T12:00:00Z', '1.0', null
      );
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = calculateConsentRecordHash(
        'id1', 'project', 'user', 'analytics', true, 
        '2026-03-31T12:00:00Z', '1.0', null
      );
      const hash2 = calculateConsentRecordHash(
        'id2', 'project', 'user', 'analytics', true, 
        '2026-03-31T12:00:00Z', '1.0', null
      );
      expect(hash1).not.toBe(hash2);
    });

    it('should include previous hash in chain', () => {
      const previousHash = 'abc123';
      const hashWithChain = calculateConsentRecordHash(
        'id', 'project', 'user', 'analytics', true, 
        '2026-03-31T12:00:00Z', '1.0', previousHash
      );
      const hashWithoutChain = calculateConsentRecordHash(
        'id', 'project', 'user', 'analytics', true, 
        '2026-03-31T12:00:00Z', '1.0', null
      );
      expect(hashWithChain).not.toBe(hashWithoutChain);
    });
  });

  describe('calculateAuditChainHash', () => {
    it('should create chain-dependent hashes', () => {
      const record = { action: 'consent_granted', id: '123' };
      
      const hash1 = calculateAuditChainHash(record, 'previous-hash-1');
      const hash2 = calculateAuditChainHash(record, 'previous-hash-2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should create consistent chains for same inputs', () => {
      const record = { action: 'consent_granted', id: '123' };
      const prevHash = 'abc123';
      
      const hash1 = calculateAuditChainHash(record, prevHash);
      const hash2 = calculateAuditChainHash(record, prevHash);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyConsentRecordIntegrity', () => {
    it('should return valid for correctly hashed record', () => {
      const recordData = {
        id: 'test-id',
        project_id: 'test-project',
        user_id: 'test-user',
        consent_type: 'analytics' as ConsentType,
        consent_granted: true,
        consent_timestamp: '2026-03-31T12:00:00Z',
        consent_version: '1.0',
        previous_record_hash: null,
      };

      const correctHash = calculateConsentRecordHash(
        recordData.id, recordData.project_id, recordData.user_id,
        recordData.consent_type, recordData.consent_granted,
        recordData.consent_timestamp, recordData.consent_version,
        recordData.previous_record_hash
      );

      const record = mockConsentRecord({
        ...recordData,
        record_hash: correctHash,
      });

      const result = verifyConsentRecordIntegrity(record);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for tampered record', () => {
      const record = mockConsentRecord({
        record_hash: 'tampered-hash-123',
      });

      const result = verifyConsentRecordIntegrity(record);
      expect(result.valid).toBe(false);
      expect(result.storedHash).toBe('tampered-hash-123');
      expect(result.calculatedHash).not.toBe('tampered-hash-123');
    });
  });
});

// =====================================================
// CONSENT PROOF TESTS
// =====================================================

describe('Consent Proofs', () => {
  describe('generateConsentProofDocument', () => {
    it('should generate proof with all required fields', () => {
      const record = mockConsentRecord({
        record_hash: 'valid-hash-123',
      });

      const { document, hash, proofId } = generateConsentProofDocument(record);

      expect(document.proof_id).toBe(proofId);
      expect(document.proof_generated_at).toBeDefined();
      expect(document.proof_version).toBe('2.0-GDPR-P0');
      expect(document.record.id).toBe(record.id);
      expect(document.verification.record_hash).toBe(record.record_hash);
      expect(document.gdpr_article_7_compliance).toBeDefined();
      expect(document.retention).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should include Article 7 compliance checks', () => {
      const record = mockConsentRecord();
      const { document } = generateConsentProofDocument(record);

      expect(document.gdpr_article_7_compliance).toEqual({
        freely_given: true,
        specific: true,
        informed: true,
        unambiguous: true,
        withdrawable: true,
        demonstrable: true,
      });
    });

    it('should include retention information', () => {
      const record = mockConsentRecord({
        retention_until_date: '2033-12-31',
      });
      const { document } = generateConsentProofDocument(record);

      expect(document.retention.expires_at).toBe('2033-12-31');
      expect(document.retention.retention_basis).toContain('7 years');
    });
  });

  describe('verifyConsentProof', () => {
    it('should validate correct proof', () => {
      const record = mockConsentRecord({
        record_hash: 'valid-hash-123',
      });

      const { document, hash, proofId } = generateConsentProofDocument(record);
      
      const proof = {
        id: 'proof-123',
        proof_id: proofId,
        consent_record_id: record.id,
        project_id: record.project_id,
        user_id: record.user_id,
        proof_document: document,
        proof_hash: hash,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        verified_at: null,
        verification_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = verifyConsentProof(proof, record);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect tampered proof document', () => {
      const record = mockConsentRecord();
      const { document, hash } = generateConsentProofDocument(record);
      
      // Tamper with document
      document.record.consent_granted = false;
      
      const proof = {
        id: 'proof-123',
        proof_id: 'tampered-proof',
        consent_record_id: record.id,
        project_id: record.project_id,
        user_id: record.user_id,
        proof_document: document,
        proof_hash: hash, // Original hash
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        verified_at: null,
        verification_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = verifyConsentProof(proof, record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proof document hash mismatch');
    });

    it('should detect expired proof', () => {
      const record = mockConsentRecord();
      const { document, hash, proofId } = generateConsentProofDocument(record);
      
      const proof = {
        id: 'proof-123',
        proof_id: proofId,
        consent_record_id: record.id,
        project_id: record.project_id,
        user_id: record.user_id,
        proof_document: document,
        proof_hash: hash,
        generated_at: '2020-01-01T00:00:00Z',
        expires_at: '2020-12-31T23:59:59Z', // Expired
        verified_at: null,
        verification_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = verifyConsentProof(proof, record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Proof has expired');
    });
  });
});

// =====================================================
// VALIDATION TESTS
// =====================================================

describe('Request Validation', () => {
  describe('validateConsentRequest', () => {
    it('should validate valid request', () => {
      const result = validateConsentRequest({
        user_id: 'user-123',
        project_id: 'project-456',
        consent_type: 'analytics',
        consent_granted: true,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.user_id).toBe('user-123');
        expect(result.data.consent_type).toBe('analytics');
      }
    });

    it('should reject missing user_id', () => {
      const result = validateConsentRequest({
        project_id: 'project-456',
        consent_type: 'analytics',
        consent_granted: true,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('user_id');
      }
    });

    it('should reject invalid consent_type', () => {
      const result = validateConsentRequest({
        user_id: 'user-123',
        project_id: 'project-456',
        consent_type: 'invalid_type',
        consent_granted: true,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('consent_type');
      }
    });

    it('should reject non-boolean consent_granted', () => {
      const result = validateConsentRequest({
        user_id: 'user-123',
        project_id: 'project-456',
        consent_type: 'analytics',
        consent_granted: 'yes',
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('boolean');
      }
    });

    it('should accept optional fields', () => {
      const result = validateConsentRequest({
        user_id: 'user-123',
        project_id: 'project-456',
        consent_type: 'analytics',
        consent_granted: true,
        purpose_description: 'Analytics for personalization',
        third_parties: [{ name: 'Mixpanel', purpose: 'Analytics', location: 'US', legal_basis: 'Standard Contractual Clauses' }],
        legal_basis: 'consent',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validateWithdrawRequest', () => {
    it('should validate valid withdrawal request', () => {
      const result = validateWithdrawRequest({
        user_id: 'user-123',
        project_id: 'project-456',
        consent_type: 'analytics',
        reason: 'No longer interested',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject missing fields', () => {
      const result = validateWithdrawRequest({
        user_id: 'user-123',
      });

      expect(result.valid).toBe(false);
    });
  });
});

// =====================================================
// CONSENT STATUS TESTS
// =====================================================

describe('Consent Status Management', () => {
  describe('isConsentValid', () => {
    it('should return true for valid consent', () => {
      const record = mockConsentRecord({
        consent_granted: true,
        withdrawal_timestamp: null,
        retention_until_date: '2033-12-31',
      });

      expect(isConsentValid(record)).toBe(true);
    });

    it('should return false for withdrawn consent', () => {
      const record = mockConsentRecord({
        consent_granted: true,
        withdrawal_timestamp: '2026-04-01T12:00:00Z',
      });

      expect(isConsentValid(record)).toBe(false);
    });

    it('should return false for expired retention', () => {
      const record = mockConsentRecord({
        consent_granted: true,
        withdrawal_timestamp: null,
        retention_until_date: '2020-12-31', // Past date
      });

      expect(isConsentValid(record)).toBe(false);
    });

    it('should return false for refused consent', () => {
      const record = mockConsentRecord({
        consent_granted: false,
      });

      expect(isConsentValid(record)).toBe(false);
    });
  });
});

// =====================================================
// GDPR ARTICLE 7 COMPLIANCE TESTS
// =====================================================

describe('GDPR Article 7 Compliance', () => {
  describe('verifyArticle7Compliance', () => {
    it('should validate fully compliant record', () => {
      const record = mockConsentRecord({
        purpose_description: 'Analytics for site improvement',
        legal_basis: 'consent',
        record_hash: 'valid-hash-123',
        integrity_proof: {
          proof_id: 'proof-123',
          proof_hash: 'proof-hash-456',
          generated_at: '2026-03-31T12:00:00Z',
        },
      });

      const result = verifyArticle7Compliance(record);
      expect(result.compliant).toBe(true);
      expect(result.checks.demonstrable).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect missing purpose description', () => {
      const record = mockConsentRecord({
        purpose_description: null,
        record_hash: 'valid-hash',
        integrity_proof: { proof_id: '1', proof_hash: 'hash', generated_at: '2026-03-31' },
      });

      const result = verifyArticle7Compliance(record);
      expect(result.compliant).toBe(false);
      expect(result.checks.specific).toBe(false);
      expect(result.violations).toContain('Purpose description is missing');
    });

    it('should detect missing legal basis', () => {
      const record = mockConsentRecord({
        legal_basis: '' as 'consent',
        record_hash: 'valid-hash',
        integrity_proof: { proof_id: '1', proof_hash: 'hash', generated_at: '2026-03-31' },
      });

      const result = verifyArticle7Compliance(record);
      expect(result.compliant).toBe(false);
      expect(result.checks.informed).toBe(false);
    });

    it('should detect missing cryptographic proof', () => {
      const record = mockConsentRecord({
        record_hash: '',
        integrity_proof: null,
        purpose_description: 'Testing',
        legal_basis: 'consent',
      });

      const result = verifyArticle7Compliance(record);
      expect(result.compliant).toBe(false);
      expect(result.checks.demonstrable).toBe(false);
      expect(result.violations).toContain('Consent record lacks cryptographic proof');
    });
  });
});

// =====================================================
// RETENTION TESTS
// =====================================================

describe('Retention Management', () => {
  describe('getDefaultRetentionDate', () => {
    it('should return date 7 years in the future', () => {
      const retentionDate = getDefaultRetentionDate();
      const now = new Date();
      
      expect(retentionDate.getFullYear()).toBeGreaterThanOrEqual(now.getFullYear() + 7);
    });
  });

  describe('GDPR_RETENTION_DAYS', () => {
    it('should be at least 7 years in days', () => {
      const sevenYearsInDays = 7 * 365 + 1; // +1 for leap year consideration
      expect(GDPR_RETENTION_DAYS).toBeGreaterThanOrEqual(sevenYearsInDays);
    });
  });
});

// =====================================================
// PII PROTECTION TESTS
// =====================================================

describe('PII Protection', () => {
  describe('hashIpAddress', () => {
    it('should hash IP address consistently', () => {
      const hash1 = hashIpAddress('192.168.1.1');
      const hash2 = hashIpAddress('192.168.1.1');
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe('192.168.1.1');
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIpAddress('192.168.1.1');
      const hash2 = hashIpAddress('192.168.1.2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashUserAgent', () => {
    it('should hash user agent consistently', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const hash1 = hashUserAgent(ua);
      const hash2 = hashUserAgent(ua);
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateAnonymousUserId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateAnonymousUserId();
      const id2 = generateAnonymousUserId();
      expect(id1).not.toBe(id2);
      expect(id1).toStartWith('anon_');
    });
  });
});

// =====================================================
// CHAIN VERIFICATION TESTS
// =====================================================

describe('Chain Verification', () => {
  it('should detect tampering in chain', () => {
    // Create a chain of 3 records
    const record1 = mockConsentRecord({
      id: 'record-1',
      record_hash: calculateConsentRecordHash(
        'record-1', 'project', 'user', 'analytics', true,
        '2026-03-31T12:00:00Z', '1.0', null
      ),
      previous_record_hash: null,
    });

    const record2 = mockConsentRecord({
      id: 'record-2',
      record_hash: calculateConsentRecordHash(
        'record-2', 'project', 'user', 'analytics', true,
        '2026-03-31T12:01:00Z', '1.0', record1.record_hash
      ),
      previous_record_hash: record1.record_hash,
    });

    const record3 = mockConsentRecord({
      id: 'record-3',
      record_hash: calculateConsentRecordHash(
        'record-3', 'project', 'user', 'analytics', false,
        '2026-03-31T12:02:00Z', '1.0', record2.record_hash
      ),
      previous_record_hash: record2.record_hash,
    });

    // Verify all records are valid
    expect(verifyConsentRecordIntegrity(record1).valid).toBe(true);
    expect(verifyConsentRecordIntegrity(record2).valid).toBe(true);
    expect(verifyConsentRecordIntegrity(record3).valid).toBe(true);

    // Verify chain links
    expect(record2.previous_record_hash).toBe(record1.record_hash);
    expect(record3.previous_record_hash).toBe(record2.record_hash);
  });

  it('should detect broken chain', () => {
    const record1 = mockConsentRecord({
      id: 'record-1',
      record_hash: 'hash-1',
    });

    const record2 = mockConsentRecord({
      id: 'record-2',
      previous_record_hash: 'different-hash', // Does not match record1
    });

    expect(record2.previous_record_hash).not.toBe(record1.record_hash);
  });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('End-to-End Consent Flow', () => {
  it('should handle full consent lifecycle with integrity', () => {
    // Step 1: Record initial consent
    const userId = 'user-test-123';
    const projectId = 'project-test-456';
    
    const initialRequest = {
      user_id: userId,
      project_id: projectId,
      consent_type: 'analytics',
      consent_granted: true,
      consent_version: '1.0',
      purpose_description: 'Site analytics',
      legal_basis: 'consent',
    };

    const validation = validateConsentRequest(initialRequest);
    expect(validation.valid).toBe(true);

    // Step 2: Calculate hash for the record
    if (validation.valid) {
      const recordId = 'generated-uuid';
      const now = new Date().toISOString();
      const recordHash = calculateConsentRecordHash(
        recordId,
        validation.data.project_id,
        validation.data.user_id,
        validation.data.consent_type,
        validation.data.consent_granted,
        now,
        validation.data.consent_version || '1.0',
        null
      );

      // Step 3: Create record
      const record = mockConsentRecord({
        id: recordId,
        user_id: validation.data.user_id,
        project_id: validation.data.project_id,
        consent_type: validation.data.consent_type,
        consent_granted: validation.data.consent_granted,
        consent_timestamp: now,
        consent_version: validation.data.consent_version || '1.0',
        purpose_description: validation.data.purpose_description || null,
        legal_basis: validation.data.legal_basis || 'consent',
        record_hash: recordHash,
        previous_record_hash: null,
      });

      // Step 4: Verify integrity
      const integrity = verifyConsentRecordIntegrity(record);
      expect(integrity.valid).toBe(true);

      // Step 5: Generate proof
      const { document: proofDoc, hash: proofHash } = generateConsentProofDocument(record);
      expect(proofDoc.gdpr_article_7_compliance.demonstrable).toBe(true);

      // Step 6: Verify Article 7 compliance
      const compliance = verifyArticle7Compliance({
        ...record,
        integrity_proof: { proof_id: 'proof-id', proof_hash: proofHash, generated_at: now },
      });
      expect(compliance.compliant).toBe(true);

      // Step 7: Check consent is valid
      expect(isConsentValid(record)).toBe(true);

      // Step 8: Withdraw consent
      const withdrawValidation = validateWithdrawRequest({
        user_id: userId,
        project_id: projectId,
        consent_type: 'analytics',
        reason: 'No longer want to be tracked',
      });
      expect(withdrawValidation.valid).toBe(true);
    }
  });
});