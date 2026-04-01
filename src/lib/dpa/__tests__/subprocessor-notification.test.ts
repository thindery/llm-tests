/**
 * Subprocessor Notification and Authorization Tests
 * Ticket: REMY-257
 */

import { describe, it, expect } from 'vitest';
import {
  createSubprocessorNotification,
  recordControllerResponse,
  resolveObjection,
  isNotificationOverdue,
  shouldSendReminder,
  generateNotificationEmail,
  isSubprocessorAuthorized,
  authorizeSubprocessor,
  revokeSubprocessorAuthorization,
  countPendingNotifications,
  generateAuthorizationReport,
  validateNotificationData,
  DEFAULT_NOTIFICATION_CONFIG,
  SubprocessorChangeNotification,
  ControllerAuthorization,
} from '../subprocessor-notification';

describe('Subprocessor Notification', () => {
  const mockSubprocessor = {
    id: 'sub-001',
    name: 'AWS',
    legal_name: 'Amazon Web Services, Inc.',
    website_url: 'https://aws.amazon.com',
    services_provided: ['cloud_infrastructure', 'storage'],
    processing_activities: ['data_storage', 'hosting'],
    headquarters_location: 'Seattle, WA, USA',
    data_storage_locations: ['us-east-1', 'eu-west-1'],
    jurisdiction: 'US',
    security_certifications: ['SOC_2_Type_II', 'ISO_27001'],
    encryption_at_rest: true,
    encryption_in_transit: true,
    soc_2_type_ii: true,
    iso_27001: true,
    gdpr_compliant: true,
    data_processing_agreement_signed: true,
    standard_contractual_clauses: true,
    contract_status: 'signed' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  describe('createSubprocessorNotification', () => {
    it('should create a valid notification', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding AWS as a new subprocessor for cloud infrastructure'
      );

      expect(notification).toBeDefined();
      expect(notification.id).toMatch(/^scn-[a-f0-9]{16}$/);
      expect(notification.customer_id).toBe('customer-123');
      expect(notification.notification_type).toBe('new_subprocessor');
      expect(notification.subprocessor_name).toBe('AWS');
      expect(notification.status).toBe('pending');
      expect(notification.notice_period_days).toBe(30);
      expect(new Date(notification.response_deadline).getTime()).toBeGreaterThan(
        new Date().getTime()
      );
    });

    it('should set longer notice period for high impact changes', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding new subprocessor',
        { impactLevel: 'critical' }
      );

      expect(notification.impact_level).toBe('critical');
      expect(notification.notice_period_days).toBeGreaterThanOrEqual(45);
    });

    it('should set custom notice period', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding new subprocessor',
        { noticePeriodDays: 60 }
      );

      expect(notification.notice_period_days).toBe(60);
    });

    it('should capture change details', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'subprocessor_update',
        mockSubprocessor,
        'Updating service scope',
        {
          previousValue: 'Storage only',
          newValue: 'Storage and compute',
          changeDetails: { service_expansion: true },
          dataCategoriesAffected: ['user_data', 'session_data'],
        }
      );

      expect(notification.previous_value).toBe('Storage only');
      expect(notification.new_value).toBe('Storage and compute');
      expect(notification.change_details).toEqual({ service_expansion: true });
      expect(notification.data_categories_affected).toEqual(['user_data', 'session_data']);
    });

    it('should calculate correct dates', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding subprocessor'
      );

      const effectiveDate = new Date(notification.effective_date);
      const responseDeadline = new Date(notification.response_deadline);
      const sentAt = new Date(notification.notification_sent_at);

      // Effective date should be ~30 days after sent
      const daysToEffective = (effectiveDate.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysToEffective).toBeGreaterThanOrEqual(30);

      // Response deadline should be before effective date
      expect(responseDeadline.getTime()).toBeLessThan(effectiveDate.getTime());
    });
  });

  describe('recordControllerResponse', () => {
    it('should record acceptance', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding subprocessor'
      );

      const updated = recordControllerResponse(notification, 'accept', {
        notes: 'Customer accepts the change',
      });

      expect(updated.status).toBe('accepted');
      expect(updated.controller_response).toBe('accept');
      expect(updated.controller_response_at).toBeDefined();
      expect(updated.controller_response_notes).toBe('Customer accepts the change');
    });

    it('should record rejection', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding subprocessor'
      );

      const updated = recordControllerResponse(notification, 'reject', {
        notes: 'Customer has concerns about US jurisdiction',
      });

      expect(updated.status).toBe('objected');
      expect(updated.controller_response).toBe('reject');
      expect(updated.controller_response_notes).toBe('Customer has concerns about US jurisdiction');
    });

    it('should record information request', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding subprocessor'
      );

      const updated = recordControllerResponse(notification, 'request_info');

      expect(updated.status).toBe('acknowledged');
      expect(updated.controller_response).toBe('request_info');
    });
  });

  describe('resolveObjection', () => {
    it('should resolve with approval', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding subprocessor'
      );

      const updated = resolveObjection(notification, 'approved', {
        notes: 'Provided additional security documentation',
      });

      expect(updated.status).toBe('pending'); // Status unchanged
      expect(updated.resolution).toBe('approved');
      expect(updated.resolution_date).toBeDefined();
      expect(updated.resolution_notes).toBe('Provided additional security documentation');
    });

    it('should resolve with alternative', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding subprocessor'
      );

      const updated = resolveObjection(notification, 'alternative_proposed', {
        alternativeSubprocessorId: 'sub-002',
        alternativeSubprocessorName: 'Azure',
      });

      expect(updated.resolution).toBe('alternative_proposed');
      expect(updated.alternative_subprocessor_id).toBe('sub-002');
    });
  });

  describe('isNotificationOverdue', () => {
    it('should return true for past deadline', () => {
      const notification: SubprocessorChangeNotification = {
        ...createSubprocessorNotification('customer-123', 'new_subprocessor', mockSubprocessor, 'Adding'),
        response_deadline: '2020-01-01T00:00:00Z',
        status: 'pending',
      };

      expect(isNotificationOverdue(notification)).toBe(true);
    });

    it('should return false for future deadline', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding'
      );
      expect(isNotificationOverdue(notification)).toBe(false);
    });

    it('should return false for already resolved', () => {
      const notification: SubprocessorChangeNotification = {
        ...createSubprocessorNotification('customer-123', 'new_subprocessor', mockSubprocessor, 'Adding'),
        status: 'accepted',
        response_deadline: '2020-01-01T00:00:00Z',
      };

      expect(isNotificationOverdue(notification)).toBe(false);
    });
  });

  describe('shouldSendReminder', () => {
    it('should suggest reminders near deadline', () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7); // 7 days from now

      const notification: SubprocessorChangeNotification = {
        ...createSubprocessorNotification('customer-123', 'new_subprocessor', mockSubprocessor, 'Adding'),
        response_deadline: deadline.toISOString(),
        status: 'pending',
        reminders_sent: 0,
      };

      expect(shouldSendReminder(notification)).toBe(true);
    });

    it('should not send too many reminders', () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      const notification: SubprocessorChangeNotification = {
        ...createSubprocessorNotification('customer-123', 'new_subprocessor', mockSubprocessor, 'Adding'),
        response_deadline: deadline.toISOString(),
        status: 'pending',
        reminders_sent: 3,
      };

      expect(shouldSendReminder(notification)).toBe(false);
    });

    it('should not send reminders for non-pending', () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      const notification: SubprocessorChangeNotification = {
        ...createSubprocessorNotification('customer-123', 'new_subprocessor', mockSubprocessor, 'Adding'),
        response_deadline: deadline.toISOString(),
        status: 'accepted',
        reminders_sent: 0,
      };

      expect(shouldSendReminder(notification)).toBe(false);
    });
  });

  describe('generateNotificationEmail', () => {
    it('should generate email content', () => {
      const notification = createSubprocessorNotification(
        'customer-123',
        'new_subprocessor',
        mockSubprocessor,
        'Adding AWS as new subprocessor for cloud infrastructure'
      );

      const email = generateNotificationEmail(notification, 'Acme Corp');

      expect(email.subject).toContain('ACTION REQUIRED');
      expect(email.subject).toContain('AWS');
      expect(email.body).toContain('Acme Corp');
      expect(email.body).toContain('Article 28(2)');
      expect(email.body).toContain(notification.id);
      expect(email.body).toContain('RESPONSE REQUIRED BY');
    });
  });

  describe('isSubprocessorAuthorized', () => {
    const mockAuthorization: ControllerAuthorization = {
      id: 'auth-001',
      customer_id: 'customer-123',
      authorization_type: 'specific',
      general_authorization_granted: false,
      auto_approve_minor_changes: false,
      minor_change_threshold: 'low',
      require_explicit_approval_for_high_impact: true,
      authorized_subprocessors: [
        {
          subprocessor_id: 'sub-001',
          name: 'AWS',
          authorized_at: '2026-01-01T00:00:00Z',
          authorization_method: 'explicit_notification',
          status: 'active',
        },
      ],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'system',
    };

    it('should return true for authorized subprocessor', () => {
      expect(isSubprocessorAuthorized(mockAuthorization, 'sub-001')).toBe(true);
    });

    it('should return false for unauthorized subprocessor', () => {
      expect(isSubprocessorAuthorized(mockAuthorization, 'sub-002')).toBe(false);
    });

    it('should return true with general authorization', () => {
      const generalAuth = {
        ...mockAuthorization,
        general_authorization_granted: true,
      };
      expect(isSubprocessorAuthorized(generalAuth, 'sub-002')).toBe(true);
    });

    it('should return false for null authorization', () => {
      expect(isSubprocessorAuthorized(null, 'sub-001')).toBe(false);
    });

    it('should return false for revoked authorization', () => {
      const revokedAuth = {
        ...mockAuthorization,
        authorized_subprocessors: [
          {
            ...mockAuthorization.authorized_subprocessors[0],
            status: 'revoked' as const,
          },
        ],
      };
      expect(isSubprocessorAuthorized(revokedAuth, 'sub-001')).toBe(false);
    });
  });

  describe('authorizeSubprocessor', () => {
    const authorization: ControllerAuthorization = {
      id: 'auth-001',
      customer_id: 'customer-123',
      authorization_type: 'specific',
      general_authorization_granted: false,
      auto_approve_minor_changes: false,
      minor_change_threshold: 'low',
      require_explicit_approval_for_high_impact: true,
      authorized_subprocessors: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'system',
    };

    it('should add new subprocessor authorization', () => {
      const updated = authorizeSubprocessor(
        authorization,
        mockSubprocessor,
        'explicit_notification',
        'legal@acme.com'
      );

      expect(updated.authorized_subprocessors).toHaveLength(1);
      expect(updated.authorized_subprocessors[0].subprocessor_id).toBe('sub-001');
      expect(updated.authorized_subprocessors[0].status).toBe('active');
      expect(updated.authorized_subprocessors[0].authorized_by).toBe('legal@acme.com');
    });

    it('should update existing subprocessor', () => {
      const existingAuth = {
        ...authorization,
        authorized_subprocessors: [
          {
            subprocessor_id: 'sub-001',
            name: 'Old AWS Name',
            authorized_at: '2026-01-01T00:00:00Z',
            authorization_method: 'explicit_notification' as const,
            status: 'active' as const,
          },
        ],
      };

      const updated = authorizeSubprocessor(existingAuth, mockSubprocessor, 'explicit_notification');

      expect(updated.authorized_subprocessors).toHaveLength(1);
      expect(updated.authorized_subprocessors[0].name).toBe('AWS');
    });
  });

  describe('revokeSubprocessorAuthorization', () => {
    it('should revoke authorization', () => {
      const authorization: ControllerAuthorization = {
        id: 'auth-001',
        customer_id: 'customer-123',
        authorization_type: 'specific',
        general_authorization_granted: false,
        auto_approve_minor_changes: false,
        minor_change_threshold: 'low',
        require_explicit_approval_for_high_impact: true,
        authorized_subprocessors: [
          {
            subprocessor_id: 'sub-001',
            name: 'AWS',
            authorized_at: '2026-01-01T00:00:00Z',
            authorization_method: 'explicit_notification',
            status: 'active',
          },
        ],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        created_by: 'system',
      };

      const updated = revokeSubprocessorAuthorization(authorization, 'sub-001', 'Contract terminated');

      expect(updated.authorized_subprocessors[0].status).toBe('revoked');
    });
  });

  describe('countPendingNotifications', () => {
    const notifications: SubprocessorChangeNotification[] = [
      createSubprocessorNotification('customer-1', 'new_subprocessor', mockSubprocessor, 'Add'),
      createSubprocessorNotification('customer-1', 'new_subprocessor', mockSubprocessor, 'Add'),
      createSubprocessorNotification('customer-2', 'new_subprocessor', mockSubprocessor, 'Add'),
    ];

    // Modify status of some
    notifications[0].status = 'accepted';
    notifications[1].impact_level = 'critical';

    it('should count pending notifications', () => {
      const counts = countPendingNotifications(notifications);
      
      expect(counts.total).toBe(2); // 2 still pending
      expect(counts.byImpact.critical).toBe(1);
    });

    it('should filter by customer ID', () => {
      const counts = countPendingNotifications(notifications, 'customer-1');
      
      expect(counts.total).toBe(1); // Only 1 pending for customer-1
    });
  });

  describe('generateAuthorizationReport', () => {
    it('should generate authorization report', () => {
      const authorization: ControllerAuthorization = {
        id: 'auth-001',
        customer_id: 'customer-123',
        authorization_type: 'specific',
        general_authorization_granted: false,
        auto_approve_minor_changes: false,
        minor_change_threshold: 'low',
        require_explicit_approval_for_high_impact: true,
        authorized_subprocessors: [
          {
            subprocessor_id: 'sub-001',
            name: 'AWS',
            authorized_at: '2026-01-01T00:00:00Z',
            authorization_method: 'explicit_notification',
            status: 'active',
          },
          {
            subprocessor_id: 'sub-002',
            name: 'Azure',
            authorized_at: '2026-01-01T00:00:00Z',
            authorization_method: 'explicit_notification',
            status: 'active',
          },
        ],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        created_by: 'system',
      };

      const allSubprocessors = [mockSubprocessor, { ...mockSubprocessor, id: 'sub-002', name: 'Azure' }];

      const report = generateAuthorizationReport(authorization, allSubprocessors);

      expect(report.customer_id).toBe('customer-123');
      expect(report.total_authorized).toBe(2);
      expect(report.active_authorizations).toBe(2);
      expect(report.authorized_names).toContain('AWS');
      expect(report.authorized_names).toContain('Azure');
    });
  });

  describe('validateNotificationData', () => {
    it('should validate valid notification data', () => {
      const result = validateNotificationData({
        customer_id: 'customer-123',
        subprocessor_id: 'sub-001',
        change_summary: 'This is a detailed change summary',
        notification_type: 'new_subprocessor',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject missing customer_id', () => {
      const result = validateNotificationData({
        subprocessor_id: 'sub-001',
        change_summary: 'Change summary',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Customer ID');
    });

    it('should reject short change summary', () => {
      const result = validateNotificationData({
        customer_id: 'customer-123',
        subprocessor_id: 'sub-001',
        change_summary: 'Short',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('10');
    });

    it('should reject invalid notification type', () => {
      const result = validateNotificationData({
        customer_id: 'customer-123',
        subprocessor_id: 'sub-001',
        change_summary: 'Valid change summary here',
        notification_type: 'invalid_type',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('notification type');
    });
  });

  describe('constants', () => {
    it('should have default notification config', () => {
      expect(DEFAULT_NOTIFICATION_CONFIG.standard_notice_period_days).toBe(30);
      expect(DEFAULT_NOTIFICATION_CONFIG.reminder_schedule).toEqual([7, 3, 1]);
    });
  });
});
