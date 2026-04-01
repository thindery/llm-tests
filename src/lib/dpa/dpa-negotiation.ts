/**
 * DPA Negotiation Workflow
 * Enterprise customer DPA customization and negotiation
 * 
 * Ticket: REMY-257
 * 
 * Supports GDPR Article 28 compliant customization for enterprise customers while
 * maintaining standard protections.
 * 
 * Key Features:
 * - Template selection based on customer tier
 * - Negotiation clauses with approval status
 * - Amendment tracking
 * - Redline document generation
 * - Legal review workflow
 */

import { randomUUID } from 'crypto';

// DPA template types
export type DpaTemplateType = 
  | 'standard'           // Standard SaaS DPA - self-serve
  | 'professional'     // Professional tier with additional terms
  | 'enterprise'         // Enterprise tier with custom clauses
  | 'custom';           // Fully negotiated custom DPA

// DPA negotiation status
export type DpaNegotiationStatus =
  | 'draft'              // Initial draft created
  | 'customer_review'    // With customer for review
  | 'customer_redline'   // Customer has proposed changes
  | 'legal_review'       // Internal legal review
  | 'rejected'           // Rejected by customer or legal
  | 'approved'           // Approved, awaiting signature
  | 'signed'             // Fully executed
  | 'expired'            // Expired without signature
  | 'replaced';          // Replaced by newer version

// Negotiation clause types
export type NegotiableClause =
  // Article 28(3) required clauses
  | 'processing_subject'      // Subject matter of processing
  | 'processing_duration'     // Duration of processing  
 | 'processing_nature'       // Nature and purpose
  | 'personal_data_types'     // Types of personal data
  | 'data_subject_categories' // Categories of data subjects
  | 'processor_obligations'   // Processor obligations
  
  // Security measures (Article 32)
  | 'encryption_at_rest'      // Encryption for data at rest
  | 'encryption_transit'      // Encryption for data in transit
  | 'access_controls'         // Access control requirements
  | 'audit_rights'            // Customer audit rights scope
  | 'certifications'          // Required security certifications
  | 'penetration_testing'     // Penetration testing frequency
  | 'backup_recovery'         // Backup and recovery SLAs
  
  // Subprocessors (Article 28(2))
  | 'subprocessor_list'       // Initial subprocessor list
  | 'subprocessor_notice'     // Notice period for changes
  | 'subprocessor_approval'   // Approval rights
  | 'subprocessor_liability'  // Subprocessor liability
  
  // Data Subject Rights (Articles 15-22)
  | 'dsr_response_time'       // Data subject request response time
  | 'assistance_scope'        // Assistance scope for DSRs
  | 'data_portability_format' // Data export format
  
  // Data Breaches (Article 33-34)
  | 'breach_notification_time'// Notification timeframe
  | 'breach_notification_scope'// What constitutes a notification
  | 'breach_reporting_detail' // Level of detail required
  | 'breach_communication'    // Communication methods
  
  // International Transfers
  | 'transfer_mechanism'      // SCCs, BCRs, adequacy decisions
  | 'transfer_safeguards'     // Additional safeguards
  
  // Termination
  | 'deletion_method'         // Deletion vs return of data
  | 'deletion_certification'  // Certification requirements
  | 'deletion_timeline'       // Deletion timeline
  
  // Liability
  | 'liability_cap'           // Liability cap amount
  | 'indemnification'          // Indemnification obligations
  
  // Other
  | 'governing_law'          // Choice of law
  | 'dispute_resolution'      // Arbitration/mediation
  | 'auto_renewal'            // Auto-renewal terms
  | 'price_uplift';           // Annual price increases

// Clause approval status
export type ClauseStatus = 
  | 'standard'     // Standard term, no deviation
  | 'negotiable'   // Can be negotiated within limits
  | 'redline'      // Customer proposed change
  | 'approved'     // Deviation approved
  | 'rejected'     // Deviation rejected
  | 'escalated';   // Escalated for executive decision

// Interface for negotiable clause
export interface NegotiatedClause {
  id: string;
  clause_type: NegotiableClause;
  status: ClauseStatus;
  
  // Standard terms
  standard_text: string;
  standard_value: string;
  
  // Negotiated terms
  customer_proposed_text?: string;
  customer_proposed_value?: string;
  negotiated_text?: string;
  negotiated_value?: string;
  
  // Internal limits
  min_acceptable_value?: string;
  max_acceptable_value?: string;
  
  // Negotiation
  customer_rationale?: string;
  internal_notes?: string;
  legal_opinion?: string;
  
  // Approval
  approved_by?: string;
  approved_at?: string;
  approval_level: 'none' | 'legal' | 'vp_legal' | 'cro';
  
  // Audit
  created_at: string;
  updated_at: string;
}

// Interface for DPA negotiation
export interface DpaNegotiation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_tier: 'startup' | 'growth' | 'enterprise' | 'strategic';
  
  // Template
  base_template_type: DpaTemplateType;
  base_template_id: string;
  
  // Status
  status: DpaNegotiationStatus;
  current_version: number;
  
  // Negotiation
  negotiated_clauses: NegotiatedClause[];
  pending_clauses: number;
  approved_clauses: number;
  rejected_clauses: number;
  
  // Documents
  redline_document_url?: string;
  clean_document_url?: string;
  previous_version_id?: string;
  
  // Communications
  last_customer_communication?: string;
  last_internal_communication?: string;
  
  // Signatures
  customer_signatory_name?: string;
  customer_signatory_title?: string;
  customer_signed_at?: string;
  processor_signatory_name?: string;
  processor_signatory_title?: string;
  processor_signed_at?: string;
  
  // Negotiation timeline
  negotiation_started_at: string;
  submitted_to_customer_at?: string;
  customer_response_received_at?: string;
  legal_review_completed_at?: string;
  submitted_for_signature_at?: string;
  fully_executed_at?: string;
  
  // Metadata
  deal_value?: number;
  acv?: number;
  mrr?: number;
  sales_rep?: string;
  legal_owner?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Negotiation limits by customer tier
export interface TieredNegotiationLimits {
  tier: 'startup' | 'growth' | 'enterprise' | 'strategic';
  allowed_clauses: NegotiableClause[];
  prohibited_clauses: NegotiableClause[];
  
  // Approval requirements
  clause_approval_thresholds: Record<ClauseStatus, 'none' | 'legal' | 'vp_legal' | 'cro'>;
  
  // Default ranges
  default_values: Partial<Record<NegotiableClause, string>>;
  min_values: Partial<Record<NegotiableClause, string>>;
  max_values: Partial<Record<NegotiableClause, string>>;
}

// Standard negotiation limits
export const NEGOTIATION_LIMITS: Record<'startup' | 'growth' | 'enterprise' | 'strategic', TieredNegotiationLimits> = {
  startup: {
    tier: 'startup',
    allowed_clauses: [
      'deletion_timeline',
      'data_portability_format',
    ],
    prohibited_clauses: [
      'liability_cap',
      'indemnification',
      'audit_rights',
      'breach_notification_time',
      'subprocessor_approval',
    ],
    clause_approval_thresholds: {
      standard: 'none',
      negotiable: 'legal',
      redline: 'legal',
      approved: 'legal',
      rejected: 'legal',
      escalated: 'vp_legal',
    },
    default_values: {
      deletion_timeline: '30 days',
      data_portability_format: 'JSON',
    },
    min_values: {
      deletion_timeline: '30 days',
    },
    max_values: {
      deletion_timeline: '60 days',
    },
  },
  growth: {
    tier: 'growth',
    allowed_clauses: [
      'deletion_timeline',
      'data_portability_format',
      'breach_notification_time',
      'subprocessor_notice',
    ],
    prohibited_clauses: [
      'liability_cap',
      'indemnification',
      'audit_rights',
    ],
    clause_approval_thresholds: {
      standard: 'none',
      negotiable: 'legal',
      redline: 'legal',
      approved: 'legal',
      rejected: 'legal',
      escalated: 'vp_legal',
    },
    default_values: {
      deletion_timeline: '30 days',
      breach_notification_time: '24 hours',
      data_portability_format: 'JSON, CSV',
      subprocessor_notice: '30 days',
    },
    min_values: {
      deletion_timeline: '30 days',
      breach_notification_time: '24 hours',
      subprocessor_notice: '14 days',
    },
    max_values: {
      deletion_timeline: '90 days',
      breach_notification_time: '48 hours',
      subprocessor_notice: '60 days',
    },
  },
  enterprise: {
    tier: 'enterprise',
    allowed_clauses: [
      'deletion_timeline',
      'data_portability_format',
      'breach_notification_time',
      'subprocessor_notice',
      'subprocessor_approval',
      'audit_rights',
      'certifications',
      'liability_cap',
      'governing_law',
    ],
    prohibited_clauses: [
      'processor_obligations', // Core obligations cannot change
      'encryption_at_rest',
      'encryption_transit',
    ],
    clause_approval_thresholds: {
      standard: 'none',
      negotiable: 'legal',
      redline: 'vp_legal',
      approved: 'legal',
      rejected: 'legal',
      escalated: 'cro',
    },
    default_values: {
      deletion_timeline: '30 days',
      breach_notification_time: '24 hours',
      data_portability_format: 'JSON, CSV, XML',
      subprocessor_notice: '30 days',
      audit_rights: 'annual, reasonable notice',
      certifications: 'SOC 2 Type II, ISO 27001',
      liability_cap: 'annual fees paid',
    },
    min_values: {
      deletion_timeline: '30 days',
      breach_notification_time: '24 hours',
      subprocessor_notice: '30 days',
      audit_rights: 'annual',
    },
    max_values: {
      deletion_timeline: '90 days',
      breach_notification_time: '72 hours',
      subprocessor_notice: '90 days',
      liability_cap: '2x annual fees',
    },
  },
  strategic: {
    tier: 'strategic',
    allowed_clauses: [
      'deletion_timeline',
      'data_portability_format',
      'breach_notification_time',
      'subprocessor_notice',
      'subprocessor_approval',
      'audit_rights',
      'certifications',
      'liability_cap',
      'indemnification',
      'governing_law',
      'dispute_resolution',
      'penetration_testing',
      'backup_recovery',
    ],
    prohibited_clauses: [
      'processor_obligations',
      'encryption_at_rest',
      'encryption_transit',
    ],
    clause_approval_thresholds: {
      standard: 'none',
      negotiable: 'legal',
      redline: 'vp_legal',
      approved: 'vp_legal',
      rejected: 'legal',
      escalated: 'cro',
    },
    default_values: {
      deletion_timeline: '30 days',
      breach_notification_time: '24 hours',
      data_portability_format: 'Custom format as agreed',
      subprocessor_notice: '30 days',
      audit_rights: 'annual, 30 days notice',
      certifications: 'SOC 2 Type II, ISO 27001, ISO 27701',
      liability_cap: '2x annual fees',
      penetration_testing: 'annual, results shared',
      backup_recovery: 'RPO 4 hours, RTO 24 hours',
    },
    min_values: {
      deletion_timeline: '30 days',
      breach_notification_time: '24 hours',
      subprocessor_notice: '30 days',
    },
    max_values: {
      deletion_timeline: '180 days',
      breach_notification_time: '72 hours',
      subprocessor_notice: '90 days',
      liability_cap: '5x annual fees',
    },
  },
};

// Standard clause text templates
export const STANDARD_CLAUSE_TEXT: Partial<Record<NegotiableClause, { text: string; value: string }>> = {
  deletion_timeline: {
    text: 'Upon termination or expiry of the Service Agreement, the Processor shall, at the Controller\'s election, return or delete all personal data within {{VALUE}} of termination.',
    value: '30 days',
  },
  breach_notification_time: {
    text: 'In the event of a personal data breach, the Processor shall notify the Controller without undue delay and in any event within {{VALUE}} of becoming aware of the breach.',
    value: '24 hours',
  },
  subprocessor_notice: {
    text: 'The Processor shall notify the Controller at least {{VALUE}} in advance of adding or replacing any Subprocessor.',
    value: '30 days',
  },
  audit_rights: {
    text: 'The Controller shall have the right to audit the Processor\'s compliance with this DPA {{VALUE}}.',
    value: 'annually, during business hours, with reasonable notice',
  },
  liability_cap: {
    text: 'Each party\'s total liability arising from or related to this DPA shall be limited to {{VALUE}}.',
    value: 'the amount paid by Customer to Processor in the 12 months preceding the claim',
  },
};

/**
 * Create a new DPA negotiation
 */
export function createDpaNegotiation(
  customerId: string,
  customerName: string,
  customerTier: 'startup' | 'growth' | 'enterprise' | 'strategic',
  options?: {
    baseTemplate?: DpaTemplateType;
    salesRep?: string;
    dealValue?: number;
    acv?: number;
    mrr?: number;
    createdBy?: string;
  }
): DpaNegotiation {
  const now = new Date().toISOString();
  const limits = NEGOTIATION_LIMITS[customerTier];

  // Create standard clauses from allowed list
  const clauses: NegotiatedClause[] = limits.allowed_clauses.map(clauseType => {
    const template = STANDARD_CLAUSE_TEXT[clauseType];
    return {
      id: `clause-${randomUUID().replace(/-/g, '').substring(0, 12)}`,
      clause_type: clauseType,
      status: 'standard',
      standard_text: template?.text || 'Standard text placeholder',
      standard_value: limits.default_values[clauseType] || template?.value || '',
      approval_level: limits.clause_approval_thresholds.standard,
      created_at: now,
      updated_at: now,
    };
  });

  return {
    id: `neg-${randomUUID().replace(/-/g, '').substring(0, 16)}`,
    customer_id: customerId,
    customer_name: customerName,
    customer_tier: customerTier,
    base_template_type: options?.baseTemplate || 'standard',
    base_template_id: `template-${customerTier}-v1.0`,
    status: 'draft',
    current_version: 1,
    negotiated_clauses: clauses,
    pending_clauses: clauses.length,
    approved_clauses: 0,
    rejected_clauses: 0,
    negotiation_started_at: now,
    deal_value: options?.dealValue,
    acv: options?.acv,
    mrr: options?.mrr,
    sales_rep: options?.salesRep,
    created_at: now,
    updated_at: now,
    created_by: options?.createdBy || 'system',
  };
}

/**
 * Submit a customer redline
 */
export function submitCustomerRedline(
  negotiation: DpaNegotiation,
  clauseId: string,
  proposedText: string,
  proposedValue: string,
  rationale?: string
): { success: boolean; negotiation: DpaNegotiation; error?: string } {
  const clauseIndex = negotiation.negotiated_clauses.findIndex(c => c.id === clauseId);
  
  if (clauseIndex === -1) {
    return { success: false, negotiation, error: 'Clause not found' };
  }

  const clause = negotiation.negotiated_clauses[clauseIndex];
  const limits = NEGOTIATION_LIMITS[negotiation.customer_tier];

  // Check if clause is negotiable
  if (limits.prohibited_clauses.includes(clause.clause_type)) {
    return { success: false, negotiation, error: 'This clause is not negotiable for your tier' };
  }

  const updatedClauses = [...negotiation.negotiated_clauses];
  updatedClauses[clauseIndex] = {
    ...clause,
    status: 'redline',
    customer_proposed_text: proposedText,
    customer_proposed_value: proposedValue,
    customer_rationale: rationale,
    approval_level: limits.clause_approval_thresholds.redline,
    updated_at: new Date().toISOString(),
  };

  return {
    success: true,
    negotiation: {
      ...negotiation,
      negotiated_clauses: updatedClauses,
      status: 'customer_redline',
      customer_response_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Approve or reject a negotiated clause
 */
export function reviewClaus(
  negotiation: DpaNegotiation,
  clauseId: string,
  decision: 'approve' | 'reject',
  options?: {
    approvedValue?: string;
    approvedText?: string;
    internalNotes?: string;
    legalOpinion?: string;
    reviewedBy?: string;
  }
): { success: boolean; negotiation: DpaNegotiation; error?: string } {
  const clauseIndex = negotiation.negotiated_clauses.findIndex(c => c.id === clauseId);
  
  if (clauseIndex === -1) {
    return { success: false, negotiation, error: 'Clause not found' };
  }

  const clause = negotiation.negotiated_clauses[clauseIndex];
  const limits = NEGOTIATION_LIMITS[negotiation.customer_tier];

  // Check approval authority
  // (In real implementation, would check user's role vs approval_level)

  const updatedClauses = [...negotiation.negotiated_clauses];
  
  if (decision === 'approve') {
    updatedClauses[clauseIndex] = {
      ...clause,
      status: 'approved',
      negotiated_text: options?.approvedText || clause.customer_proposed_text || clause.standard_text,
      negotiated_value: options?.approvedValue || clause.customer_proposed_value || clause.standard_value,
      internal_notes: options?.internalNotes,
      legal_opinion: options?.legalOpinion,
      approved_by: options?.reviewedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } else {
    updatedClauses[clauseIndex] = {
      ...clause,
      status: 'rejected',
      internal_notes: options?.internalNotes,
      legal_opinion: options?.legalOpinion,
      updated_at: new Date().toISOString(),
    };
  }

  // Re-count statuses
  const approvedCount = updatedClauses.filter(c => c.status === 'approved').length;
  const rejectedCount = updatedClauses.filter(c => c.status === 'rejected').length;
  const pendingCount = updatedClauses.filter(c => c.status === 'redline').length;

  return {
    success: true,
    negotiation: {
      ...negotiation,
      negotiated_clauses: updatedClauses,
      approved_clauses: approvedCount,
      rejected_clauses: rejectedCount,
      pending_clauses: pendingCount,
      legal_review_completed_at: new Date().toISOString(),
      status: pendingCount === 0 ? 'approved' : negotiation.status,
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Generate redline document (showing changes from standard)
 */
export function generateRedlineDocument(
  negotiation: DpaNegotiation
): {
  document: string;
  summary: {
    totalClauses: number;
    modified: number;
    deleted: number;
    added: number;
  };
} {
  const { negotiated_clauses } = negotiation;
  
  let document = `DPA REDLINE DOCUMENT\n`;
  document += `==================\n\n`;
  document += `Customer: ${negotiation.customer_name}\n`;
  document += `Template: ${negotiation.base_template_type}\n`;
  document += `Version: ${negotiation.current_version}\n`;
  document += `Generated: ${new Date().toISOString()}\n\n`;
  document += `CLAUSE COMPARISON\n`;
  document += `=================\n\n`;
  
  let modified = 0;
  let deleted = 0;
  let added = 0;

  negotiated_clauses.forEach(clause => {
    document += `--- ${clause.clause_type.toUpperCase()} ---\n`;
    document += `Status: ${clause.status}\n\n`;
    
    document += `STANDARD:\n${clause.standard_text.replace('{{VALUE}}', clause.standard_value)}\n\n`;
    
    if (clause.customer_proposed_text) {
      document += `PROPOSED (CUSTOMER):\n${clause.customer_proposed_text.replace('{{VALUE}}', clause.customer_proposed_value || '')}\n\n`;
      modified++;
    }
    
    if (clause.negotiated_text) {
      document += `APPROVED:\n${clause.negotiated_text.replace('{{VALUE}}', clause.negotiated_value || '')}\n\n`;
    }
    
    if (clause.status === 'rejected') {
      document += `[REJECTED] Reason: ${clause.internal_notes || 'See legal notes'}\n`;
      deleted++;
    }
    
    document += `\n`;
  });

  return {
    document,
    summary: {
      totalClauses: negotiated_clauses.length,
      modified,
      deleted,
      added,
    },
  };
}

/**
 * Generate clean DPA document with negotiated terms
 */
export function generateCleanDpa(
  negotiation: DpaNegotiation,
  baseTemplate: string
): string {
  let document = baseTemplate;

  // Replace negotiated clauses
  negotiation.negotiated_clauses.forEach(clause => {
    const value = clause.negotiated_value || clause.standard_value;
    const searchValue = `{{${clause.clause_type.toUpperCase()}}}`;
    document = document.replace(new RegExp(searchValue, 'g'), value);
  });

  // Add negotiation footer
  document += `\n\n---\n`;
  document += `This DPA includes custom negotiated terms.\n`;
  document += `Negotiation Reference: ${negotiation.id}\n`;
  document += `Generated: ${new Date().toISOString()}\n`;
  document += `Version: ${negotiation.current_version}\n`;

  return document;
}

/**
 * Check if negotiation is complete
 */
export function isNegotiationComplete(negotiation: DpaNegotiation): boolean {
  return negotiation.pending_clauses === 0 || ['approved', 'signed'].includes(negotiation.status);
}

/**
 * Record signatures on negotiated DPA
 */
export function recordSignatures(
  negotiation: DpaNegotiation,
  signatures: {
    customerName: string;
    customerTitle: string;
    customerSignedAt: string;
    processorName?: string;
    processorTitle?: string;
    processorSignedAt?: string;
  }
): DpaNegotiation {
  return {
    ...negotiation,
    customer_signatory_name: signatures.customerName,
    customer_signatory_title: signatures.customerTitle,
    customer_signed_at: signatures.customerSignedAt,
    processor_signatory_name: signatures.processorName || negotiation.processor_signatory_name,
    processor_signatory_title: signatures.processorTitle || negotiation.processor_signatory_title,
    processor_signed_at: signatures.processorSignedAt || new Date().toISOString(),
    status: signatures.processorSignedAt ? 'signed' : 'approved',
    fully_executed_at: signatures.processorSignedAt,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Calculate negotiation metrics for reporting
 */
export function calculateNegotiationMetrics(
  negotiations: DpaNegotiation[],
  periodStart: string,
  periodEnd: string
): {
  totalNegotiations: number;
  completedNegotiations: number;
  averageNegotiationDays: number;
  successRate: number;
  averageClausesNegotiated: number;
  byTier: Record<string, number>;
} {
  const periodNegotiations = negotiations.filter(
    n => n.negotiation_started_at >= periodStart && n.negotiation_started_at <= periodEnd
  );

  const completed = periodNegotiations.filter(n => n.status === 'signed');
  
  const avgDays = completed.length > 0
    ? completed.reduce((sum, n) => {
        const started = new Date(n.negotiation_started_at).getTime();
        const finished = n.fully_executed_at 
          ? new Date(n.fully_executed_at).getTime()
          : new Date().getTime();
        return sum + ((finished - started) / (24 * 60 * 60 * 1000));
      }, 0) / completed.length
    : 0;

  const byTier: Record<string, number> = {
    startup: 0,
    growth: 0,
    enterprise: 0,
    strategic: 0,
  };
  periodNegotiations.forEach(n => byTier[n.customer_tier]++);

  return {
    totalNegotiations: periodNegotiations.length,
    completedNegotiations: completed.length,
    averageNegotiationDays: Math.round(avgDays * 10) / 10,
    successRate: periodNegotiations.length > 0 
      ? (completed.length / periodNegotiations.length) * 100 
      : 0,
    averageClausesNegotiated: periodNegotiations.length > 0
      ? periodNegotiations.reduce((sum, n) => sum + n.negotiated_clauses.length, 0) / periodNegotiations.length
      : 0,
    byTier,
  };
}

/**
 * Export to JSON for integration with CLM systems
 */
export function exportToCLMFormat(negotiation: DpaNegotiation): Record<string, unknown> {
  return {
    agreement_id: negotiation.id,
    counterparty: {
      name: negotiation.customer_name,
      tier: negotiation.customer_tier,
    },
    document_type: 'DPA',
    base_template: negotiation.base_template_type,
    status: negotiation.status,
    negotiated_terms: negotiation.negotiated_clauses.map(c => ({
      term: c.clause_type,
      original_value: c.standard_value,
      negotiated_value: c.negotiated_value,
      status: c.status,
      approved_by: c.approved_by,
    })),
    financials: {
      deal_value: negotiation.deal_value,
      acv: negotiation.acv,
      mrr: negotiation.mrr,
    },
    timeline: {
      started: negotiation.negotiation_started_at,
      completed: negotiation.fully_executed_at,
    },
    signatures: {
      counterparty_signed: !!negotiation.customer_signed_at,
      internal_signed: !!negotiation.processor_signed_at,
    },
  };
}
