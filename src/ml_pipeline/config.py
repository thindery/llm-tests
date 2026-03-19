"""
ML Pipeline Configuration.

Manages configuration settings for the ML pipeline including
model paths, thresholds, and feature flags.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, Optional, List


@dataclass
class ModelConfig:
    """Configuration for a specific ML model version."""
    
    version: str = "v1.0.0"
    model_path: Optional[str] = None
    threshold: float = 0.7  # Minimum confidence threshold for auto-application
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if not 0.0 <= self.threshold <= 1.0:
            raise ValueError(f"Threshold must be between 0.0 and 1.0, got {self.threshold}")


@dataclass
class FeatureConfig:
    """Configuration for feature extraction."""
    
    # Text feature settings
    max_title_length: int = 200
    max_description_length: int = 5000
    
    # Feature flags
    use_title: bool = True
    use_description: bool = True
    use_labels: bool = True
    use_history: bool = True
    
    # Derived features
    use_length_features: bool = True
    use_sentiment: bool = False  # Enable when sentiment model is ready
    use_keyword_extraction: bool = True
    
    # Feature cache settings
    cache_enabled: bool = True
    cache_ttl_seconds: int = 3600  # 1 hour


@dataclass
class ShadowModeConfig:
    """Configuration for shadow mode operation."""
    
    enabled: bool = True
    
    # Percentage of predictions to run in shadow mode (0-100)
    # 100 = all predictions, 0 = none
    sampling_rate: float = 100.0
    
    # Auto-resolve shadow predictions after this many days
    auto_resolve_days: int = 30
    
    # Minimum confidence to track in shadow mode
    min_confidence_threshold: float = 0.5
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if not 0.0 <= self.sampling_rate <= 100.0:
            raise ValueError(
                f"Sampling rate must be between 0.0 and 100.0, got {self.sampling_rate}"
            )


@dataclass
class DatabaseConfig:
    """Database configuration for ML pipeline."""
    
    connection_string: Optional[str] = None
    pool_size: int = 5
    max_overflow: int = 10
    
    # Connection string from environment if not provided
    def __post_init__(self):
        if self.connection_string is None:
            self.connection_string = os.getenv("DATABASE_URL")


@dataclass
class MLConfig:
    """
    Main configuration class for the ML Pipeline.
    
    This class manages all configuration settings for the ML pipeline
    including model settings, feature extraction, shadow mode, and
    database connections.
    
    Example:
        >>> config = MLConfig.from_env()
        >>> print(config.active_model.version)
        >>> print(config.shadow_mode.enabled)
    """
    
    # Model configuration
    active_model: ModelConfig = field(default_factory=lambda: ModelConfig())
    models: Dict[str, ModelConfig] = field(default_factory=dict)
    
    # Feature configuration
    features: FeatureConfig = field(default_factory=lambda: FeatureConfig())
    
    # Shadow mode configuration
    shadow_mode: ShadowModeConfig = field(default_factory=lambda: ShadowModeConfig())
    
    # Database configuration
    database: DatabaseConfig = field(default_factory=lambda: DatabaseConfig())
    
    # General settings
    debug: bool = False
    log_level: str = "INFO"
    
    # Paths
    data_dir: Path = field(default_factory=lambda: Path("data/ml"))
    models_dir: Path = field(default_factory=lambda: Path("models"))
    
    def __post_init__(self):
        """Set up configuration after initialization."""
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        # Set default logging level from env
        if os.getenv("ML_DEBUG"):
            self.debug = True
            self.log_level = "DEBUG"
    
    @classmethod
    def from_env(cls) -> "MLConfig":
        """
        Create configuration from environment variables.
        
        Environment variables:
            - ML_MODEL_VERSION: Active model version
            - ML_MODEL_THRESHOLD: Confidence threshold (0.0-1.0)
            - ML_SHADOW_MODE: Enable shadow mode (true/false)
            - ML_SHADOW_SAMPLING: Shadow mode sampling rate (0-100)
            - DATABASE_URL: Database connection string
            - ML_DEBUG: Enable debug mode
            
        Returns:
            MLConfig instance with values from environment
        """
        # Model configuration
        model_version = os.getenv("ML_MODEL_VERSION", "v1.0.0")
        model_threshold = float(os.getenv("ML_MODEL_THRESHOLD", "0.7"))
        
        active_model = ModelConfig(
            version=model_version,
            threshold=model_threshold,
            enabled=os.getenv("ML_MODEL_DISABLED", "").lower() != "true"
        )
        
        # Shadow mode configuration
        shadow_mode = ShadowModeConfig(
            enabled=os.getenv("ML_SHADOW_MODE", "true").lower() == "true",
            sampling_rate=float(os.getenv("ML_SHADOW_SAMPLING", "100.0")),
            auto_resolve_days=int(os.getenv("ML_AUTO_RESOLVE_DAYS", "30")),
        )
        
        # Feature configuration
        features = FeatureConfig(
            use_sentiment=os.getenv("ML_USE_SENTIMENT", "").lower() == "true",
            cache_enabled=os.getenv("ML_CACHE_DISABLED", "").lower() != "true",
        )
        
        # Database configuration
        database = DatabaseConfig()
        
        return cls(
            active_model=active_model,
            shadow_mode=shadow_mode,
            features=features,
            database=database,
            debug=os.getenv("ML_DEBUG", "").lower() == "true",
            log_level=os.getenv("ML_LOG_LEVEL", "INFO"),
        )
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "MLConfig":
        """
        Create configuration from a dictionary.
        
        Args:
            config_dict: Dictionary containing configuration values
            
        Returns:
            MLConfig instance
        """
        # Parse model config
        model_dict = config_dict.get("model", {})
        active_model = ModelConfig(**model_dict)
        
        # Parse shadow mode config
        shadow_dict = config_dict.get("shadow_mode", {})
        shadow_mode = ShadowModeConfig(**shadow_dict)
        
        # Parse feature config
        feature_dict = config_dict.get("features", {})
        features = FeatureConfig(**feature_dict)
        
        # Parse database config
        db_dict = config_dict.get("database", {})
        database = DatabaseConfig(**db_dict)
        
        return cls(
            active_model=active_model,
            shadow_mode=shadow_mode,
            features=features,
            database=database,
            debug=config_dict.get("debug", False),
            log_level=config_dict.get("log_level", "INFO"),
            data_dir=Path(config_dict.get("data_dir", "data/ml")),
            models_dir=Path(config_dict.get("models_dir", "models")),
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to dictionary.
        
        Returns:
            Dictionary representation of the configuration
        """
        return {
            "model": {
                "version": self.active_model.version,
                "threshold": self.active_model.threshold,
                "enabled": self.active_model.enabled,
            },
            "shadow_mode": {
                "enabled": self.shadow_mode.enabled,
                "sampling_rate": self.shadow_mode.sampling_rate,
                "auto_resolve_days": self.shadow_mode.auto_resolve_days,
            },
            "features": {
                "use_title": self.features.use_title,
                "use_description": self.features.use_description,
                "use_sentiment": self.features.use_sentiment,
                "cache_enabled": self.features.cache_enabled,
            },
            "debug": self.debug,
            "log_level": self.log_level,
        }
    
    def get_model_config(self, version: Optional[str] = None) -> ModelConfig:
        """
        Get configuration for a specific model version.
        
        Args:
            version: Model version (None for active model)
            
        Returns:
            ModelConfig for the requested version
        """
        if version is None or version == self.active_model.version:
            return self.active_model
        
        if version in self.models:
            return self.models[version]
        
        raise ValueError(f"Model version '{version}' not found in configuration")
    
    def should_run_shadow_mode(self, confidence: float) -> bool:
        """
        Determine if a prediction should be tracked in shadow mode.
        
        Args:
            confidence: Prediction confidence score
            
        Returns:
            True if prediction should be tracked in shadow mode
        """
        if not self.shadow_mode.enabled:
            return False
        
        if confidence < self.shadow_mode.min_confidence_threshold:
            return False
        
        # Sampling is handled by caller - they can use random.random() < sampling_rate/100
        return True


# Global configuration instance (lazy-loaded)
_config: Optional[MLConfig] = None


def get_ml_config() -> MLConfig:
    """
    Get the global ML configuration instance.
    
    This function returns a cached configuration instance.
    First call loads from environment variables.
    
    Returns:
        MLConfig instance
    """
    global _config
    if _config is None:
        _config = MLConfig.from_env()
    return _config


def set_ml_config(config: MLConfig) -> None:
    """
    Set the global ML configuration instance.
    
    Args:
        config: MLConfig instance to use globally
    """
    global _config
    _config = config


def reset_ml_config() -> None:
    """Reset the global configuration to None (force reload on next get)."""
    global _config
    _config = None