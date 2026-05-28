"""Application configuration with Railway environment support."""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Info
    APP_NAME: str = "AgentTrace"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Railway provides PORT env var
    PORT: int = 8000
    
    # Database - Railway provides DATABASE_URL
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/agenttrace"
    
    # Fallback for sync operations (migrations)
    DATABASE_URL_SYNC: Optional[str] = None
    
    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL for migrations."""
        if self.DATABASE_URL_SYNC:
            return self.DATABASE_URL_SYNC
        # Convert asyncpg URL to psycopg2 compatible
        return self.DATABASE_URL.replace(
            "postgresql+asyncpg://", "postgresql://"
        ).replace("postgresql+asyncpg", "postgresql")
    
    # R2 Storage Configuration
    R2_BUCKET_NAME: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_ENDPOINT_URL: Optional[str] = None
    R2_PUBLIC_URL_BASE: Optional[str] = None
    
    @property
    def r2_enabled(self) -> bool:
        """Check if R2 storage is configured."""
        return all([
            self.R2_BUCKET_NAME,
            self.R2_ACCESS_KEY_ID,
            self.R2_SECRET_ACCESS_KEY,
            self.R2_ENDPOINT_URL
        ])
    
    # Session Storage Fallback
    LOCAL_STORAGE_PATH: str = "/tmp/agenttrace/sessions"
    USE_LOCAL_STORAGE: bool = True
    
    # Security
    SECRET_KEY: str = os.urandom(32).hex()  # Default: random, override in prod
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - Override with your production domain
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json or console
    
    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_PING_TIMEOUT: int = 60
    
    # Session Replay Settings
    SESSION_MAX_SIZE_MB: int = 50
    SESSION_RETENTION_DAYS: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()