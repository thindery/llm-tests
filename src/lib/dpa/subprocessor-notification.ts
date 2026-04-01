/**
 * Subprocessor Notification and Approval System
 * GDPR Article 28 - Controller authorization for subprocessors
 * 
 * Ticket: REMY-257
 * 
 * Key Requirements:
 * - Article 28(2): Processor shall not engage another processor without prior SPECIFIC or GENERAL WRITTEN authorization
 * - Controller must have the right to object to changes
 * - 30-day notice period for new subprocessors (industry standard, exceeding minimum requirements)
 * - Maintain records of all subprocessor authorizations
 * - Document controller's acceptance/rejection of subprocessor changes
 */

import { randomUUID } from 'crypto';

// Notification types
export type SubprocessorNotificationType = 
  | 'new_subprocessor'      // New subprocessor being added
  | 'subprocessor_update'   // Material update to existing subprocessor
  | 'subprocessor_removal'  // Subprocessor being removed
  | 'region_change'         // Data storage region change
  | 'service_change';       // Service scope change

// Notification status
export type NotificationStatus = 
  | 'pending'       // Notification sent, awaiting response
  | 'acknowledged'  // Customer acknowledged receipt
  | 'accepted'      // Customer accepted the change
  | 'objected'      // Customer objected to the change
  | 'expired'       // No response within notice period
  | 'withdrawn';    // Change withdrawn by processor

// Interface for subprocessor change notification
export interface SubprocessorChangeNotification {
  id: string;
  customer_id: string;
  notification_type: SubprocessorNotificationType;
  status: NotificationStatus;
  
  // Subprocessor details
  subprocessor_id: string;
  subprocessor_name: string;
  subprocessor_legal_name?: string;
  
  // Change details
  previous_value?: string;
  new_value?: string;
  change_summary: string;
  change_details?: Record<string, unknown>;
  
  // Impact assessment
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  data_categories_affected?: string[];
  gdpr_impact_description?: string;
  
  // Notice period
  notice_period_days: number;
  notification_sent_at: string;
  effective_date: string;  // When change takes effect
  response_deadline: string; // Customer must respond by this date
  
  // Controller response
  controller_response?: 'accept' | 'reject' | 'request_info';
  controller_response_at?: string;
  controller_response_notes?: string;
  
  // Resolution
  resolution?: 'approved' | 'blocked' | 'alternative_proposed' | 'service_terminated';
  resolution_date?: string;
  resolution_notes?: string;
  alternative_subprocessor_id?: string;
  
  // Audit trail
  sent_by: string;
  created_at: string;
  updated_at: string;
  
  // Reminders
  reminders_sent: number;
  last_reminder_at?: string;
}

// Controller authorization record
export interface ControllerAuthorization {
  id: string;
  customer_id: string;
  authorization_type: 'general' | 'specific';
  
  // General authorization
  general_authorization_granted: boolean;
  general_authorization_date?: string;
  general_authorization_version?: string;
  
  // Specific subprocessors authorized
  authorized_subprocessors: AuthorizedSubprocessor[];
  
  // Authorization terms
  auto_approve_minor_changes: boolean;
  minor_change_threshold: 'low' | 'medium';
  require_explicit_approval_for_high_impact: boolean;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface AuthorizedSubprocessor {
  subprocessor_id: string;
  name: string;
  authorized_at: string;
  authorized_by?: string;
  authorization_method: 'dpa_implicit' | 'explicit_notification' | 'written_agreement';
  status: 'active' | 'suspended' | 'revoked';
}

// Subprocessor registry entry
export interface SubprocessorRegistryEntry {
  id: string;
  name: string;
  legal_name?: string;
  website_url?: string;
  privacy_policy_url?: string;
  
  // Services
  services_provided: string[];
  processing_activities: string[];
  data_categories_processed?: string[];
  
  // Locations
  headquarters_location: string;
  data_storage_locations: string[];
  jurisdiction: string;
  
  // Security
  security_certifications: string[];
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  soc_2_type_ii?: boolean;
  iso_27001?: boolean;
  
  // GDPR compliance
  gdpr_compliant: boolean;
  data_processing_agreement_signed: boolean;
  standard_contractual_clauses: boolean;
  scc_version?: string;
  scc_signed_date?: string;
  
  // Contract details
  contract_status: 'draft' | 'signed' | 'under_review' | 'expiring' | 'terminated';
  contract_signed_date?: string;
  contract_expiry_date?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
}

// Notification preferences
export interface NotificationPreferences {
  customer_id: string;
  email_notifications: boolean;
  email_address?: string;
  
  // Notice periods
  preferred_notice_period_days: number;
  minimum_notice_period_days: number;
  
  // Auto-approval settings
  auto_approve_low_impact: boolean;
  auto_approve_medium_impact: boolean;
  require_approval_for_high_impact: boolean;
  require_approval_for_critical: boolean;
  
  // Communication preferences
  notification_methods: ('email' | 'api_webhook' | 'portal')[];
  webhook_url?: string;
  
  // Escalation
  escalation_contact_email?: string;
  escalation_contact_name?: string;
}

// Default configuration
export const DEFAULT_NOTIFICATION_CONFIG = {
  standard_notice_period_days: 30,
  short_notice_period_days: 14,
  emergency_notice_period_days: 7,
  
  reminder_schedule: [7, 3, 1], // Days before deadline to send reminders
  
  impact_descriptions: {
    low: 'Minor service change with no impact on data processing or security',
    medium: 'Service update that may affect processing workflows',
    high: 'Substantial change affecting data storage or processing activities',
    critical: 'Major change affecting data location, security controls, or data transfers',
  },
};

/**
 * Create a new subprocessor change notification
 */
export function createSubprocessorNotification(
  customerId: string,
  notificationType: SubprocessorNotificationType,
  subprocessor: SubprocessorRegistryEntry,
  changeSummary: string,
  options?: {
    impactLevel?: 'low' | 'medium' | 'high' | 'critical';
    noticePeriodDays?: number;
    previousValue?: string;
    newValue?: string;
    changeDetails?: Record<string, unknown>;
    dataCategoriesAffected?: string[];
    sentBy?: string;
  }
): SubprocessorChangeNotification {
  const now = new Date();
  
  // Determine notice period based on impact
  let noticeDays = options?.noticePeriodDays || DEFAULT_NOTIFICATION_CONFIG.standard_notice_period_days;
  if (options?.impactLevel === 'critical') {
    noticeDays = Math.max(noticeDays, 45);
  } else if (options?.impactLevel === 'high') {
    noticeDays = Math.max(noticeDays, 30);
  }
  
  // Calculate dates
  const effectiveDate = new Date(now);
  effectiveDate.setDate(effectiveDate.getDate() + noticeDays);
  
  const responseDeadline = new Date(effectiveDate);
  responseDeadline.setDate(responseDeadline.getDate() - 3); // 3 days buffer

  return {
    id: `scn-${randomUUID().replace(/-/g, '').substring(0, 16)}`,
    customer_id: customerId,
    notification_type: notificationType,
    status: 'pending',
    subprocessor_id: subprocessor.id,
    subprocessor_name: subprocessor.name,
    subprocessor_legal_name: subprocessor.legal_name,
    change_summary: changeSummary,
    previous_value: options?.previousValue,
    new_value: options?.newValue,
    change_details: options?.changeDetails,
    impact_level: options?.impactLevel || 'medium',
    data_categories_affected: options?.dataCategoriesAffected || subprocessor.data_categories_processed,
    notice_period_days: noticeDays,
    notification_sent_at: now.toISOString(),
    effective_date: effectiveDate.toISOString(),
    response_deadline: responseDeadline.toISOString(),
    reminders_sent: 0,
    sent_by: options?.sentBy || 'system',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Record controller's response to a subprocessor change
 */
export function recordControllerResponse(
  notification: SubprocessorChangeNotification,
  response: 'accept' | 'reject' | 'request_info',
  options?: {
    notes?: string;
    respondedBy?: string;
  }
): SubprocessorChangeNotification {
  const now = new Date().toISOString();
  
  let newStatus: NotificationStatus;
  switch (response) {
    case 'accept':
      newStatus = 'accepted';
      break;
    case 'reject':
      newStatus = 'objected';
      break;
    case 'request_info':
      newStatus = 'acknowledged';
      break;
    default:
      newStatus = notification.status;
  }

  return {
    ...notification,
    status: newStatus,
    controller_response: response,
    controller_response_at: now,
    controller_response_notes: options?.notes,
    updated_at: now,
  };
}

/**
 * Resolve an objection with alternative solutions
 */
export function resolveObjection(
  notification: SubprocessorChangeNotification,
  resolution: 'approved' | 'blocked' | 'alternative_proposed' | 'service_terminated',
  options?: {
    notes?: string;
    alternativeSubprocessorId?: string;
    alternativeSubprocessorName?: string;
  }
): SubprocessorChangeNotification {
  return {
    ...notification,
    resolution,
    resolution_date: new Date().toISOString(),
    resolution_notes: options?.notes,
    alternative_subprocessor_id: options?.alternativeSubprocessorId,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check if notification is overdue for response
 */
export function isNotificationOverdue(notification: SubprocessorChangeNotification): boolean {
  if (['accepted', 'objected', 'withdrawn'].includes(notification.status)) {
    return false;
  }
  return new Date() > new Date(notification.response_deadline);
}

/**
 * Check if a reminder should be sent
 */
export function shouldSendReminder(notification: SubprocessorChangeNotification): boolean {
  if (notification.status !== 'pending') {
    return false;
  }

  const deadline = new Date(notification.response_deadline);
  const now = new Date();
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  // Check against reminder schedule
  const schedule = DEFAULT_NOTIFICATION_CONFIG.reminder_schedule;
  return schedule.includes(daysUntil) && notification.reminders_sent < schedule.length;
}

/**
 * Generate notification email content
 */
export function generateNotificationEmail(
  notification: SubprocessorChangeNotification,
  customerName: string
): { subject: string; body: string } {
  const typeLabels: Record<SubprocessorNotificationType, string> = {
    new_subprocessor: 'New Subprocessor Authorization Required',
    subprocessor_update: 'Subprocessor Service Update',
    subprocessor_removal: 'Subprocessor Service Removal',
    region_change: 'Data Storage Location Change',
    service_change: 'Service Processing Change',
  };

  const subject = `[ACTION REQUIRED] ${typeLabels[notification.notification_type]} - ${notification.subprocessor_name}`;

  const impactDescription = DEFAULT_NOTIFICATION_CONFIG.impact_descriptions[notification.impact_level];

  let body = `Dear ${customerName} Team,

This is a notification under Article 28(2) of the General Data Protection Regulation (GDPR) regarding changes to our subprocessor arrangements.

NOTIFICATION DETAILS
====================
Notification ID: ${notification.id}
Change Type: ${typeLabels[notification.notification_type]}
Subprocessor: ${notification.subprocessor_name}
${notification.subprocessor_legal_name ? `Legal Entity: ${notification.subprocessor_legal_name}` : ''}

CHANGE SUMMARY
==============
${notification.change_summary}

${notification.previous_value ? `Previous: ${notification.previous_value}` : ''}
${notification.new_value ? `New: ${notification.new_value}` : ''}

IMPACT ASSESSMENT
================
Impact Level: ${notification.impact_level.toUpperCase()}
${impactDescription}

${notification.data_categories_affected ? `Data Categories Affected: ${notification.data_categories_affected.join(', ')}` : ''}

YOUR RIGHTS UNDER ARTICLE 28
============================
Under GDPR Article 28(2), you have the right to:
1. Review this proposed change
2. Request additional information about the subprocessor
3. OBJECT to this change if you have legitimate concerns
4. Request termination of services if we cannot agree on an alternative solution

RESPONSE REQUIRED BY: ${new Date(notification.response_deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

PROPOSED EFFECTIVE DATE: ${new Date(notification.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

TO RESPOND:
==========
1. ACCEPT: No action required - your continued use constitutes acceptance
2. OBJECT: Reply to this email with your objection and reasoning
3. REQUEST INFO: Schedule a call with our Data Protection Officer

If we do not hear from you by the response deadline, we will consider this notification acknowledged and proceed with the change.

For detailed information about our subprocessors and their security certifications, visit:
https://remyanalytics.com/legal/subprocessors

Questions? Contact our Data Protection Officer:
Email: dpo@remyanalytics.com
Reference: ${notification.id}

Best regards,
Data Protection Team
REMY Analytics

---
This notification is sent in compliance with GDPR Article 28(2) requirements.
Notification ID: ${notification.id}
Sent: ${new Date(notification.notification_sent_at).toISOString()}`;

  return { subject, body };
}

/**
 * Check if a customer has authorized a specific subprocessor
 */
export function isSubprocessorAuthorized(
  authorization: ControllerAuthorization | null,
  subprocessorId: string
): boolean {
  if (!authorization) {
    return false;
  }

  // Check general authorization
  if (authorization.general_authorization_granted) {
    return true;
  }

  // Check specific authorization
  return authorization.authorized_subprocessors.some(
    s => s.subprocessor_id === subprocessorId && s.status === 'active'
  );
}

/**
 * Add authorization for a new subprocessor
 */
export function authorizeSubprocessor(
  authorization: ControllerAuthorization,
  subprocessor: SubprocessorRegistryEntry,
  method: 'dpa_implicit' | 'explicit_notification' | 'written_agreement',
  authorizedBy?: string
): ControllerAuthorization {
  const now = new Date().toISOString();
  
  // Check if already authorized
  const existingIndex = authorization.authorized_subprocessors.findIndex(
    s => s.subprocessor_id === subprocessor.id
  );

  const authorizedEntry: AuthorizedSubprocessor = {
    subprocessor_id: subprocessor.id,
    name: subprocessor.name,
    authorized_at: now,
    authorized_by: authorizedBy,
    authorization_method: method,
    status: 'active',
  };

  let updatedSubprocessors: AuthorizedSubprocessor[];
  if (existingIndex >= 0) {
    updatedSubprocessors = [...authorization.authorized_subprocessors];
    updatedSubprocessors[existingIndex] = authorizedEntry;
  } else {
    updatedSubprocessors = [...authorization.authorized_subprocessors, authorizedEntry];
  }

  return {
    ...authorization,
    authorized_subprocessors: updatedSubprocessors,
    updated_at: now,
  };
}

/**
 * Revoke authorization for a subprocessor
 */
export function revokeSubprocessorAuthorization(
  authorization: ControllerAuthorization,
  subprocessorId: string,
  reason?: string
): ControllerAuthorization {
  const now = new Date().toISOString();

  const updatedSubprocessors = authorization.authorized_subprocessors.map(s => {
    if (s.subprocessor_id === subprocessorId) {
      return {
        ...s,
        status: 'revoked' as const,
      };
    }
    return s;
  });

  return {
    ...authorization,
    authorized_subprocessors: updatedSubprocessors,
    updated_at: now,
  };
}

/**
 * Get pending notifications count for dashboard
 */
export function countPendingNotifications(
  notifications: SubprocessorChangeNotification[],
  customerId?: string
): {
  total: number;
  requiringAction: number;
  overdue: number;
  byImpact: Record<string, number>;
} {
  const filtered = customerId 
    ? notifications.filter(n => n.customer_id === customerId)
    : notifications;

  const pending = filtered.filter(n => n.status === 'pending');
  const overdue = pending.filter(isNotificationOverdue);

  const byImpact: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  pending.forEach(n => {
    byImpact[n.impact_level]++;
  });

  return {
    total: pending.length,
    requiringAction: pending.filter(n => n.impact_level === 'high' || n.impact_level === 'critical').length,
    overdue: overdue.length,
    byImpact,
  };
}

/**
 * Generate subprocessor authorization report
 */
export function generateAuthorizationReport(
  authorization: ControllerAuthorization,
  allSubprocessors: SubprocessorRegistryEntry[]
): {
  customer_id: string;
  authorization_type: string;
  total_authorized: number;
  active_authorizations: number;
  revoked_authorizations: number;
  authorized_names: string[];
  not_covered_subprocessors: string[];
  generated_at: string;
} {
  const authorizedIds = new Set(
    authorization.authorized_subprocessors
      .filter(s => s.status === 'active')
      .map(s => s.subprocessor_id)
  );

  const notCovered = allSubprocessors
    .filter(s => !authorizedIds.has(s.id))
    .map(s => s.name);

  return {
    customer_id: authorization.customer_id,
    authorization_type: authorization.authorization_type,
    total_authorized: authorization.authorized_subprocessors.length,
    active_authorizations: Array.from(authorizedIds).length,
    revoked_authorizations: authorization.authorized_subprocessors.filter(s => s.status === 'revoked').length,
    authorized_names: authorization.authorized_subprocessors
      .filter(s => s.status === 'active')
      .map(s => s.name),
    not_covered_subprocessors: notCovered,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Validate notification data
 */
export function validateNotificationData(data: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid notification data' };
  }

  const d = data as Record<string, unknown>;

  if (!d.customer_id || typeof d.customer_id !== 'string') {
    return { valid: false, error: 'Customer ID is required' };
  }

  if (!d.subprocessor_id || typeof d.subprocessor_id !== 'string') {
    return { valid: false, error: 'Subprocessor ID is required' };
  }

  if (!d.change_summary || typeof d.change_summary !== 'string' || d.change_summary.length < 10) {
    return { valid: false, error: 'Change summary is required (minimum 10 characters)' };
  }

  const validTypes: SubprocessorNotificationType[] = ['new_subprocessor', 'subprocessor_update', 'subprocessor_removal', 'region_change', 'service_change'];
  if (!d.notification_type || !validTypes.includes(d.notification_type as SubprocessorNotificationType)) {
    return { valid: false, error: 'Valid notification type is required' };
  }

  return { valid: true };
}
