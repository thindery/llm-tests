"""Database configuration with Railway PostgreSQL support."""

from typing import AsyncGenerator, Generator
import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

logger = logging.getLogger(__name__)

# Base for SQLAlchemy models
Base = declarative_base()


class DatabaseManager:
    """Manages database connections for Railway PostgreSQL."""
    
    def __init__(self):
        self._async_engine: AsyncEngine | None = None
        self._async_session_maker: async_sessionmaker | None = None
        self._sync_engine = None
        self._sync_session_maker = None
    
    def init_db(self) -> None:
        """Initialize database engines."""
        self._init_async_engine()
        self._init_sync_engine()
        logger.info("Database engines initialized")
    
    def _init_async_engine(self) -> None:
        """Initialize async PostgreSQL engine."""
        try:
            self._async_engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DEBUG,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=3600,
            )
            self._async_session_maker = async_sessionmaker(
                self._async_engine,
                expire_on_commit=False,
                autoflush=False,
                autocommit=False,
            )
            logger.info("Async engine created successfully")
        except Exception as e:
            logger.error(f"Failed to create async engine: {e}")
            raise
    
    def _init_sync_engine(self) -> None:
        """Initialize sync PostgreSQL engine for migrations."""
        try:
            self._sync_engine = create_engine(
                settings.database_url_sync,
                echo=settings.DEBUG,
                pool_pre_ping=True,
            )
            self._sync_session_maker = sessionmaker(
                self._sync_engine,
                expire_on_commit=False,
            )
            logger.info("Sync engine created successfully")
        except Exception as e:
            logger.error(f"Failed to create sync engine: {e}")
            # Non-critical for app startup
            pass
    
    @property
    def async_engine(self) -> AsyncEngine:
        """Get async engine."""
        if self._async_engine is None:
            raise RuntimeError("Database not initialized. Call init_db() first.")
        return self._async_engine
    
    @property
    def async_session(self) -> AsyncSession:
        """Get new async session."""
        if self._async_session_maker is None:
            raise RuntimeError("Database not initialized")
        return self._async_session_maker()
    
    async def close(self) -> None:
        """Close all database connections."""
        if self._async_engine:
            await self._async_engine.dispose()
            logger.info("Database connections closed")
    
    async def check_connection(self) -> bool:
        """Check if database is reachable."""
        try:
            async with self.async_engine.connect() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return False


# Global database manager instance
db_manager = DatabaseManager()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database sessions."""
    async with db_manager.async_session as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_db() -> Generator:
    """Get synchronous database session (for migrations/scripts)."""
    if db_manager._sync_session_maker is None:
        raise RuntimeError("Sync engine not initialized")
    session = db_manager._sync_session_maker()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def init_models() -> None:
    """Create database tables (for development only - use migrations in prod)."""
    async with db_manager.async_engine.begin() as conn:
        # await conn.run_sync(Base.metadata.create_all)
        pass  # Use alembic migrations instead
    logger.info("Database models initialized")