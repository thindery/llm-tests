/**
 * Vercel Deployment Module
 * Exports all Vercel deployment related functions
 */

// Re-export from deploy.ts
export {
  deployFromGit,
  triggerSiteDeploy,
  syncDeploymentStatus,
  rollbackToRelease,
  configureVercelProject,
  getCustomDomainUrl,
  type DeployOptions,
  type DeployResult,
  type Site,
  type SiteRelease,
  type VercelDeployResponse,
} from './deploy';

// Re-export from webhook-handler.ts
export {
  handleVercelWebhook,
  validateWebhookPayload,
  verifyWebhookSignature,
  getDeploymentLogs,
  type VercelWebhookPayload,
  type VercelEventType,
  type WebhookResult,
} from './webhook-handler';
