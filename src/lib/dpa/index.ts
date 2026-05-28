/**
 * DPA Module Index - Comprehensive DPA Implementation
 * 
 * Ticket: REMY-257
 * 
 * Exports all DPA-related functionality:
 * - Data Subject Rights response time tracking
 * - Subprocessor notification and approval
 * - DPA negotiation workflow
 * - Cross-border transfer documentation
 */

// Data Subject Rights
export {
  createDataSubjectRequest,
  requestSLAExtension,
  isOverdue,
  isApproachingDeadline,
  getDaysUntilDeadline,
  calculateSlaMetrics,
  generateAcknowledgmentEmail,
  validateDSRRequest,
  exportRequestsToCSV,
  DEFAULT_SLA_CONFIG,
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
} from './data-subject-rights';

export type {
  DsrRequestType,
  DsrStatus,
  DsrPriority,
  DsrComplexity,
  DataSubjectRequest,
  DsrResponseTemplate,
  DsrSlaConfig,
  DsrSlaMetrics,
} from './data-subject-rights';

// Subprocessor Notification
export {
  createSubprocessorNotification,
  recordControllerResponse,
  resolveObjection,
  isNotificationOverdue,
  shouldSendReminder,
  generateNotificationEmail,
  isSubprocessorAuthorized,
  authorizeSubprocessor,
  revokeSubprocessorAuthorization,
  countPendingNotifications,
  generateAuthorizationReport,
  validateNotificationData,
  DEFAULT_NOTIFICATION_CONFIG,
} from './subprocessor-notification';

export type {
  SubprocessorNotificationType,
  NotificationStatus,
  SubprocessorChangeNotification,
  ControllerAuthorization,
  SubprocessorRegistryEntry,
  NotificationPreferences,
} from './subprocessor-notification';

// DPA Negotiation
export {
  createDpaNegotiation,
  submitCustomerRedline,
  reviewClaus,
  generateRedlineDocument,
  generateCleanDpa,
  isNegotiationComplete,
  recordSignatures,
  calculateNegotiationMetrics,
  exportToCLMFormat,
  NEGOTIATION_LIMITS,
  STANDARD_CLAUSE_TEXT,
} from './dpa-negotiation';

export type {
  DpaTemplateType,
  DpaNegotiationStatus,
  NegotiableClause,
  ClauseStatus,
  NegotiatedClause,
  DpaNegotiation,
  TieredNegotiationLimits,
} from './dpa-negotiation';

// Cross-Border Transfer
export {
  getCountryAdequacyStatus,
  createTransferImpactAssessment,
  generateSCCModule2Config,
  recommendSupplementaryMeasures,
  calculateTransferRisk,
  generateTransferDocumentation,
  validateTransferConfiguration,
  exportForArticle30Record,
  COUNTRY_ADEQUACY_DB,
  RECOMMENDED_SUPPLEMENTARY_MEASURES,
} from './cross-border-transfer';

export type {
  TransferMechanism,
  Article49DerogationType,
  AdequacyStatus,
  TransferRiskLevel,
  DestinationCountry,
  SCCRecord,
  TransferImpactAssessment,
  DataTransfer,
  SupplementaryMeasure,
} from './cross-border-transfer';
