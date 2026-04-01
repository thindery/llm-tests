/**
 * Breach Utilities - GDPR Article 33 & 34 Breach Notification Procedures
 * Ticket: REMY-260
 * 
 * Features:
 * - 72-hour DPA notification deadline tracking
 * - Risk assessment methodology (likelihood × severity)
 * - Automatic notification requirement determination
 * - Evidence collection and chain of custody
 * - Remediation workflow management
 */

import { randomUUID, createHash } from 'crypto';
import type {
  BreachRecord,
  BreachRiskLevel,
  LikelihoodLevel,
  ImpactSeverity,
  BreachCategory,
  AffectedDataCategory,
  AffectedSubjectCategory,
  NotificationStatus,
  RiskFactors,
  RiskAssessmentResult,
  RiskAssessmentMatrix,
  EUDataProtectionAuthority,
  BreachNotificationTemplate,
  TemplatePlaceholders,
  StatusHistoryEntry,
  EvidenceItem,
  RemediationStep,
  CreateBreachRequest,
} from './types';

import {
  RISK_ASSESSMENT_MATRIX,
  ALL_DPA_DATABASE,
  DEFAULT_BREACH_TEMPLATES,
} from './types';

// Re-export types
export * from './types';

// =====================================================
// BREACH ID GENERATION
// =====================================================

/**
 * Generate a unique breach ID
 * Format: BREACH-YYYY-NNNNN (e.g., BREACH-2026-00001)
 */
export function generateBreachId(sequence?: number): string {
  const year = new Date().getFullYear();
  const seq = sequence?.toString().padStart(5, '0') || randomUUID().slice(0, 5).toUpperCase();
  return `BREACH-${year}-${seq}`;
}

// =====================================================
// RISK ASSESSMENT METHODOLOGY (GDPR Article 33)
// =====================================================

/**
 * Calculate likelihood score based on risk factors
 * Returns score 0-25
 */
export function calculateLikelihoodScore(factors: RiskFactors): {
  level: LikelihoodLevel;
  score: number;
} {
  let score = 0;

  // Base scores
  if (factors.malicious_intent) score += 15;
  if (factors.public_exposure) score += 10;
  if (!factors.encryption_in_place) score += 8;
  if (!factors.access_controls) score += 5;

  // Detection speed modifier
  const detectionModifiers: Record<string, number> = {
    immediate: -10,
    hours: -5,
    days: 0,
    weeks: 5,
  };
  score += detectionModifiers[factors.detection_speed] || 0;

  // Containment speed modifier
  const containmentModifiers: Record<string, number> = {
    immediate: -5,
    hours: -2,
    days: 0,
    weeks: 3,
  };
  score += containmentModifiers[factors.containment_speed] || 0;

  // Clamp to 0-25
  score = Math.max(0, Math.min(25, score));

  // Determine level
  let level: LikelihoodLevel;
  if (score <= 5) level = 'unlikely';
  else if (score <= 12) level = 'possible';
  else if (score <= 18) level = 'likely';
  else level = 'certain';

  return { level, score };
}

/**
 * Calculate severity score based on risk factors
 * Returns score 0-25
 */
export function calculateSeverityScore(factors: RiskFactors): {
  level: ImpactSeverity;
  score: number;
} {
  let score = 0;

  // Base scores
  if (factors.special_categories) score += 15;
  if (factors.sensitive_data_present) score += 10;
  if (factors.vulnerable_subjects) score += 12;
  if (factors.large_volume) score += 8;
  if (factors.cross_border) score += 5;

  // Clamp to 0-25
  score = Math.max(0, Math.min(25, score));

  // Determine level
  let level: ImpactSeverity;
  if (score <= 5) level = 'negligible';
  else if (score <= 10) level = 'limited';
  else if (score <= 17) level = 'significant';
  else level = 'severe';

  return { level, score };
}

/**
 * Calculate overall risk score (0-100 scale)
 * Combines likelihood (0-25) × severity (0-25) with additional factors
 */
export function calculateRiskScore(
  likelihood: LikelihoodLevel,
  severity: ImpactSeverity,
  factors: RiskFactors
): number {
  const likelihoodScore = calculateLikelihoodScore(factors).score;
  const severityScore = calculateSeverityScore(factors).score;

  // Combined risk score on 0-100 scale
  let totalScore = (likelihoodScore + severityScore) * 2;

  // Bonus for special combination risks
  if (factors.special_categories && factors.malicious_intent) totalScore += 15;
  if (factors.vulnerable_subjects && !factors.encryption_in_place) totalScore += 10;
  if (factors.public_exposure && factors.large_volume) totalScore += 10;

  // Cap at 100
  return Math.min(100, totalScore);
}

/**
 * Determine risk level from score
 */
export function scoreToRiskLevel(score: number): BreachRiskLevel {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

/**
 * Check if DPA notification is required based on risk level
 * GDPR Article 33: Required when likely to result in risk to rights
 */
export function requiresDPANotification(riskLevel: BreachRiskLevel): boolean {
  return riskLevel !== 'low';
}

/**
 * Check if data subject notification is required based on risk level
 * GDPR Article 34: Required when high risk to rights
 */
export function requiresSubjectNotification(riskLevel: BreachRiskLevel): boolean {
  return riskLevel === 'high' || riskLevel === 'critical';
}

/**
 * Get notification timeline in hours
 * GDPR Article 33: 72 hours for DPA
 */
export function getNotificationTimelineHours(riskLevel: BreachRiskLevel): number {
  const timelines: Record<BreachRiskLevel, number> = {
    low: 72,
    medium: 72,
    high: 72,
    critical: 24, // Prioritize critical breaches
  };
  return timelines[riskLevel] || 72;
}

/**
 * Perform complete risk assessment
 */
export function performRiskAssessment(factors: RiskFactors): RiskAssessmentResult {
  const likelihoodResult = calculateLikelihoodScore(factors);
  const severityResult = calculateSeverityScore(factors);

  const score = calculateRiskScore(likelihoodResult.level, severityResult.level, factors);
  const level = scoreToRiskLevel(score);

  // Generate justification
  const justifications: string[] = [];

  if (factors.sensitive_data_present) {
    justifications.push('Sensitive personal data involved');
  }
  if (factors.special_categories) {
    justifications.push('Special category data affected (GDPR Article 9)');
  }
  if (factors.vulnerable_subjects) {
    justifications.push('Vulnerable data subjects affected');
  }
  if (factors.large_volume) {
    justifications.push('Large volume of data affected');
  }
  if (!factors.encryption_in_place) {
    justifications.push('Data not encrypted');
  }
  if (factors.malicious_intent) {
    justifications.push('Evidence of malicious intent');
  }
  if (factors.public_exposure) {
    justifications.push('Data publicly exposed');
  }

  return {
    score,
    level,
    requires_dpa_notification: requiresDPANotification(level),
    requires_subject_notification: requiresSubjectNotification(level),
    justification: justifications.join('; ') || 'Standard risk assessment applied',
    factors: {
      likelihood_score: likelihoodResult.score,
      severity_score: severityResult.score,
    },
  };
}

/**
 * Lookup from risk assessment matrix
 */
export function lookupRiskAssessment(
  likelihood: LikelihoodLevel,
  severity: ImpactSeverity
): (typeof RISK_ASSESSMENT_MATRIX)[0] | null {
  return RISK_ASSESSMENT_MATRIX.find(
    (r) => r.likelihood === likelihood && r.severity === severity
  ) || null;
}

// =====================================================
// DEADLINE CALCULATIONS
// =====================================================

/**
 * Calculate DPA notification deadline (72 hours from discovery)
 * GDPR Article 33(1)
 */
export function calculateDPANotificationDeadline(discoveryDate: Date | string): Date {
  const discovery = new Date(discoveryDate);
  const deadline = new Date(discovery);
  deadline.setHours(deadline.getHours() + 72);
  return deadline;
}

/**
 * Calculate subject notification deadline (without undue delay)
 * GDPR Article 34
 */
export function calculateSubjectNotificationDeadline(
  discoveryDate: Date | string,
  riskLevel: BreachRiskLevel
): Date {
  const discovery = new Date(discoveryDate);
  const deadline = new Date(discovery);

  switch (riskLevel) {
    case 'critical':
      // Immediate - same day
      deadline.setHours(deadline.getHours() + 24);
      break;
    case 'high':
      // Within reasonable timeframe
      deadline.setHours(deadline.getHours() + 72);
      break;
    default:
      // Lower risk - standard processing
      deadline.setHours(deadline.getHours() + 120);
  }

  return deadline;
}

/**
 * Check if deadline has passed
 */
export function isDeadlinePassed(deadline: Date | string): boolean {
  return new Date() > new Date(deadline);
}

/**
 * Get remaining hours until deadline
 */
export function getHoursUntilDeadline(deadline: Date | string): number {
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60));
}

/**
 * Get deadline urgency level
 */
export function getDeadlineUrgency(hoursRemaining: number): 'critical' | 'urgent' | 'warning' | 'ok' {
  if (hoursRemaining <= 4) return 'critical';
  if (hoursRemaining <= 12) return 'urgent';
  if (hoursRemaining <= 24) return 'warning';
  return 'ok';
}

// =====================================================
// DPA LOOKUP
// =====================================================

/**
 * Get DPA information by country code
 */
export function getDPAByCountryCode(countryCode: string): EUDataProtectionAuthority | null {
  const code = countryCode.toUpperCase();
  return ALL_DPA_DATABASE.find((dpa) => dpa.country_code === code) || null;
}

/**
 * Get DPA for organization\'s main establishment
 * Default to Ireland (common for tech companies)
 */
export function getDefaultDPA(): EUDataProtectionAuthority {
  // Default to Ireland (DPC) - common for EU tech companies
  return getDPAByCountryCode('IE') || ALL_DPA_DATABASE[0];
}

/**
 * Get breach notification URL for DPA
 */
export function getDPABreachNotificationUrl(countryCode: string): string | null {
  const dpa = getDPAByCountryCode(countryCode);
  return dpa?.breach_notification_url || null;
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

/**
 * Get template by ID
 */
export function getNotificationTemplate(templateId: string): BreachNotificationTemplate | null {
  return DEFAULT_BREACH_TEMPLATES[templateId] || null;
}

/**
 * Get appropriate templates for breach
 */
export function getTemplatesForBreach(
  riskLevel: BreachRiskLevel,
): BreachNotificationTemplate[] {
  return Object.values(DEFAULT_BREACH_TEMPLATES).filter(
    (t) => t.applicable_risk_levels.includes(riskLevel)
  );
}

/**
 * Fill template placeholders
 */
export function fillTemplate(
  template: string,
  placeholders: Partial<TemplatePlaceholders>
): string {
  let result = template;

  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || `[${key}]`));
  }

  return result;
}

/**
 * Generate DPA notification content
 */
export function generateDPANotification(
  breach: BreachRecord,
  dpa: EUDataProtectionAuthority,
  organizationName: string,
  contactEmail: string,
  contactPhone: string
): { subject: string; body: string } {
  const template = DEFAULT_BREACH_TEMPLATES.dpa_standard;
  const placeholders: Partial<TemplatePlaceholders> = {
    breach_id: breach.breach_id,
    breach_date: new Date(breach.breach_discovered_at).toISOString(),
    breach_discovered_date: new Date(breach.breach_discovered_at).toISOString(),
    breach_occurred_date: new Date(breach.breach_occurred_at).toISOString(),
    breach_description: breach.description,
    affected_count: String(breach.approximate_data_subjects_count),
    affected_categories: breach.affected_subject_categories.join(', '),
    likely_consequences: breach.likely_consequences,
    containment_measures: breach.containment_measures,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    dpa_name: dpa.dpa_name,
    dpa_url: dpa.website,
    organization_name: organizationName,
  };

  return {
    subject: fillTemplate(template.dpa_template.subject, placeholders),
    body: fillTemplate(template.dpa_template.body, placeholders),
  };
}

/**
 * Generate data subject notification content
 */
export function generateSubjectNotification(
  breach: BreachRecord,
  organizationName: string,
  contactEmail: string,
  contactPhone: string,
  stepsTaken: string[]
): { subject: string; body: string } {
  const template = DEFAULT_BREACH_TEMPLATES.subject_high_risk;
  const placeholders: Partial<TemplatePlaceholders> = {
    breach_id: breach.breach_id,
    breach_date: new Date(breach.breach_discovered_at).toLocaleDateString(),
    breach_description: breach.description,
    data_types: breach.personal_data_types.join(', '),
    steps_taken: stepsTaken.join('\n'),
    contact_email: contactEmail,
    contact_phone: contactPhone,
    organization_name: organizationName,
  };

  return {
    subject: fillTemplate(template.subject_template.subject, placeholders),
    body: fillTemplate(template.subject_template.body, placeholders),
  };
}

// =====================================================
// EVIDENCE COLLECTION
// =====================================================

/**
 * Calculate SHA-256 hash of evidence content
 */
export function calculateEvidenceHash(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Create evidence item
 */
export function createEvidenceItem(
  type: EvidenceItem['type'],
  title: string,
  description: string,
  collectedBy: string,
  metadata: Record<string, unknown> = {},
  filePath?: string,
  fileContent?: string | Buffer
): EvidenceItem {
  return {
    id: randomUUID(),
    type,
    title,
    description,
    file_path: filePath,
    file_hash: fileContent ? createHash('sha256').update(fileContent).digest('hex') : undefined,
    collected_by: collectedBy,
    collected_at: new Date().toISOString(),
    metadata,
  };
}

// =====================================================
// STATUS MANAGEMENT
// =====================================================

/**
 * Create status history entry
 */
export function createStatusHistoryEntry(
  status: NotificationStatus,
  changedBy: string,
  reason: string
): StatusHistoryEntry {
  return {
    status,
    timestamp: new Date().toISOString(),
    changed_by: changedBy,
    reason,
  };
}

/**
 * Get allowed status transitions
 */
export function getAllowedStatusTransitions(
  currentStatus: NotificationStatus
): NotificationStatus[] {
  const transitions: Record<NotificationStatus, NotificationStatus[]> = {
    draft: ['assessing', 'closed'],
    assessing: ['dpa_notified', 'dpa_acknowledged', 'subjects_notified', 'resolved', 'closed'],
    dpa_notified: ['dpa_acknowledged', 'subjects_notified', 'remediation', 'resolved'],
    dpa_acknowledged: ['subjects_notified', 'remediation', 'resolved'],
    subjects_notified: ['remediation', 'resolved'],
    remediation: ['resolved'],
    resolved: ['closed', 'appealed'],
    closed: ['appealed'],
    appealed: ['closed', 'resolved'],
  };

  return transitions[currentStatus] || [];
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(
  from: NotificationStatus,
  to: NotificationStatus
): boolean {
  if (from === to) return true;
  const allowed = getAllowedStatusTransitions(from);
  return allowed.includes(to);
}

// =====================================================
// REMEDIATION MANAGEMENT
// =====================================================

/**
 * Create remediation step
 */
export function createRemediationStep(
  description: string,
  priority: RemediationStep['priority'],
  assignedTo: string,
  dueDate: string
): RemediationStep {
  return {
    id: randomUUID(),
    description,
    priority,
    status: 'pending',
    assigned_to: assignedTo,
    due_date: dueDate,
    completed_at: null,
    notes: null,
  };
}

/**
 * Calculate remediation completion percentage
 */
export function calculateRemediationProgress(steps: RemediationStep[]): number {
  if (steps.length === 0) return 100;
  const completed = steps.filter((s) => s.status === 'completed').length;
  return Math.round((completed / steps.length) * 100);
}

/**
 * Check if all remediation steps are completed
 */
export function isRemediationComplete(steps: RemediationStep[]): boolean {
  // Empty steps is considered complete (no remediation needed)
  return steps.length === 0 || steps.every((s) => s.status === 'completed');
}

/**
 * Get overdue steps
 */
export function getOverdueSteps(steps: RemediationStep[]): RemediationStep[] {
  const now = new Date().toISOString();
  return steps.filter((s) => s.status !== 'completed' && s.due_date < now);
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate create breach request
 */
export function validateCreateBreachRequest(
  data: unknown
): { valid: true; data: CreateBreachRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  // Required fields
  if (!req.project_id || typeof req.project_id !== 'string') {
    return { valid: false, error: 'project_id is required' };
  }

  if (!req.breach_discovered_at || typeof req.breach_discovered_at !== 'string') {
    return { valid: false, error: 'breach_discovered_at is required' };
  }

  if (!req.breach_occurred_at || typeof req.breach_occurred_at !== 'string') {
    return { valid: false, error: 'breach_occurred_at is required' };
  }

  if (!req.category || !isValidBreachCategory(req.category)) {
    return { valid: false, error: 'category must be a valid breach category' };
  }

  if (!req.description || typeof req.description !== 'string' || req.description.length < 10) {
    return { valid: false, error: 'description must be at least 10 characters' };
  }

  if (!req.root_cause || typeof req.root_cause !== 'string') {
    return { valid: false, error: 'root_cause is required' };
  }

  if (!Array.isArray(req.affected_data_categories) || req.affected_data_categories.length === 0) {
    return { valid: false, error: 'affected_data_categories must be a non-empty array' };
  }

  if (!Array.isArray(req.affected_subject_categories) || req.affected_subject_categories.length === 0) {
    return { valid: false, error: 'affected_subject_categories must be a non-empty array' };
  }

  if (typeof req.approximate_data_subjects_count !== 'number' || req.approximate_data_subjects_count < 0) {
    return { valid: false, error: 'approximate_data_subjects_count must be a non-negative number' };
  }

  if (!req.data_types_description || typeof req.data_types_description !== 'string') {
    return { valid: false, error: 'data_types_description is required' };
  }

  if (!Array.isArray(req.personal_data_types) || req.personal_data_types.length === 0) {
    return { valid: false, error: 'personal_data_types must be a non-empty array' };
  }

  if (!req.likely_consequences || typeof req.likely_consequences !== 'string') {
    return { valid: false, error: 'likely_consequences is required' };
  }

  if (!req.containment_measures || typeof req.containment_measures !== 'string') {
    return { valid: false, error: 'containment_measures is required' };
  }

  // Validate risk factors if provided
  if (req.risk_factors !== undefined && typeof req.risk_factors !== 'object') {
    return { valid: false, error: 'risk_factors must be an object' };
  }

  return {
    valid: true,
    data: {
      project_id: req.project_id,
      breach_discovered_at: req.breach_discovered_at,
      breach_occurred_at: req.breach_occurred_at,
      category: req.category as BreachCategory,
      description: req.description,
      root_cause: req.root_cause,
      affected_data_categories: req.affected_data_categories as AffectedDataCategory[],
      affected_subject_categories: req.affected_subject_categories as AffectedSubjectCategory[],
      approximate_data_subjects_count: req.approximate_data_subjects_count,
      approximate_records_count: typeof req.approximate_records_count === 'number' ? req.approximate_records_count : 0,
      data_types_description: req.data_types_description,
      personal_data_types: req.personal_data_types as string[],
      likely_consequences: req.likely_consequences,
      cross_border_impact: Boolean(req.cross_border_impact),
      affected_member_states: Array.isArray(req.affected_member_states) ? req.affected_member_states as string[] : [],
      containment_measures: req.containment_measures,
      mitigation_measures_taken: Array.isArray(req.mitigation_measures_taken) ? req.mitigation_measures_taken as string[] : [],
      risk_factors: req.risk_factors as RiskFactors | undefined,
    },
  };
}

/**
 * Check if string is valid breach category
 */
function isValidBreachCategory(value: unknown): boolean {
  const valid: BreachCategory[] = [
    'confidentiality',
    'integrity',
    'availability',
    'accidental',
    'malicious',
    'system',
    'human_error',
    'third_party',
  ];
  return typeof value === 'string' && valid.includes(value as BreachCategory);
}

/**
 * Check if string is valid data category
 */
export function isValidDataCategory(value: unknown): boolean {
  const valid: AffectedDataCategory[] = [
    'personal_data',
    'sensitive_data',
    'financial_data',
    'health_data',
    'biometric_data',
    'genetic_data',
    'criminal_data',
    'children_data',
    'contact_data',
    'location_data',
  ];
  return typeof value === 'string' && valid.includes(value as AffectedDataCategory);
}

/**
 * Check if string is valid subject category
 */
export function isValidSubjectCategory(value: unknown): boolean {
  const valid: AffectedSubjectCategory[] = [
    'employees',
    'customers',
    'vendors',
    'prospects',
    'minors',
    'vulnerable_adults',
    'public',
  ];
  return typeof value === 'string' && valid.includes(value as AffectedSubjectCategory);
}

// =====================================================
// COMPLIANCE CHECKING
// =====================================================

/**
 * Check Article 33 compliance (DPA notification)
 */
export function checkArticle33Compliance(breach: BreachRecord): {
  compliant: boolean;
  violations: string[];
  time_remaining_hours: number;
} {
  const violations: string[] = [];

  // Check if DPA notification was required
  if (breach.requires_dpa_notification) {
    if (!breach.dpa_notification_sent_at) {
      const hoursUntil = getHoursUntilDeadline(breach.dpa_notification_deadline);
      if (isDeadlinePassed(breach.dpa_notification_deadline)) {
        violations.push(`DPA notification deadline exceeded (72 hours from discovery)`);
      }
      return {
        compliant: violations.length === 0,
        violations,
        time_remaining_hours: hoursUntil,
      };
    }

    // Check if sent within 72 hours
    const discoveryTime = new Date(breach.breach_discovered_at).getTime();
    const notificationTime = new Date(breach.dpa_notification_sent_at).getTime();
    const hoursElapsed = (notificationTime - discoveryTime) / (1000 * 60 * 60);

    if (hoursElapsed > 72) {
      violations.push(`DPA notification sent ${hoursElapsed.toFixed(1)} hours after discovery (exceeds 72-hour limit)`);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    time_remaining_hours: 0,
  };
}

/**
 * Check Article 34 compliance (subject notification)
 */
export function checkArticle34Compliance(breach: BreachRecord): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check if subject notification was required
  if (breach.requires_subject_notification) {
    if (!breach.subject_notification_sent_at) {
      violations.push('Data subject notification required but not sent (Article 34)');
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

/**
 * Check overall GDPR breach compliance
 */
export function checkBreachCompliance(breach: BreachRecord): {
  article_33: ReturnType<typeof checkArticle33Compliance>;
  article_34: ReturnType<typeof checkArticle34Compliance>;
  overall: boolean;
  violations: string[];
} {
  const article33 = checkArticle33Compliance(breach);
  const article34 = checkArticle34Compliance(breach);

  const allViolations = [...article33.violations, ...article34.violations];

  return {
    article_33: article33,
    article_34: article34,
    overall: allViolations.length === 0,
    violations: allViolations,
  };
}

// =====================================================
// STATISTICS
// =====================================================

/**
 * Calculate breach statistics
 */
export function calculateBreachStatistics(breaches: BreachRecord[]): {
  total: number;
  by_risk_level: Record<BreachRiskLevel, number>;
  by_category: Record<BreachCategory, number>;
  by_status: Record<NotificationStatus, number>;
  article_33_compliance_rate: number;
  article_34_compliance_rate: number;
} {
  const stats = {
    total: breaches.length,
    by_risk_level: { low: 0, medium: 0, high: 0, critical: 0 } as Record<BreachRiskLevel, number>,
    by_category: {} as Record<BreachCategory, number>,
    by_status: {} as Record<NotificationStatus, number>,
    article_33_compliance_rate: 0,
    article_34_compliance_rate: 0,
  };

  let article33Compliant = 0;
  let article33Total = 0;
  let article34Compliant = 0;
  let article34Total = 0;

  for (const breach of breaches) {
    // Risk level counts
    stats.by_risk_level[breach.risk_level]++;

    // Category counts
    stats.by_category[breach.category] = (stats.by_category[breach.category] || 0) + 1;

    // Status counts
    stats.by_status[breach.status] = (stats.by_status[breach.status] || 0) + 1;

    // Compliance tracking
    if (breach.requires_dpa_notification) {
      article33Total++;
      if (breach.dpa_notification_sent_at) {
        article33Compliant++;
      }
    }

    if (breach.requires_subject_notification) {
      article34Total++;
      if (breach.subject_notification_sent_at) {
        article34Compliant++;
      }
    }
  }

  stats.article_33_compliance_rate = article33Total > 0 ? article33Compliant / article33Total : 1;
  stats.article_34_compliance_rate = article34Total > 0 ? article34Compliant / article34Total : 1;

  return stats;
}

// =====================================================
// DEFAULT RISK FACTORS
// =====================================================

/**
 * Get default risk factors for breach assessment
 */
export function getDefaultRiskFactors(): RiskFactors {
  return {
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
}

// =====================================================
// BREACH RECORD BUILDER
// =====================================================

/**
 * Build initial breach record from request
 */
export function buildBreachRecord(
  request: CreateBreachRequest,
  createdBy: string
): Omit<BreachRecord, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date().toISOString();
  const riskFactors = request.risk_factors || getDefaultRiskFactors();

  // Calculate risk assessment
  const riskAssessment = performRiskAssessment(riskFactors);

  // Calculate deadlines
  const discoveryDate = new Date(request.breach_discovered_at);
  const dpaDeadline = calculateDPANotificationDeadline(discoveryDate);

  return {
    project_id: request.project_id,
    breach_id: generateBreachId(),
    breach_discovered_at: request.breach_discovered_at,
    breach_occurred_at: request.breach_occurred_at,
    breach_reported_at: now,
    category: request.category,
    description: request.description,
    root_cause: request.root_cause,
    affected_data_categories: request.affected_data_categories,
    affected_subject_categories: request.affected_subject_categories,
    approximate_data_subjects_count: request.approximate_data_subjects_count,
    approximate_records_count: request.approximate_records_count || 0,
    data_types_description: request.data_types_description,
    personal_data_types: request.personal_data_types,
    likelihood: calculateLikelihoodScore(riskFactors).level,
    severity: calculateSeverityScore(riskFactors).level,
    risk_level: riskAssessment.level,
    risk_score: riskAssessment.score,
    likely_consequences: request.likely_consequences,
    cross_border_impact: request.cross_border_impact,
    affected_member_states: request.affected_member_states || [],
    containment_measures: request.containment_measures,
    mitigation_measures_taken: request.mitigation_measures_taken || [],
    requires_dpa_notification: riskAssessment.requires_dpa_notification,
    requires_subject_notification: riskAssessment.requires_subject_notification,
    dpa_notification_deadline: dpaDeadline.toISOString(),
    dpa_notification_sent_at: null,
    dpa_notification_method: null,
    dpa_contact: null,
    dpa_response_received_at: null,
    dpa_response_notes: null,
    subject_notification_sent_at: null,
    subject_notification_method: null,
    subject_notification_template: 'subject_high_risk',
    subjects_notified_count: 0,
    subjects_failed_count: 0,
    status: 'draft',
    status_history: [
      createStatusHistoryEntry('draft', createdBy, 'Breach initially reported'),
    ],
    investigation_lead: createdBy,
    investigation_started_at: now,
    investigation_completed_at: null,
    investigation_findings: null,
    evidence_collected: [],
    remediation_plan: null,
    remediation_completed_at: null,
    lessons_learned: null,
    created_by: createdBy,
  };
}
