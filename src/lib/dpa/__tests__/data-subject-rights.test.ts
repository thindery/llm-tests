/**
 * Data Subject Rights Response Time Tracking Tests
 * Ticket: REMY-257
 */

import { describe, it, expect } from 'vitest';
import {
  createDataSubjectRequest,
  requestSLAExtension,
  isOverdue,
  isApproachingDeadline,
  getDaysUntilDeadline,
  calculateSlaMetrics,
  generateAcknowledgmentEmail,
  validateDSRRequest,
  exportRequestsToCSV,
  DEFAULT_SLA_CONFIG,
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
  DataSubjectRequest,
} from '../data-subject-rights';

describe('Data Subject Rights', () => {
  describe('createDataSubjectRequest', () => {
    it('should create a valid data subject request', () => {
      const request = createDataSubjectRequest(
        'customer-123',
        'access',
        'data.subject@example.com',
        'Requesting access to my personal data'
      );

      expect(request).toBeDefined();
      expect(request.id).toMatch(/^dsr-[a-f0-9]{16}$/);
      expect(request.customer_id).toBe('customer-123');
      expect(request.request_type).toBe('access');
      expect(request.data_subject_email).toBe('data.subject@example.com');
      expect(request.status).toBe('pending');
      expect(request.gdpr_article).toBe('Article 15');
      expect(request.sla_deadline).toBeDefined();
      expect(request.extension_granted).toBe(false);
    });

    it('should calculate SLA deadline based on request type', () => {
      const accessRequest = createDataSubjectRequest(
        'customer-123',
        'access',
        'data.subject@example.com',
        'Request'
      );
      
      const breachRequest = createDataSubjectRequest(
        'customer-123',
        'breach_inquiry',
        'data.subject@example.com',
        'Request',
        { priority: 'urgent' }
      );

      const accessDeadline = new Date(accessRequest.sla_deadline);
      const breachDeadline = new Date(breachRequest.sla_deadline);

      // Access requests should have ~30 business days (~42 calendar days)
      const accessDays = Math.ceil((accessDeadline.getTime() - new Date(accessRequest.received_at).getTime()) / (24 * 60 * 60 * 1000));
      expect(accessDays).toBeGreaterThanOrEqual(35);

      // Breach inquiries should have much shorter deadline (2 calendar days for urgent requests)
      const breachDays = Math.ceil((breachDeadline.getTime() - new Date(breachRequest.received_at).getTime()) / (24 * 60 * 60 * 1000));
      expect(breachDays).toBeLessThanOrEqual(3);
      expect(breachDays).toBeGreaterThanOrEqual(1);
    });

    it('should support optional parameters', () => {
      const request = createDataSubjectRequest(
        'customer-123',
        'erasure',
        'data.subject@example.com',
        'Please delete my data',
        {
          priority: 'high',
          complexity: 'complex',
          channel: 'web_form',
          dataSubjectName: 'John Doe',
          dataCategories: ['contact_data', 'usage_data'],
        }
      );

      expect(request.priority).toBe('high');
      expect(request.complexity).toBe('complex');
      expect(request.request_channel).toBe('web_form');
      expect(request.data_subject_name).toBe('John Doe');
      expect(request.data_categories_requested).toEqual(['contact_data', 'usage_data']);
    });
  });

  describe('requestSLAExtension', () => {
    it('should extend SLA deadline', () => {
      const request = createDataSubjectRequest(
        'customer-123',
        'access',
        'data.subject@example.com',
        'Request'
      );

      const originalDeadline = request.sla_deadline;
      const result = requestSLAExtension(
        request,
        'Complex request requiring additional time',
        30
      );

      expect(result.success).toBe(true);
      expect(result.request.extension_granted).toBe(true);
      expect(result.request.extension_reason).toBe('Complex request requiring additional time');
      expect(new Date(result.request.extended_deadline!).getTime()).toBeGreaterThan(
        new Date(originalDeadline).getTime()
      );
    });

    it('should reject extension for completed requests', () => {
      const request: DataSubjectRequest = {
        ...createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request'),
        status: 'completed',
      };

      const result = requestSLAExtension(request, 'Reason', 30);
      expect(result.success).toBe(false);
      expect(result.error).toContain('completed');
    });

    it('should enforce maximum extension days', () => {
      const request = createDataSubjectRequest(
        'customer-123',
        'access',
        'email@test.com',
        'Request'
      );

      const result = requestSLAExtension(request, 'Reason', 90);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('isOverdue', () => {
    it('should return true for past deadline', () => {
      const request: DataSubjectRequest = {
        ...createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request'),
        sla_deadline: '2020-01-01T00:00:00Z',
        status: 'in_review',
      };

      expect(isOverdue(request)).toBe(true);
    });

    it('should return false for future deadline', () => {
      const request = createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request');
      expect(isOverdue(request)).toBe(false);
    });

    it('should return false for completed requests', () => {
      const request: DataSubjectRequest = {
        ...createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request'),
        sla_deadline: '2020-01-01T00:00:00Z',
        status: 'completed',
      };

      expect(isOverdue(request)).toBe(false);
    });
  });

  describe('isApproachingDeadline', () => {
    it('should detect approaching deadline', () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 5); // 5 days from now

      const request: DataSubjectRequest = {
        ...createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request'),
        sla_deadline: deadline.toISOString(),
        status: 'in_review',
      };

      expect(isApproachingDeadline(request)).toBe(true);
    });

    it('should return false for distant deadlines', () => {
      const request = createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request');
      expect(isApproachingDeadline(request)).toBe(false);
    });
  });

  describe('getDaysUntilDeadline', () => {
    it('should return correct days remaining', () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 10);

      const request: DataSubjectRequest = {
        ...createDataSubjectRequest('customer-123', 'access', 'email@test.com', 'Request'),
        sla_deadline: deadline.toISOString(),
      };

      const days = getDaysUntilDeadline(request);
      expect(days).toBeGreaterThanOrEqual(9);
      expect(days).toBeLessThanOrEqual(11);
    });
  });

  describe('calculateSlaMetrics', () => {
    it('should calculate metrics correctly', () => {
      const now = new Date();
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const requests: DataSubjectRequest[] = [
        {
          ...createDataSubjectRequest('customer-1', 'access', 'email@test.com', 'Request'),
          status: 'completed',
          completed_at: now.toISOString(),
          received_at: monthAgo.toISOString(),
        },
        {
          ...createDataSubjectRequest('customer-2', 'erasure', 'email@test.com', 'Request'),
          status: 'completed',
          completed_at: now.toISOString(),
          received_at: monthAgo.toISOString(),
        },
        {
          ...createDataSubjectRequest('customer-3', 'access', 'email@test.com', 'Request'),
          status: 'pending',
          received_at: monthAgo.toISOString(),
        },
      ];

      const metrics = calculateSlaMetrics(
        requests,
        monthAgo.toISOString(),
        now.toISOString()
      );

      expect(metrics.total_requests).toBe(3);
      expect(metrics.completed_on_time).toBeGreaterThanOrEqual(0);
      expect(metrics.avg_response_time_days).toBeGreaterThanOrEqual(0);
      expect(metrics.by_type.access).toBeDefined();
      expect(metrics.by_type.erasure).toBeDefined();
    });
  });

  describe('generateAcknowledgmentEmail', () => {
    it('should generate valid acknowledgment email', () => {
      const request = createDataSubjectRequest(
        'customer-123',
        'access',
        'data.subject@example.com',
        'Request',
        { dataSubjectName: 'John Doe' }
      );

      const email = generateAcknowledgmentEmail(request);

      expect(email.subject).toContain('Acknowledgment');
      expect(email.subject).toContain(request.id);
      expect(email.body).toContain('John Doe');
      expect(email.body).toContain('Article 15');
      expect(email.body).toContain(REQUEST_TYPE_LABELS.access);
    });
  });

  describe('validateDSRRequest', () => {
    it('should validate valid request', () => {
      const result = validateDSRRequest({
        data_subject_email: 'test@example.com',
        request_type: 'access',
        request_description: 'Please provide my data',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateDSRRequest({
        data_subject_email: 'invalid-email',
        request_type: 'access',
        request_description: 'Please provide my data',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject missing fields', () => {
      const result = validateDSRRequest({
        data_subject_email: 'test@example.com',
      });

      expect(result.valid).toBe(false);
    });

    it('should reject short description', () => {
      const result = validateDSRRequest({
        data_subject_email: 'test@example.com',
        request_type: 'access',
        request_description: 'Short',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('10');
    });
  });

  describe('exportRequestsToCSV', () => {
    it('should export to CSV format', () => {
      const requests = [
        createDataSubjectRequest('customer-1', 'access', 'email1@test.com', 'Request 1'),
        createDataSubjectRequest('customer-2', 'erasure', 'email2@test.com', 'Request 2'),
      ];

      const csv = exportRequestsToCSV(requests);

      expect(csv).toContain('Request Type');
      expect(csv).toContain('Status');
      expect(csv).toContain('Right of Access');
      expect(csv).toContain('Right to Erasure');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('constants', () => {
    it('should have request type labels', () => {
      expect(REQUEST_TYPE_LABELS.access).toBe('Right of Access');
      expect(REQUEST_TYPE_LABELS.erasure).toBe('Right to Erasure (Right to be Forgotten)');
    });

    it('should have status labels', () => {
      expect(STATUS_LABELS.completed).toBe('Completed');
      expect(STATUS_LABELS.pending).toBe('Pending');
    });

    it('should have default SLA configuration', () => {
      expect(DEFAULT_SLA_CONFIG.length).toBeGreaterThan(0);
      const accessConfig = DEFAULT_SLA_CONFIG.find(c => c.request_type === 'access');
      expect(accessConfig?.base_days).toBe(30);
    });
  });
});
