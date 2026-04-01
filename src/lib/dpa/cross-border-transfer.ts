/**
 * Cross-Border Data Transfer Documentation
 * GDPR Chapter V - Transfers of personal data to third countries or international organisations
 * 
 * Ticket: REMY-257
 * 
 * Key Requirements:
 * - Article 44: General principle for transfers
 * - Article 45: Transfers on the basis of an adequacy decision
 * - Article 46: Transfers subject to appropriate safeguards
 * - Article 47: Binding Corporate Rules
 * - Article 48: Transfers or disclosures not authorized by Union law
 * - Article 49: Derogations for specific situations
 * 
 * Transfer Mechanisms:
 * 1. Adequacy Decisions (Article 45)
 * 2. Standard Contractual Clauses (Article 46(2)(c)) - Module 1 (Controller to Processor)
 * 3. Binding Corporate Rules (Article 47)
 * 4. Approved Code of Conduct / Certification (Article 46(2)(e), 42)
 * 5. Derogations (Article 49)
 * 
 * Documentation Requirements:
 * - Transfer Impact Assessment (TIA)
 * - Supplementary Measures documentation
 * - Record of transfer purpose
 * - Periodic review dates
 */

import { randomUUID } from 'crypto';

// Transfer mechanisms
export type TransferMechanism =
  | 'adequacy_decision'        // Article 45
  | 'sccs_module_1'           // Standard Contractual Clauses, Module 1: Controller to Controller
  | 'sccs_module_2'           // Standard Contractual Clauses, Module 2: Controller to Processor
  | 'sccs_module_3'           // Standard Contractual Clauses, Module 3: Processor to Processor
  | 'sccs_module_4'           // Standard Contractual Clauses, Module 4: Processor to Controller
  | 'bcr'                      // Binding Corporate Rules (Article 47)
  | 'code_of_conduct'          // Article 42, 46(2)(e)
  | 'certification'           // Certification mechanism (Article 42, 46(2)(f))
  | 'derived_authority'         // Transfers based on administrative arrangement
  | 'article_49_derogation';    // Article 49 derogations (one-time, occasional)

// Derogation types under Article 49
export type Article49DerogationType =
  | 'explicit_consent'         // 49(1)(a): Explicit consent
  | 'contract_performance'     // 49(1)(b): Contract performance
  | 'vital_interests'          // 49(1)(c): Vital interests
  | 'public_interest'          // 49(1)(d): Public interest
  | 'legal_claims'             // 49(1)(e): Legal claims
  | 'vital_interests_subject'   // 49(1)(f): Vital interests of data subject
  | 'public_register';          // 49(1)(g): Public register (not applicable for REMY)

// Country adequacy status
export type AdequacyStatus = 
  | 'adequate'                 // Full adequacy decision
  | 'partial'                 // Partial adequacy decision
  | 'under_review'            // Under Commission review
  | 'not_adequate';           // No adequacy decision

// Transfer risk levels
export type TransferRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Interface for data destination country
export interface DestinationCountry {
  iso_code: string;           // ISO 3166-1 alpha-2 code
  name: string;
  region: string;
  adequacy_status: AdequacyStatus;
  
  // Adequacy decision details (if applicable)
  adequacy_decision_date?: string;
  adequacy_decision_reference?: string;
  adequacy_valid_from?: string;
  adequacy_valid_until?: string;
  
  // Supplementary measures required
  supplementary_measures_required: boolean;
  recommended_mechanism?: TransferMechanism;
  
  // Surveillance concerns (Schrems II related)
  has_surveillance_concerns: boolean;
  surveillance_framework_description?: string;
  
  // Last reviewed
  last_assessed_at: string;
  next_review_due: string;
  
  // Notes
  assessment_notes?: string;
}

// Standard Contractual Clauses record
export interface SCCRecord {
  id: string;
  scc_type: TransferMechanism;
  
  // Party details
  exporter_name: string;
  exporter_address: string;
  exporter_contact_email: string;
  exporter_role: 'data_exporter' | 'data_importer';
  
  importer_name: string;
  importer_address: string;
  importer_contact_email: string;
  importer_role: 'data_exporter' | 'data_importer';
  
  // SCC version (EU Commission Decision 2021/914 for new SCCs)
  scc_version: 'new_2021' | 'old_2001_2004' | 'old_2010';
  execution_date: string;
  effective_date: string;
  expiry_date?: string;
  
  // Module configuration
  module: 1 | 2 | 3 | 4;
  annex_a_description: string;       // Description of transfer
  annex_b_security_measures: string;
  
  // Optional clauses
  dock_clause_enabled?: boolean;    // Clause 7 (Docking)
  clause_9a_used?: boolean;         // Subprocessor prior authorization
  clause_9b_used?: boolean;         // Subprocessor general authorization
  clause_11a_used?: boolean;        // Redress by independent dispute resolution body
  clause_13a_used?: boolean;        // Supervisory authority competent (one authority)
  clause_13b_used?: boolean;        // Supervisory authority competent (each supervisory authority)
  clause_17a_used?: boolean;        // EU law governing
  clause_17b_used?: boolean;        // EEA law governing
  
  // Governing law
  governing_law: string;
  competent_courts: string;
  
  // Linked data
  destination_country_ids: string[];
  transfer_ids: string[];
  
  // Document storage
  document_url?: string;
  signed_document_hash?: string;
  
  // Status
  status: 'draft' | 'executed' | 'expired' | 'terminated' | 'replaced';
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Transfer Impact Assessment (TIA)
export interface TransferImpactAssessment {
  id: string;
  transfer_id: string;
  
  // Assessment dates
  assessment_date: string;
  next_review_due: string;
  
  // Transfer details
  destination_countries: string[];
  transfer_mechanisms_used: TransferMechanism[];
  data_categories: string[];
  data_volumes: 'low' | 'medium' | 'high' | 'very_high';
  sensitive_data: boolean;
  
  // Legal assessment
  legislation_analysis: string;
  government_access_rights?: string;
  surveillance_practices?: string;
  data_subject_rights_impact?: string;
  
  // Risk assessment
  overall_risk_level: TransferRiskLevel;
  risk_factors: string[];
  
  // Supplementary measures
  supplementary_measures_implemented: boolean;
  supplementary_measures_description?: string;
  technical_measures?: string[];
  organizational_measures?: string[];
  contractual_measures?: string[];
  
  // Conclusion
  assessment_conclusion: 'proceed' | 'proceed_with_measures' | 'proceed_limited' | 'do_not_proceed';
  justification: string;
  
  // Approvals
  approved_by_dpo: boolean;
  dpo_approval_date?: string;
  approved_by_legal: boolean;
  legal_approval_date?: string;
  
  // DPO/Reviewer
  assessed_by: string;
  reviewed_by?: string;
  
  // Linked documents
  document_url?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
}

// Specific data transfer record
export interface DataTransfer {
  id: string;
  customer_id: string;
  
  // Transfer details
  transfer_purpose: string;
  data_description: string;
  data_categories: string[];
  data_subjects: string[];
  
  // Destination
  destination_countries: string[];
  recipient_name: string;
  recipient_address?: string;
  recipient_type: 'controller' | 'processor' | 'subprocessor';
  
  // Legal basis
  transfer_mechanism: TransferMechanism;
  scc_id?: string;                    // Linked SCC record if applicable
  article_49_derogation?: Article49DerogationType;
  derogation_justification?: string;
  
  // DPA link
  has_dpa: boolean;
  dpa_id?: string;
  
  // Risk assessment
  tia_required: boolean;
  tia_id?: string;
  risk_level: TransferRiskLevel;
  
  // Status
  transfer_status: 'planned' | 'active' | 'suspended' | 'terminated';
  
  // Dates
  transfer_start_date?: string;
  transfer_end_date?: string;
  scheduled_review_date: string;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Supplementary measures catalog (based on EDPB recommendations)
export interface SupplementaryMeasure {
  id: string;
  name: string;
  category: 'technical' | 'organizational' | 'contractual';
  
  // Implementation details
  description: string;
  implementation_guide: string;
  
  // Applicability
  applicable_transfer_mechanisms: TransferMechanism[];
  applicable_risk_levels: TransferRiskLevel[];
  applicable_countries?: string[];     // ISO codes where relevant
  
  // Effectiveness
  effectiveness_against: string[];      // What threats it mitigates
  effectiveness_rating: 'low' | 'medium' | 'high';
  
  // Implementation
  is_implemented: boolean;
  implementation_date?: string;
  implementation_notes?: string;
  
  // Verification
  last_verified_at?: string;
  verified_by?: string;
}

// Country adequacy database (simplified - would be API-connected in production)
export const COUNTRY_ADEQUACY_DB: Partial<Record<string, {
  name: string;
  status: AdequacyStatus;
  adequacy_decision_ref?: string;
  has_surveillance_issues: boolean;
  notes?: string;
}>> = {
  // EEA/EU countries (adequate by definition)
  'AT': { name: 'Austria', status: 'adequate', has_surveillance_issues: false },
  'BE': { name: 'Belgium', status: 'adequate', has_surveillance_issues: false },
  'BG': { name: 'Bulgaria', status: 'adequate', has_surveillance_issues: false },
  'HR': { name: 'Croatia', status: 'adequate', has_surveillance_issues: false },
  'CY': { name: 'Cyprus', status: 'adequate', has_surveillance_issues: false },
  'CZ': { name: 'Czech Republic', status: 'adequate', has_surveillance_issues: false },
  'DK': { name: 'Denmark', status: 'adequate', has_surveillance_issues: false },
  'EE': { name: 'Estonia', status: 'adequate', has_surveillance_issues: false },
  'FI': { name: 'Finland', status: 'adequate', has_surveillance_issues: false },
  'FR': { name: 'France', status: 'adequate', has_surveillance_issues: false },
  'DE': { name: 'Germany', status: 'adequate', has_surveillance_issues: false },
  'GR': { name: 'Greece', status: 'adequate', has_surveillance_issues: false },
  'HU': { name: 'Hungary', status: 'adequate', has_surveillance_issues: true, notes: 'Some concerns regarding national security law' },
  'IS': { name: 'Iceland', status: 'adequate', has_surveillance_issues: false },
  'IE': { name: 'Ireland', status: 'adequate', has_surveillance_issues: true, notes: 'US intelligence access through tech companies' },
  'IT': { name: 'Italy', status: 'adequate', has_surveillance_issues: false },
  'LV': { name: 'Latvia', status: 'adequate', has_surveillance_issues: false },
  'LI': { name: 'Liechtenstein', status: 'adequate', has_surveillance_issues: false },
  'LT': { name: 'Lithuania', status: 'adequate', has_surveillance_issues: false },
  'LU': { name: 'Luxembourg', status: 'adequate', has_surveillance_issues: false },
  'MT': { name: 'Malta', status: 'adequate', has_surveillance_issues: false },
  'NL': { name: 'Netherlands', status: 'adequate', has_surveillance_issues: false },
  'NO': { name: 'Norway', status: 'adequate', has_surveillance_issues: false },
  'PL': { name: 'Poland', status: 'adequate', has_surveillance_issues: false },
  'PT': { name: 'Portugal', status: 'adequate', has_surveillance_issues: false },
  'RO': { name: 'Romania', status: 'adequate', has_surveillance_issues: false },
  'SK': { name: 'Slovakia', status: 'adequate', has_surveillance_issues: false },
  'SI': { name: 'Slovenia', status: 'adequate', has_surveillance_issues: false },
  'ES': { name: 'Spain', status: 'adequate', has_surveillance_issues: false },
  'SE': { name: 'Sweden', status: 'adequate', has_surveillance_issues: false },
  'CH': { name: 'Switzerland', status: 'adequate', has_surveillance_issues: false },
  
  // Adequate countries (non-EEA)
  'AD': { name: 'Andorra', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2010/625/EU' },
  'AR': { name: 'Argentina', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2003/490/EC' },
  'CA': { name: 'Canada', status: 'partial', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2002/2/EC - commercial organizations only' },
  'FO': { name: 'Faroe Islands', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2010/146/EU' },
  'IL': { name: 'Israel', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2011/61/EU' },
  'JE': { name: 'Jersey', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2008/393/EC' },
  'NZ': { name: 'New Zealand', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Decision 2013/65/EU' },
  'UY': { name: 'Uruguay', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Implementing Decision 2012/484/EU' },
  
  // UK - adequacy decision with sunset clause (review mechanism)
  'GB': { name: 'United Kingdom', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Implementing Decision 2021/1772 - 4 years with extension possible', notes: 'Adequacy decision in effect; surveillance framework compliant with EU standards' },
  
  // Countries requiring SCCs with supplementary measures
  'US': { name: 'United States', status: 'not_adequate', has_surveillance_issues: true, notes: 'Schrems II - Privacy Shield invalidated; SCCs with supplementary measures required' },
  'IN': { name: 'India', status: 'not_adequate', has_surveillance_issues: true, notes: 'No adequacy decision; SCCs recommended with TIA' },
  'BR': { name: 'Brazil', status: 'under_review', has_surveillance_issues: true, notes: 'Draft adequacy decision in preparation' },
  'JP': { name: 'Japan', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Implementing Decision 2019/568 - with commercial sector limitation', notes: 'Only for private sector entities under APPI' },
  'KR': { name: 'South Korea', status: 'adequate', has_surveillance_issues: false, adequacy_decision_ref: 'Commission Implementing Decision 2022/1037' },
  
  // Asia-Pacific
  'AU': { name: 'Australia', status: 'not_adequate', has_surveillance_issues: true, notes: 'No adequacy decision; SCCs with supplementary measures recommended' },
  'SG': { name: 'Singapore', status: 'not_adequate', has_surveillance_issues: true, notes: 'No adequacy decision; SCCs recommended' },
  'TH': { name: 'Thailand', status: 'not_adequate', has_surveillance_issues: true, notes: 'No adequacy decision' },
};

// Predefined supplementary measures based on EDPB recommendations
export const RECOMMENDED_SUPPLEMENTARY_MEASURES: SupplementaryMeasure[] = [
  {
    id: 'tech-001',
    name: 'End-to-end encryption with managed keys',
    category: 'technical',
    description: 'Encrypt data at field level with keys held by data exporter or within EEA',
    implementation_guide: 'Use AES-256 encryption with keys stored in EU-based HSM. Ensure importer has no access to decryption keys.',
    applicable_transfer_mechanisms: ['sccs_module_1', 'sccs_module_2', 'sccs_module_3'],
    applicable_risk_levels: ['high', 'critical'],
    effectiveness_against: ['bulk_surveillance', 'targeted_access'],
    effectiveness_rating: 'high',
    is_implemented: false,
  },
  {
    id: 'tech-002',
    name: 'Pseudonymization with secure key separation',
    category: 'technical',
    description: 'Pseudonymize data before transfer, with pseudonymization keys held separately',
    implementation_guide: 'Implement pseudonymization mapping tables in EU. Transfer only pseudonymized data to third country.',
    applicable_transfer_mechanisms: ['sccs_module_1', 'sccs_module_2', 'sccs_module_3'],
    applicable_risk_levels: ['medium', 'high'],
    effectiveness_against: ['bulk_surveillance', 're_identification'],
    effectiveness_rating: 'medium',
    is_implemented: false,
  },
  {
    id: 'tech-003',
    name: 'Split or multi-party processing',
    category: 'technical',
    description: 'Split data across multiple jurisdictions requiring reconstruction within EEA',
    implementation_guide: 'Distribute data fragments across jurisdictions such that no single location has complete data sets.',
    applicable_transfer_mechanisms: ['sccs_module_1', 'sccs_module_2', 'sccs_module_3'],
    applicable_risk_levels: ['high', 'critical'],
    effectiveness_against: ['bulk_surveillance', 'direct_access'],
    effectiveness_rating: 'high',
    is_implemented: false,
  },
  {
    id: 'org-001',
    name: 'Enhanced oversight and auditing',
    category: 'organizational',
    description: 'Implement additional audits of importer and their security practices',
    implementation_guide: 'Conduct annual audits of importer. Include review of government access requests and disclosure policies.',
    applicable_transfer_mechanisms: ['sccs_module_1', 'sccs_module_2', 'sccs_module_3', 'bcr'],
    applicable_risk_levels: ['medium', 'high'],
    effectiveness_against: ['covert_access', 'data_misuse'],
    effectiveness_rating: 'medium',
    is_implemented: false,
  },
  {
    id: 'org-002',
    name: 'Transparency reporting on access requests',
    category: 'organizational',
    description: 'Require importer to report government access requests',
    implementation_guide: 'Contractually require disclosure of any government requests for data. Include in regular compliance reports.',
    applicable_transfer_mechanisms: ['sccs_module_1', 'sccs_module_2', 'sccs_module_3'],
    applicable_risk_levels: ['high', 'critical'],
    effectiveness_against: ['covert_access', 'secret_surveillance'],
    effectiveness_rating: 'medium',
    is_implemented: false,
  },
  {
    id: 'contract-001',
    name: 'Enhanced warranty on access limitation',
    category: 'contractual',
    description: 'Specific warranties that importer will challenge unlawful government access',
    implementation_guide: 'Include clause requiring importer to challenge any government access request that is not legally binding and specific.',
    applicable_transfer_mechanisms: ['sccs_module_1', 'sccs_module_2', 'sccs_module_3'],
    applicable_risk_levels: ['high', 'critical'],
    effectiveness_against: ['broad_access', 'unlawful_requests'],
    effectiveness_rating: 'medium',
    is_implemented: false,
  },
];

/**
 * Assess if a country has adequacy decision
 */
export function getCountryAdequacyStatus(isoCode: string): {
  adequate: boolean;
  status: AdequacyStatus;
  requiresSCCs: boolean;
  requiresTIA: boolean;
  hasSurveillanceConcerns: boolean;
  notes?: string;
} {
  const country = COUNTRY_ADEQUACY_DB[isoCode.toUpperCase()];
  
  if (!country) {
    return {
      adequate: false,
      status: 'not_adequate',
      requiresSCCs: true,
      requiresTIA: true,
      hasSurveillanceConcerns: true,
      notes: 'No information available - assume SCCs and TIA required',
    };
  }
  
  return {
    adequate: country.status === 'adequate' || country.status === 'partial',
    status: country.status,
    requiresSCCs: country.status !== 'adequate',
    requiresTIA: country.has_surveillance_issues,
    hasSurveillanceConcerns: country.has_surveillance_issues,
    notes: country.notes,
  };
}

/**
 * Create a Transfer Impact Assessment
 */
export function createTransferImpactAssessment(
  transferId: string,
  destinationCountries: string[],
  dataCategories: string[],
  options?: {
    dataVolumes?: 'low' | 'medium' | 'high' | 'very_high';
    sensitiveData?: boolean;
    assessedBy?: string;
  }
): TransferImpactAssessment {
  const now = new Date();
  const sixMonthsFromNow = new Date(now);
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  
  // Assess risk level based on factors
  let riskLevel: TransferRiskLevel = 'low';
  const countries = destinationCountries.map(c => getCountryAdequacyStatus(c));
  
  if (countries.some(c => c.hasSurveillanceConcerns)) {
    riskLevel = 'medium';
  }
  if (countries.some(c => c.status === 'not_adequate')) {
    riskLevel = 'high';
  }
  if (options?.sensitiveData && countries.some(c => c.hasSurveillanceConcerns)) {
    riskLevel = 'critical';
  }

  const requiresMeasures = countries.some(c => c.requiresTIA);

  return {
    id: `tia-${randomUUID().replace(/-/g, '').substring(0, 16)}`,
    transfer_id: transferId,
    assessment_date: now.toISOString(),
    next_review_due: sixMonthsFromNow.toISOString(),
    destination_countries: destinationCountries,
    transfer_mechanisms_used: [],
    data_categories: dataCategories,
    data_volumes: options?.dataVolumes || 'low',
    sensitive_data: options?.sensitiveData || false,
    legislation_analysis: '',
    overall_risk_level: riskLevel,
    risk_factors: [],
    supplementary_measures_implemented: requiresMeasures,
    assessment_conclusion: requiresMeasures ? 'proceed_with_measures' : 'proceed',
    justification: 'Assessment pending detailed review',
    assessed_by: options?.assessedBy || 'system',
    approved_by_dpo: false,
    approved_by_legal: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Generate SCC Module 2 (Controller to Processor) configuration
 */
export function generateSCCModule2Config(
  exporterName: string,
  importerName: string,
  destinationCountries: string[],
  options?: {
    exporterAddress?: string;
    importerAddress?: string;
    subprocessorAuthorization?: '9a' | '9b';
    competentCourt?: string;
  }
): Partial<SCCRecord> {
  return {
    scc_type: 'sccs_module_2',
    module: 2,
    exporter_name: exporterName,
    exporter_address: options?.exporterAddress || '',
    exporter_role: 'data_exporter',
    importer_name: importerName,
    importer_address: options?.importerAddress || '',
    importer_role: 'data_importer',
    scc_version: 'new_2021',
    status: 'draft',
    destination_country_ids: destinationCountries,
    clause_9a_used: options?.subprocessorAuthorization === '9a',
    clause_9b_used: options?.subprocessorAuthorization === '9b',
    competent_courts: options?.competentCourt || 'Courts of Ireland',
    governing_law: 'EU Member State law (Ireland)',
  };
}

/**
 * Recommend supplementary measures based on transfer characteristics
 */
export function recommendSupplementaryMeasures(
  destinationCountry: string,
  transferMechanism: TransferMechanism,
  riskLevel: TransferRiskLevel
): SupplementaryMeasure[] {
  const country = getCountryAdequacyStatus(destinationCountry);
  
  if (!country.hasSurveillanceConcerns) {
    return []; // No measures needed
  }
  
  return RECOMMENDED_SUPPLEMENTARY_MEASURES.filter(measure => 
    measure.applicable_transfer_mechanisms.includes(transferMechanism) &&
    measure.applicable_risk_levels.includes(riskLevel)
  );
}

/**
 * Calculate transfer risk rating
 */
export function calculateTransferRisk(
  destinationCountries: string[],
  dataCategories: string[],
  dataVolumes: 'low' | 'medium' | 'high' | 'very_high',
  sensitiveData: boolean
): {
  overallRisk: TransferRiskLevel;
  factors: string[];
  requiresSCCs: boolean;
  requiresTIA: boolean;
  recommendedMechanism: TransferMechanism;
} {
  const countryStatuses = destinationCountries.map(getCountryAdequacyStatus);
  const factors: string[] = [];
  
  // Check country risks
  const highRiskCountries = countryStatuses.filter(c => c.hasSurveillanceConcerns);
  if (highRiskCountries.length > 0) {
    factors.push(`${highRiskCountries.length} destination country(ies) with surveillance concerns`);
  }
  
  const inadequateCountries = countryStatuses.filter(c => c.status === 'not_adequate');
  if (inadequateCountries.length > 0) {
    factors.push(`${inadequateCountries.length} destination country(ies) without adequacy decision`);
  }
  
  // Check data sensitivity
  if (sensitiveData) {
    factors.push('Sensitive personal data involved');
  }
  
  if (dataVolumes === 'high' || dataVolumes === 'very_high') {
    factors.push(`Large data volumes (${dataVolumes})`);
  }
  
  // Calculate overall risk
  let overallRisk: TransferRiskLevel = 'low';
  if (countryStatuses.every(c => c.adequate && !c.hasSurveillanceConcerns)) {
    overallRisk = 'low';
  } else if (countryStatuses.some(c => c.hasSurveillanceConcerns) && sensitiveData) {
    overallRisk = 'critical';
  } else if (inadequateCountries.length > 0 || sensitiveData) {
    overallRisk = 'high';
  } else if (countryStatuses.some(c => c.hasSurveillanceConcerns)) {
    overallRisk = 'medium';
  }
  
  // Determine requirements
  const requiresSCCs = countryStatuses.some(c => c.requiresSCCs);
  const requiresTIA = countryStatuses.some(c => c.requiresTIA);
  
  // Recommend mechanism
  let recommendedMechanism: TransferMechanism = 'sccs_module_2';
  if (countryStatuses.every(c => c.status === 'adequate')) {
    recommendedMechanism = 'adequacy_decision';
  } else if (countryStatuses.every(c => c.status === 'adequate' || c.status === 'partial')) {
    recommendedMechanism = 'sccs_module_2';
  }
  
  return {
    overallRisk,
    factors,
    requiresSCCs,
    requiresTIA,
    recommendedMechanism,
  };
}

/**
 * Generate transfer documentation package
 */
export function generateTransferDocumentation(
  transfer: DataTransfer,
  sccRecord?: SCCRecord,
  tia?: TransferImpactAssessment
): {
  summary: string;
  documents: string[];
  status: 'complete' | 'incomplete' | 'requires_attention';
  missingDocuments: string[];
} {
  const documents: string[] = [];
  const missing: string[] = [];
  
  // Always need
  if (transfer.has_dpa) {
    documents.push('Data Processing Agreement');
  } else {
    missing.push('Data Processing Agreement');
  }
  
  // If SCCs are the mechanism
  if (transfer.transfer_mechanism.startsWith('sccs')) {
    if (sccRecord && sccRecord.status === 'executed') {
      documents.push('Standard Contractual Clauses (executed)');
    } else if (sccRecord) {
      documents.push('Standard Contractual Clauses (draft)');
      missing.push('Executed Standard Contractual Clauses');
    } else {
      missing.push('Standard Contractual Clauses');
    }
  }
  
  // If TIA required
  if (transfer.tia_required) {
    if (tia && tia.approved_by_legal && tia.approved_by_dpo) {
      documents.push('Transfer Impact Assessment (DPO/Legal approved)');
    } else if (tia) {
      documents.push('Transfer Impact Assessment (pending approval)');
      missing.push('DPO and Legal approval of TIA');
    } else {
      missing.push('Transfer Impact Assessment');
    }
  }
  
  // If Article 49 derogation
  if (transfer.transfer_mechanism === 'article_49_derogation') {
    if (transfer.derogation_justification) {
      documents.push('Article 49 derogation justification');
    } else {
      missing.push('Article 49 derogation documentation');
    }
  }
  
  // Generate summary
  const summary = `Transfer to ${transfer.destination_countries.join(', ')} via ${transfer.transfer_mechanism}`;
  
  let status: 'complete' | 'incomplete' | 'requires_attention' = 'complete';
  if (missing.length > 0) {
    status = 'incomplete';
  }
  if (missing.length === documents.length) {
    status = 'incomplete';
  }
  
  return {
    summary,
    documents,
    status,
    missingDocuments: missing,
  };
}

/**
 * Validate transfer configuration
 */
export function validateTransferConfiguration(
  transfer: Partial<DataTransfer>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!transfer.destination_countries || transfer.destination_countries.length === 0) {
    errors.push('At least one destination country is required');
  }
  
  if (!transfer.transfer_mechanism) {
    errors.push('Transfer mechanism is required');
  }
  
  if (transfer.transfer_mechanism?.startsWith('scc') && !transfer.scc_id) {
    errors.push('SCC ID is required');
  }
  
  if (transfer.transfer_mechanism === 'article_49_derogation' && !transfer.article_49_derogation) {
    errors.push('Derogation type is required when using Article 49');
  }
  
  if (!transfer.has_dpa) {
    errors.push('DPA is required');
  }
  
  if (transfer.transfer_mechanism?.startsWith('scc')) {
    const countryStatuses = transfer.destination_countries?.map(getCountryAdequacyStatus) || [];
    if (countryStatuses.some(c => c.requiresTIA) && !transfer.tia_id) {
      errors.push('Transfer Impact Assessment is required for cross-border transfers');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export transfers for Article 30 record of processing
 */
export function exportForArticle30Record(
  transfers: DataTransfer[],
  sccRecords: SCCRecord[]
): {
  record: string;
  totalTransfers: number;
  transferDestinations: string[];
} {
  const destinations = new Set<string>();
  
  let record = 'CROSS-BORDER TRANSFERS REGISTER\n';
  record += '==============================\n\n';
  record += `Generated: ${new Date().toISOString()}\n`;
  record += `Total Transfers: ${transfers.length}\n\n`;
  
  transfers.forEach((transfer, index) => {
    record += `--- Transfer ${index + 1} ---\n`;
    record += `Transfer ID: ${transfer.id}\n`;
    record += `Purpose: ${transfer.transfer_purpose}\n`;
    record += `Destination Countries: ${transfer.destination_countries.join(', ')}\n`;
    record += `Mechanism: ${transfer.transfer_mechanism}\n`;
    record += `Data Categories: ${transfer.data_categories.join(', ')}\n`;
    record += `Status: ${transfer.transfer_status}\n`;
    record += `TIA Required: ${transfer.tia_required ? 'Yes' : 'No'}\n`;
    
    transfer.destination_countries.forEach(c => destinations.add(c));
    
    if (transfer.scc_id && sccRecords) {
      const scc = sccRecords.find(s => s.id === transfer.scc_id);
      if (scc) {
        record += `SCC: ${scc.scc_type} (Module ${scc.module})\n`;
        record += `SCC Status: ${scc.status}\n`;
      }
    }
    
    record += '\n';
  });
  
  return {
    record,
    totalTransfers: transfers.length,
    transferDestinations: Array.from(destinations),
  };
}
