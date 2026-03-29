/**
 * Security Incident Utilities
 * Ticket: REMY-260
 * 
 * GDPR Breach Notification Procedures
 * Article 33 - DPA notification
 * Article 34 - Individual notification
 */

// Severity levels for breach classification
export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus = 'detected' | 'under_investigation' | 'contained' | 'remediated' | 'closed' | 'false_positive';
export type BreachType = 
  | 'unauthorized_access' 
  | 'unauthorized_disclosure' 
  | 'data_loss' 
  | 'data_corruption'
  | 'ransomware'
  | 'insider_threat'
  | 'third_party_breach'
  | 'physical_security'
  | 'misconfiguration'
  | 'other';

export type DiscoverySource =
  | 'automated_monitoring'
  | 'user_report'
  | 'internal_audit'
  | 'third_party_notification'
  | 'penetration_test'
  | 'vulnerability_scan'
  | 'customer_complaint'
  | 'regulatory_notification'
  | 'other';

export type LikelihoodOfHarm = 'remote' | 'possible' | 'probable' | 'certain';
export type SeverityOfImpact = 'minimal' | 'limited' | 'significant' | 'severe';

// Incident interfaces
export interface SecurityIncident {
  id: string;
  detectedAt: string;
  reportedAt: string | null;
  severity: BreachSeverity;
  description: string;
  descriptionInternal: string | null;
  affectedUsersCount: number;
  dataCategories: string[];
  dataSpecialCategories: string[];
  likelihoodOfHarm: LikelihoodOfHarm | null;
  severityOfImpact: SeverityOfImpact | null;
  breachType: BreachType | null;
  discoverySource: DiscoverySource | null;
  dpiaNotifiedAt: string | null;
  dpaNotifiedAt: string | null;
  dpaReferenceNumber: string | null;
  individualsNotifiedAt: string | null;
  notificationMethod: string | null;
  status: BreachStatus;
  containmentMeasures: string[];
  remediationSteps: string[];
  preventativeMeasures: string[];
  rootCause: string | null;
  lessonsLearned: string | null;
  detectedBy: string | null;
  assignedTo: string | null;
  closedBy: string | null;
  projectId: string | null;
  relatedIncidentId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  tags: string[];
  priority: number;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface IncidentNotification {
  id: string;
  incidentId: string;
  notificationType: 'dpa_notification' | 'individual_notification' | 'customer_notification' | 'internal_alert' | 'management_escalation';
  recipientCount: number;
  recipientType: string | null;
  sentAt: string;
  sentBy: string | null;
  method: string | null;
  templateUsed: string | null;
  subjectLine: string | null;
  contentHash: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  gdprArticleReference: string;
  timelineMet: boolean;
}

// Classification scoring
export interface SeverityScoreFactors {
  affectedUsers: number;
  dataCategories: string[];
  specialCategories: string[];
  likelihood: LikelihoodOfHarm;
  impact: SeverityOfImpact;
}

// GDPR notification requirements
export interface NotificationRequirements {
  requiresDpaNotification: boolean;
  dpaDeadlineHours: number;
  requiresIndividualNotification: boolean;
  individualDeadlineHours: number;
  rationale: string;
}

// Timeline constants (GDPR Article 33 & 34)
export const GDPR_TIMELINE = {
  DPA_NOTIFICATION_HOURS: 72,
  INDIVIDUAL_NOTIFICATION_DAYS: 30, // Without undue delay, but typically within 30 days for high risk
  HIGH_RISK_INDIVIDUAL_HOURS: 72,
} as const;

// Severity thresholds
export const SEVERITY_THRESHOLDS = {
  CRITICAL_SCORE: 10,
  HIGH_SCORE: 7,
  MEDIUM_SCORE: 4,
  LOW_SCORE: 0,
} as const;

// Affected user count thresholds
export const USER_COUNT_THRESHOLDS = {
  CRITICAL: 100000,
  HIGH: 10000,
  MEDIUM: 1000,
  LOW: 1,
} as const;

/**
 * Calculate severity score from incident factors
 * Higher score = more severe
 */
export function calculateSeverityScore(factors: SeverityScoreFactors): number {
  let score = 0;

  // Score from affected users
  if (factors.affectedUsers >= USER_COUNT_THRESHOLDS.CRITICAL) {
    score += 4;
  } else if (factors.affectedUsers >= USER_COUNT_THRESHOLDS.HIGH) {
    score += 3;
  } else if (factors.affectedUsers >= USER_COUNT_THRESHOLDS.MEDIUM) {
    score += 2;
  } else if (factors.affectedUsers >= USER_COUNT_THRESHOLDS.LOW) {
    score += 1;
  }

  // Score from special category data (higher risk)
  if (factors.specialCategories.length > 0) {
    score += 3;
  }

  // Score from sensitive data categories
  const sensitiveCategories = ['financial', 'government_id', 'health', 'biometric'];
  const hasSensitiveData = factors.dataCategories.some(cat => 
    sensitiveCategories.includes(cat.toLowerCase())
  );
  if (hasSensitiveData) {
    score += 2;
  }

  // Score from likelihood of harm
  const likelihoodScores: Record<LikelihoodOfHarm, number> = {
    remote: 1,
    possible: 2,
    probable: 3,
    certain: 4,
  };
  score += likelihoodScores[factors.likelihood] || 0;

  // Score from impact severity
  const impactScores: Record<SeverityOfImpact, number> = {
    minimal: 1,
    limited: 2,
    significant: 3,
    severe: 4,
  };
  score += impactScores[factors.impact] || 0;

  return score;
}

/**
 * Classify breach severity based on score
 */
export function classifyBreachSeverity(score: number): BreachSeverity {
  if (score >= SEVERITY_THRESHOLDS.CRITICAL_SCORE) return 'critical';
  if (score >= SEVERITY_THRESHOLDS.HIGH_SCORE) return 'high';
  if (score >= SEVERITY_THRESHOLDS.MEDIUM_SCORE) return 'medium';
  return 'low';
}

/**
 * Determine GDPR notification requirements
 */
export function getNotificationRequirements(
  severity: BreachSeverity,
  affectedUsers: number,
  specialCategories: string[],
  likelihood: LikelihoodOfHarm,
  impact: SeverityOfImpact
): NotificationRequirements {
  let requiresDpa = false;
  let requiresIndividual = false;
  const rationale: string[] = [];

  // Article 33 - DPA notification required unless breach unlikely to result in risk
  if (severity === 'medium' || severity === 'high' || severity === 'critical') {
    requiresDpa = true;
    rationale.push(`Severity level ${severity} indicates potential risk to data subjects`);
  }

  if (affectedUsers >= 100) {
    requiresDpa = true;
    rationale.push(`${affectedUsers} affected users exceeds threshold of 100`);
  }

  if (specialCategories.length > 0) {
    requiresDpa = true;
    rationale.push(`Special category data (Article 9) requires notification`);
  }

  if (likelihood === 'probable' || likelihood === 'certain') {
    requiresDpa = true;
    rationale.push(`Likelihood of harm is ${likelihood}`);
  }

  // Article 34 - Individual notification required if high risk
  if (severity === 'high' || severity === 'critical') {
    requiresIndividual = true;
    rationale.push(`High/critical severity indicates high risk to rights and freedoms`);
  }

  if (affectedUsers >= 1000 && ['possible', 'probable', 'certain'].includes(likelihood)) {
    requiresIndividual = true;
    rationale.push(`Large scale incident (${affectedUsers} users) with ${likelihood} harm likelihood`);
  }

  if (impact === 'significant' || impact === 'severe') {
    requiresIndividual = true;
    rationale.push(`Impact severity is ${impact}`);
  }

  if (specialCategories.length > 0 && affectedUsers >= 100) {
    requiresIndividual = true;
    rationale.push(`Special category data breach affecting ${affectedUsers} users`);
  }

  return {
    requiresDpaNotification: requiresDpa,
    dpaDeadlineHours: requiresDpa ? GDPR_TIMELINE.DPA_NOTIFICATION_HOURS : 0,
    requiresIndividualNotification: requiresIndividual,
    individualDeadlineHours: requiresIndividual ? GDPR_TIMELINE.HIGH_RISK_INDIVIDUAL_HOURS : 0,
    rationale: rationale.join('. ') + '.',
  };
}

/**
 * Calculate remaining hours for DPA notification
 */
export function getDpaDeadlineHoursRemaining(detectedAt: string): number {
  const detected = new Date(detectedAt).getTime();
  const deadline = detected + (GDPR_TIMELINE.DPA_NOTIFICATION_HOURS * 60 * 60 * 1000);
  const remaining = deadline - Date.now();
  return Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
}

/**
 * Calculate remaining hours for individual notification (high risk)
 */
export function getIndividualDeadlineHoursRemaining(detectedAt: string): number {
  const detected = new Date(detectedAt).getTime();
  const deadline = detected + (GDPR_TIMELINE.HIGH_RISK_INDIVIDUAL_HOURS * 60 * 60 * 1000);
  const remaining = deadline - Date.now();
  return Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
}

/**
 * Check if DPA notification is overdue
 */
export function isDpaOverdue(detectedAt: string, notifiedAt: string | null): boolean {
  if (notifiedAt) return false;
  return getDpaDeadlineHoursRemaining(detectedAt) === 0;
}

/**
 * Check if individual notification is overdue
 */
export function isIndividualNotificationOverdue(
  severity: BreachSeverity,
  detectedAt: string,
  notifiedAt: string | null
): boolean {
  if (notifiedAt) return false;
  if (!['high', 'critical'].includes(severity)) return false;
  return getIndividualDeadlineHoursRemaining(detectedAt) === 0;
}

/**
 * Get status badge styling
 */
export function getSeverityBadge(severity: BreachSeverity): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
  color: string;
} {
  const badges: Record<BreachSeverity, { label: string; variant: 'success' | 'warning' | 'danger' | 'info'; color: string }> = {
    low: { label: 'Low', variant: 'info', color: 'blue' },
    medium: { label: 'Medium', variant: 'warning', color: 'amber' },
    high: { label: 'High', variant: 'danger', color: 'red' },
    critical: { label: 'Critical', variant: 'danger', color: 'red' },
  };
  return badges[severity];
}

export function getStatusBadge(status: BreachStatus): {
  label: string;
  color: string;
} {
  const badges: Record<BreachStatus, { label: string; color: string }> = {
    detected: { label: 'Detected', color: 'red' },
    under_investigation: { label: 'Under Investigation', color: 'amber' },
    contained: { label: 'Contained', color: 'blue' },
    remediated: { label: 'Remediated', color: 'green' },
    closed: { label: 'Closed', color: 'gray' },
    false_positive: { label: 'False Positive', color: 'gray' },
  };
  return badges[status];
}

/**
 * Format date for display
 */
export function formatDateTime(date: string | null): string {
  if (!date) return 'Not set';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format duration since date
 */
export function formatTimeSince(date: string): string {
  const then = new Date(date).getTime();
  const now = Date.now();
  const diff = now - then;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Less than an hour ago';
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Get breach type display name
 */
export function getBreachTypeDisplay(type: BreachType | null): string {
  if (!type) return 'Unknown';
  const displays: Record<BreachType, string> = {
    unauthorized_access: 'Unauthorized Access',
    unauthorized_disclosure: 'Unauthorized Disclosure',
    data_loss: 'Data Loss',
    data_corruption: 'Data Corruption',
    ransomware: 'Ransomware',
    insider_threat: 'Insider Threat',
    third_party_breach: 'Third Party Breach',
    physical_security: 'Physical Security Breach',
    misconfiguration: 'Misconfiguration',
    other: 'Other',
  };
  return displays[type];
}

/**
 * Get discovery source display name
 */
export function getDiscoverySourceDisplay(source: DiscoverySource | null): string {
  if (!source) return 'Unknown';
  const displays: Record<DiscoverySource, string> = {
    automated_monitoring: 'Automated Monitoring',
    user_report: 'User Report',
    internal_audit: 'Internal Audit',
    third_party_notification: 'Third Party Notification',
    penetration_test: 'Penetration Test',
    vulnerability_scan: 'Vulnerability Scan',
    customer_complaint: 'Customer Complaint',
    regulatory_notification: 'Regulatory Notification',
    other: 'Other',
  };
  return displays[source];
}

/**
 * Generate incident reference ID
 */
export function generateIncidentReference(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SEC-${year}${month}-${random}`;
}

/**
 * Check if incident requires escalation
 */
export function requiresEscalation(incident: SecurityIncident): boolean {
  // Critical severity always escalates
  if (incident.severity === 'critical') return true;
  
  // High severity with large user count escalates
  if (incident.severity === 'high' && incident.affectedUsersCount >= 10000) return true;
  
  // Special category data breach escalates
  if (
    incident.dataSpecialCategories.length > 0 && 
    incident.affectedUsersCount >= 1000
  ) return true;
  
  // Overdue DPA notification escalates
  if (
    !incident.dpaNotifiedAt && 
    isDpaOverdue(incident.detectedAt)
  ) return true;
  
  return false;
}

/**
 * Get data categories for incident display
 */
export const DATA_CATEGORIES = [
  { value: 'contact', label: 'Contact Information', sensitive: false },
  { value: 'identity', label: 'Identity Documents', sensitive: true },
  { value: 'financial', label: 'Financial Data', sensitive: true },
  { value: 'health', label: 'Health Data', sensitive: true, special: true },
  { value: 'biometric', label: 'Biometric Data', sensitive: true, special: true },
  { value: 'location', label: 'Location Data', sensitive: false },
  { value: 'online_identifiers', label: 'Online Identifiers', sensitive: false },
  { value: 'behavioral', label: 'Behavioral Data', sensitive: false },
  { value: 'authentication', label: 'Authentication Credentials', sensitive: true },
  { value: 'professional', label: 'Professional Information', sensitive: false },
] as const;

/**
 * Get special category data types (GDPR Article 9)
 */
export const SPECIAL_CATEGORIES = [
  { value: 'racial_ethnic', label: 'Racial/Ethnic Origin' },
  { value: 'political', label: 'Political Opinions' },
  { value: 'religious', label: 'Religious Beliefs' },
  { value: 'trade_union', label: 'Trade Union Membership' },
  { value: 'genetic', label: 'Genetic Data' },
  { value: 'biometric', label: 'Biometric Data' },
  { value: 'health', label: 'Health Data' },
  { value: 'sex_life', label: 'Sex Life/Sexual Orientation' },
] as const;

/**
 * Validate incident data
 */
export function validateIncidentData(data: Partial<SecurityIncident>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.description || data.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }

  if (!data.severity || !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
    errors.push('Valid severity level is required');
  }

  if (data.affectedUsersCount === undefined || data.affectedUsersCount < 0) {
    errors.push('Affected users count must be a non-negative number');
  }

  if (!data.detectedAt) {
    errors.push('Detection timestamp is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Mock incident for development/testing
 */
export function createMockIncident(severity: BreachSeverity = 'medium'): SecurityIncident {
  return {
    id: crypto.randomUUID(),
    detectedAt: new Date().toISOString(),
    reportedAt: null,
    severity,
    description: `Test ${severity} security incident for development`,
    descriptionInternal: 'Internal technical details would go here',
    affectedUsersCount: severity === 'critical' ? 150000 : severity === 'high' ? 15000 : severity === 'medium' ? 1500 : 50,
    dataCategories: ['contact', 'behavioral'],
    dataSpecialCategories: severity === 'critical' ? ['health'] : [],
    likelihoodOfHarm: severity === 'critical' ? 'certain' : severity === 'high' ? 'probable' : 'possible',
    severityOfImpact: severity === 'critical' ? 'severe' : severity === 'high' ? 'significant' : 'limited',
    breachType: 'unauthorized_access',
    discoverySource: 'automated_monitoring',
    dpiaNotifiedAt: severity === 'critical' ? new Date().toISOString() : null,
    dpaNotifiedAt: null,
    dpaReferenceNumber: null,
    individualsNotifiedAt: null,
    notificationMethod: null,
    status: 'detected',
    containmentMeasures: [],
    remediationSteps: [],
    preventativeMeasures: [],
    rootCause: null,
    lessonsLearned: null,
    detectedBy: 'user-123',
    assignedTo: null,
    closedBy: null,
    projectId: 'project-456',
    relatedIncidentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
    tags: ['test', 'gdpr'],
    priority: severity === 'critical' ? 100 : severity === 'high' ? 75 : severity === 'medium' ? 50 : 25,
  };
}
