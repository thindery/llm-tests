/**
 * Breach Notification Types - GDPR Article 33 & 34 Compliance (P0)
 * Ticket: REMY-260
 * 
 * Implements:
 * - Article 33: DPA notification within 72 hours
 * - Article 34: Data subject notification when high risk
 * - Risk assessment methodology
 * - Evidence collection and remediation tracking
 * - Documented record of all breaches
 */

// =====================================================
// BREACH SEVERITY CLASSIFICATION (GDPR Article 33)
// =====================================================

/**
 * GDPR Breach Risk Levels
 * Determines notification requirements
 */
export type BreachRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Breach likelihood assessment
 * Used in risk calculation
 */
export type LikelihoodLevel = 'unlikely' | 'possible' | 'likely' | 'certain';

/**
 * Impact severity on data subjects
 */
export type ImpactSeverity = 'negligible' | 'limited' | 'significant' | 'severe';

// =====================================================
// BREACH CATEGORIES
// =====================================================

/**
 * Types of privacy breaches
 * Based on EDPB guidelines
 */
export type BreachCategory =
  | 'confidentiality'    // Unauthorized access/disclosure
  | 'integrity'          // Unauthorized modification
  | 'availability'       // Loss of access/destruction
  | 'accidental'         // Accidental exposure
  | 'malicious'          // Malicious attack
  | 'system'             // System malfunction
  | 'human_error'        // Human error
  | 'third_party';       // Third-party breach

/**
 * Data categories affected by breach
 */
export type AffectedDataCategory =
  | 'personal_data'
  | 'sensitive_data'
  | 'financial_data'
  | 'health_data'
  | 'biometric_data'
  | 'genetic_data'
  | 'criminal_data'
  | 'children_data'
  | 'contact_data'
  | 'location_data';

/**
 * Data subject categories
 */
export type AffectedSubjectCategory =
  | 'employees'
  | 'customers'
  | 'vendors'
  | 'prospects'
  | 'minors'
  | 'vulnerable_adults'
  | 'public';

// =====================================================
// NOTIFICATION STATUS
// =====================================================

/**
 * Notification workflow status
 */
export type NotificationStatus =
  | 'draft'              // Initial report
  | 'assessing'          // Risk assessment in progress
  | 'dpa_notified'       // DPA notification sent
  | 'dpa_acknowledged'   // DPA acknowledged receipt
  | 'subjects_notified'    // Data subjects notified
  | 'remediation'          // Remediation in progress
  | 'resolved'             // Breach resolved
  | 'closed'               // Case closed
  | 'appealed';            // Decision appealed

/**
 * Notification method for DPA
 */
export type DPANotificationMethod =
  | 'online_form'
  | 'email'
  | 'phone'
  | 'postal';

/**
 * Notification method for data subjects
 */
export type SubjectNotificationMethod =
  | 'email'
  | 'sms'
  | 'phone'
  | 'postal'
  | 'public_announcement'
  | 'website_banner';

// =====================================================
// BREACH RECORD (Article 33 Documentation)
// =====================================================

/**
 * Main breach record - complete documentation
 * Even non-notified breaches must be recorded
 */
export interface BreachRecord {
  id: string;
  project_id: string;
  
  // Breach identification
  breach_id: string;                    // Unique identifier (BREACH-YYYY-NNNN)
  breach_discovered_at: string;         // When breach was discovered
  breach_occurred_at: string;           // Estimated occurrence time
  breach_reported_at: string;           // When reported to system
  
  // Classification
  category: BreachCategory;
  description: string;
  root_cause: string;
  
  // Data affected (GDPR Article 33(3)(a))
  affected_data_categories: AffectedDataCategory[];
  affected_subject_categories: AffectedSubjectCategory[];
  approximate_data_subjects_count: number;
  approximate_records_count: number;
  
  // Personal data types affected (Article 33(3)(b))
  data_types_description: string;
  personal_data_types: string[];
  
  // Risk assessment (Article 33(3)(c)-(d))
  likelihood: LikelihoodLevel;
  severity: ImpactSeverity;
  risk_level: BreachRiskLevel;
  risk_score: number;                   // Calculated 0-100 score
  
  // Consequences (Article 33(3)(d))
  likely_consequences: string;
  cross_border_impact: boolean;
  affected_member_states: string[];     // EU member states affected
  
  // Mitigation measures (Article 33(3)(e))
  containment_measures: string;
  mitigation_measures_taken: string[];
  
  // Notification requirements
  requires_dpa_notification: boolean;     // Based on risk assessment
  requires_subject_notification: boolean; // Based on article 34
  
  // DPA notification tracking
  dpa_notification_deadline: string;      // 72 hours from discovery
  dpa_notification_sent_at: string | null;
  dpa_notification_method: DPANotificationMethod | null;
  dpa_contact: DPAContact | null;
  dpa_response_received_at: string | null;
  dpa_response_notes: string | null;
  
  // Data subject notification tracking (Article 34)
  subject_notification_sent_at: string | null;
  subject_notification_method: SubjectNotificationMethod | null;
  subject_notification_template: string;
  subjects_notified_count: number;
  subjects_failed_count: number;
  
  // Status tracking
  status: NotificationStatus;
  status_history: StatusHistoryEntry[];
  
  // Investigation
  investigation_lead: string;
  investigation_started_at: string;
  investigation_completed_at: string | null;
  investigation_findings: string | null;
  
  // Evidence
  evidence_collected: EvidenceItem[];
  
  // Remediation
  remediation_plan: RemediationPlan | null;
  remediation_completed_at: string | null;
  lessons_learned: string | null;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * DPA Contact information
 */
export interface DPAContact {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  country_code: string;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  status: NotificationStatus;
  timestamp: string;
  changed_by: string;
  reason: string;
}

/**
 * Evidence item
 */
export interface EvidenceItem {
  id: string;
  type: 'log' | 'screenshot' | 'file' | 'email' | 'report' | 'other';
  title: string;
  description: string;
  file_path?: string;
  file_hash?: string;
  collected_by: string;
  collected_at: string;
  metadata: Record<string, unknown>;
}

/**
 * Remediation plan
 */
export interface RemediationPlan {
  id: string;
  steps: RemediationStep[];
  estimated_completion: string;
  responsible_party: string;
  resources_required: string;
}

/**
 * Remediation step
 */
export interface RemediationStep {
  id: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string;
  due_date: string;
  completed_at: string | null;
  notes: string | null;
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

/**
 * Notification template for different breach types
 */
export interface BreachNotificationTemplate {
  id: string;
  name: string;
  description: string;
  
  // Template for DPA notification
  dpa_template: {
    subject: string;
    body: string;
    required_fields: string[];
  };
  
  // Template for data subject notification
  subject_template: {
    subject: string;
    body: string;
    required_fields: string[];
    channels: SubjectNotificationMethod[];
  };
  
  // Risk level this template applies to
  applicable_risk_levels: BreachRiskLevel[];
  applicable_categories: BreachCategory[];
  
  // Metadata
  language: string;
  version: string;
  created_at: string;
  updated_at: string;
}

/**
 * Template placeholders
 */
export interface TemplatePlaceholders {
  breach_id: string;
  breach_date: string;
  breach_description: string;
  data_types: string;
  risk_level: string;
  steps_taken: string;
  contact_email: string;
  contact_phone: string;
  dpa_name: string;
  dpa_url: string;
  organization_name: string;
}

// =====================================================
// RISK ASSESSMENT
// =====================================================

/**
 * Risk assessment matrix
 * Maps likelihood × severity → risk level
 */
export interface RiskAssessmentMatrix {
  likelihood: LikelihoodLevel;
  severity: ImpactSeverity;
  risk_level: BreachRiskLevel;
  requires_dpa_notification: boolean;
  requires_subject_notification: boolean;
  notification_timeline_hours: number;
}

/**
 * Risk factors for calculation
 */
export interface RiskFactors {
  // Data sensitivity factors
  sensitive_data_present: boolean;
  large_volume: boolean;              // >1000 records
  vulnerable_subjects: boolean;         // Children, vulnerable adults
  special_categories: boolean;          // Health, biometric, etc.
  
  // Context factors
  cross_border: boolean;
  public_exposure: boolean;
  malicious_intent: boolean;
  
  // Mitigation factors
  encryption_in_place: boolean;
  access_controls: boolean;
  detection_speed: 'immediate' | 'hours' | 'days' | 'weeks';
  containment_speed: 'immediate' | 'hours' | 'days' | 'weeks';
}

/**
 * Risk assessment result
 */
export interface RiskAssessmentResult {
  score: number;
  level: BreachRiskLevel;
  requires_dpa_notification: boolean;
  requires_subject_notification: boolean;
  justification: string;
  factors: {
    likelihood_score: number;
    severity_score: number;
  };
}

// =====================================================
// NOTIFICATION LOGGING
// =====================================================

/**
 * DPA notification log entry
 */
export interface DPANotificationLog {
  id: string;
  breach_id: string;
  sent_at: string;
  sent_by: string;
  method: DPANotificationMethod;
  dpa_contact: DPAContact;
  notification_content: string;
  acknowledgement_received: boolean;
  acknowledged_at: string | null;
  dpa_response: string | null;
  attachments: string[];
}

/**
 * Subject notification log entry
 */
export interface SubjectNotificationLog {
  id: string;
  breach_id: string;
  sent_at: string;
  sent_by: string;
  method: SubjectNotificationMethod;
  recipients: string[];
  template_used: string;
  success_count: number;
  failed_count: number;
  bounce_count: number;
  errors: SubjectNotificationError[];
}

/**
 * Subject notification error
 */
export interface SubjectNotificationError {
  recipient: string;
  error: string;
  timestamp: string;
}

// =====================================================
// STATISTICS & REPORTING
// =====================================================

/**
 * Breach statistics
 */
export interface BreachStatistics {
  total_breaches: number;
  by_risk_level: Record<BreachRiskLevel, number>;
  by_category: Record<BreachCategory, number>;
  by_status: Record<NotificationStatus, number>;
  
  // Notification compliance
  dpa_notification_compliance: {
    on_time: number;
    late: number;
    non_required: number;
  };
  subject_notification_compliance: {
    notified: number;
    not_required: number;
    pending: number;
  };
  
  // Trends
  last_30_days: number;
  last_90_days: number;
  last_year: number;
  
  // Resolution
  average_resolution_days: number;
}

/**
 * Compliance report
 */
export interface GDPRBreachComplianceReport {
  report_id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  
  summary: {
    total_breaches: number;
    dpa_notifications_sent: number;
    subject_notifications_sent: number;
    average_notification_time_hours: number;
    compliance_rate: number;
  };
  
  details: BreachRecord[];
  statistics: BreachStatistics;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Create breach report request
 */
export interface CreateBreachRequest {
  project_id: string;
  breach_discovered_at: string;
  breach_occurred_at: string;
  category: BreachCategory;
  description: string;
  root_cause: string;
  affected_data_categories: AffectedDataCategory[];
  affected_subject_categories: AffectedSubjectCategory[];
  approximate_data_subjects_count: number;
  approximate_records_count: number;
  data_types_description: string;
  personal_data_types: string[];
  likely_consequences: string;
  cross_border_impact: boolean;
  affected_member_states?: string[];
  containment_measures: string;
  mitigation_measures_taken?: string[];
  risk_factors?: RiskFactors;
}

/**
 * Update breach request
 */
export interface UpdateBreachRequest {
  description?: string;
  status?: NotificationStatus;
  risk_level?: BreachRiskLevel;
  investigation_findings?: string;
}

/**
 * Notify DPA request
 */
export interface NotifyDPARequest {
  method: DPANotificationMethod;
  dpa_contact: DPAContact;
  notification_content: string;
  attachments?: string[];
}

/**
 * Notify subjects request
 */
export interface NotifySubjectsRequest {
  method: SubjectNotificationMethod;
  template_id: string;
  recipients?: string[];
  custom_message?: string;
}

// =====================================================
// EU DPA DATABASE
// =====================================================

/**
 * EU Data Protection Authority information
 */
export interface EUDataProtectionAuthority {
  country_code: string;
  country_name: string;
  dpa_name: string;
  dpa_local_name: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  breach_notification_url: string;
  languages: string[];
}

// Risk assessment matrix (GDPR standard)
export const RISK_ASSESSMENT_MATRIX: RiskAssessmentMatrix[] = [
  // Low likelihood
  { likelihood: 'unlikely', severity: 'negligible', risk_level: 'low', requires_dpa_notification: false, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'unlikely', severity: 'limited', risk_level: 'low', requires_dpa_notification: false, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'unlikely', severity: 'significant', risk_level: 'medium', requires_dpa_notification: true, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'unlikely', severity: 'severe', risk_level: 'high', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  
  // Possible likelihood
  { likelihood: 'possible', severity: 'negligible', risk_level: 'low', requires_dpa_notification: false, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'possible', severity: 'limited', risk_level: 'medium', requires_dpa_notification: true, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'possible', severity: 'significant', risk_level: 'high', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  { likelihood: 'possible', severity: 'severe', risk_level: 'critical', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  
  // Likely
  { likelihood: 'likely', severity: 'negligible', risk_level: 'medium', requires_dpa_notification: true, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'likely', severity: 'limited', risk_level: 'high', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  { likelihood: 'likely', severity: 'significant', risk_level: 'critical', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  { likelihood: 'likely', severity: 'severe', risk_level: 'critical', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  
  // Certain
  { likelihood: 'certain', severity: 'negligible', risk_level: 'medium', requires_dpa_notification: true, requires_subject_notification: false, notification_timeline_hours: 72 },
  { likelihood: 'certain', severity: 'limited', risk_level: 'high', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  { likelihood: 'certain', severity: 'significant', risk_level: 'critical', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
  { likelihood: 'certain', severity: 'severe', risk_level: 'critical', requires_dpa_notification: true, requires_subject_notification: true, notification_timeline_hours: 72 },
];

// EU Data Protection Authorities
export const EU_DPA_DATABASE: EUDataProtectionAuthority[] = [
  {
    country_code: 'AT',
    country_name: 'Austria',
    dpa_name: 'Austrian Data Protection Authority',
    dpa_local_name: 'Österreichische Datenschutzbehörde',
    website: 'https://dsb.gv.at',
    email: 'dsb@dsb.gv.at',
    phone: '+431 52152-0',
    address: 'Barichgasse 40-42, 1030 Wien, Austria',
    breach_notification_url: 'https://dsb.gv.at/breach-notification',
    languages: ['de', 'en'],
  },
  {
    country_code: 'BE',
    country_name: 'Belgium',
    dpa_name: 'Belgian Data Protection Authority',
    dpa_local_name: 'Gegevensbeschermingsautoriteit',
    website: 'https://apd-gba.be',
    email: 'contact@apd-gba.be',
    phone: '+32 2 274 48 00',
    address: 'Rue de la Presse 35, 1000 Brussels, Belgium',
    breach_notification_url: 'https://apd-gba.be/breach-notification',
    languages: ['nl', 'fr', 'de', 'en'],
  },
  {
    country_code: 'BG',
    country_name: 'Bulgaria',
    dpa_name: 'Commission for Personal Data Protection',
    dpa_local_name: 'Комисия за защита на личните данни',
    website: 'https://cpdp.bg',
    email: 'kzp@cpdp.bg',
    phone: '+359 2 91 91 33',
    address: '2 Prof. Tsvetan Lazarov Blvd., 1592 Sofia, Bulgaria',
    breach_notification_url: 'https://cpdp.bg/breach-notification',
    languages: ['bg', 'en'],
  },
  {
    country_code: 'HR',
    country_name: 'Croatia',
    dpa_name: 'Croatian Personal Data Protection Agency',
    dpa_local_name: 'Agencija za zaštitu osobnih podataka',
    website: 'https://azop.hr',
    email: 'info@azop.hr',
    phone: '+385 1 4609 000',
    address: '"Selska cesta" 136, 10 000 Zagreb, Croatia',
    breach_notification_url: 'https://azop.hr/breach-notification',
    languages: ['hr', 'en'],
  },
  {
    country_code: 'CY',
    country_name: 'Cyprus',
    dpa_name: 'Commissioner for Personal Data Protection',
    dpa_local_name: 'Επίτροπος Προστασίας Δεδομένων Προσωπικού Χαρακτήρα',
    website: 'https://dataprotection.gov.cy',
    email: 'commissioner@dataprotection.gov.cy',
    phone: '+357 22 815 685',
    address: 'Iasonos 1, 1082 Nicosia, Cyprus',
    breach_notification_url: 'https://dataprotection.gov.cy/breach-notification',
    languages: ['el', 'en'],
  },
  {
    country_code: 'CZ',
    country_name: 'Czech Republic',
    dpa_name: 'Office for Personal Data Protection',
    dpa_local_name: 'Úřad pro ochranu osobních údajů',
    website: 'https://uoou.cz',
    email: 'posta@uoou.cz',
    phone: '+420 234 665 111',
    address: 'Pplk. Sochora 27, 170 00 Praha 7, Czech Republic',
    breach_notification_url: 'https://uoou.cz/breach-notification',
    languages: ['cs', 'en'],
  },
  {
    country_code: 'DK',
    country_name: 'Denmark',
    dpa_name: 'Danish Data Protection Agency',
    dpa_local_name: 'Datatilsynet',
    website: 'https://datatilsynet.dk',
    email: 'dt@datatilsynet.dk',
    phone: '+45 33 1932 00',
    address: 'Borgergade 28,5, 1300 København K, Denmark',
    breach_notification_url: 'https://www.datatilsynet.dk/breach',
    languages: ['da', 'en'],
  },
  {
    country_code: 'EE',
    country_name: 'Estonia',
    dpa_name: 'Estonian Data Protection Inspectorate',
    dpa_local_name: 'Andmekaitse Inspektsioon',
    website: 'https://aki.ee',
    email: 'info@aki.ee',
    phone: '+372 627 4135',
    address: '39 Väike-Ameerika St., 10129 Tallinn, Estonia',
    breach_notification_url: 'https://aki.ee/en/breach',
    languages: ['et', 'en'],
  },
  {
    country_code: 'FI',
    country_name: 'Finland',
    dpa_name: 'Office of the Data Protection Ombudsman',
    dpa_local_name: 'Tietosuojavaltuutetun toimisto',
    website: 'https://tietosuoja.fi',
    email: 'tietosuoja@tietosuoja.fi',
    phone: '+358 29 566 6670',
    address: 'P.O. Box 800, 00521 Helsinki, Finland',
    breach_notification_url: 'https://tietosuoja.fi/en/breach',
    languages: ['fi', 'sv', 'en'],
  },
  {
    country_code: 'FR',
    country_name: 'France',
    dpa_name: 'Commission Nationale de l\'Informatique et des Libertés',
    dpa_local_name: 'CNIL',
    website: 'https://cnil.fr',
    email: 'accueil-internet@cnil.fr',
    phone: '+33 1 53 73 22 22',
    address: '3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France',
    breach_notification_url: 'https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles',
    languages: ['fr', 'en'],
  },
  {
    country_code: 'DE',
    country_name: 'Germany',
    dpa_name: 'Federal Commissioner for Data Protection and Freedom of Information',
    dpa_local_name: 'Bundesbeauftragte für den Datenschutz und die Informationsfreiheit',
    website: 'https://bfdi.bund.de',
    email: 'poststelle@bfdi.bund.de',
    phone: '+49 228 997799-0',
    address: 'Graurheindorfer Str. 153, 53117 Bonn, Germany',
    breach_notification_url: 'https://bfdi.bund.de/breach',
    languages: ['de', 'en'],
  },
  {
    country_code: 'GR',
    country_name: 'Greece',
    dpa_name: 'Hellenic Data Protection Authority',
    dpa_local_name: 'Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα',
    website: 'https://dpa.gr',
    email: 'contact@dpa.gr',
    phone: '+30 210 6475 600',
    address: 'Kifissias 1-3, 115 23 Athens, Greece',
    breach_notification_url: 'https://dpa.gr/breach-notification',
    languages: ['el', 'en'],
  },
  {
    country_code: 'HU',
    country_name: 'Hungary',
    dpa_name: 'National Authority for Data Protection and Freedom of Information',
    dpa_local_name: 'Nemzeti Adatvédelmi és Információszabadság Hatóság',
    website: 'https://naih.hu',
    email: 'ugyfelszolgalat@naih.hu',
    phone: '+36 1 391 1400',
    address: 'Szilágyi Erzsébet fasor 22/C, 1125 Budapest, Hungary',
    breach_notification_url: 'https://naih.hu/breach',
    languages: ['hu', 'en'],
  },
  {
    country_code: 'IE',
    country_name: 'Ireland',
    dpa_name: 'Data Protection Commission',
    dpa_local_name: 'An Coimisiún Cosanta Sonraí',
    website: 'https://dataprotection.ie',
    email: 'info@dataprotection.ie',
    phone: '+353 57 868 4800',
    address: '21 Fitzwilliam Square South, Dublin 2, D02 RD28, Ireland',
    breach_notification_url: 'https://www.dataprotection.ie/en/organisations/breach-reporting',
    languages: ['en', 'ga'],
  },
  {
    country_code: 'IT',
    country_name: 'Italy',
    dpa_name: 'Italian Data Protection Authority',
    dpa_local_name: 'Garante per la Protezione dei Dati Personali',
    website: 'https://garanteprivacy.it',
    email: 'garante@gpdp.it',
    phone: '+39 06 69677 1',
    address: 'Piazza Venezia 11, 00187 Roma, Italy',
    breach_notification_url: 'https://www.garanteprivacy.it/breach',
    languages: ['it', 'en'],
  },
  {
    country_code: 'LV',
    country_name: 'Latvia',
    dpa_name: 'Data State Inspectorate',
    dpa_local_name: 'Datu valsts inspekcija',
    website: 'https://dvi.gov.lv',
    email: 'info@dvi.gov.lv',
    phone: '+371 6722 3131',
    address: 'Blaumaņa iela 11/13-15, Rīga, LV-1011, Latvia',
    breach_notification_url: 'https://dvi.gov.lv/en/breach',
    languages: ['lv', 'en'],
  },
  {
    country_code: 'LT',
    country_name: 'Lithuania',
    dpa_name: 'State Data Protection Inspectorate',
    dpa_local_name: 'Valstybinė duomenų apsaugos inspekcija',
    website: 'https://vdai.lrv.lt',
    email: 'ada@ada.lt',
    phone: '+370 5 279 14 45',
    address: 'A. Juozapavičiaus g. 6, 09310 Vilnius, Lithuania',
    breach_notification_url: 'https://vdai.lrv.lt/breach',
    languages: ['lt', 'en'],
  },
  {
    country_code: 'LU',
    country_name: 'Luxembourg',
    dpa_name: 'National Commission for Data Protection',
    dpa_local_name: 'Commission Nationale pour la Protection des Données',
    website: 'https://cnpd.lu',
    email: 'info@cnpd.lu',
    phone: '+352 26 10 60-1',
    address: '1, Avenue du Rock\'n\'Roll, L-4361 Esch-sur-Alzette, Luxembourg',
    breach_notification_url: 'https://cnpd.lu/en/breach',
    languages: ['lb', 'fr', 'de', 'en'],
  },
  {
    country_code: 'MT',
    country_name: 'Malta',
    dpa_name: 'Office of the Information and Data Protection Commissioner',
    dpa_local_name: 'Qorti tal-Data',
    website: 'https://idpc.org.mt',
    email: 'commissioner@idpc.org.mt',
    phone: '+356 2327 7100',
    address: '2nd Floor, Airways House, High Street, Sliema SLM 1549, Malta',
    breach_notification_url: 'https://idpc.org.mt/breach',
    languages: ['en', 'mt'],
  },
  {
    country_code: 'NL',
    country_name: 'Netherlands',
    dpa_name: 'Dutch Data Protection Authority',
    dpa_local_name: 'Autoriteit Persoonsgegevens',
    website: 'https://autoriteitpersoonsgegevens.nl',
    email: 'info@autoriteitpersoonsgegevens.nl',
    phone: '+31 70 888 8500',
    address: 'Bezuidenhoutseweg 30, 2594 AV The Hague, Netherlands',
    breach_notification_url: 'https://autoriteitpersoonsgegevens.nl/en/breach',
    languages: ['nl', 'en'],
  },
  {
    country_code: 'PL',
    country_name: 'Poland',
    dpa_name: 'President of the Personal Data Protection Office',
    dpa_local_name: 'Prezes Urzędu Ochrony Danych Osobowych',
    website: 'https://uodo.gov.pl',
    email: 'kancelaria@uodo.gov.pl',
    phone: '+48 22 531 03 00',
    address: 'ul. Stawki 2, 00-193 Warszawa, Poland',
    breach_notification_url: 'https://uodo.gov.pl/breach',
    languages: ['pl', 'en'],
  },
  {
    country_code: 'PT',
    country_name: 'Portugal',
    dpa_name: 'National Data Protection Commission',
    dpa_local_name: 'Comissão Nacional de Proteção de Dados',
    website: 'https://cnpd.pt',
    email: 'geral@cnpd.pt',
    phone: '+351 213 928 400',
    address: 'Av. D. Carlos I, 134 - 1.º, 1200-651 Lisboa, Portugal',
    breach_notification_url: 'https://cnpd.pt/breach',
    languages: ['pt', 'en'],
  },
  {
    country_code: 'RO',
    country_name: 'Romania',
    dpa_name: 'National Supervisory Authority for Personal Data Processing',
    dpa_local_name: 'Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal',
    website: 'https://dataprotection.ro',
    email: 'anspdcp@dataprotection.ro',
    phone: '+40 318 059 211',
    address: 'B-dul G-ral. Gheorghe Magheru, nr. 28-30, Sector 1, 010336 Bucharest, Romania',
    breach_notification_url: 'https://www.dataprotection.ro/breach',
    languages: ['ro', 'en'],
  },
  {
    country_code: 'SK',
    country_name: 'Slovakia',
    dpa_name: 'Office for Personal Data Protection',
    dpa_local_name: 'Úrad na ochranu osobných údajov',
    website: 'https://dataprotection.gov.sk',
    email: 'statny.dozor@pdp.gov.sk',
    phone: '+421 2 32 331 321',
    address: 'Hraničná 12, 820 07 Bratislava, Slovakia',
    breach_notification_url: 'https://dataprotection.gov.sk/breach',
    languages: ['sk', 'en'],
  },
  {
    country_code: 'SI',
    country_name: 'Slovenia',
    dpa_name: 'Information Commissioner',
    dpa_local_name: 'Informacijski pooblaščenec',
    website: 'https://ip-rs.si',
    email: 'gp.ip@ip-rs.si',
    phone: '+386 1 230 9730',
    address: 'Dunajska cesta 22, 1509 Ljubljana, Slovenia',
    breach_notification_url: 'https://ip-rs.si/breach',
    languages: ['sl', 'en'],
  },
  {
    country_code: 'ES',
    country_name: 'Spain',
    dpa_name: 'Spanish Data Protection Agency',
    dpa_local_name: 'Agencia Española de Protección de Datos',
    website: 'https://www.aepd.es',
    email: 'internacional@aepd.es',
    phone: '+34 91 266 35 17',
    address: 'C/ Jorge Juan, 6, 28001 Madrid, Spain',
    breach_notification_url: 'https://sedeagpd.gob.es/sede-electronica-web/vistas/formBrecha/formbrecha.jsf',
    languages: ['es', 'en'],
  },
  {
    country_code: 'SE',
    country_name: 'Sweden',
    dpa_name: 'Swedish Authority for Privacy Protection',
    dpa_local_name: 'Integritetsskyddsmyndigheten',
    website: 'https://imy.se',
    email: 'imy@imy.se',
    phone: '+46 8 657 61 00',
    address: 'Drottninggatan 29, 5th floor, SE-103 87 Stockholm, Sweden',
    breach_notification_url: 'https://www.imy.se/en/breach',
    languages: ['sv', 'en'],
  },
];

// EFTA countries (EEA)
export const EFTA_DPA_DATABASE: EUDataProtectionAuthority[] = [
  {
    country_code: 'IS',
    country_name: 'Iceland',
    dpa_name: 'Icelandic Data Protection Authority',
    dpa_local_name: 'Persónuvernd',
    website: 'https://personuvernd.is',
    email: 'personuvernd@personuvernd.is',
    phone: '+354 510 9600',
    address: 'Rauðarárstígur 10, 105 Reykjavík, Iceland',
    breach_notification_url: 'https://personuvernd.is/breach',
    languages: ['is', 'en'],
  },
  {
    country_code: 'LI',
    country_name: 'Liechtenstein',
    dpa_name: 'Data Protection Authority',
    dpa_local_name: 'Datenschutzstelle Liechtenstein',
    website: 'https://datenschutzstelle.li',
    email: 'info@datenschutzstelle.li',
    phone: '+423 236 60 90',
    address: 'Städtle 38, Postfach 94, 9490 Vaduz, Liechtenstein',
    breach_notification_url: 'https://datenschutzstelle.li/breach',
    languages: ['de', 'en'],
  },
  {
    country_code: 'NO',
    country_name: 'Norway',
    dpa_name: 'Norwegian Data Protection Authority',
    dpa_local_name: 'Datatilsynet',
    website: 'https://datatilsynet.no',
    email: 'postkasse@datatilsynet.no',
    phone: '+47 22 47 70 00',
    address: 'Sverdrupsgata 12, 4608 Kristiansand, Norway',
    breach_notification_url: 'https://www.datatilsynet.no/en/breach',
    languages: ['no', 'en'],
  },
];

// Combined database
export const ALL_DPA_DATABASE: EUDataProtectionAuthority[] = [
  ...EU_DPA_DATABASE,
  ...EFTA_DPA_DATABASE,
];

// Default notification templates
export const DEFAULT_BREACH_TEMPLATES: Record<string, BreachNotificationTemplate> = {
  dpa_standard: {
    id: 'dpa_standard',
    name: 'Standard DPA Notification',
    description: 'Standard template for notifying Data Protection Authorities',
    dpa_template: {
      subject: 'Personal Data Breach Notification - {{breach_id}}',
      body: `NOTIFICATION OF PERSONAL DATA BREACH

To: {{dpa_name}}

From: {{organization_name}}
Date: {{breach_date}}

1. BREACH IDENTIFICATION
Breach ID: {{breach_id}}
Date of Discovery: {{breach_discovered_date}}
Estimated Date of Occurrence: {{breach_occurred_date}}

2. DESCRIPTION OF BREACH
{{breach_description}}

3. DATA SUBJECTS AFFECTED
Number of individuals: {{affected_count}}
Categories: {{affected_categories}}

4. LIKELY CONSEQUENCES
{{likely_consequences}}

5. MEASURES TAKEN
{{containment_measures}}

6. CONTACT INFORMATION
Email: {{contact_email}}
Phone: {{contact_phone}}

Please acknowledge receipt of this notification.`,
      required_fields: ['breach_id', 'organization_name', 'breach_description', 'affected_count'],
    },
    subject_template: {
      subject: '',
      body: '',
      required_fields: [],
      channels: [],
    },
    applicable_risk_levels: ['medium', 'high', 'critical'],
    applicable_categories: ['confidentiality', 'integrity', 'availability', 'accidental', 'malicious', 'system', 'human_error', 'third_party'],
    language: 'en',
    version: '1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  subject_high_risk: {
    id: 'subject_high_risk',
    name: 'Data Subject High Risk Notification',
    description: 'Required notification when breach poses high risk to data subjects\' rights',
    dpa_template: {
      subject: '',
      body: '',
      required_fields: [],
    },
    subject_template: {
      subject: 'Important: Security Incident Affecting Your Personal Data',
      body: `Dear User,

We are writing to inform you of a security incident that may have affected your personal data.

INCIDENT DETAILS
On {{breach_date}}, we discovered a security incident that {{breach_description}}.

YOUR DATA INVOLVED
The following information may have been affected:
{{data_types}}

WHAT WE ARE DOING
We have taken immediate action to:
{{steps_taken}}

WHAT YOU CAN DO
We recommend that you:
1. Monitor your accounts for unusual activity
2. Change passwords for any accounts using similar credentials
3. Be vigilant against phishing attempts

CONTACT INFORMATION
If you have questions or concerns, please contact us:
Email: {{contact_email}}
Phone: {{contact_phone}}

We apologize for any inconvenience and appreciate your understanding as we work to resolve this matter.

{{organization_name}}`,
      required_fields: ['breach_id', 'breach_date', 'data_types', 'steps_taken'],
      channels: ['email', 'sms', 'phone', 'postal', 'public_announcement', 'website_banner'],
    },
    applicable_risk_levels: ['high', 'critical'],
    applicable_categories: ['confidentiality', 'integrity', 'availability', 'accidental', 'malicious', 'system', 'human_error', 'third_party'],
    language: 'en',
    version: '1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};
