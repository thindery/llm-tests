"""Tests for GDPR data retention functionality."""

import asyncio
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4

# Mock the database and models before importing the worker
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture
def mock_session():
    """Create a mock session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.add = AsyncMock()
    session.flush = AsyncMock()
    session.delete = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_user():
    """Create a mock user with retention settings."""
    user = MagicMock()
    user.id = uuid4()
    user.email = "test@example.com"
    user.retention_policy_enabled = True
    user.retention_period_days = 90
    user.last_purge_at = None
    return user


@pytest.fixture
def mock_expired_session():
    """Create a mock expired session."""
    sess = MagicMock()
    sess.id = uuid4()
    sess.user_id = uuid4()
    sess.created_at = datetime.now(timezone.utc) - timedelta(days=100)
    sess.is_purged = False
    sess.deleted_at = None
    sess.storage_key = "sessions/test_session.json"
    return sess


@pytest.fixture
def mock_recent_session():
    """Create a mock recent session (not expired)."""
    sess = MagicMock()
    sess.id = uuid4()
    sess.user_id = uuid4()
    sess.created_at = datetime.now(timezone.utc) - timedelta(days=30)
    sess.is_purged = False
    sess.deleted_at = None
    sess.storage_key = None
    return sess


class TestRetentionModels:
    """Test retention model definitions."""
    
    def test_user_retention_columns(self):
        """Test that User model has retention columns."""
        # This would import the actual models and verify
        # For now, just verify the migration exists
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
            assert "retention_policy_enabled" in content
            assert "retention_period_days" in content
            assert "last_purge_at" in content
    
    def test_session_soft_delete_columns(self):
        """Test that Session model has soft delete columns."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
            assert "deleted_at" in content
            assert "deletion_reason" in content
            assert "is_purged" in content
    
    def test_legal_hold_table(self):
        """Test that LegalHold table is defined."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
            assert "legal_holds" in content
            assert "session_id" in content
            assert "reason" in content
            assert "reference_id" in content
    
    def test_export_jobs_table(self):
        """Test that ExportJob table is defined."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
            assert "export_jobs" in content
            assert "session_ids" in content
            assert "status" in content
    
    def test_retention_audit_table(self):
        """Test that RetentionAuditLog table is defined."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
            assert "retention_audit_log" in content
            assert "action" in content
            assert "details" in content


class TestRetentionWorker:
    """Test retention worker functionality."""
    
    @pytest.mark.asyncio
    async def test_retention_worker_initialization(self):
        """Test that retention worker initializes with scheduled jobs."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        with patch('apscheduler.schedulers.asyncio.AsyncIOScheduler') as MockScheduler:
            scheduler_instance = MagicMock()
            MockScheduler.return_value = scheduler_instance
            
            await worker.initialize()
            
            # Should add two jobs
            assert scheduler_instance.add_job.call_count == 2
            scheduler_instance.start.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_retention_purge_skips_legal_holds(self, mock_session, mock_user, mock_expired_session):
        """Test that retention purge skips sessions with legal holds."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        # Mock the database session
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_user]
        mock_session.execute.return_value = mock_result
        
        with patch.object(worker, '_check_legal_hold', return_value=True):
            with patch.object(worker, '_check_pending_export', return_value=False):
                deleted, skipped = await worker._purge_user_expired_sessions(
                    mock_session, mock_user
                )
        
        # Should have skipped the session
        assert skipped == 1
        assert deleted == 0
    
    @pytest.mark.asyncio
    async def test_retention_purge_skips_pending_exports(self, mock_session, mock_user, mock_expired_session):
        """Test that retention purge skips sessions in pending exports."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        with patch.object(worker, '_check_legal_hold', return_value=False):
            with patch.object(worker, '_check_pending_export', return_value=True):
                deleted, skipped = await worker._purge_user_expired_sessions(
                    mock_session, mock_user
                )
        
        # Should have skipped the session
        assert skipped == 1
        assert deleted == 0
    
    @pytest.mark.asyncio 
    async def test_retention_purge_deletes_expired_sessions(self, mock_session, mock_user, mock_expired_session):
        """Test that retention purge deletes expired sessions."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        # Mock finding expired sessions
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_expired_session]
        
        with patch.object(worker, '_check_legal_hold', return_value=False):
            with patch.object(worker, '_check_pending_export', return_value=False):
                with patch.object(worker, '_purge_session', new_callable=AsyncMock) as mock_purge:
                    deleted, skipped = await worker._purge_user_expired_sessions(
                        mock_session, mock_user
                    )
        
        # Should have deleted the session
        assert deleted == 1
        assert skipped == 0
    
    @pytest.mark.asyncio
    async def test_check_legal_hold_returns_true_when_active(self, mock_session):
        """Test that _check_legal_hold returns True when active hold exists."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        mock_hold = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_hold
        mock_session.execute.return_value = mock_result
        
        result = await worker._check_legal_hold(mock_session, str(uuid4()))
        assert result is True
    
    @pytest.mark.asyncio
    async def test_check_legal_hold_returns_false_when_inactive(self, mock_session):
        """Test that _check_legal_hold returns False when no active hold."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        
        result = await worker._check_legal_hold(mock_session, str(uuid4()))
        assert result is False
    
    @pytest.mark.asyncio
    async def test_session_purging_deletes_storage(self, mock_session, mock_expired_session):
        """Test that purging deletes the session from storage."""
        from src.agenttrace_backend.retention_worker import RetentionWorker
        
        worker = RetentionWorker()
        
        with patch('src.agenttrace_backend.retention_worker.storage') as mock_storage:
            mock_storage.delete = AsyncMock()
            
            await worker._purge_session(mock_session, mock_expired_session, uuid4())
            
            mock_storage.delete.assert_called_once_with(mock_expired_session.storage_key)


class TestRetentionSettings:
    """Test retention settings endpoints."""
    
    def test_retention_settings_update_validation(self):
        """Test validation of retention settings."""
        from src.agenttrace_backend.routers.retention import RetentionSettingsUpdate
        
        # Valid settings
        valid = RetentionSettingsUpdate(
            retention_policy_enabled=True,
            retention_period_days=365
        )
        assert valid.retention_period_days == 365
        
        # Test minimum days
        with pytest.raises(ValueError):
            RetentionSettingsUpdate(retention_period_days=0)


class TestLegalHolds:
    """Test legal hold functionality."""
    
    def test_legal_hold_creation_validation(self):
        """Test legal hold creation validation."""
        from src.agenttrace_backend.routers.retention import LegalHoldCreate
        
        # Valid hold
        valid = LegalHoldCreate(
            session_id=str(uuid4()),
            reason="Litigation hold",
            reference_id="CASE-001"
        )
        assert valid.reference_id == "CASE-001"
        
        # Empty reason should fail
        with pytest.raises(ValueError):
            LegalHoldCreate(
                session_id=str(uuid4()),
                reason=""
            )


class TestExportJobs:
    """Test export job functionality."""
    
    def test_export_job_validation(self):
        """Test export job creation validation."""
        from src.agenttrace_backend.routers.retention import ExportJobCreate
        
        # Valid export
        valid = ExportJobCreate(
            session_ids=[str(uuid4())],
            format="json"
        )
        assert valid.format == "json"
        
        # Invalid format
        with pytest.raises(ValueError):
            ExportJobCreate(
                session_ids=[str(uuid4())],
                format="xml"
            )
        
        # Empty session list
        with pytest.raises(ValueError):
            ExportJobCreate(session_ids=[])


class TestRetentionAuditLog:
    """Test retention audit logging."""
    
    def test_audit_log_model_exists(self):
        """Test that audit log model exists and has required fields."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/src/agenttrace_backend/models.py") as f:
            content = f.read()
            assert "class RetentionAuditLog" in content
            assert "action" in content
            assert "details" in content
            assert "created_at" in content


class TestAPSchedulerIntegration:
    """Test APScheduler integration."""
    
    def test_apscheduler_in_requirements(self):
        """Test that APScheduler is in requirements."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/requirements.txt") as f:
            content = f.read()
            assert "apscheduler" in content.lower()
    
    def test_retention_worker_imports(self):
        """Test that retention worker can be imported."""
        try:
            from src.agenttrace_backend.retention_worker import retention_worker, initialize_retention_worker, shutdown_retention_worker
            assert retention_worker is not None
        except ImportError as e:
            pytest.fail(f"Failed to import retention_worker: {e}")
    
    def test_retention_router_imports(self):
        """Test that retention router can be imported."""
        try:
            from src.agenttrace_backend.routers import retention
            assert retention.router is not None
        except ImportError as e:
            pytest.fail(f"Failed to import retention router: {e}")


class TestMigration:
    """Test database migration."""
    
    def test_migration_is_valid_python(self):
        """Test that migration file is valid Python."""
        import ast
        
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
        
        # Should parse without errors
        try:
            ast.parse(content)
        except SyntaxError as e:
            pytest.fail(f"Migration file has syntax error: {e}")
    
    def test_migration_has_upgrade_and_downgrade(self):
        """Test that migration has upgrade and downgrade functions."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
        
        assert "def upgrade()" in content
        assert "def downgrade()" in content
    
    def test_migration_has_correct_revision(self):
        """Test that migration has correct revision identifiers."""
        with open("/Users/thindery/.openclaw/workspace/projects/agenttrace-backend/alembic/versions/003_add_data_retention.py") as f:
            content = f.read()
        
        assert 'revision: str = "003"' in content
        assert 'down_revision: str = "002"' in content


class TestIntegration:
    """Integration tests for retention workflow."""
    
    @pytest.mark.asyncio
    async def test_full_retention_workflow(self):
        """Test the complete retention workflow."""
        # This is a placeholder for end-to-end integration tests
        # In a real test, this would set up a test database and run through
        # the entire workflow
        pass


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])