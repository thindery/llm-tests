/**
 * Breach Notification Module - GDPR Article 33 & 34 Compliance
 * Ticket: REMY-260
 * 
 * Main export file for breach notification functionality
 * 
 * Usage:
 * ```typescript
 * import {
 *   performRiskAssessment,
 *   buildBreachRecord,
 *   calculateDPANotificationDeadline,
 *   checkBreachCompliance,
 * } from '@/lib/breach';
 * 
 * // Report a new breach
 * const breach = buildBreachRecord(request, userId);
 * 
 * // Assess risk
 * const assessment = performRiskAssessment(riskFactors);
 * 
 * // Check compliance
 * const compliance = checkBreachCompliance(breach);
 * ```
 */

// Export all types
export * from './types';

// Export all utility functions
export {
  // Breach ID Generation
  generateBreachId,
  
  // Risk Assessment
  calculateLikelihoodScore,
  calculateSeverityScore,
  calculateRiskScore,
  performRiskAssessment,
  scoreToRiskLevel,
  lookupRiskAssessment,
  
  // Notification Requirements
  requiresDPANotification,
  requiresSubjectNotification,
  getDefaultRiskFactors,
  
  // Deadline Calculations
  calculateDPANotificationDeadline,
  calculateSubjectNotificationDeadline,
  isDeadlinePassed,
  getHoursUntilDeadline,
  getDeadlineUrgency,
  
  // DPA Lookup
  getDPAByCountryCode,
  getDefaultDPA,
  getDPABreachNotificationUrl,
  
  // Templates
  getNotificationTemplate,
  getTemplatesForBreach,
  fillTemplate,
  generateDPANotification,
  generateSubjectNotification,
  
  // Evidence Collection
  calculateEvidenceHash,
  createEvidenceItem,
  
  // Status Management
  createStatusHistoryEntry,
  getAllowedStatusTransitions,
  isValidStatusTransition,
  
  // Remediation
  createRemediationStep,
  calculateRemediationProgress,
  isRemediationComplete,
  getOverdueSteps,
  
  // Validation
  validateCreateBreachRequest,
  isValidDataCategory,
  isValidSubjectCategory,
  
  // Breach Building
  buildBreachRecord,
  
  // Compliance Checking
  checkArticle33Compliance,
  checkArticle34Compliance,
  checkBreachCompliance,
  
  // Statistics
  calculateBreachStatistics,
} from './utils';

// Export utilities under namespace for organized imports
export * as BreachUtils from './utils';

// Re-export crypto utilities
export { createHash } from 'crypto';
