"""Configuration System for ML Pipeline.

Provides environment-based configuration with graceful degradation support.
"""

from __future__ import annotations

import os
import json
import logging
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)


class Environment(Enum):
    """Deployment environment."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class MLFeatureLevel(Enum):
    """ML feature enablement level."""
    DISABLED = "disabled"  # Pure momentum strategy
    SHADOW = "shadow"      # ML runs in shadow mode only
    ENHANCED = "enhanced"  # ML-enhanced with fallback to momentum
    FULL = "full"          # Full ML mode, fail if ML unavailable


@dataclass
class SlackConfig:
    """Slack notification configuration."""
    webhook_url: Optional[str] = None
    channel: str = "#alerts"
    username: str = "Kalshi-Trader-Bot"
    emoji: str = ":chart_with_upwards_trend:"
    timeout_seconds: float = 5.0
    
    @classmethod
    def from_env(cls) -> "SlackConfig":
        """Load from environment variables."""
        return cls(
            webhook_url=os.getenv("SLACK_WEBHOOK_URL"),
            channel=os.getenv("SLACK_CHANNEL", "#alerts"),
            username=os.getenv("SLACK_USERNAME", "Kalshi-Trader-Bot"),
            emoji=os.getenv("SLACK_EMOJI", ":chart_with_upwards_trend:"),
            timeout_seconds=float(os.getenv("SLACK_TIMEOUT", "5.0")),
        )
    
    def is_configured(self) -> bool:
        """Check if Slack is properly configured."""
        return self.webhook_url is not None and len(self.webhook_url) > 0


@dataclass
class EmailConfig:
    """Email notification configuration."""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    from_address: str = "kalshi-trader@localhost"
    to_addresses: List[str] = field(default_factory=list)
    
    @classmethod
    def from_env(cls) -> "EmailConfig":
        """Load from environment variables."""
        to_addrs = os.getenv("EMAIL_TO_ADDRESSES", "")
        return cls(
            smtp_host=os.getenv("SMTP_HOST", ""),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_user=os.getenv("SMTP_USER", ""),
            smtp_password=os.getenv("SMTP_PASSWORD", ""),
            from_address=os.getenv("EMAIL_FROM", "kalshi-trader@localhost"),
            to_addresses=[a.strip() for a in to_addrs.split(",") if a.strip()] if to_addrs else [],
        )
    
    def is_configured(self) -> bool:
        """Check if email is properly configured."""
        return all([
            self.smtp_host,
            self.smtp_user,
            self.smtp_password,
            self.to_addresses,
        ])


@dataclass
class NotificationConfig:
    """Notification configuration."""
    slack: SlackConfig = field(default_factory=SlackConfig)
    email: EmailConfig = field(default_factory=EmailConfig)
    
    # Alert thresholds
    circuit_breaker_alert: bool = True
    daily_loss_alert: bool = True
    model_drift_alert: bool = True
    pnl_report: bool = True
    
    @classmethod
    def from_env(cls) -> "NotificationConfig":
        """Load from environment variables."""
        return cls(
            slack=SlackConfig.from_env(),
            email=EmailConfig.from_env(),
            circuit_breaker_alert=os.getenv("ALERT_CIRCUIT_BREAKER", "true").lower() == "true",
            daily_loss_alert=os.getenv("ALERT_DAILY_LOSS", "true").lower() == "true",
            model_drift_alert=os.getenv("ALERT_MODEL_DRIFT", "true").lower() == "true",
            pnl_report=os.getenv("ALERT_PNL_REPORT", "true").lower() == "true",
        )


@dataclass
class MonitoringConfig:
    """Monitoring configuration."""
    health_check_interval_seconds: int = 60
    metrics_retention_days: int = 30
    dashboard_port: int = 8501
    api_port: int = 8000
    log_level: str = "INFO"
    
    # Model drift detection
    drift_threshold: float = 0.05
    drift_check_interval_hours: int = 6
    min_samples_for_drift: int = 50
    
    @classmethod
    def from_env(cls) -> "MonitoringConfig":
        """Load from environment variables."""
        return cls(
            health_check_interval_seconds=int(os.getenv("HEALTH_CHECK_INTERVAL", "60")),
            metrics_retention_days=int(os.getenv("METRICS_RETENTION_DAYS", "30")),
            dashboard_port=int(os.getenv("DASHBOARD_PORT", "8501")),
            api_port=int(os.getenv("API_PORT", "8000")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            drift_threshold=float(os.getenv("DRIFT_THRESHOLD", "0.05")),
            drift_check_interval_hours=int(os.getenv("DRIFT_CHECK_INTERVAL", "6")),
            min_samples_for_drift=int(os.getenv("MIN_SAMPLES_DRIFT", "50")),
        )


@dataclass
class IntegrationConfig:
    """ML integration configuration."""
    ml_feature_level: MLFeatureLevel = MLFeatureLevel.ENHANCED
    
    # Fallback settings
    fallback_to_momentum: bool = True
    momentum_confidence_threshold: float = 0.6
    ml_override_threshold: float = 0.75  # ML confidence to override momentum
    
    # Trading loop settings
    enable_auto_position_sizing: bool = True
    enable_safety_controls: bool = True
    enable_graduation_logic: bool = True
    enable_ab_testing: bool = True
    
    # Confidence blending
    bayesian_weight: float = 0.4
    ml_weight: float = 0.6
    
    @classmethod
    def from_env(cls) -> "IntegrationConfig":
        """Load from environment variables."""
        level_str = os.getenv("ML_FEATURE_LEVEL", "enhanced")
        level = MLFeatureLevel(level_str) if level_str in [e.value for e in MLFeatureLevel] else MLFeatureLevel.ENHANCED
        
        return cls(
            ml_feature_level=level,
            fallback_to_momentum=os.getenv("FALLBACK_TO_MOMENTUM", "true").lower() == "true",
            momentum_confidence_threshold=float(os.getenv("MOMENTUM_THRESHOLD", "0.6")),
            ml_override_threshold=float(os.getenv("ML_OVERRIDE_THRESHOLD", "0.75")),
            enable_auto_position_sizing=os.getenv("AUTO_POSITION_SIZE", "true").lower() == "true",
            enable_safety_controls=os.getenv("ENABLE_SAFETY", "true").lower() == "true",
            enable_graduation_logic=os.getenv("ENABLE_GRADUATION", "true").lower() == "true",
            enable_ab_testing=os.getenv("ENABLE_AB_TEST", "true").lower() == "true",
            bayesian_weight=float(os.getenv("BAYESIAN_WEIGHT", "0.4")),
            ml_weight=float(os.getenv("ML_WEIGHT", "0.6")),
        )


@dataclass
class MLConfig:
    """Complete ML pipeline configuration."""
    environment: Environment = Environment.DEVELOPMENT
    integration: IntegrationConfig = field(default_factory=IntegrationConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    notifications: NotificationConfig = field(default_factory=NotificationConfig)
    
    # Paths
    db_path: str = "data/ml_pipeline.db"
    model_registry_path: str = "data/models"
    artifacts_path: str = "data/artifacts"
    logs_path: str = "logs"
    
    def __post_init__(self):
        """Ensure paths exist."""
        for path_attr in ['db_path', 'model_registry_path', 'artifacts_path', 'logs_path']:
            path = getattr(self, path_attr)
            if path:
                Path(path).parent.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def from_env(cls) -> "MLConfig":
        """Load configuration from environment."""
        env_str = os.getenv("KALSHI_ENV", "development")
        env = Environment(env_str) if env_str in [e.value for e in Environment] else Environment.DEVELOPMENT
        
        return cls(
            environment=env,
            integration=IntegrationConfig.from_env(),
            monitoring=MonitoringConfig.from_env(),
            notifications=NotificationConfig.from_env(),
            db_path=os.getenv("DB_PATH", "data/ml_pipeline.db"),
            model_registry_path=os.getenv("MODEL_REGISTRY_PATH", "data/models"),
            artifacts_path=os.getenv("ARTIFACTS_PATH", "data/artifacts"),
            logs_path=os.getenv("LOGS_PATH", "logs"),
        )
    
    @classmethod
    def from_file(cls, path: str) -> "MLConfig":
        """Load configuration from JSON file."""
        with open(path, 'r') as f:
            data = json.load(f)
        
        # Parse enums
        data['environment'] = Environment(data.get('environment', 'development'))
        data['integration']['ml_feature_level'] = MLFeatureLevel(
            data.get('integration', {}).get('ml_feature_level', 'enhanced')
        )
        
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'environment': self.environment.value,
            'integration': {
                'ml_feature_level': self.integration.ml_feature_level.value,
                'fallback_to_momentum': self.integration.fallback_to_momentum,
                'momentum_confidence_threshold': self.integration.momentum_confidence_threshold,
                'ml_override_threshold': self.integration.ml_override_threshold,
                'enable_auto_position_sizing': self.integration.enable_auto_position_sizing,
                'enable_safety_controls': self.integration.enable_safety_controls,
                'enable_graduation_logic': self.integration.enable_graduation_logic,
                'enable_ab_testing': self.integration.enable_ab_testing,
                'bayesian_weight': self.integration.bayesian_weight,
                'ml_weight': self.integration.ml_weight,
            },
            'monitoring': {
                'health_check_interval_seconds': self.monitoring.health_check_interval_seconds,
                'metrics_retention_days': self.monitoring.metrics_retention_days,
                'dashboard_port': self.monitoring.dashboard_port,
                'api_port': self.monitoring.api_port,
                'log_level': self.monitoring.log_level,
                'drift_threshold': self.monitoring.drift_threshold,
                'drift_check_interval_hours': self.monitoring.drift_check_interval_hours,
                'min_samples_for_drift': self.monitoring.min_samples_for_drift,
            },
            'notifications': {
                'circuit_breaker_alert': self.notifications.circuit_breaker_alert,
                'daily_loss_alert': self.notifications.daily_loss_alert,
                'model_drift_alert': self.notifications.model_drift_alert,
                'pnl_report': self.notifications.pnl_report,
                'slack': self.notifications.slack.is_configured(),
                'email': self.notifications.email.is_configured(),
            },
            'paths': {
                'db_path': self.db_path,
                'model_registry_path': self.model_registry_path,
                'artifacts_path': self.artifacts_path,
                'logs_path': self.logs_path,
            },
        }
    
    def save(self, path: str) -> None:
        """Save configuration to file."""
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
        logger.info(f"Configuration saved to {path}")


def load_config(path: Optional[str] = None) -> MLConfig:
    """Load configuration.
    
    Priority:
    1. From file if path provided
    2. From environment variables
    3. Default configuration
    
    Parameters
    ----------
    path : str | None
        Path to config file
        
    Returns
    -------
    MLConfig
        Loaded configuration
    """
    if path and Path(path).exists():
        logger.info(f"Loading configuration from {path}")
        return MLConfig.from_file(path)
    
    # Check for config file in standard locations
    config_paths = [
        "config/ml_config.json",
        "config/ml_config.yaml",
        os.path.expanduser("~/.kalshi/ml_config.json"),
        "/etc/kalshi/ml_config.json",
    ]
    
    for config_path in config_paths:
        if Path(config_path).exists():
            logger.info(f"Loading configuration from {config_path}")
            return MLConfig.from_file(config_path)
    
    # Load from environment
    logger.info("Loading configuration from environment variables")
    return MLConfig.from_env()
