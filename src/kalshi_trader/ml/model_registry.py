"""Model Registry for Kalshi Trader ML Pipeline.

Provides version control, artifact storage, and model lifecycle management.
Supports both local filesystem and SQLite backends.
"""

from __future__ import annotations

import json
import pickle
import hashlib
import shutil
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import sqlite3

from .confidence_scorer import SuggestionType
from .model_training import TrainingResult, ModelType


class ModelStatus(str, Enum):
    """Status of a registered model."""
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"
    FAILED = "failed"


@dataclass
class ModelVersion:
    """Represents a versioned model in the registry."""
    version_id: str
    model_name: str
    suggestion_type: Optional[SuggestionType]
    model_type: ModelType
    status: ModelStatus
    created_at: datetime
    
    # Model artifacts
    model_path: str
    metadata_path: str
    
    # Training info
    training_timestamp: datetime
    n_samples: int
    n_features: int
    
    # Performance metrics
    test_accuracy: float
    test_precision: float
    test_recall: float
    test_f1: float
    test_auc: float
    
    # Cross-validation metrics
    cv_mean_accuracy: float
    cv_std_accuracy: float
    cv_mean_auc: float
    
    # Additional metadata
    tags: Dict[str, str] = field(default_factory=dict)
    description: str = ""
    parent_version: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'version_id': self.version_id,
            'model_name': self.model_name,
            'suggestion_type': self.suggestion_type.value if self.suggestion_type else None,
            'model_type': self.model_type.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'model_path': self.model_path,
            'metadata_path': self.metadata_path,
            'training_timestamp': self.training_timestamp.isoformat(),
            'n_samples': self.n_samples,
            'n_features': self.n_features,
            'test_accuracy': self.test_accuracy,
            'test_precision': self.test_precision,
            'test_recall': self.test_recall,
            'test_f1': self.test_f1,
            'test_auc': self.test_auc,
            'cv_mean_accuracy': self.cv_mean_accuracy,
            'cv_std_accuracy': self.cv_std_accuracy,
            'cv_mean_auc': self.cv_mean_auc,
            'tags': self.tags,
            'description': self.description,
            'parent_version': self.parent_version,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> ModelVersion:
        """Create from dictionary."""
        return cls(
            version_id=data['version_id'],
            model_name=data['model_name'],
            suggestion_type=SuggestionType(data['suggestion_type']) if data.get('suggestion_type') else None,
            model_type=ModelType(data['model_type']),
            status=ModelStatus(data['status']),
            created_at=datetime.fromisoformat(data['created_at']),
            model_path=data['model_path'],
            metadata_path=data['metadata_path'],
            training_timestamp=datetime.fromisoformat(data['training_timestamp']),
            n_samples=data['n_samples'],
            n_features=data['n_features'],
            test_accuracy=data['test_accuracy'],
            test_precision=data['test_precision'],
            test_recall=data['test_recall'],
            test_f1=data['test_f1'],
            test_auc=data['test_auc'],
            cv_mean_accuracy=data['cv_mean_accuracy'],
            cv_std_accuracy=data['cv_std_accuracy'],
            cv_mean_auc=data['cv_mean_auc'],
            tags=data.get('tags', {}),
            description=data.get('description', ''),
            parent_version=data.get('parent_version'),
        )
    
    def summary(self) -> str:
        """Generate human-readable summary."""
        lines = [
            f"Model: {self.model_name}",
            f"Version: {self.version_id}",
            f"Status: {self.status.value}",
            f"Type: {self.model_type.value}",
            f"Suggestion Type: {self.suggestion_type.value if self.suggestion_type else 'All'}",
            f"",
            f"Dataset: {self.n_samples} samples, {self.n_features} features",
            f"Training Date: {self.training_timestamp}",
            f"",
            f"Test Metrics:",
            f"  Accuracy: {self.test_accuracy:.3f}",
            f"  Precision: {self.test_precision:.3f}",
            f"  Recall: {self.test_recall:.3f}",
            f"  F1: {self.test_f1:.3f}",
            f"  AUC: {self.test_auc:.3f}",
            f"",
            f"CV Metrics:",
            f"  Accuracy: {self.cv_mean_accuracy:.3f} (+/- {self.cv_std_accuracy:.3f})",
            f"  AUC: {self.cv_mean_auc:.3f}",
        ]
        
        if self.description:
            lines.extend([f"", f"Description: {self.description}"])
        
        if self.tags:
            lines.extend([f"", f"Tags: {self.tags}"])
        
        return "\n".join(lines)


@dataclass
class ModelComparison:
    """Comparison between two model versions."""
    baseline_version: ModelVersion
    candidate_version: ModelVersion
    
    # Metric differences
    accuracy_diff: float
    precision_diff: float
    recall_diff: float
    f1_diff: float
    auc_diff: float
    
    # Recommendation
    is_improvement: bool
    is_significant: bool
    recommendation: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'baseline_version': self.baseline_version.to_dict(),
            'candidate_version': self.candidate_version.to_dict(),
            'accuracy_diff': self.accuracy_diff,
            'precision_diff': self.precision_diff,
            'recall_diff': self.recall_diff,
            'f1_diff': self.f1_diff,
            'auc_diff': self.auc_diff,
            'is_improvement': self.is_improvement,
            'is_significant': self.is_significant,
            'recommendation': self.recommendation,
        }


# Database schema for model registry
REGISTRY_SCHEMA = """
-- Model versions table
CREATE TABLE IF NOT EXISTS model_versions (
    version_id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    suggestion_type TEXT,
    model_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'staging',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_path TEXT NOT NULL,
    metadata_path TEXT NOT NULL,
    training_timestamp TIMESTAMP NOT NULL,
    n_samples INTEGER NOT NULL,
    n_features INTEGER NOT NULL,
    test_accuracy REAL NOT NULL,
    test_precision REAL NOT NULL,
    test_recall REAL NOT NULL,
    test_f1 REAL NOT NULL,
    test_auc REAL NOT NULL,
    cv_mean_accuracy REAL NOT NULL,
    cv_std_accuracy REAL NOT NULL,
    cv_mean_auc REAL NOT NULL,
    tags TEXT,  -- JSON string
    description TEXT,
    parent_version TEXT
);

-- Model transitions table (audit log)
CREATE TABLE IF NOT EXISTS model_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (version_id) REFERENCES model_versions(version_id)
);

-- Model metrics history
CREATE TABLE IF NOT EXISTS model_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES model_versions(version_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_name ON model_versions(model_name);
CREATE INDEX IF NOT EXISTS idx_suggestion_type ON model_versions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_status ON model_versions(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON model_versions(created_at);
"""


class ModelRegistry:
    """Model registry for version control and artifact storage.
    
    Manages model lifecycle from staging to production to archived.
    Supports both local filesystem and SQLite backends.
    
    Parameters
    ----------
    registry_path : str | Path
        Path to registry storage (directory for filesystem, file for SQLite)
    use_sqlite : bool
        Whether to use SQLite backend (default: True)
    
    Attributes
    ----------
    registry_path : Path
        Path to registry storage
    
    Example
    -------
    >>> from kalshi_trader.ml import ModelRegistry, ModelVersion
    >>> from kalshi_trader.ml import TrainingResult
    >>>
    >>> registry = ModelRegistry("/path/to/registry")
    >>> registry.initialize()
    >>>
    >>> # Register a new model
    >>> version = registry.register_model(
    ...     model_name="breakout_predictor",
    ...     training_result=result,
    ...     model_path="/path/to/model.pkl"
    ... )
    >>> print(f"Registered version: {version.version_id}")
    >>>
    >>> # Promote to production
    >>> registry.promote_to_production(version.version_id)
    >>>
    >>> # Get production model
    >>> prod_model = registry.get_production_model("breakout_predictor")
    """
    
    def __init__(
        self,
        registry_path: Optional[str | Path] = None,
        use_sqlite: bool = True
    ):
        self.use_sqlite = use_sqlite
        
        if registry_path is None:
            registry_path = Path.home() / ".kalshi-trader" / "model-registry"
        
        self.registry_path = Path(registry_path)
        
        if self.use_sqlite:
            self.db_path = self.registry_path / "registry.db"
            self.artifacts_path = self.registry_path / "artifacts"
        else:
            self.artifacts_path = self.registry_path / "models"
            self.metadata_path = self.registry_path / "metadata"
        
        self._conn: Optional[sqlite3.Connection] = None
    
    def initialize(self) -> None:
        """Initialize registry storage."""
        self.registry_path.mkdir(parents=True, exist_ok=True)
        self.artifacts_path.mkdir(parents=True, exist_ok=True)
        
        if self.use_sqlite:
            with sqlite3.connect(self.db_path) as conn:
                conn.executescript(REGISTRY_SCHEMA)
                conn.commit()
        else:
            self.metadata_path.mkdir(parents=True, exist_ok=True)
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection."""
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
        return self._conn
    
    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
    
    def _generate_version_id(
        self,
        model_name: str,
        timestamp: datetime
    ) -> str:
        """Generate unique version ID."""
        hash_input = f"{model_name}:{timestamp.isoformat()}"
        hash_val = hashlib.sha256(hash_input.encode()).hexdigest()[:12]
        return f"{model_name}-{timestamp.strftime('%Y%m%d')}-{hash_val}"
    
    def register_model(
        self,
        model_name: str,
        training_result: TrainingResult,
        model_path: str,
        description: str = "",
        tags: Optional[Dict[str, str]] = None,
        parent_version: Optional[str] = None
    ) -> ModelVersion:
        """Register a new model version.
        
        Parameters
        ----------
        model_name : str
            Name of the model
        training_result : TrainingResult
            Training results
        model_path : str
            Path to saved model file
        description : str
            Optional description
        tags : dict | None
            Optional tags
        parent_version : str | None
            Parent version ID (for lineage)
            
        Returns
        -------
        ModelVersion
            Registered model version
        """
        # Generate version ID
        version_id = self._generate_version_id(model_name, training_result.training_timestamp)
        
        # Copy model to artifacts
        artifact_path = self.artifacts_path / f"{version_id}.pkl"
        shutil.copy2(model_path, artifact_path)
        
        # Save metadata
        metadata = training_result.to_dict()
        metadata['version_id'] = version_id
        metadata['model_name'] = model_name
        metadata['description'] = description
        metadata['tags'] = tags or {}
        metadata['parent_version'] = parent_version
        
        metadata_path = self.artifacts_path / f"{version_id}_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Create version record
        version = ModelVersion(
            version_id=version_id,
            model_name=model_name,
            suggestion_type=training_result.suggestion_type,
            model_type=training_result.model_type,
            status=ModelStatus.STAGING,
            created_at=datetime.now(),
            model_path=str(artifact_path),
            metadata_path=str(metadata_path),
            training_timestamp=training_result.training_timestamp,
            n_samples=training_result.n_samples,
            n_features=training_result.n_features,
            test_accuracy=training_result.test_accuracy,
            test_precision=training_result.test_precision,
            test_recall=training_result.test_recall,
            test_f1=training_result.test_f1,
            test_auc=training_result.test_auc,
            cv_mean_accuracy=training_result.cv_results.mean_accuracy if training_result.cv_results else 0.0,
            cv_std_accuracy=training_result.cv_results.std_accuracy if training_result.cv_results else 0.0,
            cv_mean_auc=training_result.cv_results.mean_auc if training_result.cv_results else 0.0,
            tags=tags or {},
            description=description,
            parent_version=parent_version,
        )
        
        # Store in registry
        if self.use_sqlite:
            self._store_version_sqlite(version)
        else:
            self._store_version_filesystem(version)
        
        return version
    
    def _store_version_sqlite(self, version: ModelVersion) -> None:
        """Store version in SQLite."""
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO model_versions 
               (version_id, model_name, suggestion_type, model_type, status,
                model_path, metadata_path, training_timestamp, n_samples, n_features,
                test_accuracy, test_precision, test_recall, test_f1, test_auc,
                cv_mean_accuracy, cv_std_accuracy, cv_mean_auc, tags, description, parent_version)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                version.version_id, version.model_name,
                version.suggestion_type.value if version.suggestion_type else None,
                version.model_type.value, version.status.value,
                version.model_path, version.metadata_path,
                version.training_timestamp.isoformat(),
                version.n_samples, version.n_features,
                version.test_accuracy, version.test_precision,
                version.test_recall, version.test_f1, version.test_auc,
                version.cv_mean_accuracy, version.cv_std_accuracy, version.cv_mean_auc,
                json.dumps(version.tags), version.description, version.parent_version
            )
        )
        conn.commit()
    
    def _store_version_filesystem(self, version: ModelVersion) -> None:
        """Store version in filesystem."""
        version_file = self.metadata_path / f"{version.version_id}.json"
        with open(version_file, 'w') as f:
            json.dump(version.to_dict(), f, indent=2)
    
    def get_version(self, version_id: str) -> Optional[ModelVersion]:
        """Get a specific model version.
        
        Parameters
        ----------
        version_id : str
            Version ID
            
        Returns
        -------
        ModelVersion | None
            Model version or None if not found
        """
        if self.use_sqlite:
            return self._get_version_sqlite(version_id)
        else:
            return self._get_version_filesystem(version_id)
    
    def _get_version_sqlite(self, version_id: str) -> Optional[ModelVersion]:
        """Get version from SQLite."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM model_versions WHERE version_id = ?",
            (version_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
        
        return self._row_to_version(row)
    
    def _get_version_filesystem(self, version_id: str) -> Optional[ModelVersion]:
        """Get version from filesystem."""
        version_file = self.metadata_path / f"{version_id}.json"
        
        if not version_file.exists():
            return None
        
        with open(version_file, 'r') as f:
            data = json.load(f)
        
        return ModelVersion.from_dict(data)
    
    def _row_to_version(self, row: sqlite3.Row) -> ModelVersion:
        """Convert database row to ModelVersion."""
        return ModelVersion(
            version_id=row['version_id'],
            model_name=row['model_name'],
            suggestion_type=SuggestionType(row['suggestion_type']) if row['suggestion_type'] else None,
            model_type=ModelType(row['model_type']),
            status=ModelStatus(row['status']),
            created_at=datetime.fromisoformat(row['created_at']),
            model_path=row['model_path'],
            metadata_path=row['metadata_path'],
            training_timestamp=datetime.fromisoformat(row['training_timestamp']),
            n_samples=row['n_samples'],
            n_features=row['n_features'],
            test_accuracy=row['test_accuracy'],
            test_precision=row['test_precision'],
            test_recall=row['test_recall'],
            test_f1=row['test_f1'],
            test_auc=row['test_auc'],
            cv_mean_accuracy=row['cv_mean_accuracy'],
            cv_std_accuracy=row['cv_std_accuracy'],
            cv_mean_auc=row['cv_mean_auc'],
            tags=json.loads(row['tags']) if row['tags'] else {},
            description=row['description'] or '',
            parent_version=row['parent_version'],
        )
    
    def list_versions(
        self,
        model_name: Optional[str] = None,
        suggestion_type: Optional[SuggestionType] = None,
        status: Optional[ModelStatus] = None,
        limit: int = 100
    ) -> List[ModelVersion]:
        """List model versions with optional filtering.
        
        Parameters
        ----------
        model_name : str | None
            Filter by model name
        suggestion_type : SuggestionType | None
            Filter by suggestion type
        status : ModelStatus | None
            Filter by status
        limit : int
            Maximum number of results
            
        Returns
        -------
        list[ModelVersion]
            List of model versions
        """
        if self.use_sqlite:
            return self._list_versions_sqlite(model_name, suggestion_type, status, limit)
        else:
            return self._list_versions_filesystem(model_name, suggestion_type, status, limit)
    
    def _list_versions_sqlite(
        self,
        model_name: Optional[str],
        suggestion_type: Optional[SuggestionType],
        status: Optional[ModelStatus],
        limit: int
    ) -> List[ModelVersion]:
        """List versions from SQLite."""
        conn = self._get_connection()
        
        query = "SELECT * FROM model_versions WHERE 1=1"
        params = []
        
        if model_name:
            query += " AND model_name = ?"
            params.append(model_name)
        if suggestion_type:
            query += " AND suggestion_type = ?"
            params.append(suggestion_type.value)
        if status:
            query += " AND status = ?"
            params.append(status.value)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        
        return [self._row_to_version(row) for row in cursor.fetchall()]
    
    def _list_versions_filesystem(
        self,
        model_name: Optional[str],
        suggestion_type: Optional[SuggestionType],
        status: Optional[ModelStatus],
        limit: int
    ) -> List[ModelVersion]:
        """List versions from filesystem."""
        versions = []
        
        for version_file in sorted(self.metadata_path.glob("*.json"), reverse=True):
            with open(version_file, 'r') as f:
                data = json.load(f)
            
            version = ModelVersion.from_dict(data)
            
            # Apply filters
            if model_name and version.model_name != model_name:
                continue
            if suggestion_type and version.suggestion_type != suggestion_type:
                continue
            if status and version.status != status:
                continue
            
            versions.append(version)
            
            if len(versions) >= limit:
                break
        
        return versions
    
    def promote_to_production(
        self,
        version_id: str,
        reason: str = ""
    ) -> ModelVersion:
        """Promote a model version to production.
        
        Archives any existing production model for the same
        suggestion type.
        
        Parameters
        ----------
        version_id : str
            Version ID to promote
        reason : str
            Reason for promotion
            
        Returns
        -------
        ModelVersion
            Updated model version
        """
        version = self.get_version(version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")
        
        # Archive existing production models for this suggestion type
        if version.suggestion_type:
            existing = self.get_production_model_for_type(version.suggestion_type)
            if existing and existing.version_id != version_id:
                self.update_status(existing.version_id, ModelStatus.ARCHIVED, "Replaced by new production model")
        
        # Promote new version
        self.update_status(version_id, ModelStatus.PRODUCTION, reason)
        
        return self.get_version(version_id)
    
    def update_status(
        self,
        version_id: str,
        new_status: ModelStatus,
        reason: str = ""
    ) -> ModelVersion:
        """Update model version status.
        
        Parameters
        ----------
        version_id : str
            Version ID
        new_status : ModelStatus
            New status
        reason : str
            Reason for status change
            
        Returns
        -------
        ModelVersion
            Updated model version
        """
        version = self.get_version(version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")
        
        old_status = version.status
        
        if self.use_sqlite:
            conn = self._get_connection()
            conn.execute(
                "UPDATE model_versions SET status = ? WHERE version_id = ?",
                (new_status.value, version_id)
            )
            conn.execute(
                """INSERT INTO model_transitions 
                   (version_id, from_status, to_status, reason)
                   VALUES (?, ?, ?, ?)""",
                (version_id, old_status.value, new_status.value, reason)
            )
            conn.commit()
        else:
            version.status = new_status
            self._store_version_filesystem(version)
        
        return self.get_version(version_id)
    
    def get_production_model(
        self,
        model_name: str
    ) -> Optional[ModelVersion]:
        """Get current production model for a model name.
        
        Parameters
        ----------
        model_name : str
            Model name
            
        Returns
        -------
        ModelVersion | None
            Production model or None
        """
        versions = self.list_versions(model_name=model_name, status=ModelStatus.PRODUCTION, limit=1)
        return versions[0] if versions else None
    
    def get_production_model_for_type(
        self,
        suggestion_type: SuggestionType
    ) -> Optional[ModelVersion]:
        """Get current production model for a suggestion type.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Suggestion type
            
        Returns
        -------
        ModelVersion | None
            Production model or None
        """
        versions = self.list_versions(
            suggestion_type=suggestion_type,
            status=ModelStatus.PRODUCTION,
            limit=1
        )
        return versions[0] if versions else None
    
    def compare_versions(
        self,
        baseline_id: str,
        candidate_id: str
    ) -> ModelComparison:
        """Compare two model versions.
        
        Parameters
        ----------
        baseline_id : str
            Baseline version ID
        candidate_id : str
            Candidate version ID
            
        Returns
        -------
        ModelComparison
            Comparison results
        """
        baseline = self.get_version(baseline_id)
        candidate = self.get_version(candidate_id)
        
        if not baseline:
            raise ValueError(f"Baseline version {baseline_id} not found")
        if not candidate:
            raise ValueError(f"Candidate version {candidate_id} not found")
        
        # Calculate differences
        accuracy_diff = candidate.test_accuracy - baseline.test_accuracy
        precision_diff = candidate.test_precision - baseline.test_precision
        recall_diff = candidate.test_recall - baseline.test_recall
        f1_diff = candidate.test_f1 - baseline.test_f1
        auc_diff = candidate.test_auc - baseline.test_auc
        
        # Determine if improvement
        is_improvement = (
            accuracy_diff > 0 and
            f1_diff > 0 and
            auc_diff > 0
        )
        
        # Check significance (simple threshold-based)
        is_significant = abs(accuracy_diff) > 0.02 or abs(auc_diff) > 0.02
        
        # Generate recommendation
        if is_improvement and is_significant:
            recommendation = f"Candidate shows significant improvement. Promote to production."
        elif is_improvement:
            recommendation = f"Candidate shows improvement but not significant. Consider more testing."
        elif is_significant:
            recommendation = f"Candidate performs worse. Keep baseline in production."
        else:
            recommendation = f"No significant difference. Either version acceptable."
        
        return ModelComparison(
            baseline_version=baseline,
            candidate_version=candidate,
            accuracy_diff=accuracy_diff,
            precision_diff=precision_diff,
            recall_diff=recall_diff,
            f1_diff=f1_diff,
            auc_diff=auc_diff,
            is_improvement=is_improvement,
            is_significant=is_significant,
            recommendation=recommendation,
        )
    
    def get_model_artifact(self, version_id: str) -> Any:
        """Load model artifact.
        
        Parameters
        ----------
        version_id : str
            Version ID
            
        Returns
        -------
        Any
            Loaded model
        """
        version = self.get_version(version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")
        
        with open(version.model_path, 'rb') as f:
            return pickle.load(f)
    
    def delete_version(self, version_id: str) -> None:
        """Delete a model version.
        
        Parameters
        ----------
        version_id : str
            Version ID to delete
        """
        version = self.get_version(version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")
        
        # Delete files
        if Path(version.model_path).exists():
            Path(version.model_path).unlink()
        if Path(version.metadata_path).exists():
            Path(version.metadata_path).unlink()
        
        # Delete from registry
        if self.use_sqlite:
            conn = self._get_connection()
            conn.execute("DELETE FROM model_versions WHERE version_id = ?", (version_id,))
            conn.execute("DELETE FROM model_transitions WHERE version_id = ?", (version_id,))
            conn.commit()
        else:
            version_file = self.metadata_path / f"{version_id}.json"
            if version_file.exists():
                version_file.unlink()
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all registered models.
        
        Returns
        -------
        dict
            Metrics summary
        """
        all_versions = self.list_versions(limit=1000)
        
        by_status = {}
        by_suggestion_type = {}
        
        for version in all_versions:
            # By status
            status = version.status.value
            if status not in by_status:
                by_status[status] = []
            by_status[status].append(version.to_dict())
            
            # By suggestion type
            st = version.suggestion_type.value if version.suggestion_type else 'all'
            if st not in by_suggestion_type:
                by_suggestion_type[st] = []
            by_suggestion_type[st].append(version.to_dict())
        
        return {
            'total_models': len(all_versions),
            'by_status': {k: len(v) for k, v in by_status.items()},
            'by_suggestion_type': {k: len(v) for k, v in by_suggestion_type.items()},
            'production_models': [
                v.version_id for v in all_versions
                if v.status == ModelStatus.PRODUCTION
            ],
        }
