/**
 * Subprocessor Validation Utilities
 * 
 * Ticket: REMY-259
 */

import {
  SubprocessorRequest,
  SubprocessorStatus,
  ContractStatus,
  ApiResponse,
} from './types';

interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: SubprocessorRequest;
}

// Validate subprocessor creation/update request
export function validateSubprocessorRequest(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format - expected object' };
  }

  const d = data as Partial<SubprocessorRequest>;

  // Required fields validation
  const requiredFields: { field: keyof SubprocessorRequest; label: string }[] = [
    { field: 'name', label: 'Name' },
    { field: 'purpose', label: 'Purpose' },
    { field: 'headquarters_location', label: 'Headquarters location' },
    { field: 'jurisdiction', label: 'Jurisdiction' },
  ];

  for (const { field, label } of requiredFields) {
    const value = d[field];
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return { valid: false, error: `${label} is required` };
    }
  }

  // Validate name length
  if (d.name && d.name.length > 255) {
    return { valid: false, error: 'Name must be 255 characters or less' };
  }

  // Validate legal name length
  if (d.legal_name && d.legal_name.length > 255) {
    return { valid: false, error: 'Legal name must be 255 characters or less' };
  }

  // Validate URLs
  if (d.website_url) {
    try {
      new URL(d.website_url);
    } catch {
      return { valid: false, error: 'Website URL must be a valid URL' };
    }
  }

  if (d.privacy_policy_url) {
    try {
      new URL(d.privacy_policy_url);
    } catch {
      return { valid: false, error: 'Privacy policy URL must be a valid URL' };
    }
  }

  // Validate contract_status enum
  const validContractStatuses: ContractStatus[] = [
    'pending',
    'draft',
    'signed',
    'under_review',
    'expired',
    'terminated',
  ];
  if (d.contract_status && !validContractStatuses.includes(d.contract_status)) {
    return {
      valid: false,
      error: `Invalid contract status. Must be one of: ${validContractStatuses.join(', ')}`,
    };
  }

  // Validate status enum
  const validStatuses: SubprocessorStatus[] =
    ['active', 'pending_review', 'deprecated', 'terminated'];
  if (d.status && !validStatuses.includes(d.status)) {
    return {
      valid: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    };
  }

  // Validate date strings
  if (d.contract_signed_date) {
    const signedDate = new Date(d.contract_signed_date);
    if (isNaN(signedDate.getTime())) {
      return { valid: false, error: 'Contract signed date must be a valid date' };
    }
  }

  if (d.contract_expiry_date) {
    const expiryDate = new Date(d.contract_expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return { valid: false, error: 'Contract expiry date must be a valid date' };
    }
  }

  // Validate expiry is after signed date
  if (d.contract_signed_date && d.contract_expiry_date) {
    const signed = new Date(d.contract_signed_date).getTime();
    const expiry = new Date(d.contract_expiry_date).getTime();
    if (expiry <= signed) {
      return {
        valid: false,
        error: 'Contract expiry date must be after signed date',
      };
    }
  }

  // Validate arrays
  if (d.processing_activities && !Array.isArray(d.processing_activities)) {
    return { valid: false, error: 'Processing activities must be an array' };
  }

  if (d.data_categories && !Array.isArray(d.data_categories)) {
    return { valid: false, error: 'Data categories must be an array' };
  }

  if (d.data_storage_locations && !Array.isArray(d.data_storage_locations)) {
    return { valid: false, error: 'Data storage locations must be an array' };
  }

  if (d.security_certifications && !Array.isArray(d.security_certifications)) {
    return { valid: false, error: 'Security certifications must be an array' };
  }

  // Validate security_measures is an object
  if (d.security_measures && typeof d.security_measures !== 'object') {
    return { valid: false, error: 'Security measures must be an object' };
  }

  // GDPR compliance warning (not blocking)
  // Log a warning if critical fields are missing
  const gdprWarnings: string[] = [];
  
  if (d.gdpr_compliant === false) {
    gdprWarnings.push('Subprocessor is not marked as GDPR compliant');
  }
  
  if (d.data_processing_agreement_signed === false) {
    gdprWarnings.push('No DPA signed - required for GDPR compliance');
  }
  
  if (d.standard_contractual_clauses === false) {
    gdprWarnings.push('No SCCs - may be required for international transfers');
  }

  // Note: We still allow the request but could log warnings
  // In production, you might want to surface these warnings

  return { valid: true, data: d as SubprocessorRequest };
}

// Validate subprocessor update - ensure ID is present
export function validateSubprocessorUpdate(data: unknown): ValidationResult & { id?: string } {
  const baseValidation = validateSubprocessorRequest(data);
  
  if (!baseValidation.valid) {
    return baseValidation;
  }

  const d = data as { id?: string };
  
  if (!d.id) {
    return { valid: false, error: 'Subprocessor ID is required for updates' };
  }

  return { valid: true, data: baseValidation.data, id: d.id };
}

// Validate subprocessor deletion
export function validateDeleteRequest(data: unknown): { valid: boolean; error?: string; id?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request data' };
  }

  const d = data as { id?: string };

  if (!d.id) {
    return { valid: false, error: 'Subprocessor ID is required' };
  }

  return { valid: true, id: d.id };
}

// Check if contract is expiring soon (within days)
export function isContractExpiringSoon(
  expiryDate: string | undefined,
  days: number = 90
): boolean {
  if (!expiryDate) return false;
  
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const cutoff = now + days * 24 * 60 * 60 * 1000;
  
  return expiry <= cutoff && expiry > now;
}

// Calculate days until contract expiry
export function daysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const diff = expiry - now;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

// Validate GDPR compliance requirements
export function validateGDPRCompliance(subprocessor: Partial<SubprocessorRequest>): {
  compliant: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!subprocessor.gdpr_compliant) {
    missing.push('GDPR compliance declaration');
  }

  if (!subprocessor.data_processing_agreement_signed) {
    missing.push('Data Processing Agreement (DPA)');
  }

  if (!subprocessor.encryption_at_rest) {
    missing.push('Encryption at rest');
  }

  if (!subprocessor.encryption_in_transit) {
    missing.push('Encryption in transit');
  }

  if (!subprocessor.audit_trail_available) {
    missing.push('Audit trail capability');
  }

  if (!subprocessor.standard_contractual_clauses) {
    // Only required for non-EU/EEA jurisdictions
    const isEUJurisdiction = [
      'European Union',
      'Germany',
      'France',
      'Ireland',
      'Netherlands',
      'Sweden',
      'United Kingdom',
    ].includes(subprocessor.jurisdiction || '');

    if (!isEUJurisdiction) {
      missing.push('Standard Contractual Clauses (for international data transfers)');
    }
  }

  return {
    compliant: missing.length === 0,
    missing,
  };
}

// Sanitize subprocessor data for public disclosure
export function sanitizeForPublic(subprocessor: Record<string, unknown>): Record<string, unknown> {
  const allowedFields = [
    'id',
    'name',
    'legal_name',
    'website_url',
    'privacy_policy_url',
    'purpose',
    'processing_activities',
    'data_categories',
    'headquarters_location',
    'data_storage_locations',
    'jurisdiction',
    'security_certifications',
    'gdpr_compliant',
    'standard_contractual_clauses',
    'data_processing_agreement_signed',
    'onboarded_at',
  ];

  const sanitized: Record<string, unknown> = {};
  
  for (const field of allowedFields) {
    if (field in subprocessor) {
      sanitized[field] = subprocessor[field];
    }
  }

  return sanitized;
}
