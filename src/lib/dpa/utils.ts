/**
 * DPA Utilities - GDPR Data Processing Agreement helpers
 * Ticket: REMY-257
 */

import { createHash, randomUUID } from 'crypto';

// DPA Version
export const CURRENT_DPA_VERSION = '1.0';

// Document template path
export const DPA_TEMPLATE_PATH = '/legal/dpa-template.md';

// DPA Status types
export type DpaStatus = 'pending' | 'signed' | 'expired';

// DPA Agreement record
export interface DpaAgreement {
  id: string;
  customer_id: string;
  dpa_version: string;
  signed_at: string | null;
  ip_address_hash: string | null;
  signature_hash: string;
  signing_metadata: Record<string, unknown>;
  status: DpaStatus;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  pdf_url: string | null;
}

// DPA Version record
export interface DpaVersion {
  id: string;
  version: string;
  effective_date: string;
  template_content: string;
  changelog: string;
  is_active: boolean;
  created_at: string;
}

// Signature data structure
export interface SignatureData {
  customerId: string;
  version: string;
  signedAt: string;
  name: string;
  title: string;
  ipAddress: string;
}

/**
 * Hash an IP address for storage in audit trail
 * Uses SHA-256 to maintain privacy while allowing correlation
 */
export function hashIpAddress(ipAddress: string): string {
  return createHash('sha256')
    .update(ipAddress + process.env.IP_HASH_SALT || 'remy-dpa-salt-2026')
    .digest('hex');
}

/**
 * Generate a cryptographic signature hash
 * This creates a tamper-evident record of the signature
 */
export function generateSignatureHash(signatureData: SignatureData): string {
  const dataString = JSON.stringify({
    customerId: signatureData.customerId,
    version: signatureData.version,
    signedAt: signatureData.signedAt,
    name: signatureData.name,
    title: signatureData.title,
    // IP is already hashed in signature hash for additional privacy
    ipHash: hashIpAddress(signatureData.ipAddress),
  });
  
  return createHash('sha512')
    .update(dataString + process.env.DPA_SIGNATURE_SECRET || 'remy-dpa-secret')
    .digest('hex');
}

/**
 * Verify a signature hash matches the provided data
 */
export function verifySignatureHash(
  signatureData: SignatureData, 
  storedHash: string
): boolean {
  const computedHash = generateSignatureHash(signatureData);
  return computedHash === storedHash;
}

/**
 * Generate a document ID for the signed DPA
 */
export function generateDocumentId(): string {
  return `dpa-${randomUUID().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * Format date for legal documents
 */
export function formatLegalDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format timestamp for legal documents
 */
export function formatLegalTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Check if DPA is expired
 */
export function isDpaExpired(agreement: DpaAgreement): boolean {
  if (agreement.status === 'expired') return true;
  if (agreement.expires_at) {
    return new Date(agreement.expires_at) < new Date();
  }
  return false;
}

/**
 * Validate signature request
 */
export interface ValidateSignatureRequest {
  name: string;
  title: string;
  acceptTerms: boolean;
}

export function validateSignatureRequest(
  data: unknown
): { valid: true; data: ValidateSignatureRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = data as Record<string, unknown>;

  if (!req.name || typeof req.name !== 'string' || req.name.trim().length < 2) {
    return { valid: false, error: 'Name is required (minimum 2 characters)' };
  }

  if (!req.title || typeof req.title !== 'string' || req.title.trim().length < 2) {
    return { valid: false, error: 'Title is required (minimum 2 characters)' };
  }

  if (req.acceptTerms !== true) {
    return { valid: false, error: 'You must accept the DPA terms' };
  }

  return {
    valid: true,
    data: {
      name: req.name.trim(),
      title: req.title.trim(),
      acceptTerms: true,
    },
  };
}

/**
 * Replace template variables with actual values
 */
export function processTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    processed = processed.replace(
      new RegExp(`{{${key}}}`, 'g'),
      value
    );
  }
  return processed;
}

/**
 * Get template variables for DPA
 */
export function getTemplateVariables(
  customerName: string,
  signerName: string,
  signerTitle: string,
  documentId: string,
  signatureHash: string
): Record<string, string> {
  const now = new Date();
  
  return {
    EFFECTIVE_DATE: formatLegalDate(now),
    CONTROLLER_NAME: customerName,
    CONTROLLER_REP_NAME: signerName,
    CONTROLLER_REP_TITLE: signerTitle,
    PROCESSOR_REP_NAME: 'REMY Analytics Legal Team',
    PROCESSOR_REP_TITLE: 'Data Protection Officer',
    SIGNATURE_DATE: formatLegalDate(now),
    DOCUMENT_ID: documentId,
    GENERATED_TIMESTAMP: formatLegalTimestamp(now),
    DIGITAL_SIGNATURE: signatureHash.substring(0, 32) + '...',
  };
}

/**
 * DPA acceptance response
 */
export interface DpaAcceptanceResponse {
  success: boolean;
  agreementId: string;
  documentId: string;
  signedAt: string;
  version: string;
  pdfUrl: string | null;
}

/**
 * DPA status response
 */
export interface DpaStatusResponse {
  hasSignedDpa: boolean;
  currentVersion: string;
  latestAgreement: DpaAgreement | null;
  agreementHistory: DpaAgreement[];
}
