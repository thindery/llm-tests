/**
 * DPA PDF Generator Tests
 * Ticket: REMY-257
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generatePdfHtml,
  markdownToHtml,
  createCertificateResponse,
  createPdfBlob,
} from '../pdf-generator';
import { DpaAgreement } from '../utils';

describe('DPA PDF Generator', () => {
  const mockAgreement: DpaAgreement = {
    id: 'test-agreement-id',
    customer_id: 'customer-123',
    dpa_version: '1.0',
    signed_at: '2026-03-15T14:30:00Z',
    ip_address_hash: 'hashed-ip-address',
    signature_hash: 'test-signature-hash-123456789',
    signing_metadata: {
      name: 'John Doe',
      title: 'Data Protection Officer',
      customerName: 'Acme Corp',
      documentId: 'dpa-abc123',
    },
    status: 'signed',
    created_at: '2026-03-15T14:30:00Z',
    updated_at: '2026-03-15T14:30:00Z',
    expires_at: null,
    pdf_url: '/dpa-certificates/test-id.html',
  };

  describe('generatePdfHtml', () => {
    it('should generate valid HTML document', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
    });

    it('should include document title with customer name', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('<title>Data Processing Agreement - Acme Corp');
    });

    it('should include signed status badge', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('SIGNED');
      expect(html).toContain('status-signed');
    });

    it('should include signature hash', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain(mockAgreement.signature_hash);
    });

    it('should include document ID', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain(mockAgreement.id);
    });

    it('should include signed date', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('March'); // Should contain formatted date
      expect(html).toContain('2026');
    });

    it('should show watermark for signed agreements', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        { ...mockAgreement, status: 'signed' },
        'Acme Corp'
      );

      expect(html).toContain('watermark');
      expect(html).toContain('Signed');
    });

    it('should include metadata section', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('metadata');
      expect(html).toContain('Document Information');
      expect(html).toContain('Signature Hash');
    });

    it('should include signature blocks', () => {
      const html = generatePdfHtml(
        '# DPA Content',
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('signature-block');
      expect(html).toContain('Controller Representative');
      expect(html).toContain('REMY Analytics');
      expect(html).toContain('Data Protection Officer');
    });

    it('should handle null signed_at gracefully', () => {
      const unsignedAgreement = { ...mockAgreement, signed_at: null };
      const html = generatePdfHtml(
        '# DPA Content',
        unsignedAgreement,
        'Acme Corp'
      );

      expect(html).toContain('Pending');
    });

    it('should process template content', () => {
      const templateContent = '# Article 1\n\nThis is the content.';
      const html = generatePdfHtml(
        templateContent,
        mockAgreement,
        'Acme Corp'
      );

      expect(html).toContain('<br>'); // Line breaks should be converted
    });
  });

  describe('markdownToHtml', () => {
    it('should convert headers', () => {
      const result = markdownToHtml('# Header 1\n## Header 2\n### Header 3');
      expect(result).toContain('<h1>Header 1</h1>');
      expect(result).toContain('<h2>Header 2</h2>');
      expect(result).toContain('<h3>Header 3</h3>');
    });

    it('should convert bold text', () => {
      const result = markdownToHtml('This is **bold** text');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should convert italic text', () => {
      const result = markdownToHtml('This is *italic* text');
      expect(result).toContain('<em>italic</em>');
    });

    it('should convert line breaks', () => {
      const result = markdownToHtml('Line 1\nLine 2');
      expect(result).toContain('<br>');
    });

    it('should handle empty string', () => {
      const result = markdownToHtml('');
      expect(result).toBe('');
    });
  });

  describe('createPdfBlob', () => {
    it('should create blob with correct type', () => {
      const html = '<html></html>';
      const blob = createPdfBlob(html);

      expect(blob.type).toBe('text/html;charset=utf-8');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('createCertificateResponse', () => {
    it('should create certificate with all fields', () => {
      const response = createCertificateResponse(
        mockAgreement,
        '# Template',
        'Acme Corp'
      );

      expect(response.agreementId).toBe(mockAgreement.id);
      expect(response.documentId).toMatch(/^DPA-/);
      expect(response.fileType).toBe('html');
      expect(response.expiresAt).toBeNull();
    });

    it('should create unique document ID per agreement', () => {
      const response1 = createCertificateResponse(
        { ...mockAgreement, id: 'id-1' },
        '# Template',
        'Acme Corp'
      );
      const response2 = createCertificateResponse(
        { ...mockAgreement, id: 'id-2' },
        '# Template',
        'Acme Corp'
      );

      expect(response1.documentId).not.toBe(response2.documentId);
    });
  });
});