/**
 * Subprocessor Types and Utilities
 * 
 * Ticket: REMY-259
 */

// Subprocessor status types
export type SubprocessorStatus = 'active' | 'pending_review' | 'deprecated' | 'terminated';
export type ContractStatus = 'pending' | 'draft' | 'signed' | 'under_review' | 'expired' | 'terminated';

// Security certification types
export type SecurityCertification =
  | 'SOC_1_Type_II'
  | 'SOC_2_Type_II'
  | 'ISO_27001'
  | 'ISO_27018'
  | 'ISO_27701'
  | 'PCIDSS_Level_1'
  | 'HIPAA'
  | 'FedRAMP'
  | 'GDPR_Compliant';

// Processing activity types
export type ProcessingActivity =
  | 'data_storage'
  | 'hosting'
  | 'authentication'
  | 'database_hosting'
  | 'cdn'
  | 'serverless_computing'
  | 'email_delivery'
  | 'transactional_email'
  | 'email_analytics'
  | 'payment_processing'
  | 'subscription_management'
  | 'billing'
  | 'analytics'
  | 'logging'
  | 'monitoring'
  | 'error_tracking'
  | 'customer_support'
  | 'ai_ml_processing'
  | 'data_processing'
  | 'identity_verification'
  | 'communication';

// Data category types
export type DataCategory =
  | 'user_data'
  | 'authentication_data'
  | 'session_data'
  | 'ip_addresses'
  | 'usage_data'
  | 'payment_data'
  | 'billing_address'
  | 'transaction_history'
  | 'email_address'
  | 'communication_data'
  | 'profile_data'
  | 'preference_data'
  | 'device_data'
  | 'location_data'
  | 'cookies';

// Jurisdiction types (ISO country codes)
export type Jurisdiction =
  | 'US'
  | 'GB'
  | 'EU'
  | 'DE'
  | 'FR'
  | 'IE'
  | 'NL'
  | 'SE'
  | 'CA'
  | 'AU'
  | 'JP'
  | 'SG'
  | 'United States'
  | 'United Kingdom'
  | 'European Union'
  | 'Germany'
  | 'France'
  | 'Ireland'
  | 'Netherlands'
  | 'Sweden'
  | 'Canada'
  | 'Australia'
  | 'Japan'
  | 'Singapore';

// Main Subprocessor interface
export interface Subprocessor {
  id: string;
  name: string;
  legal_name?: string;
  website_url?: string;
  privacy_policy_url?: string;
  purpose: string;
  processing_activities: ProcessingActivity[];
  data_categories: DataCategory[];
  headquarters_location: string;
  data_storage_locations: string[];
  jurisdiction: Jurisdiction | string;
  contract_status: ContractStatus;
  contract_signed_date?: string;
  contract_expiry_date?: string;
  contract_renewal_reminder_sent: boolean;
  dpa_version?: string;
  security_certifications: SecurityCertification[] | string[];
  security_measures: Record<string, unknown>;
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  access_controls?: string;
  audit_trail_available: boolean;
  gdpr_compliant: boolean;
  data_processing_agreement_signed: boolean;
  standard_contractual_clauses: boolean;
  binding_corporate_rules?: boolean;
  status: SubprocessorStatus;
  onboarded_at?: string;
  deprecated_at?: string;
  deprecated_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Public Subprocessor interface (limited fields)
export interface PublicSubprocessor {
  id: string;
  name: string;
  legal_name?: string;
  website_url?: string;
  privacy_policy_url?: string;
  purpose: string;
  processing_activities: string[];
  data_categories: string[];
  headquarters_location: string;
  data_storage_locations: string[];
  jurisdiction: string;
  security_certifications: string[];
  gdpr_compliant: boolean;
  standard_contractual_clauses: boolean;
  data_processing_agreement_signed: boolean;
  onboarded_at?: string;
}

// Subprocessor creation/update request
export interface SubprocessorRequest {
  name: string;
  legal_name?: string;
  website_url?: string;
  privacy_policy_url?: string;
  purpose: string;
  processing_activities?: ProcessingActivity[];
  data_categories?: DataCategory[];
  headquarters_location: string;
  data_storage_locations?: string[];
  jurisdiction: Jurisdiction | string;
  contract_status?: ContractStatus;
  contract_signed_date?: string;
  contract_expiry_date?: string;
  dpa_version?: string;
  security_certifications?: SecurityCertification[];
  security_measures?: Record<string, unknown>;
  encryption_at_rest?: boolean;
  encryption_in_transit?: boolean;
  access_controls?: string;
  audit_trail_available?: boolean;
  gdpr_compliant?: boolean;
  data_processing_agreement_signed?: boolean;
  standard_contractual_clauses?: boolean;
  binding_corporate_rules?: boolean;
  status?: SubprocessorStatus;
  notes?: string;
}

// Audit log entry
export interface SubprocessorAuditLog {
  id: string;
  subprocessor_id: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'contract_update';
  changes: Record<string, unknown>;
  performed_by?: string;
  performed_at: string;
  ip_address_hash?: string;
  reason?: string;
}

// Subprocessor notification
export interface SubprocessorNotification {
  id: string;
  subprocessor_id: string;
  notification_type: 'new' | 'update' | 'removal';
  notification_sent_at: string;
  notification_method: 'email' | 'in_app' | 'api_webhook';
  recipients_count: number;
  template_version?: string;
  content_hash?: string;
}

// Compliance summary
export interface SubprocessorComplianceSummary {
  total_subprocessors: number;
  active_subprocessors: number;
  pending_review: number;
  gdpr_compliant: number;
  with_signed_dpa: number;
  by_jurisdiction: Record<string, number>;
  security_certifications: Record<string, number>;
  contracts_expiring_soon: number;
  expired_contracts: number;
}

// Export data structure
export interface SubprocessorExport {
  export_metadata: {
    generated_at: string;
    format_version: string;
    total_subprocessors: number;
    active_subprocessors: number;
    gdpr_compliant_count: number;
    export_type: 'full' | 'public' | 'audit';
  };
  organization: {
    name: string;
    dpo_contact?: string;
    last_updated: string;
  };
  subprocessors: PublicSubprocessor[];
  compliance_summary: SubprocessorComplianceSummary;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}
