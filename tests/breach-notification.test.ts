/**
 * Breach Notification Tests - GDPR Article 33 & 34 Compliance
 * Ticket: REMY-260
 * 
 * Test Coverage:
 * - Breach risk assessment (likelihood × severity)
 * - 72-hour DPA notification deadline tracking
 * - Data subject notification requirements (Article 34)
 * - Evidence collection
 * - Remediation tracking
 * - Compliance verification
 * - Template generation
 * - Status transitions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateBreachId,
  performRiskAssessment,
  calculateLikelihoodScore,
  calculateSeverityScore,
  calculateRiskScore,
  requiresDPANotification,
  requiresSubjectNotification,
  calculateDPANotificationDeadline,
  calculateSubjectNotificationDeadline,
  getHoursUntilDeadline,
  getDeadlineUrgency,
  isDeadlinePassed,
  getDPAByCountryCode,
  getDefaultDPA,
  generateDPANotification,
  generateSubjectNotification,
  createStatusHistoryEntry,
  isValidStatusTransition,
  createRemediationStep,
  calculateRemediationProgress,
  isRemediationComplete,
  getOverdueSteps,
  validateCreateBreachRequest,
  buildBreachRecord,
  checkBreachCompliance,
  checkArticle33Compliance,
  checkArticle34Compliance,
  calculateBreachStatistics,
  getDefaultRiskFactors,
  // Risk assessment matrix
  scoreToRiskLevel,
} from '../src/lib/breach';

import {
  RISK_ASSESSMENT_MATRIX,
  ALL_DPA_DATABASE,
  BreachCategory,
  AffectedDataCategory,
  AffectedSubjectCategory,
  RiskFactors,
  NotificationStatus,
  CreateBreachRequest,
  BreachRecord,
} from '../src/lib/breach';

describe('Breach Notification - REMY-260', () => {
  // =====================================================
  // RISK ASSESSMENT TESTS
  // =====================================================

  describe('Risk Assessment Methodology', () => {
    it('should calculate likelihood score with minimal risk factors', () => {
      const factors: RiskFactors = {
        sensitive_data_present: false,
        large_volume: false,
        vulnerable_subjects: false,
        special_categories: false,
        cross_border: false,
        public_exposure: false,
        malicious_intent: false,
        encryption_in_place: true,
        access_controls: true,
        detection_speed: 'immediate',
        containment_speed: 'immediate',
      };

      const result = calculateLikelihoodScore(factors);
      expect(result.level).toBe('unlikely');
      expect(result.score).toBe(0);
    });

    it('should calculate high likelihood with malicious intent and public exposure', () => {
      const factors: RiskFactors = {
        sensitive_data_present: false,
        large_volume: false,
        vulnerable_subjects: false,
        special_categories: false,
        cross_border: false,
        public_exposure: true,
        malicious_intent: true,
        encryption_in_place: false,
        access_controls: false,
        detection_speed: 'weeks',
        containment_speed: 'weeks',
      };

      const result = calculateLikelihoodScore(factors);
      expect(result.level).toBe('certain');
      expect(result.score).toBeGreaterThanOrEqual(20);
    });

    it('should calculate severity score with special categories', () => {
      const factors: RiskFactors = {
        sensitive_data_present: true,
        large_volume: true,
        vulnerable_subjects: true,
        special_categories: true,
        cross_border: true,
        public_exposure: false,
        malicious_intent: false,
        encryption_in_place: true,
        access_controls: true,
        detection_speed: 'immediate',
        containment_speed: 'immediate',
      };

      const result = calculateSeverityScore(factors);
      expect(result.level).toBe('severe');
      expect(result.score).toBeGreaterThanOrEqual(18);
    });

    it('should calculate overall risk score', () => {
      const factors: RiskFactors = {
        sensitive_data_present: true,
        large_volume: true,
        vulnerable_subjects: false,
        special_categories: false,
        cross_border: false,
        public_exposure: false,
        malicious_intent: false,
        encryption_in_place: true,
        access_controls: true,
        detection_speed: 'immediate',
        containment_speed: 'immediate',
      };

      const score = calculateRiskScore('unlikely', 'limited', factors);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should perform complete risk assessment', () => {
      const factors: RiskFactors = {
        sensitive_data_present: true,
        large_volume: false,
        vulnerable_subjects: true,
        special_categories: true,
        cross_border: true,
        public_exposure: true,
        malicious_intent: true,
        encryption_in_place: false,
        access_controls: true,
        detection_speed: 'days',
        containment_speed: 'hours',
      };

      const result = performRiskAssessment(factors);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.level);
      expect(typeof result.requires_dpa_notification).toBe('boolean');
      expect(typeof result.requires_subject_notification).toBe('boolean');
      expect(result.justification).toBeTruthy();
      expect(result.factors.likelihood_score).toBeGreaterThanOrEqual(0);
      expect(result.factors.severity_score).toBeGreaterThanOrEqual(0);
    });

    it('should require DPA notification for medium+ risk levels', () => {
      expect(requiresDPANotification('low')).toBe(false);
      expect(requiresDPANotification('medium')).toBe(true);
      expect(requiresDPANotification('high')).toBe(true);
      expect(requiresDPANotification('critical')).toBe(true);
    });

    it('should require subject notification only for high+ risk levels', () => {
      expect(requiresSubjectNotification('low')).toBe(false);
      expect(requiresSubjectNotification('medium')).toBe(false);
      expect(requiresSubjectNotification('high')).toBe(true);
      expect(requiresSubjectNotification('critical')).toBe(true);
    });

    it('should convert score to correct risk level', () => {
      expect(scoreToRiskLevel(10)).toBe('low');
      expect(scoreToRiskLevel(30)).toBe('medium');
      expect(scoreToRiskLevel(40)).toBe('medium');
      expect(scoreToRiskLevel(70)).toBe('high');
      expect(scoreToRiskLevel(90)).toBe('critical');
    });
  });

  // =====================================================
  // DEADLINE CALCULATION TESTS
  // =====================================================

  describe('Notification Deadlines', () => {
    it('should calculate 72-hour DPA deadline (Article 33)', () => {
      const discoveredAt = '2026-03-31T10:00:00Z';
      const deadline = calculateDPANotificationDeadline(discoveredAt);
      
      const expectedDeadline = new Date('2026-04-03T10:00:00Z'); // 72 hours later
      expect(deadline.toISOString()).toBe(expectedDeadline.toISOString());
    });

    it('should calculate subject notification deadline based on risk level', () => {
      const discoveredAt = '2026-03-31T10:00:00Z';
      
      const criticalDeadline = calculateSubjectNotificationDeadline(discoveredAt, 'critical');
      const highDeadline = calculateSubjectNotificationDeadline(discoveredAt, 'high');
      const lowDeadline = calculateSubjectNotificationDeadline(discoveredAt, 'low');
      
      // Critical should have shorter deadline
      expect(criticalDeadline.getTime()).toBeLessThan(highDeadline.getTime());
      // Low risk should have longer deadline
      expect(lowDeadline.getTime()).toBeGreaterThan(highDeadline.getTime());
    });

    it('should calculate remaining hours until deadline', () => {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 10); // 10 hours from now
      
      const hoursRemaining = getHoursUntilDeadline(deadline.toISOString());
      expect(hoursRemaining).toBeGreaterThanOrEqual(9);
      expect(hoursRemaining).toBeLessThanOrEqual(11);
    });

    it('should detect passed deadlines', () => {
      const pastDeadline = new Date();
      pastDeadline.setHours(pastDeadline.getHours() - 5);
      
      const futureDeadline = new Date();
      futureDeadline.setHours(futureDeadline.getHours() + 5);
      
      expect(isDeadlinePassed(pastDeadline.toISOString())).toBe(true);
      expect(isDeadlinePassed(futureDeadline.toISOString())).toBe(false);
    });

    it('should return correct urgency levels', () => {
      expect(getDeadlineUrgency(3)).toBe('critical');
      expect(getDeadlineUrgency(10)).toBe('urgent');
      expect(getDeadlineUrgency(20)).toBe('warning');
      expect(getDeadlineUrgency(48)).toBe('ok');
    });
  });

  // =====================================================
  // DPA LOOKUP TESTS
  // =====================================================

  describe('Data Protection Authority Lookup', () => {
    it('should find DPA by country code', () => {
      const irishDPA = getDPAByCountryCode('IE');
      expect(irishDPA).not.toBeNull();
      expect(irishDPA?.country_name).toBe('Ireland');
      expect(irishDPA?.dpa_name).toContain('Data Protection');
    });

    it('should find German DPA', () => {
      const germanDPA = getDPAByCountryCode('DE');
      expect(germanDPA).not.toBeNull();
      expect(germanDPA?.country_name).toBe('Germany');
    });

    it('should return null for invalid country code', () => {
      const result = getDPAByCountryCode('XX');
      expect(result).toBeNull();
    });

    it('should return default DPA (Ireland)', () => {
      const defaultDPA = getDefaultDPA();
      expect(defaultDPA).not.toBeNull();
      expect(defaultDPA?.country_code).toBe('IE');
    });

    it('should have complete EU DPA database', () => {
      expect(ALL_DPA_DATABASE.length).toBeGreaterThanOrEqual(27); // EU member states
      
      // Check for major member states
      const hasGermany = ALL_DPA_DATABASE.find(dpa => dpa.country_code === 'DE');
      const hasFrance = ALL_DPA_DATABASE.find(dpa => dpa.country_code === 'FR');
      const hasItaly = ALL_DPA_DATABASE.find(dpa => dpa.country_code === 'IT');
      
      expect(hasGermany).toBeTruthy();
      expect(hasFrance).toBeTruthy();
      expect(hasItaly).toBeTruthy();
    });
  });

  // =====================================================
  // BREACH ID GENERATION
  // =====================================================

  describe('Breach ID Generation', () => {
    it('should generate breach ID with correct format', () => {
      const id = generateBreachId();
      expect(id).toMatch(/^BREACH-\d{4}-[A-Z0-9]{5}$/);
    });

    it('should generate breach ID with sequence number', () => {
      const id = generateBreachId(1);
      const currentYear = new Date().getFullYear();
      expect(id).toBe(`BREACH-${currentYear}-00001`);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateBreachId());
      }
      expect(ids.size).toBe(100);
    });
  });

  // =====================================================
  // NOTIFICATION TEMPLATE TESTS
  // =====================================================

  describe('Notification Templates', () => {
    const mockBreach: Partial<BreachRecord> = {
      breach_id: 'BREACH-2026-00001',
      breach_discovered_at: '2026-03-31T10:00:00Z',
      breach_occurred_at: '2026-03-30T08:00:00Z',
      category: 'confidentiality' as BreachCategory,
      description: 'Unauthorized access to customer database containing personal information',
      affected_data_categories: ['personal_data', 'contact_data'],
      affected_subject_categories: ['customers'],
      approximate_data_subjects_count: 5000,
      personal_data_types: ['email', 'name', 'phone'],
      likely_consequences: 'Potential phishing attempts using exposed contact information',
      containment_measures: 'Database access revoked, systems secured',
      mitigation_measures_taken: ['Revoked credentials', 'Enhanced monitoring', 'Password resets'],
    };

    it('should generate DPA notification content', () => {
      const dpa = getDefaultDPA();
      const orgName = 'Test Organization';
      const email = 'privacy@test.org';
      const phone = '+1-555-123-4567';

      const notification = generateDPANotification(
        mockBreach as BreachRecord,
        dpa,
        orgName,
        email,
        phone
      );

      expect(notification.subject).toContain('BREACH-2026-00001');
      expect(notification.body).toContain('Test Organization');
      expect(notification.body).toContain('privacy@test.org');
      expect(notification.body).toContain('Unauthorized access');
    });

    it('should generate subject notification content', () => {
      const orgName = 'Test Organization';
      const email = 'privacy@test.org';
      const phone = '+1-555-123-4567';
      const stepsTaken = ['Step 1', 'Step 2', 'Step 3'];

      const notification = generateSubjectNotification(
        mockBreach as BreachRecord,
        orgName,
        email,
        phone,
        stepsTaken
      );

      expect(notification.subject).toContain('Security Incident');
      expect(notification.body).toContain('Test Organization');
      expect(notification.body).toContain('privacy@test.org');
      expect(notification.body).toContain('Step 1');
    });
  });

  // =====================================================
  // STATUS MANAGEMENT TESTS
  // =====================================================

  describe('Status Management', () => {
    it('should create status history entry', () => {
      const entry = createStatusHistoryEntry('draft', 'user123', 'Initial report');
      
      expect(entry.status).toBe('draft');
      expect(entry.changed_by).toBe('user123');
      expect(entry.reason).toBe('Initial report');
      expect(entry.timestamp).toBeTruthy();
    });

    it('should validate status transitions', () => {
      expect(isValidStatusTransition('draft', 'assessing')).toBe(true);
      expect(isValidStatusTransition('draft', 'dpa_notified')).toBe(false);
      expect(isValidStatusTransition('assessing', 'dpa_notified')).toBe(true);
      expect(isValidStatusTransition('dpa_notified', 'subjects_notified')).toBe(true);
      expect(isValidStatusTransition('resolved', 'closed')).toBe(true);
      expect(isValidStatusTransition('closed', 'draft')).toBe(false);
    });

    it('should allow same status transition', () => {
      expect(isValidStatusTransition('draft', 'draft')).toBe(true);
    });
  });

  // =====================================================
  // REMEDIATION TESTS
  // =====================================================

  describe('Remediation Management', () => {
    it('should create remediation step', () => {
      const step = createRemediationStep(
        'Implement two-factor authentication',
        'high',
        'security@example.com',
        '2026-04-15T00:00:00Z'
      );

      expect(step.description).toBe('Implement two-factor authentication');
      expect(step.priority).toBe('high');
      expect(step.assigned_to).toBe('security@example.com');
      expect(step.status).toBe('pending');
      expect(step.id).toBeTruthy();
    });

    it('should calculate remediation progress', () => {
      const steps = [
        createRemediationStep('Step 1', 'high', 'user1', '2026-04-01'),
        createRemediationStep('Step 2', 'medium', 'user2', '2026-04-01'),
        createRemediationStep('Step 3', 'low', 'user3', '2026-04-01'),
      ];

      steps[0].status = 'completed';
      steps[1].status = 'completed';

      const progress = calculateRemediationProgress(steps);
      expect(progress).toBe(67); // 2 out of 3 completed
    });

    it('should detect remediation completion', () => {
      const completedStep = createRemediationStep('Step', 'high', 'user', '2026-04-01');
      completedStep.status = 'completed';

      const pendingStep = createRemediationStep('Step', 'high', 'user', '2026-04-01');

      expect(isRemediationComplete([completedStep])).toBe(true);
      expect(isRemediationComplete([pendingStep])).toBe(false);
      expect(isRemediationComplete([])).toBe(true); // No steps = complete
    });

    it('should identify overdue steps', () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 1); // Yesterday

      const future = new Date();
      future.setDate(future.getDate() + 1); // Tomorrow

      const steps = [
        { ...createRemediationStep('Step 1', 'high', 'user', future.toISOString()), status: 'pending' as const },
        { ...createRemediationStep('Step 2', 'high', 'user', pastDue.toISOString()), status: 'pending' as const },
        { ...createRemediationStep('Step 3', 'high', 'user', pastDue.toISOString()), status: 'completed' as const },
      ];

      const overdue = getOverdueSteps(steps);
      expect(overdue.length).toBe(1);
      expect(overdue[0].description).toBe('Step 2');
    });
  });

  // =====================================================
  // REQUEST VALIDATION TESTS
  // =====================================================

  describe('Request Validation', () => {
    it('should validate complete breach request', () => {
      const validRequest = {
        project_id: 'proj-123',
        breach_discovered_at: '2026-03-31T10:00:00Z',
        breach_occurred_at: '2026-03-30T08:00:00Z',
        category: 'confidentiality',
        description: 'Description of the breach event',
        root_cause: 'System misconfiguration',
        affected_data_categories: ['personal_data', 'contact_data'] as AffectedDataCategory[],
        affected_subject_categories: ['customers'] as AffectedSubjectCategory[],
        approximate_data_subjects_count: 100,
        data_types_description: 'Email addresses and phone numbers',
        personal_data_types: ['email', 'phone'],
        likely_consequences: 'Potential spam or phishing attempts',
        cross_border_impact: true,
        containment_measures: 'Access revoked immediately',
      };

      const result = validateCreateBreachRequest(validRequest);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.project_id).toBe('proj-123');
      }
    });

    it('should reject empty categories', () => {
      const invalidRequest = {
        project_id: 'proj-123',
        breach_discovered_at: '2026-03-31T10:00:00Z',
        breach_occurred_at: '2026-03-30T08:00:00Z',
        category: 'confidentiality',
        description: 'Description of breach event',
        root_cause: 'Test cause',
        affected_data_categories: [],
        affected_subject_categories: ['customers'],
        approximate_data_subjects_count: 100,
        data_types_description: 'Types',
        personal_data_types: ['email'],
        likely_consequences: 'Consequences',
        cross_border_impact: false,
        containment_measures: 'Measures',
      };

      const result = validateCreateBreachRequest(invalidRequest);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error.toLowerCase()).toContain('data_categories');
      }
    });

    it('should reject missing required fields', () => {
      const result = validateCreateBreachRequest({});
      expect(result.valid).toBe(false);
    });

    it('should reject negative counts', () => {
      const request = {
        project_id: 'proj-123',
        breach_discovered_at: '2026-03-31T10:00:00Z',
        breach_occurred_at: '2026-03-30T08:00:00Z',
        category: 'confidentiality',
        description: 'Description long enough',
        root_cause: 'Cause',
        affected_data_categories: ['personal_data'],
        affected_subject_categories: ['customers'],
        approximate_data_subjects_count: -1,
        data_types_description: 'Data types',
        personal_data_types: ['email'],
        likely_consequences: 'Consequences',
        cross_border_impact: false,
        containment_measures: 'Measures',
      };

      const result = validateCreateBreachRequest(request);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('non-negative');
      }
    });
  });

  // =====================================================
  // BUILD BREACH RECORD TESTS
  // =====================================================

  describe('Build Breach Record', () => {
    const validRequest: CreateBreachRequest = {
      project_id: 'proj-123',
      breach_discovered_at: '2026-03-31T10:00:00Z',
      breach_occurred_at: '2026-03-30T08:00:00Z',
      category: 'confidentiality',
      description: 'Description of the breach',
      root_cause: 'System vulnerability',
      affected_data_categories: ['personal_data'],
      affected_subject_categories: ['customers'],
      approximate_data_subjects_count: 500,
      approximate_records_count: 500,
      data_types_description: 'Contact information',
      personal_data_types: ['email', 'phone'],
      likely_consequences: 'Possible spam',
      cross_border_impact: false,
      containment_measures: 'System secured',
    };

    it('should build initial breach record', () => {
      const record = buildBreachRecord(validRequest, 'user-456');

      expect(record.project_id).toBe('proj-123');
      expect(record.breach_id).toMatch(/^BREACH-2026-/);
      expect(record.category).toBe('confidentiality');
      expect(record.created_by).toBe('user-456');
      expect(record.status).toBe('draft');
      expect(record.status_history).toHaveLength(1);
      expect(record.investigation_lead).toBe('user-456');
      expect(record.risk_level).toBeDefined();
      expect(record.risk_score).toBeDefined();
      expect(record.dpa_notification_deadline).toBeDefined();
    });

    it('should set correct notification requirements based on risk', () => {
      const highRiskRequest: CreateBreachRequest = {
        ...validRequest,
        risk_factors: {
          ...getDefaultRiskFactors(),
          special_categories: true,
          malicious_intent: true,
          vulnerable_subjects: true,
          encryption_in_place: false,
          detection_speed: 'weeks',
          containment_speed: 'weeks',
        },
      };

      const record = buildBreachRecord(highRiskRequest, 'user-456');

      expect(record.requires_dpa_notification).toBe(true);
      expect(record.requires_subject_notification).toBe(true);
      expect(['high', 'critical']).toContain(record.risk_level);
    });

    it('should calculate DPA notification deadline', () => {
      const record = buildBreachRecord(validRequest, 'user-456');
      
      const expectedDeadline = calculateDPANotificationDeadline(validRequest.breach_discovered_at);
      expect(record.dpa_notification_deadline).toBe(expectedDeadline.toISOString());
    });
  });

  // =====================================================
  // COMPLIANCE VERIFICATION TESTS
  // =====================================================

  describe('GDPR Compliance Verification', () => {
    const baseBreach: Partial<BreachRecord> = {
      breach_id: 'BREACH-2026-00001',
      breach_discovered_at: '2026-03-31T10:00:00Z',
      dpa_notification_deadline: '2026-04-03T10:00:00Z',
      requires_dpa_notification: true,
      requires_subject_notification: true,
    };

    it('should pass Article 33 compliance when DPA notified within 72 hours', () => {
      const breach = {
        ...baseBreach,
        dpa_notification_sent_at: '2026-03-31T20:00:00Z', // 10 hours later
      } as BreachRecord;

      const result = checkArticle33Compliance(breach);
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail Article 33 compliance when DPA notified late', () => {
      const breach = {
        ...baseBreach,
        dpa_notification_sent_at: '2026-04-04T10:00:00Z', // 4 days later
      } as BreachRecord;

      const result = checkArticle33Compliance(breach);
      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('72');
    });

    it('should detect missed DPA deadline', () => {
      const pastBreach = {
        ...baseBreach,
        breach_discovered_at: '2026-03-20T10:00:00Z',
        dpa_notification_deadline: '2026-03-23T10:00:00Z',
        dpa_notification_sent_at: null,
      } as BreachRecord;

      const result = checkArticle33Compliance(pastBreach);
      expect(result.compliant).toBe(false);
      expect(result.violations[0]).toContain('exceeded');
    });

    it('should pass Article 34 compliance when subjects notified', () => {
      const breach = {
        ...baseBreach,
        subject_notification_sent_at: '2026-03-31T18:00:00Z',
      } as BreachRecord;

      const result = checkArticle34Compliance(breach);
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail Article 34 compliance when subjects not notified', () => {
      const breach = {
        ...baseBreach,
        subject_notification_sent_at: null,
      } as BreachRecord;

      const result = checkArticle34Compliance(breach);
      expect(result.compliant).toBe(false);
      expect(result.violations[0]).toContain('Article 34');
    });

    it('should check overall compliance', () => {
      const compliantBreach = {
        ...baseBreach,
        dpa_notification_sent_at: '2026-03-31T20:00:00Z',
        subject_notification_sent_at: '2026-03-31T22:00:00Z',
      } as BreachRecord;

      const result = checkBreachCompliance(compliantBreach);
      expect(result.overall).toBe(true);
      expect(result.article_33.compliant).toBe(true);
      expect(result.article_34.compliant).toBe(true);
    });
  });

  // =====================================================
  // STATISTICS CALCULATION TESTS
  // =====================================================

  describe('Statistics Calculation', () => {
    const sampleBreaches: Partial<BreachRecord>[] = [
      {
        id: '1', risk_level: 'low', category: 'human_error', status: 'closed',
        requires_dpa_notification: false, requires_subject_notification: false,
        dpa_notification_sent_at: null, subject_notification_sent_at: null,
      },
      {
        id: '2', risk_level: 'medium', category: 'system', status: 'resolved',
        requires_dpa_notification: true, requires_subject_notification: false,
        dpa_notification_sent_at: '2026-01-01', subject_notification_sent_at: null,
      },
      {
        id: '3', risk_level: 'high', category: 'confidentiality', status: 'resolved',
        requires_dpa_notification: true, requires_subject_notification: true,
        dpa_notification_sent_at: '2026-01-01', subject_notification_sent_at: '2026-01-01',
      },
    ] as BreachRecord[];

    it('should calculate correct totals', () => {
      const stats = calculateBreachStatistics(sampleBreaches as BreachRecord[]);
      expect(stats.total).toBe(3);
    });

    it('should calculate risk level distribution', () => {
      const stats = calculateBreachStatistics(sampleBreaches as BreachRecord[]);
      
      expect(stats.by_risk_level.low).toBe(1);
      expect(stats.by_risk_level.medium).toBe(1);
      expect(stats.by_risk_level.high).toBe(1);
    });

    it('should calculate category distribution', () => {
      const stats = calculateBreachStatistics(sampleBreaches as BreachRecord[]);
      
      expect(stats.by_category.human_error).toBe(1);
      expect(stats.by_category.system).toBe(1);
      expect(stats.by_category.confidentiality).toBe(1);
    });

    it('should calculate Article 33 compliance rate', () => {
      const stats = calculateBreachStatistics(sampleBreaches as BreachRecord[]);
      
      // 2 out of 2 required notifications were sent
      expect(stats.article_33_compliance_rate).toBe(1.0);
    });

    it('should calculate Article 34 compliance rate', () => {
      const stats = calculateBreachStatistics(sampleBreaches as BreachRecord[]);
      
      // 1 out of 1 required notifications were sent
      expect(stats.article_34_compliance_rate).toBe(1.0);
    });

    it('should handle empty breach list', () => {
      const stats = calculateBreachStatistics([]);
      
      expect(stats.total).toBe(0);
      expect(stats.article_33_compliance_rate).toBe(1); // Default to compliant when empty
      expect(stats.article_34_compliance_rate).toBe(1);
    });
  });

  // =====================================================
  // RISK ASSESSMENT MATRIX TESTS
  // =====================================================

  describe('Risk Assessment Matrix', () => {
    it('should have complete matrix with all combinations', () => {
      const likelihoods = ['unlikely', 'possible', 'likely', 'certain'] as const;
      const severities = ['negligible', 'limited', 'significant', 'severe'] as const;
      
      for (const likelihood of likelihoods) {
        for (const severity of severities) {
          const entry = RISK_ASSESSMENT_MATRIX.find(
            e => e.likelihood === likelihood && e.severity === severity
          );
          expect(entry).toBeDefined();
          expect(['low', 'medium', 'high', 'critical']).toContain(entry?.risk_level);
        }
      }
    });

    it('should require DPA notification for medium+ risk', () => {
      const mediumEntry = RISK_ASSESSMENT_MATRIX.find(
        e => e.risk_level === 'medium'
      );
      expect(mediumEntry?.requires_dpa_notification).toBe(true);
    });

    it('should require subject notification for high+ risk', () => {
      const highEntry = RISK_ASSESSMENT_MATRIX.find(
        e => e.risk_level === 'high'
      );
      expect(highEntry?.requires_subject_notification).toBe(true);
    });
  });

  // =====================================================
  // EDGE CASE TESTS
  // =====================================================

  describe('Edge Cases', () => {
    it('should handle exact 72-hour DPA deadline', () => {
      const discoveryAt = '2026-03-31T10:00:00Z';
      const deadline = calculateDPANotificationDeadline(discoveryAt);
      
      // Verify exactly 72 hours
      const diffMs = new Date(deadline).getTime() - new Date(discoveryAt).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(72);
    });

    it('should handle minimum risk factors', () => {
      const factors = getDefaultRiskFactors();
      expect(factors.sensitive_data_present).toBe(false);
      expect(factors.encryption_in_place).toBe(true);
    });

    it('should handle breach with zero affected subjects', () => {
      const request: CreateBreachRequest = {
        project_id: 'proj-123',
        breach_discovered_at: '2026-03-31T10:00:00Z',
        breach_occurred_at: '2026-03-30T08:00:00Z',
        category: 'human_error',
        description: 'Description long enough for validation',
        root_cause: 'Test cause',
        affected_data_categories: ['personal_data'],
        affected_subject_categories: ['customers'],
        approximate_data_subjects_count: 0,
        data_types_description: 'Types',
        personal_data_types: ['email'],
        likely_consequences: 'None due to quick containment',
        cross_border_impact: false,
        containment_measures: 'Immediate containment',
      };

      const result = validateCreateBreachRequest(request);
      expect(result.valid).toBe(true);
    });
  });
});
