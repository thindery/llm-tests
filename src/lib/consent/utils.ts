/**
 * Consent Utilities - GDPR Article 7 Consent Tracking Helpers
 * Ticket: REMY-258
 */

import { createHash } from 'crypto';

// Consent types
export type ConsentType = 'analytics' | 'marketing' | 'functional';

// Consent record
export interface ConsentRecord {
  id: string;
  project_id: string;
  user_id: string;
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_timestamp: string;
  consent_version: string;
  ip_address_hash: string | null;
  user_agent_hash: string | null;
  withdrawal_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

// Consent status for a specific type
export interface ConsentStatus {
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_timestamp: string;
  consent_version: string;
  is_withdrawn: boolean;
}

// Full user consent status
export interface UserConsentStatus {
  user_id: string;
  project_id: string;
  consents: ConsentStatus[];
}

// Consent banner settings
export interface ConsentBannerSettings {
  id: string;
  project_id: string;
  banner_title: string;
  banner_text: string;
  accept_button_text: string;
  reject_button_text: string;
  customize_button_text: string;
  background_color: string;
  text_color: string;
  button_primary_color: string;
  button_secondary_color: string;
  position: 'bottom' | 'top' | 'center';
  show_banner: boolean;
  consent_expiration_days: number;
  created_at: string;
  updated_at: string;
}

// Consent statistics
export interface ConsentStatistics {
  total_consents: number;
  granted_by_type: Record<ConsentType, number>;
  withdrawn_by_type: Record<ConsentType, number>;
  unique_users: number;
  last_30_days: {
    granted: number;
    withdrawn: number;
  };
}

// Data export for GDPR portability
export interface ConsentDataExport {
  user_id: string;
  project_id: string;
  export_timestamp: string;
  consent_records: Array<{
    id: string;
    consent_type: ConsentType;
    consent_granted: boolean;
    consent_timestamp: string;
    consent_version: string;
    withdrawal_timestamp: string | null;
    ip_address_hash: string | null;
    user_agent_hash: string | null;
  }>;
}

// Request types
export interface RecordConsentRequest {
  user_id: string;
  project_id: string;
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_version?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface WithdrawConsentRequest {
  user_id: string;
  project_id: string;
  consent_type: ConsentType;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Hash a value using SHA-256
 */
export function sha256Hash(value: string, salt?: string): string {
  const data = salt ? `${value}:${salt}` : value;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Hash IP address for storage
 */
export function hashIpAddress(ipAddress: string): string {
  return sha256Hash(
    ipAddress,
    process.env.CONSENT_IP_SALT || 'consent-ip-salt-2026'
  );
}

/**
 * Hash user agent for device fingerprinting
 */
export function hashUserAgent(userAgent: string): string {
  return sha256Hash(
    userAgent,
    process.env.CONSENT_UA_SALT || 'consent-ua-salt-2026'
  );
}

/**
 * Generate a unique user ID for anonymous users
 */
export function generateAnonymousUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `anon_${timestamp}_${random}`;
}

/**
 * Validate consent record request
 */
export function validateConsentRequest(
  data: unknown
): { valid: true; data: RecordConsentRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  // Validate required fields
  if (!req.user_id || typeof req.user_id !== 'string' || req.user_id.trim().length === 0) {
    return { valid: false, error: 'user_id is required' };
  }

  if (!req.project_id || typeof req.project_id !== 'string') {
    return { valid: false, error: 'project_id is required' };
  }

  if (!req.consent_type || !['analytics', 'marketing', 'functional'].includes(req.consent_type as string)) {
    return { valid: false, error: 'consent_type must be analytics, marketing, or functional' };
  }

  if (typeof req.consent_granted !== 'boolean') {
    return { valid: false, error: 'consent_granted must be a boolean' };
  }

  return {
    valid: true,
    data: {
      user_id: req.user_id.trim(),
      project_id: req.project_id,
      consent_type: req.consent_type as ConsentType,
      consent_granted: req.consent_granted,
      consent_version: typeof req.consent_version === 'string' ? req.consent_version : '1.0',
      ip_address: typeof req.ip_address === 'string' ? req.ip_address : undefined,
      user_agent: typeof req.user_agent === 'string' ? req.user_agent : undefined,
    },
  };
}

/**
 * Validate withdraw consent request
 */
export function validateWithdrawRequest(
  data: unknown
): { valid: true; data: WithdrawConsentRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  if (!req.user_id || typeof req.user_id !== 'string' || req.user_id.trim().length === 0) {
    return { valid: false, error: 'user_id is required' };
  }

  if (!req.project_id || typeof req.project_id !== 'string') {
    return { valid: false, error: 'project_id is required' };
  }

  if (!req.consent_type || !['analytics', 'marketing', 'functional'].includes(req.consent_type as string)) {
    return { valid: false, error: 'consent_type must be analytics, marketing, or functional' };
  }

  return {
    valid: true,
    data: {
      user_id: req.user_id.trim(),
      project_id: req.project_id,
      consent_type: req.consent_type as ConsentType,
    },
  };
}

/**
 * Check if consent is valid (not withdrawn)
 */
export function isConsentValid(record: ConsentRecord | ConsentStatus): boolean {
  if ('is_withdrawn' in record) {
    return record.consent_granted && !record.is_withdrawn;
  }
  return record.consent_granted && !record.withdrawal_timestamp;
}

/**
 * Get consent expiration date
 */
export function getConsentExpirationDate(
  consentTimestamp: string,
  expirationDays: number = 365
): Date {
  const date = new Date(consentTimestamp);
  date.setDate(date.getDate() + expirationDays);
  return date;
}

/**
 * Check if consent has expired
 */
export function isConsentExpired(
  consentTimestamp: string,
  expirationDays: number = 365
): boolean {
  const expirationDate = getConsentExpirationDate(consentTimestamp, expirationDays);
  return new Date() > expirationDate;
}

/**
 * Default banner settings
 */
export function getDefaultBannerSettings(project_id: string): ConsentBannerSettings {
  return {
    id: '',
    project_id,
    banner_title: 'Cookie Consent',
    banner_text: 'We use cookies to improve your experience and analyze site usage.',
    accept_button_text: 'Accept All',
    reject_button_text: 'Reject',
    customize_button_text: 'Customize',
    background_color: '#ffffff',
    text_color: '#1f2937',
    button_primary_color: '#3b82f6',
    button_secondary_color: '#6b7280',
    position: 'bottom',
    show_banner: true,
    consent_expiration_days: 365,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convert consent records to CSV format
 */
export function exportConsentToCSV(records: ConsentRecord[]): string {
  const headers = [
    'id',
    'user_id',
    'consent_type',
    'consent_granted',
    'consent_timestamp',
    'consent_version',
    'withdrawal_timestamp',
  ].join(',');

  const rows = records.map(record => [
    record.id,
    record.user_id,
    record.consent_type,
    record.consent_granted,
    record.consent_timestamp,
    record.consent_version,
    record.withdrawal_timestamp || '',
  ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

  return [headers, ...rows].join('\n');
}

/**
 * Filter events based on consent status
 * Returns true if event can be processed
 */
export function canProcessEvent(
  consentType: ConsentType,
  consentStatus: ConsentStatus | null
): boolean {
  if (!consentStatus) return false;
  if (consentType !== consentStatus.consent_type) return false;
  return isConsentValid(consentStatus);
}

/**
 * Event categories and their required consent types
 */
export const EVENT_CONSENT_REQUIREMENTS: Record<string, ConsentType> = {
  'page_view': 'analytics',
  'click': 'analytics',
  'scroll': 'analytics',
  'form_submit': 'functional',
  'custom_event': 'analytics',
  'track_conversion': 'marketing',
  'personalization': 'marketing',
};

/**
 * Get consent type required for an event
 */
export function getConsentTypeForEvent(eventType: string): ConsentType | null {
  return EVENT_CONSENT_REQUIREMENTS[eventType] || null;
}