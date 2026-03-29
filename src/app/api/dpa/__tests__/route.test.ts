/**
 * DPA API Routes Tests
 * Ticket: REMY-257
 * 
 * Tests for:
 * - GET /api/v1/dpa - List customer's DPA agreements
 * - GET /api/v1/dpa/current - Get current DPA version
 * - POST /api/v1/dpa/accept - Accept DPA
 * - GET /api/v1/dpa/certificate - Download signed certificate
 * 
 * Note: Some tests use a mock customer ID for testing since the API
 * has development fallbacks for unauthorized requests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST, dpaAgreements, dpaVersions } from '../route';
import { CURRENT_DPA_VERSION } from '../../../../lib/dpa/utils';

describe('DPA API Routes', () => {
  const mockUserId = 'test-user-123';
  const mockAuthHeader = `Bearer ${mockUserId}`;

  beforeEach(() => {
    // Clear in-memory storage before each test
    dpaAgreements.clear();
    
    // Ensure current version exists
    if (!dpaVersions.has(CURRENT_DPA_VERSION)) {
      dpaVersions.set(CURRENT_DPA_VERSION, {
        version: CURRENT_DPA_VERSION,
        content: '# Test DPA Template',
        effectiveDate: new Date().toISOString(),
      });
    }
  });

  describe('GET /api/v1/dpa', () => {
    it('should return empty state for user with no DPA agreements', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa', {
        headers: { Authorization: mockAuthHeader },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.hasSignedDpa).toBe(false);
      expect(data.data.currentVersion).toBe(CURRENT_DPA_VERSION);
      expect(data.data.agreementHistory).toEqual([]);
      expect(data.data.latestAgreement).toBeNull();
    });

    it('should return DPA status for user with signed agreement', async () => {
      // Create a signed agreement
      const agreement = {
        id: 'test-agreement-id',
        customer_id: mockUserId,
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: new Date().toISOString(),
        ip_address_hash: 'hashed-ip',
        signature_hash: 'test-signature-hash',
        signing_metadata: { name: 'Test User', title: 'Admin' },
        status: 'signed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
        pdf_url: null,
      };
      dpaAgreements.set(agreement.id, agreement);

      const request = new Request('http://localhost:3000/api/v1/dpa', {
        headers: { Authorization: mockAuthHeader },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.hasSignedDpa).toBe(true);
      expect(data.data.latestAgreement).toBeDefined();
      expect(data.data.latestAgreement.id).toBe(agreement.id);
      expect(data.data.agreementHistory).toHaveLength(1);
    });

    it('should sort agreements by signed_at descending', async () => {
      // Create multiple agreements
      const agreement1 = {
        id: 'agreement-1',
        customer_id: mockUserId,
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: '2026-01-01T00:00:00Z',
        ip_address_hash: 'hash1',
        signature_hash: 'sig1',
        signing_metadata: {},
        status: 'expired' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        expires_at: null,
        pdf_url: null,
      };
      const agreement2 = {
        id: 'agreement-2',
        customer_id: mockUserId,
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: '2026-03-01T00:00:00Z',
        ip_address_hash: 'hash2',
        signature_hash: 'sig2',
        signing_metadata: {},
        status: 'signed' as const,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
        expires_at: null,
        pdf_url: null,
      };
      
      dpaAgreements.set(agreement1.id, agreement1);
      dpaAgreements.set(agreement2.id, agreement2);

      const request = new Request('http://localhost:3000/api/v1/dpa', {
        headers: { Authorization: mockAuthHeader },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.agreementHistory[0].id).toBe('agreement-2');
      expect(data.data.agreementHistory[1].id).toBe('agreement-1');
    });

    it('should use mock user when no auth header provided (dev fallback)', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa', {
        headers: {},
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/v1/dpa/current', () => {
    it('should return current DPA version', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/current');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.version).toBe(CURRENT_DPA_VERSION);
      expect(data.data.required).toBe(true);
      expect(data.data.content).toBeDefined();
      expect(data.data.effectiveDate).toBeDefined();
    });

    it('should return 404 if version not found', async () => {
      // Clear versions temporarily
      dpaVersions.clear();

      const request = new Request('http://localhost:3000/api/v1/dpa/current');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('DPA version not found');

      // Restore for other tests
      dpaVersions.set(CURRENT_DPA_VERSION, {
        version: CURRENT_DPA_VERSION,
        content: '# Test DPA Template',
        effectiveDate: new Date().toISOString(),
      });
    });
  });

  describe('POST /api/v1/dpa/accept', () => {
    it('should return 400 for invalid JSON body', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          Authorization: mockAuthHeader,
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should return 400 for missing name', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          Authorization: mockAuthHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Admin', acceptTerms: true }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Name is required');
    });

    it('should return 400 for missing title', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          Authorization: mockAuthHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User', acceptTerms: true }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Title is required');
    });

    it('should return 400 for not accepting terms', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          Authorization: mockAuthHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User', title: 'Admin', acceptTerms: false }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('accept');
    });

    it('should return 409 if DPA already signed', async () => {
      // Create existing signed agreement
      const existingAgreement = {
        id: 'existing-agreement',
        customer_id: 'mock-user-id', // Note: dev fallback uses this ID
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: new Date().toISOString(),
        ip_address_hash: 'hash',
        signature_hash: 'sig',
        signing_metadata: {},
        status: 'signed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
        pdf_url: null,
      };
      dpaAgreements.set(existingAgreement.id, existingAgreement);

      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test User', title: 'Admin', acceptTerms: true }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('already signed');
    });

    it('should successfully accept DPA with valid data', async () => {
      // Clear any existing agreements
      dpaAgreements.clear();

      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          Authorization: mockAuthHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: 'John Doe', 
          title: 'Data Protection Officer', 
          acceptTerms: true 
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
      expect(data.data.agreementId).toBeDefined();
      expect(data.data.documentId).toBeDefined();
      expect(data.data.signedAt).toBeDefined();
      expect(data.data.version).toBe(CURRENT_DPA_VERSION);
      expect(data.data.pdfUrl).toBeDefined();
    });

    it('should store agreement in memory after acceptance', async () => {
      // Clear any existing agreements
      dpaAgreements.clear();

      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          Authorization: mockAuthHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: 'John Doe', 
          title: 'Data Protection Officer', 
          acceptTerms: true 
        }),
      });

      await POST(request);

      // Verify stored agreement
      expect(dpaAgreements.size).toBeGreaterThan(0);
      
      const storedAgreement = Array.from(dpaAgreements.values())[0];
      expect(storedAgreement.status).toBe('signed');
      expect(storedAgreement.signing_metadata).toMatchObject({
        name: 'John Doe',
        title: 'Data Protection Officer',
      });
    });

    it('should use mock user when no auth header (dev fallback)', async () => {
      // Clear any existing agreements first
      dpaAgreements.clear();

      const request = new Request('http://localhost:3000/api/v1/dpa/accept', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: 'John Doe', 
          title: 'Data Protection Officer', 
          acceptTerms: true 
        }),
      });

      const response = await POST(request);

      // Dev fallback should succeed
      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/v1/dpa/certificate', () => {
    it('should return 400 if agreement ID not provided', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/certificate', {
        headers: { Authorization: mockAuthHeader },
      });
      const response = await GET(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Agreement ID required');
    });

    it('should return 404 if agreement not found', async () => {
      const request = new Request('http://localhost:3000/api/v1/dpa/certificate?id=nonexistent', {
        headers: { Authorization: mockAuthHeader },
      });
      const response = await GET(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Agreement not found');
    });

    it('should return 403 if accessing another user agreement', async () => {
      // Create agreement for different user
      const otherUserAgreement = {
        id: 'other-agreement',
        customer_id: 'other-user-id',
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: new Date().toISOString(),
        ip_address_hash: 'hash',
        signature_hash: 'sig',
        signing_metadata: {},
        status: 'signed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
        pdf_url: null,
      };
      dpaAgreements.set(otherUserAgreement.id, otherUserAgreement);

      const request = new Request('http://localhost:3000/api/v1/dpa/certificate?id=other-agreement', {
        headers: { Authorization: mockAuthHeader },
      });
      const response = await GET(request);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return HTML certificate for valid agreement', async () => {
      // Create agreement for current user
      const agreement = {
        id: 'cert-test-agreement',
        customer_id: mockUserId,
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: new Date().toISOString(),
        ip_address_hash: 'hash',
        signature_hash: 'test-signature-hash-value',
        signing_metadata: { name: 'John Doe', title: 'Admin', customerName: 'Acme Corp' },
        status: 'signed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
        pdf_url: '/dpa-certificates/cert-test-agreement.html',
      };
      dpaAgreements.set(agreement.id, agreement);

      const request = new Request('http://localhost:3000/api/v1/dpa/certificate?id=cert-test-agreement', {
        headers: { Authorization: mockAuthHeader },
      });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(response.headers.get('Content-Disposition')).toContain('dpa-certificate');

      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Data Processing Agreement');
      expect(html).toContain('test-signature-hash-value');
    });

    it('should show metadata in certificate', async () => {
      // Create agreement for current user
      const agreement = {
        id: 'cert-test-agreement-2',
        customer_id: mockUserId,
        dpa_version: CURRENT_DPA_VERSION,
        signed_at: new Date().toISOString(),
        ip_address_hash: 'hash',
        signature_hash: 'test-signature',
        signing_metadata: { name: 'Jane Smith', title: 'CEO' },
        status: 'signed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
        pdf_url: null,
      };
      dpaAgreements.set(agreement.id, agreement);

      const request = new Request('http://localhost:3000/api/v1/dpa/certificate?id=cert-test-agreement-2', {
        headers: { Authorization: mockAuthHeader },
      });
      const response = await GET(request);
      const html = await response.text();

      expect(html).toContain('Document Information');
      expect(html).toContain('signature');
    });
  });
});