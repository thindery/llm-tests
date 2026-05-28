"""Background worker for GDPR data retention enforcement.

This module provides scheduled tasks to automatically purge expired sessions
based on retention policies, while respecting legal holds and export jobs.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .database import db_manager
from .models import Session, User, LegalHold, ExportJob, RetentionAuditLog, now_utc
from .storage import storage

logger = logging.getLogger(__name__)


class RetentionWorker:
    """Worker for enforcing GDPR data retention policies."""
    
    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
    
    async def initialize(self):
        """Initialize and start the scheduler."""
        self.scheduler = AsyncIOScheduler()
        
        # Schedule daily retention purge at 3 AM UTC (low traffic time)
        self.scheduler.add_job(
            self.run_retention_purge,
            trigger=CronTrigger(hour=3, minute=0),
            id="daily_retention_purge",
            name="Daily GDPR Data Retention Purge",
            replace_existing=True
        )
        
        # Schedule weekly cleanup of old export jobs (Fridays at 4 AM)
        self.scheduler.add_job(
            self.cleanup_old_exports,
            trigger=CronTrigger(day_of_week="fri", hour=4, minute=0),
            id="weekly_export_cleanup",
            name="Weekly Export Job Cleanup",
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("RetentionWorker initialized with scheduled jobs")
    
    async def shutdown(self):
        """Shutdown the scheduler."""
        if self.scheduler:
            self.scheduler.shutdown()
            logger.info("RetentionWorker shut down")
    
    async def run_retention_purge(self):
        """Run the retention purge process for all users with retention enabled."""
        logger.info("Starting retention purge job")
        
        try:
            async with db_manager.get_session() as session:
                # Get users with retention policy enabled
                result = await session.execute(
                    select(User).where(User.retention_policy_enabled == True)
                )
                users = result.scalars().all()
                
                total_deleted = 0
                total_skipped = 0
                
                for user in users:
                    deleted, skipped = await self._purge_user_expired_sessions(session, user)
                    total_deleted += deleted
                    total_skipped += skipped
                
                # Update last purge timestamp for all processed users
                if users:
                    await session.execute(
                        update(User)
                        .where(User.id.in_([u.id for u in users]))
                        .values(last_purge_at=now_utc())
                    )
                    await session.commit()
                
                # Log audit entry for this purge run
                audit_entry = RetentionAuditLog(
                    action="purge",
                    details={
                        "users_processed": len(users),
                        "sessions_deleted": total_deleted,
                        "sessions_skipped": total_skipped,
                        "scheduled_run": True
                    }
                )
                session.add(audit_entry)
                await session.commit()
                
                logger.info(
                    f"Retention purge completed: {total_deleted} sessions deleted, "
                    f"{total_skipped} skipped (legal holds/expiring exports)"
                )
                
        except Exception as e:
            logger.error(f"Retention purge job failed: {e}", exc_info=True)
            # Log failure in audit log
            try:
                async with db_manager.get_session() as session:
                    audit_entry = RetentionAuditLog(
                        action="purge",
                        details={
                            "error": str(e),
                            "scheduled_run": True,
                            "status": "failed"
                        }
                    )
                    session.add(audit_entry)
                    await session.commit()
            except Exception as log_err:
                logger.error(f"Failed to log audit entry: {log_err}")
    
    async def _purge_user_expired_sessions(
        self, session: AsyncSession, user: User
    ) -> tuple[int, int]:
        """Purge expired sessions for a user.
        
        Returns:
            Tuple of (deleted_count, skipped_count)
        """
        retention_days = user.retention_period_days or 90
        cutoff_date = now_utc() - timedelta(days=retention_days)
        
        # Find sessions that are:
        # 1. Older than retention period
        # 2. Not already purged
        # 3. Not soft-deleted
        result = await session.execute(
            select(Session).where(
                and_(
                    Session.user_id == user.id,
                    Session.created_at < cutoff_date,
                    Session.is_purged == False,
                    Session.deleted_at.is_(None)
                )
            )
        )
        expired_sessions = result.scalars().all()
        
        deleted_count = 0
        skipped_count = 0
        
        for sess in expired_sessions:
            # Check for active legal holds
            has_legal_hold = await self._check_legal_hold(session, sess.id)
            if has_legal_hold:
                logger.debug(f"Session {sess.id} has active legal hold, skipping purge")
                skipped_count += 1
                continue
            
            # Check for pending exports
            has_pending_export = await self._check_pending_export(session, sess.id)
            if has_pending_export:
                logger.debug(f"Session {sess.id} has pending export, skipping purge")
                skipped_count += 1
                continue
            
            # Purge the session
            await self._purge_session(session, sess, user.id)
            deleted_count += 1
        
        return deleted_count, skipped_count
    
    async def _check_legal_hold(self, session: AsyncSession, session_id) -> bool:
        """Check if session has an active legal hold."""
        result = await session.execute(
            select(LegalHold).where(
                and_(
                    LegalHold.session_id == session_id,
                    LegalHold.is_active == True,
                    or_(
                        LegalHold.expires_at.is_(None),
                        LegalHold.expires_at > now_utc()
                    )
                )
            )
        )
        return result.scalar_one_or_none() is not None
    
    async def _check_pending_export(self, session: AsyncSession, session_id: str) -> bool:
        """Check if session is part of a pending export job."""
        result = await session.execute(
            select(ExportJob).where(
                and_(
                    ExportJob.status.in_(["pending", "processing"]),
                    ExportJob.expires_at > now_utc()
                )
            )
        )
        export_jobs = result.scalars().all()
        
        # Check if this session_id is in any export's session_ids list
        for job in export_jobs:
            if session_id in (job.session_ids or []):
                return True
        return False
    
    async def _purge_session(
        self, session: AsyncSession, sess: Session, user_id: str
    ):
        """Purge a single session - soft delete and remove storage."""
        try:
            # Delete from storage first
            if sess.storage_key:
                try:
                    await storage.delete(sess.storage_key)
                    logger.debug(f"Deleted storage for session {sess.id}")
                except Exception as e:
                    logger.warning(f"Failed to delete storage for session {sess.id}: {e}")
            
            # Soft delete in database
            sess.deleted_at = now_utc()
            sess.is_purged = True
            sess.deletion_reason = "retention_policy"
            
            # Log audit entry
            audit_entry = RetentionAuditLog(
                session_id=sess.id,
                user_id=user_id,
                action="purge",
                details={
                    "reason": "retention_policy",
                    "retention_days_applied": True,
                    "original_created_at": sess.created_at.isoformat() if sess.created_at else None
                }
            )
            session.add(audit_entry)
            
        except Exception as e:
            logger.error(f"Failed to purge session {sess.id}: {e}", exc_info=True)
            raise
    
    async def cleanup_old_exports(self):
        """Clean up expired export jobs and their storage."""
        logger.info("Starting export job cleanup")
        
        try:
            async with db_manager.get_session() as session:
                cutoff_date = now_utc() - timedelta(days=30)
                
                # Find expired export jobs
                result = await session.execute(
                    select(ExportJob).where(
                        and_(
                            ExportJob.status == "completed",
                            ExportJob.expires_at < cutoff_date
                        )
                    )
                )
                old_exports = result.scalars().all()
                
                deleted_count = 0
                for export in old_exports:
                    # Delete from storage if exists
                    if export.storage_key:
                        try:
                            await storage.delete(export.storage_key)
                        except Exception as e:
                            logger.warning(f"Failed to delete export storage {export.storage_key}: {e}")
                    
                    await session.delete(export)
                    deleted_count += 1
                
                if deleted_count > 0:
                    await session.commit()
                    
                    # Log audit
                    audit_entry = RetentionAuditLog(
                        action="cleanup",
                        details={
                            "export_jobs_deleted": deleted_count,
                            "type": "expired_exports"
                        }
                    )
                    session.add(audit_entry)
                    await session.commit()
                
                logger.info(f"Export cleanup completed: {deleted_count} old exports removed")
                
        except Exception as e:
            logger.error(f"Export cleanup job failed: {e}", exc_info=True)
    
    async def manual_purge_user(
        self, user_id: str, performed_by: Optional[str] = None
    ) -> dict:
        """Manually trigger retention purge for a specific user.
        
        Returns:
            Dict with purge statistics
        """
        async with db_manager.get_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            deleted_count, skipped_count = await self._purge_user_expired_sessions(
                session, user
            )
            
            user.last_purge_at = now_utc()
            
            # Log audit
            audit_entry = RetentionAuditLog(
                user_id=user_id,
                action="purge",
                performed_by=performed_by,
                details={
                    "manual_trigger": True,
                    "sessions_deleted": deleted_count,
                    "sessions_skipped": skipped_count
                }
            )
            session.add(audit_entry)
            await session.commit()
            
            return {
                "user_id": str(user_id),
                "sessions_deleted": deleted_count,
                "sessions_skipped": skipped_count,
                "performed_at": now_utc().isoformat()
            }


# Global retention worker instance
retention_worker = RetentionWorker()


async def initialize_retention_worker():
    """Initialize the retention worker on startup."""
    await retention_worker.initialize()


async def shutdown_retention_worker():
    """Shutdown the retention worker."""
    await retention_worker.shutdown()