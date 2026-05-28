/**
 * Data Subject Rights (DSR) Response Time Tracking
 * GDPR Articles 15-22 - Response time tracking and SLA monitoring
 * 
 * Ticket: REMY-257
 * 
 * Key Requirements:
 * - Article 12: Transparent, intelligible, easily accessible information
 * - Article 15: Right of access - response within 1 month
 * - Article 16: Right to rectification - response within 1 month
 * - Article 17: Right to erasure - response within 1 month
 * - Article 18: Right to restriction - response within 1 month
 * - Article 20: Right to data portability - response within 1 month
 * - Article 21: Right to object - response within 1 month
 * - Article 22: Right to not be subject to automated decisions
 * 
 * Response Time SLA:
 * - Standard: 30 days from receipt
 * - Extension: Up to 2 additional months for complex requests
 * - Urgent: 48 hours for data breach related requests
 * - Emergency: 24 hours for imminent harm situations
 */

import { randomUUID } from 'crypto';

// DSR request types mapped to GDPR articles
export type DsrRequestType =
  | 'access'           // Article 15 - Right of access
  | 'rectification'    // Article 16 - Right to rectification
  | 'erasure'          // Article 17 - Right to erasure (right to be forgotten)
  | 'restriction'      // Article 18 - Right to restriction of processing
  | 'portability'      // Article 20 - Right to data portability
  | 'objection'        // Article 21 - Right to object
  | 'automated'        // Article 22 - Rights related to automated decision-making
  | 'withdraw_consent' // Article 7 - Right to withdraw consent
  | 'breach_inquiry'   // Custom type for data breach inquiries
  | 'emergency'        // Emergency/imminent harm situations
  | 'complaint';       // General complaint/inquiry

// DSR request status
export type DsrStatus =
  | 'pending'          // Initial state
  | 'acknowledged'     // Received and acknowledged
  | 'in_review'        // Under review
  | 'gathering_data'   // Collecting response data
  | 'legal_review'     // Under legal review
  | 'awaiting_info'    // Awaiting additional info from data subject
  | 'completed'        // Request fulfilled
  | 'refused'          // Request refused (with justification)
  | 'withdrawn'        // Request withdrawn by data subject
  | 'expired';         // No response within SLA

// Request priority levels
export type DsrPriority = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

// Complexity level affects SLA
export type DsrComplexity = 'simple' | 'complex' | 'highly_complex';

// Interface for DSR request
export interface DataSubjectRequest {
  id: string;
  customer_id: string;
  request_type: DsrRequestType;
  status: DsrStatus;
  priority: DsrPriority;
  complexity: DsrComplexity;
  
  // Data subject info
  data_subject_email: string;
  data_subject_name?: string;
  data_subject_id?: string;
  verification_method?: string;
  identity_verified: boolean;
  
  // Request details
  request_description: string;
  request_channel: 'email' | 'web_form' | 'phone' | 'mail' | 'api';
  received_at: string;
  original_request_text?: string;
  
  // SLA tracking
  sla_deadline: string;
  extension_granted: boolean;
  extension_reason?: string;
  extended_deadline?: string;
  
  // Response tracking
  acknowledged_at?: string;
  started_at?: string;
  completed_at?: string;
  response_method?: 'email' | 'portal' | 'download' | 'mail';
  response_summary?: string;
  
  // GDPR compliance fields
  gdpr_article: string;
  legal_basis_referenced?: string;
  grounds_for_refusal?: string;
  
  // Data scope
  data_categories_requested?: string[];
  date_range_start?: string;
  date_range_end?: string;
  
  // Processing metrics
  hours_spent: number;
  data_volume_mb?: number;
  records_affected?: number;
  
  // Audit trail
  created_by: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Response template for different request types
export interface DsrResponseTemplate {
  id: string;
  request_type: DsrRequestType;
  language: string;
  subject_template: string;
  body_template: string;
  legal_references: string[];
  required_data_fields: string[];
  auto_close_on_send: boolean;
}

// SLA configuration
export interface DsrSlaConfig {
  request_type: DsrRequestType;
  priority: DsrPriority;
  base_days: number;
  max_extension_days: number;
  warning_threshold_days: number; // Days before deadline to trigger warning
  
  // Special rules
  weekends_count: boolean;
  holidays_count: boolean;
  business_hours_only: boolean;
}

// SLA metrics for reporting
export interface DsrSlaMetrics {
  total_requests: number;
  completed_on_time: number;
  completed_late: number;
  in_progress: number;
  overdue: number;
  withdrawn: number;
  refused: number;
  
  // Average times
  avg_response_time_days: number;
  avg_acknowledgment_time_hours: number;
  
  // SLA adherence percentage
  sla_adherence_rate: number;
  
  // Breakdown by type
  by_type: Record<DsrRequestType, {
    count: number;
    avg_days: number;
    on_time_rate: number;
  }>;
  
  // Period
  period_start: string;
  period_end: string;
}

// Default SLA configuration per GDPR requirements
export const DEFAULT_SLA_CONFIG: DsrSlaConfig[] = [
  {
    request_type: 'access',
    priority: 'normal',
    base_days: 30,
    max_extension_days: 60,
    warning_threshold_days: 7,
    weekends_count: false,
    holidays_count: false,
    business_hours_only: true,
  },
  {
    request_type: 'erasure',
    priority: 'high',
    base_days: 30,
    max_extension_days: 60,
    warning_threshold_days: 5,
    weekends_count: false,
    holidays_count: false,
    business_hours_only: true,
  },
  {
    request_type: 'portability',
    priority: 'normal',
    base_days: 30,
    max_extension_days: 60,
    warning_threshold_days: 7,
    weekends_count: false,
    holidays_count: false,
    business_hours_only: true,
  },
  {
    request_type: 'rectification',
    priority: 'normal',
    base_days: 30,
    max_extension_days: 60,
    warning_threshold_days: 7,
    weekends_count: false,
    holidays_count: false,
    business_hours_only: true,
  },
  {
    request_type: 'restriction',
    priority: 'high',
    base_days: 30,
    max_extension_days: 60,
    warning_threshold_days: 5,
    weekends_count: false,
    holidays_count: false,
    business_hours_only: true,
  },
  {
    request_type: 'objection',
    priority: 'high',
    base_days: 30,
    max_extension_days: 60,
    warning_threshold_days: 5,
    weekends_count: false,
    holidays_count: false,
    business_hours_only: true,
  },
  {
    request_type: 'breach_inquiry',
    priority: 'urgent',
    base_days: 2,
    max_extension_days: 7,
    warning_threshold_days: 1,
    weekends_count: true,
    holidays_count: true,
    business_hours_only: false,
  },
  {
    request_type: 'emergency',
    priority: 'emergency',
    base_days: 1,
    max_extension_days: 2,
    warning_threshold_days: 0,
    weekends_count: true,
    holidays_count: true,
    business_hours_only: false,
  },
];

// GDPR Article mapping
const ARTICLE_MAP: Record<DsrRequestType, string> = {
  access: 'Article 15',
  rectification: 'Article 16',
  erasure: 'Article 17',
  restriction: 'Article 18',
  portability: 'Article 20',
  objection: 'Article 21',
  automated: 'Article 22',
  withdraw_consent: 'Article 7',
  breach_inquiry: 'Article 34',
  complaint: 'Article 77',
};

// Request type labels
export const REQUEST_TYPE_LABELS: Record<DsrRequestType, string> = {
  access: 'Right of Access',
  rectification: 'Right to Rectification',
  erasure: 'Right to Erasure (Right to be Forgotten)',
  restriction: 'Right to Restriction of Processing',
  portability: 'Right to Data Portability',
  objection: 'Right to Object',
  automated: 'Rights Related to Automated Decision-Making',
  withdraw_consent: 'Withdrawal of Consent',
  breach_inquiry: 'Data Breach Inquiry',
  complaint: 'Complaint',
};

// Status labels
export const STATUS_LABELS: Record<DsrStatus, string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  in_review: 'Under Review',
  gathering_data: 'Gathering Data',
  legal_review: 'Legal Review',
  awaiting_info: 'Awaiting Information',
  completed: 'Completed',
  refused: 'Refused',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

/**
 * Create a new Data Subject Request
 */
export function createDataSubjectRequest(
  customerId: string,
  requestType: DsrRequestType,
  dataSubjectEmail: string,
  description: string,
  options?: {
    priority?: DsrPriority;
    complexity?: DsrComplexity;
    channel?: 'email' | 'web_form' | 'phone' | 'mail' | 'api';
    dataSubjectName?: string;
    dataSubjectId?: string;
    dataCategories?: string[];
    dateRangeStart?: string;
    dateRangeEnd?: string;
    createdBy?: string;
  }
): DataSubjectRequest {
  const now = new Date().toISOString();
  const slaConfig = DEFAULT_SLA_CONFIG.find(
    c => c.request_type === requestType && c.priority === (options?.priority || 'normal')
  ) || DEFAULT_SLA_CONFIG[0];

  // Calculate SLA deadline
  const deadline = calculateSLADeadline(now, slaConfig);

  return {
    id: `dsr-${randomUUID().replace(/-/g, '').substring(0, 16)}`,
    customer_id: customerId,
    request_type: requestType,
    status: 'pending',
    priority: options?.priority || 'normal',
    complexity: options?.complexity || 'simple',
    data_subject_email: dataSubjectEmail,
    data_subject_name: options?.dataSubjectName,
    data_subject_id: options?.dataSubjectId,
    identity_verified: false,
    request_description: description,
    request_channel: options?.channel || 'web_form',
    received_at: now,
    sla_deadline: deadline,
    extension_granted: false,
    hours_spent: 0,
    data_categories_requested: options?.dataCategories,
    date_range_start: options?.dateRangeStart,
    date_range_end: options?.dateRangeEnd,
    gdpr_article: ARTICLE_MAP[requestType],
    created_by: options?.createdBy || 'system',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Calculate SLA deadline based on configuration
 */
function calculateSLADeadline(startDate: string, config: DsrSlaConfig): string {
  const start = new Date(startDate);
  let days = config.base_days;
  
  // Calculate based on business days
  if (!config.weekends_count) {
    days = addBusinessDays(start, days);
  } else {
    start.setDate(start.getDate() + days);
  }
  
  return start.toISOString();
}

/**
 * Add business days to a date (skip weekends)
 */
function addBusinessDays(date: Date, days: number): number {
  let currentDays = days;
  let workingDays = 0;
  
  while (workingDays < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    currentDays++;
  }
  
  return currentDays;
}

/**
 * Request SLA extension
 */
export function requestSLAExtension(
  request: DataSubjectRequest,
  reason: string,
  additionalDays: number
): { success: boolean; request: DataSubjectRequest; error?: string } {
  // Check if extension is possible
  if (request.status === 'completed' || request.status === 'refused' || request.status === 'withdrawn') {
    return {
      success: false,
      request,
      error: 'Cannot extend SLA for already completed/refused/withdrawn requests',
    };
  }

  const slaConfig = DEFAULT_SLA_CONFIG.find(
    c => c.request_type === request.request_type && c.priority === request.priority
  ) || DEFAULT_SLA_CONFIG[0];

  if (additionalDays > slaConfig.max_extension_days) {
    return {
      success: false,
      request,
      error: `Extension cannot exceed ${slaConfig.max_extension_days} days`,
    };
  }

  // Calculate new deadline
  const currentDeadline = new Date(request.extended_deadline || request.sla_deadline);
  currentDeadline.setDate(currentDeadline.getDate() + additionalDays);

  const updatedRequest: DataSubjectRequest = {
    ...request,
    extension_granted: true,
    extension_reason: reason,
    extended_deadline: currentDeadline.toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { success: true, request: updatedRequest };
}

/**
 * Check if request is overdue
 */
export function isOverdue(request: DataSubjectRequest): boolean {
  const deadline = new Date(request.extended_deadline || request.sla_deadline);
  return new Date() > deadline && !['completed', 'refused', 'withdrawn'].includes(request.status);
}

/**
 * Check if request is approaching deadline (within warning threshold)
 */
export function isApproachingDeadline(request: DataSubjectRequest): boolean {
  if (['completed', 'refused', 'withdrawn'].includes(request.status)) {
    return false;
  }

  const slaConfig = DEFAULT_SLA_CONFIG.find(
    c => c.request_type === request.request_type && c.priority === request.priority
  ) || DEFAULT_SLA_CONFIG[0];

  const deadline = new Date(request.extended_deadline || request.sla_deadline);
  const warningThreshold = deadline.getTime() - (slaConfig.warning_threshold_days * 24 * 60 * 60 * 1000);
  
  return new Date().getTime() >= warningThreshold && new Date() < deadline;
}

/**
 * Get days remaining until deadline
 */
export function getDaysUntilDeadline(request: DataSubjectRequest): number {
  const deadline = new Date(request.extended_deadline || request.sla_deadline);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Calculate SLA adherence metrics
 */
export function calculateSlaMetrics(
  requests: DataSubjectRequest[],
  periodStart: string,
  periodEnd: string
): DsrSlaMetrics {
  const periodRequests = requests.filter(
    r => r.created_at >= periodStart && r.created_at <= periodEnd
  );

  const completed = periodRequests.filter(r => r.status === 'completed');
  const completedOnTime = completed.filter(r => {
    if (!r.completed_at) return false;
    const deadline = new Date(r.extended_deadline || r.sla_deadline);
    return new Date(r.completed_at) <= deadline;
  });

  const byType: Record<DsrRequestType, { count: number; avg_days: number; on_time_rate: number }> =
    {} as Record<DsrRequestType, { count: number; avg_days: number; on_time_rate: number }>;

  // Initialize all types
  const types: DsrRequestType[] = ['access', 'erasure', 'portability', 'rectification', 'restriction', 'objection', 'breach_inquiry'];
  types.forEach(type => {
    const typeRequests = periodRequests.filter(r => r.request_type === type);
    const typeCompleted = typeRequests.filter(r => r.status === 'completed');
    const typeOnTime = typeCompleted.filter(r => {
      if (!r.completed_at) return false;
      const deadline = new Date(r.extended_deadline || r.sla_deadline);
      return new Date(r.completed_at) <= deadline;
    });

    const avgDays = typeCompleted.length > 0
      ? typeCompleted.reduce((sum, r) => {
          const received = new Date(r.received_at).getTime();
          const completed = new Date(r.completed_at!).getTime();
          return sum + ((completed - received) / (24 * 60 * 60 * 1000));
        }, 0) / typeCompleted.length
      : 0;

    byType[type] = {
      count: typeRequests.length,
      avg_days: Math.round(avgDays * 10) / 10,
      on_time_rate: typeCompleted.length > 0 ? (typeOnTime.length / typeCompleted.length) * 100 : 0,
    };
  });

  return {
    total_requests: periodRequests.length,
    completed_on_time: completedOnTime.length,
    completed_late: completed.length - completedOnTime.length,
    in_progress: periodRequests.filter(r => ['pending', 'acknowledged', 'in_review', 'gathering_data'].includes(r.status)).length,
    overdue: periodRequests.filter(isOverdue).length,
    withdrawn: periodRequests.filter(r => r.status === 'withdrawn').length,
    refused: periodRequests.filter(r => r.status === 'refused').length,
    avg_response_time_days: completed.length > 0
      ? completed.reduce((sum, r) => {
          const received = new Date(r.received_at).getTime();
          const done = new Date(r.completed_at!).getTime();
          return sum + ((done - received) / (24 * 60 * 60 * 1000));
        }, 0) / completed.length
      : 0,
    avg_acknowledgment_time_hours: periodRequests.filter(r => r.acknowledged_at).length > 0
      ? periodRequests.filter(r => r.acknowledged_at).reduce((sum, r) => {
          const received = new Date(r.received_at).getTime();
          const ack = new Date(r.acknowledged_at!).getTime();
          return sum + ((ack - received) / (60 * 60 * 1000));
        }, 0) / periodRequests.filter(r => r.acknowledged_at).length
      : 0,
    sla_adherence_rate: completed.length > 0 ? (completedOnTime.length / completed.length) * 100 : 0,
    by_type: byType,
    period_start: periodStart,
    period_end: periodEnd,
  };
}

/**
 * Generate acknowledgment email for data subject
 */
export function generateAcknowledgmentEmail(request: DataSubjectRequest): {
  subject: string;
  body: string;
} {
  const requestLabel = REQUEST_TYPE_LABELS[request.request_type];
  const deadline = new Date(request.extended_deadline || request.sla_deadline);
  const responseDate = deadline.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Acknowledgment: Your ${requestLabel} Request - Reference: ${request.id}`;

  const body = `Dear ${request.data_subject_name || 'Data Subject'},

Thank you for your ${requestLabel.toLowerCase()} request received on ${new Date(request.received_at).toLocaleDateString()}.

We hereby acknowledge receipt of your request concerning the processing of your personal data under ${request.gdpr_article} of the General Data Protection Regulation (GDPR).

Request Details:
- Reference Number: ${request.id}
- Request Type: ${requestLabel}
- Status: ${STATUS_LABELS[request.status]}

Response Timeline:
We will respond to your request within the statutory timeframe. Your response deadline is: ${responseDate}

${request.extension_granted ? `Note: Due to the complexity of your request, we have extended the response period as permitted under Article 12(3) GDPR. The extended deadline is: ${new Date(request.extended_deadline!).toLocaleDateString()}` : ''}

What Happens Next:
We are currently reviewing your request. If we require any additional information to verify your identity or to process your request effectively, we will contact you.

Your Rights:
Please note that:
- We may need to verify your identity before processing your request
- If your request is manifestly unfounded or excessive, we may charge a reasonable fee or refuse to act on the request
- You have the right to lodge a complaint with a supervisory authority

If you have any questions about this request or need to provide additional information, please reply to this email or contact us at dpo@remyanalytics.com.

Best regards,
Data Protection Officer
REMY Analytics

---
This email was sent in connection with your data subject rights request.
Document ID: ${request.id}
Date: ${new Date().toISOString()}`;

  return { subject, body };
}

/**
 * Validate DSR request data
 */
export function validateDSRRequest(data: unknown): {
  valid: boolean;
  error?: string;
  data?: Partial<DataSubjectRequest>;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request data' };
  }

  const d = data as Record<string, unknown>;

  // Required fields
  if (!d.data_subject_email || typeof d.data_subject_email !== 'string') {
    return { valid: false, error: 'Data subject email is required' };
  }

  if (!d.request_type || !Object.keys(REQUEST_TYPE_LABELS).includes(d.request_type as string)) {
    return { valid: false, error: 'Valid request type is required' };
  }

  if (!d.request_description || typeof d.request_description !== 'string' || (d.request_description as string).length < 10) {
    return { valid: false, error: 'Request description is required (minimum 10 characters)' };
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(d.data_subject_email as string)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  return { valid: true, data: d as Partial<DataSubjectRequest> };
}

/**
 * Export requests to CSV format for regulatory reporting
 */
export function exportRequestsToCSV(requests: DataSubjectRequest[]): string {
  const headers = [
    'ID',
    'Request Type',
    'Status',
    'Priority',
    'Data Subject Email',
    'Received At',
    'SLA Deadline',
    'Completed At',
    'Days To Complete',
    'On Time',
    'Complexity',
    'Extension Granted',
  ].join(',');

  const rows = requests.map(r => {
    const deadline = new Date(r.extended_deadline || r.sla_deadline);
    const received = new Date(r.received_at);
    const completed = r.completed_at ? new Date(r.completed_at) : null;
    
    const daysToComplete = completed
      ? Math.round((completed.getTime() - received.getTime()) / (24 * 60 * 60 * 1000) * 10) / 10
      : null;
    
    const onTime = completed ? completed <= deadline : null;

    const values = [
      r.id,
      REQUEST_TYPE_LABELS[r.request_type],
      STATUS_LABELS[r.status],
      r.priority,
      r.data_subject_email,
      r.received_at,
      r.extended_deadline || r.sla_deadline,
      r.completed_at || '',
      daysToComplete ?? '',
      onTime === null ? '' : onTime ? 'Yes' : 'No',
      r.complexity,
      r.extension_granted ? 'Yes' : 'No',
    ];

    // Escape CSV values
    return values.map(v => {
      const str = String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}
