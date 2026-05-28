/**
 * Consent Types - GDPR Article 7 Compliance
 * Ticket: REMY-258
 */

// Consent types
export type ConsentType = 'analytics' | 'marketing' | 'functional';

export const CONSENT_TYPES: ConsentType[] = ['analytics', 'marketing', 'functional'];

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