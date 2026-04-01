/**
 * Legal Basis API Tests
 * REMY-261: GDPR Legal Basis Documentation and Consent Flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateProcessingActivityRequest,
  isProcessingAuthorized,
  verifyConsentCompliance,
  calculateWithdrawalEaseScore,
  generateActivityId,
  LEGAL_BASIS_DESCRIPTIONS,
}
from '../../../src/lib/legal-basis/utils';

describe('REMY-261: GDPR Legal Basis Documentation', () => {
  // =====================================================
  // Article 6: Legal Basis Documentation Tests
  // =====================================================
  
  describe('Art 6: Processing Activity Validation', () => {
    it('should require all mandatory fields for processing activity', () => {
      const result = validateProcessingActivityRequest({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('activity_id is required');
    });

    it('should require legal basis justification with minimum length', () => {
      const result = validateProcessingActivityRequest({
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'A test activity',
        legal_basis: 'consent',
        legal_basis_justification: 'Too short',
        processing_purpose: 'analytics',
        retention_period_days: 365,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 50 characters');
    });

    it('should require consent withdrawal mechanism for consent-based processing', () => {
      const result = validateProcessingActivityRequest({
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'A test activity that collects user data',
        legal_basis: 'consent',
        legal_basis_justification: 'This is a detailed justification explaining why consent is the appropriate legal basis for this processing activity under GDPR Article 6.',
        processing_purpose: 'marketing',
        retention_period_days: 365,
        consent_mechanism: 'explicit',
        // Missing consent_withdrawal_mechanism
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('consent_withdrawal_mechanism is required');
    });

    it('should require LIA for legitimate interest processing', () => {
      const result = validateProcessingActivityRequest({
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'A test activity',
        legal_basis: 'legitimate_interest',
        legal_basis_justification: 'This is a detailed justification explaining why legitimate interest is the appropriate legal basis for this processing activity.',
        processing_purpose: 'customer_support',
        retention_period_days: 365,
        // Missing legitimate_interest_description
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('legitimate_interest_description is required');
    });

    it('should accept valid processing activity request', () => {
      const result = validateProcessingActivityRequest({
        activity_id: 'TEST-001',
        activity_name: 'Test Analytics',
        activity_description: 'Collecting anonymized usage data to improve platform',
        legal_basis: 'consent',
        legal_basis_justification: 'This is a detailed justification explaining why consent is the appropriate legal basis. We need this to fulfill user expectations and provide a clear opt-in mechanism.',
        processing_purpose: 'analytics',
        retention_period_days: 365,
        consent_mechanism: 'explicit',
        consent_withdrawal_mechanism: '/settings/privacy#withdraw-consent',
      });
      expect(result.valid).toBe(true);
    });

    it('should normalize activity_id to uppercase', () => {
      const result = validateProcessingActivityRequest({
        activity_id: 'test-001',
        activity_name: 'Test Activity',
        activity_description: 'A test activity',
        legal_basis: 'contract',
        legal_basis_justification: 'This is a detailed justification explaining why contract is the appropriate legal basis for this processing.',
        processing_purpose: 'service_delivery',
        retention_period_days: 90,
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.activity_id).toBe('TEST-001');
      }
    });
  });

  // =====================================================
  // Authorization Tests
  // =====================================================

  describe('Art 6: Processing Authorization', () => {
    it('should not authorize processing without approval', () => {
      const activity = {
        id: 'test-1',
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'Test description',
        legal_basis: 'consent' as const,
        legal_basis_justification: 'This is a detailed justification explaining why consent is the appropriate legal basis.',
        processing_purpose: 'analytics' as const,
        retention_period_days: 365,
        status: 'suspended' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
        consent_withdrawal_mechanism: '/settings/privacy',
      };
      
      const result = isProcessingAuthorized(activity);
      expect(result.authorized).toBe(false);
      expect(result.reasons).toContain("Activity status is 'suspended', must be 'active'");
    });

    it('should not authorize processing without legal basis documentation', () => {
      const activity = {
        id: 'test-1',
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'Test description',
        legal_basis: '' as 'consent',
        legal_basis_justification: '',
        processing_purpose: 'analytics' as const,
        retention_period_days: 365,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
        approved_at: new Date().toISOString(),
      };
      
      const result = isProcessingAuthorized(activity);
      expect(result.authorized).toBe(false);
    });

    it('should authorize processing when all requirements met', () => {
      const activity = {
        id: 'test-1',
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'Test description',
        legal_basis: 'consent' as const,
        legal_basis_justification: 'This is a detailed justification that meets the minimum length requirement for proper documentation under GDPR Article 6.',
        processing_purpose: 'analytics' as const,
        retention_period_days: 365,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
        approved_at: new Date().toISOString(),
        consent_withdrawal_mechanism: '/settings/privacy',
      };
      
      const result = isProcessingAuthorized(activity);
      expect(result.authorized).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should require LIA completion for legitimate interest', () => {
      const activity = {
        id: 'test-1',
        activity_id: 'TEST-001',
        activity_name: 'Test Activity',
        activity_description: 'Test description',
        legal_basis: 'legitimate_interest' as const,
        legal_basis_justification: 'This is a detailed justification explaining why legitimate interest is the appropriate legal basis.',
        processing_purpose: 'customer_support' as const,
        retention_period_days: 365,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
        approved_at: new Date().toISOString(),
        legitimate_interest_balancing_completed: false,
      };
      
      const result = isProcessingAuthorized(activity);
      expect(result.authorized).toBe(false);
      expect(result.reasons.some(r => r.includes('Legitimate Interest Assessment'))).toBe(true);
    });
  });

  // =====================================================
  // Article 7: Consent Tests
  // =====================================================

  describe('Art 7: Consent Compliance', () => {
    it('should detect non-informed consent (no information shown)', () => {
      const consentEvent = {
        id: 'event-1',
        user_id: 'user-1',
        project_id: 'project-1',
        event_type: 'accepted' as const,
        ui_component: 'consent-banner',
        information_shown: {},
        occurred_at: new Date().toISOString(),
      };
      
      const result = verifyConsentCompliance(consentEvent);
      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('Consent not informed: No information was shown to user');
    });

    it('should detect non-specific consent (no purposes disclosed)', () => {
      const consentEvent = {
        id: 'event-1',
        user_id: 'user-1',
        project_id: 'project-1',
        event_type: 'accepted' as const,
        ui_component: 'consent-banner',
        information_shown: { legal_basis: 'consent' },
        occurred_at: new Date().toISOString(),
      };
      
      const result = verifyConsentCompliance(consentEvent);
      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('Consent not specific: No purposes disclosed');
    });

    it('should flag implied consent as unambiguous violation', () => {
      const consentEvent = {
        id: 'event-1',
        user_id: 'user-1',
        project_id: 'project-1',
        event_type: 'accepted' as const,
        ui_component: 'consent-banner',
        information_shown: {
          legal_basis: 'consent',
          purposes: ['analytics'],
        },
        decision_method: 'implied',
        occurred_at: new Date().toISOString(),
      };
      
      const result = verifyConsentCompliance(consentEvent);
      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('Consent not unambiguous: Decision method is unclear');
    });

    it('should verify compliant consent collection', () => {
      const consentEvent = {
        id: 'event-1',
        user_id: 'user-1',
        project_id: 'project-1',
        event_type: 'accepted' as const,
        ui_component: 'consent-banner',
        information_shown: {
          legal_basis: 'consent',
          purposes: ['analytics'],
          data_retention: '365 days',
        },
        decision_method: 'click',
        time_to_decision_ms: 5000,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      
      const result = verifyConsentCompliance(consentEvent);
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  // =====================================================
  // Withdrawal Ease Tests
  // =====================================================

  describe('Art 7: Withdrawal Must Be As Easy As Giving Consent', () => {
    it('should score withdrawal as easy when steps are equal', () => {
      const collectionEvent = {
        id: 'event-1',
        user_id: 'user-1',
        project_id: 'project-1',
        event_type: 'accepted' as const,
        ui_component: 'consent-banner',
        information_shown: {
          legal_basis: 'consent',
          purposes: ['analytics'],
        },
        decision_method: 'click',
        time_to_decision_ms: 3000,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      
      const withdrawalEvent = {
        id: 'withdrawal-1',
        user_id: 'user-1',
        project_id: 'project-1',
        consent_types: ['analytics'],
        withdrawal_timestamp: new Date().toISOString(),
        withdrawal_method: 'one_click' as const,
        steps_required: 1,
        time_to_withdraw_seconds: 2,
      };
      
      const result = calculateWithdrawalEaseScore(collectionEvent, withdrawalEvent);
      expect(result.is_as_easy).toBe(true);
      expect(result.ease_score).toBeGreaterThanOrEqual(8);
    });

    it('should flag withdrawal as harder when more steps required', () => {
      const collectionEvent = {
        id: 'event-1',
        user_id: 'user-1',
        project_id: 'project-1',
        event_type: 'accepted' as const,
        ui_component: 'consent-banner',
        information_shown: {
          legal_basis: 'consent',
          purposes: ['analytics'],
        },
        decision_method: 'click',
        time_to_decision_ms: 3000,
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      
      const withdrawalEvent = {
        id: 'withdrawal-1',
        user_id: 'user-1',
        project_id: 'project-1',
        consent_types: ['analytics'],
        withdrawal_timestamp: new Date().toISOString(),
        withdrawal_method: 'one_click' as const,
        steps_required: 3, // More steps to withdraw
        time_to_withdraw_seconds: 45,
      };
      
      const result = calculateWithdrawalEaseScore(collectionEvent, withdrawalEvent);
      expect(result.is_as_easy).toBe(false);
      expect(result.comparison.consent_steps).toBe(1);
      expect(result.comparison.withdrawal_steps).toBe(3);
    });
  });

  // =====================================================
  // Utility Function Tests
  // =====================================================

  describe('Utility Functions', () => {
    it('should return correct article references for all legal bases', () => {
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.article).toBe('Art 6(1)(a)');
      expect(LEGAL_BASIS_DESCRIPTIONS.contract.article).toBe('Art 6(1)(b)');
      expect(LEGAL_BASIS_DESCRIPTIONS.legal_obligation.article).toBe('Art 6(1)(c)');
      expect(LEGAL_BASIS_DESCRIPTIONS.vital_interests.article).toBe('Art 6(1)(d)');
      expect(LEGAL_BASIS_DESCRIPTIONS.public_task.article).toBe('Art 6(1)(e)');
      expect(LEGAL_BASIS_DESCRIPTIONS.legitimate_interest.article).toBe('Art 6(1)(f)');
    });

    it('should include all Art 7 requirements for consent', () => {
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.requirements).toContain('Freely given');
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.requirements).toContain('Specific');
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.requirements).toContain('Informed');
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.requirements).toContain('Unambiguous');
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.requirements).toContain('Demonstrable withdrawal mechanism');
      expect(LEGAL_BASIS_DESCRIPTIONS.consent.requirements).toContain('As easy to withdraw as to give');
    });

    it('should include LIA requirement for legitimate interest', () => {
      expect(LEGAL_BASIS_DESCRIPTIONS.legitimate_interest.requirements).toContain('Must conduct Legitimate Interest Assessment');
      expect(LEGAL_BASIS_DESCRIPTIONS.legitimate_interest.requirements).toContain('Balance controller interests vs individual rights');
    });
  });
});

// =====================================================
// Integration Tests
// =====================================================

describe('REMY-261: Integration Tests', () => {
  it('should complete full legal basis workflow', async () => {
    // 1. Create processing activity with proper documentation
    const createResult = validateProcessingActivityRequest({
      activity_id: 'ANALYTICS-002',
      activity_name: 'New Analytics Feature',
      activity_description: 'Collect user interaction data to improve user experience',
      legal_basis: 'consent',
      legal_basis_justification: 'We need explicit consent to collect detailed analytics data. This allows users to opt-in to enhanced analytics while maintaining privacy by default. This is the most appropriate legal basis under GDPR Article 6(1)(a).',
      processing_purpose: 'analytics',
      retention_period_days: 365,
      consent_mechanism: 'explicit',
      consent_withdrawal_mechanism: '/settings/privacy#withdraw-analytics',
    });
    
    expect(createResult.valid).toBe(true);
    
    if (createResult.valid) {
      const activity = {
        id: 'test-id',
        ...createResult.data,
        status: 'suspended' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: '1.0',
      };
      
      // 2. Verify not authorized before approval
      const preAuth = isProcessingAuthorized(activity);
      expect(preAuth.authorized).toBe(false);
      
      // 3. Approve activity
      const approvedActivity = {
        ...activity,
        status: 'active' as const,
        approved_at: new Date().toISOString(),
      };
      
      // 4. Verify authorized after approval
      const postAuth = isProcessingAuthorized(approvedActivity);
      expect(postAuth.authorized).toBe(true);
    }
  });

  it('should handle consent and withdrawal workflow', () => {
    // 1. User gives consent
    const consentEvent = {
      id: 'event-1',
      user_id: 'user-1',
      project_id: 'project-1',
      event_type: 'accepted' as const,
      ui_component: 'consent-banner',
      information_shown: {
        legal_basis: 'consent',
        purposes: ['analytics', 'marketing'],
        data_retention: '365 days',
      },
      decision_method: 'click',
      time_to_decision_ms: 5000,
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    
    // 2. Verify consent was compliant
    const consentCheck = verifyConsentCompliance(consentEvent);
    expect(consentCheck.compliant).toBe(true);
    
    // 3. User withdraws consent
    const withdrawalEvent = {
      id: 'withdrawal-1',
      user_id: 'user-1',
      project_id: 'project-1',
      consent_types: ['marketing'],
      withdrawal_timestamp: new Date().toISOString(),
      withdrawal_method: 'one_click' as const,
      steps_required: 1,
      time_to_withdraw_seconds: 3,
    };
    
    // 4. Verify withdrawal is as easy as giving consent
    const easeCheck = calculateWithdrawalEaseScore(consentEvent, withdrawalEvent);
    expect(easeCheck.is_as_easy).toBe(true);
  });
});
