/**
 * Subprocessor Utilities - GDPR Subprocessor Disclosure helpers
 * Ticket: REMY-259
 */

import { createHash } from 'crypto';

// Subprocessor types
export type SubprocessorStatus = 'active' | 'pending_review' | 'terminating' | 'terminated';
export type DataSensitivityLevel = 'standard' | 'high' | 'restricted';

export interface Subprocessor {
  id: string;
  name: string;
  legal_name: string | null;
  service_provided: string;
  service_category: string;
  location: string;
  data_center_locations: string[] | null;
  data_types: string[];
  data_sensitivity: DataSensitivityLevel;
  security_certifications: string[] | null;
  contract_status: SubprocessorStatus;
  dpa_signed: boolean;
  dpa_signed_at: string | null;
  dpa_document_url: string | null;
  scc_signed: boolean;
  scc_type: string | null;
  scc_signed_at: string | null;
  transfer_mechanism: string | null;
  vendor_privacy_url: string | null;
  vendor_security_url: string | null;
  vendor_dpa_url: string | null;
  risk_assessment: string | null;
  annual_review_date: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

/**
 * Hash an IP address for storage in audit trail
 */
export function hashIpAddress(ipAddress: string): string {
  return createHash('sha256')
    .update(ipAddress + (process.env.IP_HASH_SALT || 'remy-subprocessor-salt-2026'))
    .digest('hex');
}

/**
 * Format category for display
 */
export function formatCategory(category: string): string {
  const categories: Record<string, string> = {
    hosting: 'Infrastructure & Hosting',
    storage: 'Data Storage',
    database: 'Database Services',
    cdn: 'Content Delivery & Security',
    monitoring: 'Monitoring & Logging',
    analytics: 'Analytics',
  };
  return categories[category.toLowerCase()] || category;
}

/**
 * Generate a notification for a subprocessor change
 */
export async function createSubprocessorNotification(
  supabase: any,
  {
    subprocessorId,
    changeHistoryId,
    type,
    title,
    content,
    severity = 'info',
    effectiveDate,
    requiresAcknowledgment = false,
  }: {
    subprocessorId?: string;
    changeHistoryId?: string;
    type: 'new_subprocessor' | 'data_region_change' | 'service_change' | 'termination';
    title: string;
    content: string;
    severity?: 'critical' | 'warning' | 'info';
    effectiveDate?: string;
    requiresAcknowledgment?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('subprocessor_notifications')
    .insert({
      subprocessor_id: subprocessorId,
      change_history_id: changeHistoryId,
      notification_type: type,
      title,
      content,
      severity,
      published_at: new Date().toISOString(),
      effective_date: effectiveDate,
      requires_acknowledgment: requiresAcknowledgment,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
