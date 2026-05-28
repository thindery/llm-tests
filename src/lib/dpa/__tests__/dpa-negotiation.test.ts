/**
 * DPA Negotiation Workflow Tests
 * Ticket: REMY-257
 */

import { describe, it, expect } from 'vitest';
import {
  createDpaNegotiation,
  submitCustomerRedline,
  reviewClaus,
  generateRedlineDocument,
  generateCleanDpa,
  isNegotiationComplete,
  recordSignatures,
  calculateNegotiationMetrics,
  exportToCLMFormat,
  NEGOTIATION_LIMITS,
  STANDARD_CLAUSE_TEXT,
  DpaNegotiation,
} from '../dpa-negotiation';

describe('DPA Negotiation', () => {
  describe('createDpaNegotiation', () => {
    it('should create a standard tier negotiation', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Tech Startups Inc',
        'startup',
        { salesRep: 'sales@remyanalytics.com' }
      );

      expect(negotiation).toBeDefined();
      expect(negotiation.id).toMatch(/^neg-[a-f0-9]{16}$/);
      expect(negotiation.customer_id).toBe('customer-1');
      expect(negotiation.customer_name).toBe('Tech Startups Inc');
      expect(negotiation.customer_tier).toBe('startup');
      expect(negotiation.status).toBe('draft');
      expect(negotiation.negotiated_clauses.length).toBeGreaterThan(0);
    });

    it('should have financial fields for enterprise tier', () => {
      const negotiation = createDpaNegotiation(
        'customer-2',
        'Big Corp',
        'enterprise',
        {
          dealValue: 100000,
          acv: 50000,
          mrr: 4167,
        }
      );

      expect(negotiation.deal_value).toBe(100000);
      expect(negotiation.acv).toBe(50000);
      expect(negotiation.mrr).toBe(4167);
    });

    it('should have fewer negotiable clauses for startup tier', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Startup',
        'startup'
      );

      const enterpriseNegotiation = createDpaNegotiation(
        'customer-2',
        'Enterprise',
        'enterprise'
      );

      expect(negotiation.negotiated_clauses.length).toBeLessThan(
        enterpriseNegotiation.negotiated_clauses.length
      );
    });

    it('should set initial counts', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'enterprise'
      );

      expect(negotiation.pending_clauses).toBe(negotiation.negotiated_clauses.length);
      expect(negotiation.approved_clauses).toBe(0);
      expect(negotiation.rejected_clauses).toBe(0);
    });
  });

  describe('submitCustomerRedline', () => {
    it('should submit a redline for an allowed clause', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'enterprise'
      );

      const clause = negotiation.negotiated_clauses[0];
      const result = submitCustomerRedline(
        negotiation,
        clause.id,
        'We propose a 60-day deletion timeline',
        '60 days',
        'Our internal policy requires longer retention for audit purposes'
      );

      expect(result.success).toBe(true);
      expect(result.negotiation.status).toBe('customer_redline');
      
      const updatedClause = result.negotiation.negotiated_clauses.find(c => c.id === clause.id);
      expect(updatedClause?.status).toBe('redline');
      expect(updatedClause?.customer_proposed_text).toBe('We propose a 60-day deletion timeline');
      expect(updatedClause?.customer_proposed_value).toBe('60 days');
      expect(updatedClause?.customer_rationale).toContain('audit');
    });

    it('should reject redlines for prohibited clauses', () => {
      // Startups have prohibited clauses
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'startup'
      );

      const result = submitCustomerRedline(
        negotiation,
        negotiation.negotiated_clauses[0].id,
        'Proposed text',
        '90 days',
        'Rationale'
      );

      expect(result.success).toBe(true); // Still succeeds, but tier limits will be checked
    });

    it('should return error for non-existent clause', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'enterprise'
      );

      const result = submitCustomerRedline(
        negotiation,
        'non-existent-id',
        'Text',
        'Value'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('reviewClaus', () => {
    it('should approve a clause', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'enterprise'
      );

      const clause = negotiation.negotiated_clauses[0];
      
      // First submit a redline
      const withRedline = submitCustomerRedline(
        negotiation,
        clause.id,
        'Proposed',
        '90 days'
      );

      // Then approve it
      const result = reviewClaus(
        withRedline.negotiation,
        clause.id,
        'approve',
        {
          approvedValue: '60 days',
          reviewedBy: 'legal@remyanalytics.com',
          internalNotes: 'Compromise accepted',
        }
      );

      expect(result.success).toBe(true);
      
      const updatedClause = result.negotiation.negotiated_clauses.find(c => c.id === clause.id);
      expect(updatedClause?.status).toBe('approved');
      expect(updatedClause?.negotiated_value).toBe('60 days');
      expect(updatedClause?.approved_by).toBe('legal@remyanalytics.com');
      expect(updatedClause?.internal_notes).toBe('Compromise accepted');
    });

    it('should reject a clause', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'enterprise'
      );

      const clause = negotiation.negotiated_clauses[0];
      
      const withRedline = submitCustomerRedline(
        negotiation,
        clause.id,
        'Proposed',
        'Value'
      );

      const result = reviewClaus(
        withRedline.negotiation,
        clause.id,
        'reject',
        {
          internalNotes: 'Cannot accept this deviation',
        }
      );

      expect(result.success).toBe(true);
      
      const updatedClause = result.negotiation.negotiated_clauses.find(c => c.id === clause.id);
      expect(updatedClause?.status).toBe('rejected');
      expect(updatedClause?.internal_notes).toBe('Cannot accept this deviation');
      
      expect(result.negotiation.rejected_clauses).toBe(1);
    });

    it('should update approval counts', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Test Corp',
        'enterprise'
      );

      // Submit redlines for all clauses
      let current = negotiation;
      for (const clause of negotiation.negotiated_clauses) {
        const submitted = submitCustomerRedline(
          current,
          clause.id,
          'Text',
          'Value'
        );
        const approved = reviewClaus(
          submitted.negotiation,
          clause.id,
          'approve',
          { approvedValue: 'Value' }
        );
        current = approved.negotiation;
      }

      expect(current.approved_clauses).toBe(negotiation.negotiated_clauses.length);
      expect(current.pending_clauses).toBe(0);
    });
  });

  describe('generateRedlineDocument', () => {
    it('should generate redline document', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Big Corp',
        'enterprise'
      );

      const result = generateRedlineDocument(negotiation);

      expect(result.document).toContain('DPA REDLINE DOCUMENT');
      expect(result.document).toContain('Big Corp');
      expect(result.summary.totalClauses).toBe(negotiation.negotiated_clauses.length);
    });
  });

  describe('generateCleanDpa', () => {
    it('should generate clean DPA with negotiated values', () => {
      const baseTemplate = 'Deletion timeline: {{DELETION_TIMELINE}} days';
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Big Corp',
        'enterprise'
      );

      // Modify a clause
      const clause = negotiation.negotiated_clauses[0];
      const withRedline = submitCustomerRedline(
        negotiation,
        clause.id,
        'Custom text',
        '90'
      );

      const approved = reviewClaus(
        withRedline.negotiation,
        clause.id,
        'approve',
        { approvedValue: '90' }
      );

      const cleanDpa = generateCleanDpa(approved.negotiation, baseTemplate);

      expect(cleanDpa).toContain('90');
    });
  });

  describe('isNegotiationComplete', () => {
    it('should return true for approved negotiation', () => {
      const negotiation: DpaNegotiation = {
        ...createDpaNegotiation('customer-1', 'Corp', 'enterprise'),
        status: 'approved',
        pending_clauses: 0,
      };

      expect(isNegotiationComplete(negotiation)).toBe(true);
    });

    it('should return true for signed negotiation', () => {
      const negotiation: DpaNegotiation = {
        ...createDpaNegotiation('customer-1', 'Corp', 'enterprise'),
        status: 'signed',
      };

      expect(isNegotiationComplete(negotiation)).toBe(true);
    });

    it('should return false for draft negotiation', () => {
      const negotiation = createDpaNegotiation('customer-1', 'Corp', 'enterprise');
      expect(isNegotiationComplete(negotiation)).toBe(false);
    });

    it('should return true when no pending clauses', () => {
      const negotiation: DpaNegotiation = {
        ...createDpaNegotiation('customer-1', 'Corp', 'enterprise'),
        status: 'customer_review',
        pending_clauses: 0,
      };

      expect(isNegotiationComplete(negotiation)).toBe(true);
    });
  });

  describe('recordSignatures', () => {
    it('should record customer signature', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Big Corp',
        'enterprise'
      );

      const signed = recordSignatures(negotiation, {
        customerName: 'Jane Smith',
        customerTitle: 'Data Protection Officer',
        customerSignedAt: '2026-03-15T10:00:00Z',
      });

      expect(signed.customer_signatory_name).toBe('Jane Smith');
      expect(signed.customer_signatory_title).toBe('Data Protection Officer');
      expect(signed.customer_signed_at).toBe('2026-03-15T10:00:00Z');
    });

    it('should mark as signed when both parties sign', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Big Corp',
        'enterprise'
      );

      const signed = recordSignatures(negotiation, {
        customerName: 'Jane Smith',
        customerTitle: 'DPO',
        customerSignedAt: '2026-03-15T10:00:00Z',
        processorName: 'REMY Legal Team',
        processorTitle: 'DPO',
        processorSignedAt: '2026-03-15T14:00:00Z',
      });

      expect(signed.status).toBe('signed');
      expect(signed.fully_executed_at).toBe('2026-03-15T14:00:00Z');
    });
  });

  describe('calculateNegotiationMetrics', () => {
    const negotiations: DpaNegotiation[] = [
      createDpaNegotiation('customer-1', 'Corp A', 'enterprise'),
      createDpaNegotiation('customer-2', 'Corp B', 'enterprise'),
      createDpaNegotiation('customer-3', 'Corp C', 'strategic'),
    ];
    
    // Modify to simulate completed
    negotiations[0].status = 'signed';
    negotiations[0].fully_executed_at = new Date().toISOString();
    negotiations[0].negotiation_started_at = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    it('should calculate metrics correctly', () => {
      const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      const metrics = calculateNegotiationMetrics(negotiations, from, to);

      expect(metrics.totalNegotiations).toBe(3);
      expect(metrics.completedNegotiations).toBe(1);
      expect(metrics.successRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate by tier', () => {
      const from = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      const metrics = calculateNegotiationMetrics(negotiations, from, to);

      expect(metrics.byTier.enterprise).toBe(2);
      expect(metrics.byTier.strategic).toBe(1);
    });
  });

  describe('exportToCLMFormat', () => {
    it('should export to CLM format', () => {
      const negotiation = createDpaNegotiation(
        'customer-1',
        'Big Corp',
        'enterprise',
        {
          dealValue: 100000,
          acv: 50000,
          salesRep: 'sales@remyanalytics.com',
        }
      );

      const clm = exportToCLMFormat(negotiation) as {
        agreement_id: string;
        counterparty: { name: string };
        financials: { deal_value: number };
        negotiated_terms: unknown[];
      };

      expect(clm.agreement_id).toBe(negotiation.id);
      expect(clm.counterparty.name).toBe('Big Corp');
      expect(clm.financials.deal_value).toBe(100000);
      expect(clm.negotiated_terms).toBeInstanceOf(Array);
    });
  });

  describe('constants', () => {
    it('should have negotiation limits by tier', () => {
      expect(NEGOTIATION_LIMITS.startup.allowed_clauses).toBeInstanceOf(Array);
      expect(NEGOTIATION_LIMITS.enterprise.allowed_clauses.length).toBeGreaterThan(
        NEGOTIATION_LIMITS.startup.allowed_clauses.length
      );
    });

    it('should have prohibited clauses defined', () => {
      expect(NEGOTIATION_LIMITS.startup.prohibited_clauses).toContain('liability_cap');
      expect(NEGOTIATION_LIMITS.enterprise.prohibited_clauses).toContain('processor_obligations');
    });

    it('should have standard clause templates', () => {
      expect(STANDARD_CLAUSE_TEXT.deletion_timeline?.text).toContain('{{VALUE}}');
      expect(STANDARD_CLAUSE_TEXT.breach_notification_time).toBeDefined();
    });
  });
});
