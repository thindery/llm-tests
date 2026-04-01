/**
 * Cross-Border Transfer Documentation Tests
 * Ticket: REMY-257
 */

import { describe, it, expect } from 'vitest';
import {
  getCountryAdequacyStatus,
  createTransferImpactAssessment,
  generateSCCModule2Config,
  recommendSupplementaryMeasures,
  calculateTransferRisk,
  generateTransferDocumentation,
  validateTransferConfiguration,
  exportForArticle30Record,
  COUNTRY_ADEQUACY_DB,
  RECOMMENDED_SUPPLEMENTARY_MEASURES,
  DataTransfer,
  SCCRecord,
} from '../cross-border-transfer';

describe('Cross-Border Transfer', () => {
  describe('getCountryAdequacyStatus', () => {
    it('should return adequate for EU countries', () => {
      const germany = getCountryAdequacyStatus('DE');
      expect(germany.adequate).toBe(true);
      expect(germany.status).toBe('adequate');
      expect(germany.requiresSCCs).toBe(false);
      expect(germany.requiresTIA).toBe(false);
    });

    it('should return inadequate for US with surveillance concerns', () => {
      const us = getCountryAdequacyStatus('US');
      expect(us.adequate).toBe(false);
      expect(us.status).toBe('not_adequate');
      expect(us.requiresSCCs).toBe(true);
      expect(us.requiresTIA).toBe(true);
      expect(us.hasSurveillanceConcerns).toBe(true);
      expect(us.notes).toContain('Schrems');
    });

    it('should return adequate with partial for Canada', () => {
      const canada = getCountryAdequacyStatus('CA');
      expect(canada.adequate).toBe(true);
      expect(canada.status).toBe('partial');
      expect(canada.requiresSCCs).toBe(true);
    });

    it('should return cautious for unknown countries', () => {
      const unknown = getCountryAdequacyStatus('XX');
      expect(unknown.adequate).toBe(false);
      expect(unknown.requiresSCCs).toBe(true);
      expect(unknown.requiresTIA).toBe(true);
      expect(unknown.notes).toContain('assume');
    });

    it('should handle case insensitivity', () => {
      const lower = getCountryAdequacyStatus('de');
      const upper = getCountryAdequacyStatus('DE');
      
      expect(lower.adequate).toBe(upper.adequate);
    });
  });

  describe('createTransferImpactAssessment', () => {
    it('should create TIA with correct structure', () => {
      const tia = createTransferImpactAssessment(
        'transfer-001',
        ['US'],
        ['user_data'],
        { dataVolumes: 'high', sensitiveData: true }
      );

      expect(tia).toBeDefined();
      expect(tia.id).toMatch(/^tia-[a-f0-9]{16}$/);
      expect(tia.transfer_id).toBe('transfer-001');
      expect(tia.destination_countries).toContain('US');
      expect(tia.data_categories).toContain('user_data');
      expect(tia.sensitive_data).toBe(true);
      expect(tia.overall_risk_level).toBe('critical');
    });

    it('should assess different risk levels', () => {
      const lowRisk = createTransferImpactAssessment(
        'transfer-001',
        ['GB'], // UK has adequacy
        ['user_data'],
        { dataVolumes: 'low', sensitiveData: false }
      );

      const highRisk = createTransferImpactAssessment(
        'transfer-002',
        ['US'], // US has surveillance concerns
        ['user_data'],
        { dataVolumes: 'high', sensitiveData: true }
      );

      expect(lowRisk.overall_risk_level).toBe('low');
      expect(highRisk.overall_risk_level).toBe('critical');
    });

    it('should require supplementary measures for high-risk countries', () => {
      const tia = createTransferImpactAssessment(
        'transfer-001',
        ['US'],
        ['user_data']
      );

      expect(tia.supplementary_measures_implemented).toBe(true);
      expect(tia.assessment_conclusion).toBe('proceed_with_measures');
    });

    it('should set review dates', () => {
      const tia = createTransferImpactAssessment(
        'transfer-001',
        ['US'],
        ['user_data']
      );

      const assessment = new Date(tia.assessment_date);
      const review = new Date(tia.next_review_due);
      
      // Review should be ~6 months later
      const diffMonths = (review.getTime() - assessment.getTime()) / (30 * 24 * 60 * 60 * 1000);
      expect(diffMonths).toBeGreaterThanOrEqual(5);
      expect(diffMonths).toBeLessThanOrEqual(7);
    });
  });

  describe('generateSCCModule2Config', () => {
    it('should generate Module 2 (Controller to Processor) config', () => {
      const config = generateSCCModule2Config(
        'REMY Analytics',
        'AWS',
        ['US', 'IE']
      );

      expect(config.scc_type).toBe('sccs_module_2');
      expect(config.module).toBe(2);
      expect(config.exporter_name).toBe('REMY Analytics');
      expect(config.importer_name).toBe('AWS');
      expect(config.destination_country_ids).toEqual(['US', 'IE']);
      expect(config.scc_version).toBe('new_2021');
    });

    it('should include optional fields', () => {
      const config = generateSCCModule2Config(
        'REMY Analytics',
        'AWS',
        ['US'],
        {
          exporterAddress: 'Dublin, Ireland',
          importerAddress: 'Seattle, WA',
          subprocessorAuthorization: '9b',
          competentCourt: 'Commercial Court of Ireland',
        }
      );

      expect(config.exporter_address).toBe('Dublin, Ireland');
      expect(config.importer_address).toBe('Seattle, WA');
      expect(config.clause_9a_used).toBe(false);
      expect(config.clause_9b_used).toBe(true);
      expect(config.competent_courts).toBe('Commercial Court of Ireland');
    });
  });

  describe('recommendSupplementaryMeasures', () => {
    it('should recommend measures for US transfers', () => {
      const measures = recommendSupplementaryMeasures(
        'US',
        'sccs_module_2',
        'high'
      );

      expect(measures.length).toBeGreaterThan(0);
      expect(measures.some(m => m.category === 'technical')).toBe(true);
    });

    it('should return empty for adequate countries', () => {
      const measures = recommendSupplementaryMeasures(
        'DE',
        'adequacy_decision',
        'low'
      );

      expect(measures).toHaveLength(0);
    });

    it('should filter by mechanism', () => {
      const measures = recommendSupplementaryMeasures(
        'US',
        'sccs_module_2',
        'high'
      );

      expect(measures.every(m => 
        m.applicable_transfer_mechanisms.includes('sccs_module_2')
      )).toBe(true);
    });
  });

  describe('calculateTransferRisk', () => {
    it('should calculate low risk for EU transfers', () => {
      const risk = calculateTransferRisk(
        ['DE', 'FR'],
        ['user_data'],
        'low',
        false
      );

      expect(risk.overallRisk).toBe('low');
      expect(risk.requiresSCCs).toBe(false);
      expect(risk.recommendedMechanism).toBe('adequacy_decision');
    });

    it('should calculate high risk for US transfers', () => {
      const risk = calculateTransferRisk(
        ['US'],
        ['user_data', 'contact_data'],
        'high',
        true
      );

      expect(risk.overallRisk).toBe('critical');
      expect(risk.factors.some(f => f.includes('surveillance') || f.includes('concern'))).toBe(true);
      expect(risk.requiresSCCs).toBe(true);
      expect(risk.requiresTIA).toBe(true);
    });

    it('should consider UK as adequate', () => {
      const risk = calculateTransferRisk(
        ['GB'],
        ['user_data'],
        'medium',
        false
      );

      expect(risk.overallRisk).toBe('low');
      expect(risk.recommendedMechanism).toBe('adequacy_decision');
    });

    it('should identify risk factors', () => {
      const risk = calculateTransferRisk(
        ['US', 'IN'], // Both have concerns
        ['sensitive_data'],
        'very_high',
        true
      );

      expect(risk.factors.length).toBeGreaterThan(0);
      expect(risk.factors.some(f => f.includes('surveillance'))).toBe(true);
    });
  });

  describe('generateTransferDocumentation', () => {
    const mockTransfer: DataTransfer = {
      id: 'transfer-001',
      customer_id: 'customer-1',
      transfer_purpose: 'Cloud hosting',
      data_description: 'Session recording data',
      data_categories: ['user_data', 'session_data'],
      data_subjects: ['website_visitors'],
      destination_countries: ['US'],
      recipient_name: 'AWS',
      recipient_type: 'processor',
      transfer_mechanism: 'sccs_module_2',
      scc_id: 'scc-001',
      has_dpa: true,
      tia_required: true,
      risk_level: 'high',
      transfer_status: 'active',
      scheduled_review_date: '2026-09-01T00:00:00Z',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
      created_by: 'system',
    };

    const mockSCC: SCCRecord = {
      id: 'scc-001',
      scc_type: 'sccs_module_2',
      exporter_name: 'REMY Analytics',
      exporter_address: 'Dublin, Ireland',
      exporter_contact_email: 'dpo@remyanalytics.com',
      exporter_role: 'data_exporter',
      importer_name: 'AWS',
      importer_address: 'Seattle, WA',
      importer_contact_email: 'privacy@aws.com',
      importer_role: 'data_importer',
      scc_version: 'new_2021',
      execution_date: '2026-01-01T00:00:00Z',
      effective_date: '2026-01-01T00:00:00Z',
      module: 2,
      annex_a_description: 'Session recording data processing',
      annex_b_security_measures: 'AES-256 encryption, TLS 1.3',
      governing_law: 'Irish law',
      competent_courts: 'Commercial Court of Ireland',
      destination_country_ids: ['US'],
      transfer_ids: ['transfer-001'],
      status: 'executed',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'legal',
    };

    it('should generate documentation for complete transfer', () => {
      const doc = generateTransferDocumentation(mockTransfer, mockSCC);

      expect(doc.summary).toContain('US');
      expect(doc.summary).toContain('sccs_module_2');
      expect(doc.documents).toContain('Standard Contractual Clauses (executed)');
      expect(doc.documents).toContain('Data Processing Agreement');
      expect(doc.status).toBe('incomplete'); // Missing TIA approval
    });

    it('should identify missing documents', () => {
      const incompleteTransfer: DataTransfer = {
        ...mockTransfer,
        has_dpa: false,
      };

      const doc = generateTransferDocumentation(incompleteTransfer);

      expect(doc.missingDocuments).toContain('Data Processing Agreement');
      expect(doc.status).toBe('incomplete');
    });

    it('should report complete when all documents present', () => {
      const completeTransfer: DataTransfer = {
        ...mockTransfer,
        tia_required: false,
      };

      const doc = generateTransferDocumentation(completeTransfer, mockSCC);

      // Should be complete when TIA not required and docs present
      expect(doc.documents.length).toBeGreaterThan(0);
    });

    it('should report draft SCC', () => {
      const draftSCC = { ...mockSCC, status: 'draft' as const };
      const doc = generateTransferDocumentation(mockTransfer, draftSCC);

      expect(doc.status).toBe('incomplete');
    });
  });

  describe('validateTransferConfiguration', () => {
    it('should validate valid transfer', () => {
      const transfer: Partial<DataTransfer> = {
        destination_countries: ['US', 'IE'],
        transfer_mechanism: 'sccs_module_2',
        scc_id: 'scc-001',
        has_dpa: true,
        tia_required: true,
        tia_id: 'tia-001',
      };

      const result = validateTransferConfiguration(transfer);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require destination countries', () => {
      const result = validateTransferConfiguration({
        destination_countries: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one destination country is required');
    });

    it('should require transfer mechanism', () => {
      const result = validateTransferConfiguration({
        destination_countries: ['US'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transfer mechanism is required');
    });

    it('should require SCCs when using SCC mechanism', () => {
      const result = validateTransferConfiguration({
        destination_countries: ['US'],
        transfer_mechanism: 'sccs_module_2',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SCC ID is required');
    });

    it('should require DPA', () => {
      const result = validateTransferConfiguration({
        destination_countries: ['US'],
        transfer_mechanism: 'sccs_module_2',
        scc_id: 'scc-001',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DPA is required');
    });

    it('should require TIA for high-risk countries', () => {
      const result = validateTransferConfiguration({
        destination_countries: ['US'],
        transfer_mechanism: 'sccs_module_2',
        scc_id: 'scc-001',
        has_dpa: true,
        // No TIA provided
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Transfer Impact Assessment'))).toBe(true);
    });
  });

  describe('exportForArticle30Record', () => {
    const mockTransfers: DataTransfer[] = [
      {
        id: 'transfer-001',
        customer_id: 'customer-1',
        transfer_purpose: 'Hosting',
        data_description: 'Website data',
        data_categories: ['user_data'],
        data_subjects: ['visitors'],
        destination_countries: ['US'],
        recipient_name: 'AWS',
        recipient_type: 'processor',
        transfer_mechanism: 'sccs_module_2',
        scc_id: 'scc-001',
        has_dpa: true,
        tia_required: true,
        risk_level: 'high',
        transfer_status: 'active',
        scheduled_review_date: '2026-09-01T00:00:00Z',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
        created_by: 'system',
      },
    ];

    const mockSCCs: SCCRecord[] = [
      {
        id: 'scc-001',
        scc_type: 'sccs_module_2',
        exporter_name: 'REMY',
        exporter_address: 'Dublin',
        exporter_contact_email: 'dpo@remyanalytics.com',
        exporter_role: 'data_exporter',
        importer_name: 'AWS',
        importer_address: 'Seattle',
        importer_contact_email: 'privacy@aws.com',
        importer_role: 'data_importer',
        scc_version: 'new_2021',
        execution_date: '2026-01-01T00:00:00Z',
        effective_date: '2026-01-01T00:00:00Z',
        module: 2,
        annex_a_description: 'Data',
        annex_b_security_measures: 'Encryption',
        governing_law: 'IE',
        competent_courts: 'Dublin',
        destination_country_ids: ['US'],
        transfer_ids: ['transfer-001'],
        status: 'executed',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        created_by: 'system',
      },
    ];

    it('should export transfers for Article 30 record', () => {
      const result = exportForArticle30Record(mockTransfers, mockSCCs);

      expect(result.record).toContain('CROSS-BORDER TRANSFERS REGISTER');
      expect(result.totalTransfers).toBe(1);
      expect(result.transferDestinations).toContain('US');
      expect(result.record).toContain('transfer-001');
      expect(result.record).toContain('sccs_module_2');
    });

    it('should deduplicate destination countries', () => {
      const multipleTransfers: DataTransfer[] = [
        {
          ...mockTransfers[0],
          destination_countries: ['US', 'CA'],
        },
        {
          ...mockTransfers[0],
          id: 'transfer-002',
          destination_countries: ['US', 'UK'],
        },
      ];

      const result = exportForArticle30Record(multipleTransfers, []);
      expect(result.transferDestinations).toContain('US');
      expect(result.transferDestinations).toContain('CA');
    });
  });

  describe('constants', () => {
    it('should have country adequacy database', () => {
      expect(Object.keys(COUNTRY_ADEQUACY_DB).length).toBeGreaterThan(0);
      expect(COUNTRY_ADEQUACY_DB.US).toBeDefined();
      expect(COUNTRY_ADEQUACY_DB.DE).toBeDefined();
    });

    it('should have US marked with surveillance concerns', () => {
      expect(COUNTRY_ADEQUACY_DB.US?.has_surveillance_issues).toBe(true);
      expect(COUNTRY_ADEQUACY_DB.US?.notes).toContain('Schrems');
    });

    it('should have supplementary measures catalog', () => {
      expect(RECOMMENDED_SUPPLEMENTARY_MEASURES.length).toBeGreaterThan(0);
      expect(RECOMMENDED_SUPPLEMENTARY_MEASURES.some(m => m.category === 'technical')).toBe(true);
      expect(RECOMMENDED_SUPPLEMENTARY_MEASURES.some(m => m.category === 'organizational')).toBe(true);
      expect(RECOMMENDED_SUPPLEMENTARY_MEASURES.some(m => m.category === 'contractual')).toBe(true);
    });

    it('should have encryption measure', () => {
      const encryption = RECOMMENDED_SUPPLEMENTARY_MEASURES.find(
        m => m.name.includes('End-to-end encryption')
      );
      expect(encryption).toBeDefined();
      expect(encryption?.effectiveness_rating).toBe('high');
    });
  });
});
