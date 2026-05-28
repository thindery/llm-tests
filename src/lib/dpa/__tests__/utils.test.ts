/**
 * DPA Utilities Tests
 * Ticket: REMY-257
 */

import { describe, it, expect, vi } from 'vitest';
import {
  hashIpAddress,
  generateSignatureHash,
  verifySignatureHash,
  generateDocumentId,
  formatLegalDate,
  formatLegalTimestamp,
  isDpaExpired,
  validateSignatureRequest,
  processTemplate,
  getTemplateVariables,
  CURRENT_DPA_VERSION,
} from '../utils';

describe('DPA Utilities', () => {
  describe('hashIpAddress', () => {
    it('should return consistent hash for same IP', () => {
      const ip = '192.168.1.1';
      const hash1 = hashIpAddress(ip);
      const hash2 = hashIpAddress(ip);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should return different hashes for different IPs', () => {
      const hash1 = hashIpAddress('192.168.1.1');
      const hash2 = hashIpAddress('192.168.1.2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return valid hex string', () => {
      const hash = hashIpAddress('10.0.0.1');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateSignatureHash', () => {
    it('should generate consistent hash for same data', () => {
      const data = {
        customerId: 'user-123',
        version: '1.0',
        signedAt: '2026-01-01T00:00:00Z',
        name: 'John Doe',
        title: 'Admin',
        ipAddress: '192.168.1.1',
      };
      const hash1 = generateSignatureHash(data);
      const hash2 = generateSignatureHash(data);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different data', () => {
      const data1 = {
        customerId: 'user-123',
        version: '1.0',
        signedAt: '2026-01-01T00:00:00Z',
        name: 'John Doe',
        title: 'Admin',
        ipAddress: '192.168.1.1',
      };
      const data2 = { ...data1, name: 'Jane Doe' };
      const hash1 = generateSignatureHash(data1);
      const hash2 = generateSignatureHash(data2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return 128 character hex string', () => {
      const data = {
        customerId: 'user-123',
        version: '1.0',
        signedAt: '2026-01-01T00:00:00Z',
        name: 'John Doe',
        title: 'Admin',
        ipAddress: '192.168.1.1',
      };
      const hash = generateSignatureHash(data);
      expect(hash).toHaveLength(128); // SHA-512 hex length
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('verifySignatureHash', () => {
    it('should return true for valid hash', () => {
      const data = {
        customerId: 'user-123',
        version: '1.0',
        signedAt: '2026-01-01T00:00:00Z',
        name: 'John Doe',
        title: 'Admin',
        ipAddress: '192.168.1.1',
      };
      const hash = generateSignatureHash(data);
      expect(verifySignatureHash(data, hash)).toBe(true);
    });

    it('should return false for invalid hash', () => {
      const data = {
        customerId: 'user-123',
        version: '1.0',
        signedAt: '2026-01-01T00:00:00Z',
        name: 'John Doe',
        title: 'Admin',
        ipAddress: '192.168.1.1',
      };
      expect(verifySignatureHash(data, 'invalid-hash')).toBe(false);
    });

    it('should return false for tampered data', () => {
      const data = {
        customerId: 'user-123',
        version: '1.0',
        signedAt: '2026-01-01T00:00:00Z',
        name: 'John Doe',
        title: 'Admin',
        ipAddress: '192.168.1.1',
      };
      const hash = generateSignatureHash(data);
      const tamperedData = { ...data, name: 'Jane Doe' };
      expect(verifySignatureHash(tamperedData, hash)).toBe(false);
    });
  });

  describe('generateDocumentId', () => {
    it('should return string starting with dpa-', () => {
      const docId = generateDocumentId();
      expect(docId).toMatch(/^dpa-[a-f0-9]{16}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateDocumentId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('formatLegalDate', () => {
    it('should return ISO date format (YYYY-MM-DD)', () => {
      const date = new Date('2026-03-15T14:30:00Z');
      expect(formatLegalDate(date)).toBe('2026-03-15');
    });

    it('should handle different dates correctly', () => {
      expect(formatLegalDate(new Date('2026-01-01'))).toBe('2026-01-01');
      expect(formatLegalDate(new Date('2026-12-31'))).toBe('2026-12-31');
    });
  });

  describe('formatLegalTimestamp', () => {
    it('should return ISO timestamp', () => {
      const date = new Date('2026-03-15T14:30:00Z');
      expect(formatLegalTimestamp(date)).toBe(date.toISOString());
    });
  });

  describe('isDpaExpired', () => {
    it('should return true for expired status', () => {
      const agreement = {
        id: 'test',
        customer_id: 'user',
        dpa_version: '1.0',
        signed_at: '2026-01-01T00:00:00Z',
        ip_address_hash: null,
        signature_hash: 'test',
        signing_metadata: {},
        status: 'expired' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        expires_at: null,
        pdf_url: null,
      };
      expect(isDpaExpired(agreement)).toBe(true);
    });

    it('should return true for past expires_at date', () => {
      const agreement = {
        id: 'test',
        customer_id: 'user',
        dpa_version: '1.0',
        signed_at: '2026-01-01T00:00:00Z',
        ip_address_hash: null,
        signature_hash: 'test',
        signing_metadata: {},
        status: 'signed' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        expires_at: '2020-01-01T00:00:00Z', // Past date
        pdf_url: null,
      };
      expect(isDpaExpired(agreement)).toBe(true);
    });

    it('should return false for active signed agreement', () => {
      const agreement = {
        id: 'test',
        customer_id: 'user',
        dpa_version: '1.0',
        signed_at: '2026-01-01T00:00:00Z',
        ip_address_hash: null,
        signature_hash: 'test',
        signing_metadata: {},
        status: 'signed' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        expires_at: null,
        pdf_url: null,
      };
      expect(isDpaExpired(agreement)).toBe(false);
    });

    it('should return false for future expires_at date', () => {
      const agreement = {
        id: 'test',
        customer_id: 'user',
        dpa_version: '1.0',
        signed_at: '2026-01-01T00:00:00Z',
        ip_address_hash: null,
        signature_hash: 'test',
        signing_metadata: {},
        status: 'signed' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        expires_at: '2030-01-01T00:00:00Z', // Future date
        pdf_url: null,
      };
      expect(isDpaExpired(agreement)).toBe(false);
    });
  });

  describe('validateSignatureRequest', () => {
    it('should validate valid request', () => {
      const result = validateSignatureRequest({
        name: 'John Doe',
        title: 'Admin',
        acceptTerms: true,
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.title).toBe('Admin');
        expect(result.data.acceptTerms).toBe(true);
      }
    });

    it('should reject empty name', () => {
      const result = validateSignatureRequest({
        name: '',
        title: 'Admin',
        acceptTerms: true,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Name');
      }
    });

    it('should reject short name', () => {
      const result = validateSignatureRequest({
        name: 'A',
        title: 'Admin',
        acceptTerms: true,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject empty title', () => {
      const result = validateSignatureRequest({
        name: 'John Doe',
        title: '',
        acceptTerms: true,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Title');
      }
    });

    it('should reject if terms not accepted', () => {
      const result = validateSignatureRequest({
        name: 'John Doe',
        title: 'Admin',
        acceptTerms: false,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('accept');
      }
    });

    it('should reject undefined acceptTerms', () => {
      const result = validateSignatureRequest({
        name: 'John Doe',
        title: 'Admin',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject non-object input', () => {
      const result = validateSignatureRequest('invalid');
      expect(result.valid).toBe(false);
    });

    it('should trim whitespace from name and title', () => {
      const result = validateSignatureRequest({
        name: '  John Doe  ',
        title: '  Admin  ',
        acceptTerms: true,
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.title).toBe('Admin');
      }
    });
  });

  describe('processTemplate', () => {
    it('should replace template variables', () => {
      const template = 'Hello {{NAME}}, your role is {{ROLE}}.';
      const result = processTemplate(template, {
        NAME: 'John',
        ROLE: 'Admin',
      });
      expect(result).toBe('Hello John, your role is Admin.');
    });

    it('should replace multiple occurrences', () => {
      const template = '{{NAME}} {{NAME}} {{NAME}}';
      const result = processTemplate(template, { NAME: 'Hi' });
      expect(result).toBe('Hi Hi Hi');
    });

    it('should keep unreplaced variables', () => {
      const template = 'Hello {{NAME}}, your {{UNKNOWN}} is here.';
      const result = processTemplate(template, { NAME: 'John' });
      expect(result).toBe('Hello John, your {{UNKNOWN}} is here.');
    });

    it('should handle empty template', () => {
      const result = processTemplate('', { NAME: 'John' });
      expect(result).toBe('');
    });
  });

  describe('getTemplateVariables', () => {
    it('should generate all required variables', () => {
      const vars = getTemplateVariables(
        'Acme Corp',
        'John Doe',
        'CEO',
        'dpa-abc123',
        'signature-hash-value'
      );

      expect(vars.CONTROLLER_NAME).toBe('Acme Corp');
      expect(vars.CONTROLLER_REP_NAME).toBe('John Doe');
      expect(vars.CONTROLLER_REP_TITLE).toBe('CEO');
      expect(vars.DOCUMENT_ID).toBe('dpa-abc123');
      expect(vars.PROCESSOR_REP_NAME).toBe('REMY Analytics Legal Team');
      expect(vars.PROCESSOR_REP_TITLE).toBe('Data Protection Officer');
      expect(vars.DIGITAL_SIGNATURE).toBe('signature-hash-value'.substring(0, 32) + '...');
    });

    it('should generate valid dates', () => {
      const vars = getTemplateVariables('Corp', 'Name', 'Title', 'ID', 'Hash');
      
      // EFFECTIVE_DATE should be YYYY-MM-DD format
      expect(vars.EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // SIGNATURE_DATE should also be YYYY-MM-DD format  
      expect(vars.SIGNATURE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // GENERATED_TIMESTAMP should be ISO format
      expect(vars.GENERATED_TIMESTAMP).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('CURRENT_DPA_VERSION', () => {
    it('should be defined', () => {
      expect(CURRENT_DPA_VERSION).toBeDefined();
      expect(typeof CURRENT_DPA_VERSION).toBe('string');
    });

    it('should follow semantic versioning format', () => {
      expect(CURRENT_DPA_VERSION).toMatch(/^\d+\.\d+$/);
    });
  });
});