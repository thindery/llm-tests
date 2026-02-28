/**
 * Git Operations Module
 * 
 * Handles local repository operations: clone, commit, tag, checkout/rollback.
 */

export { cloneUserRepo, getRepoPath, getSiteRepoPath, isRepoCloned, removeClonedRepo, getRepoInfo } from './clone';
export type { CloneConfig, CloneResult } from './clone';

export { commitFiles, getSiteCommits } from './commit';
export type { CommitConfig, CommitResult, FileChange } from './commit';

export { createTag, getSiteTags, getLatestVersion, calculateNextVersion, bumpVersion, deleteTag, validateTagName } from './tag';
export type { TagConfig, TagResult, SiteVersion } from './tag';

export { checkout, rollbackSite, getFileAtRef, diffWithRef, listRollbackVersions, isSiteAtLatestVersion } from './checkout';
export type { CheckoutConfig, CheckoutResult, RollbackResult } from './checkout';
