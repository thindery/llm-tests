"""Database layer for ML Pipeline.

Manages SQLite storage for:
- Confidence scores per suggestion type
- A/B group assignments
- Trade outcomes for analysis
- Confidence history for trending
- Safety controls and circuit breakers
- Graduation logic for strategies
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any, List


SCHEMA = """
-- Confidence scores per suggestion type
CREATE TABLE IF NOT EXISTS confidence_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_type TEXT NOT NULL UNIQUE,
    alpha REAL NOT NULL DEFAULT 0.5,
    beta REAL NOT NULL DEFAULT 0.5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A/B group assignments
CREATE TABLE IF NOT EXISTS ab_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    group_assignment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Trade outcomes for A/B analysis
CREATE TABLE IF NOT EXISTS trade_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    group_assignment TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    confidence REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    pnl REAL,
    outcome INTEGER,  -- 1 = profit, 0 = loss
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Confidence history for trending
CREATE TABLE IF NOT EXISTS confidence_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_type TEXT NOT NULL,
    confidence REAL NOT NULL,
    alpha REAL NOT NULL,
    beta REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize confidence scores with defaults
INSERT OR IGNORE INTO confidence_scores (suggestion_type, alpha, beta) VALUES
    ('reversion', 0.5, 0.5),
    ('breakout', 0.5, 0.5),
    ('volatility', 0.5, 0.5);

-- Training data for ML models
CREATE TABLE IF NOT EXISTS training_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id TEXT NOT NULL UNIQUE,
    suggestion_type TEXT NOT NULL,
    features TEXT NOT NULL,  -- JSON array of feature values
    feature_names TEXT NOT NULL,  -- JSON array of feature names
    outcome INTEGER,  -- 1 = profit, 0 = loss
    pnl REAL,
    confidence REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model predictions for tracking
CREATE TABLE IF NOT EXISTS model_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id TEXT NOT NULL UNIQUE,
    trade_id TEXT NOT NULL,
    model_version TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    predicted_outcome REAL NOT NULL,  -- Probability of success
    actual_outcome INTEGER,  -- 1 = profit, 0 = loss (filled later)
    features_used TEXT,  -- JSON of features used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Feature importance tracking
CREATE TABLE IF NOT EXISTS feature_importance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_version TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    importance_score REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_version, feature_name)
);

-- Training runs tracking
CREATE TABLE IF NOT EXISTS training_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL UNIQUE,
    model_type TEXT NOT NULL,  -- xgboost, lightgbm, etc.
    suggestion_type TEXT,
    n_samples INTEGER NOT NULL,
    n_features INTEGER NOT NULL,
    cv_accuracy REAL,
    cv_auc REAL,
    test_accuracy REAL,
    test_auc REAL,
    model_path TEXT,
    status TEXT DEFAULT 'completed',  -- running, completed, failed
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_training_suggestion ON training_data(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_predictions_trade ON model_predictions(trade_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON model_predictions(model_version);
CREATE INDEX IF NOT EXISTS idx_feature_importance_version ON feature_importance(model_version);
CREATE INDEX IF NOT EXISTS idx_training_runs_type ON training_runs(suggestion_type);

-- Safety controls tables
CREATE TABLE IF NOT EXISTS safety_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,  -- circuit_breaker, cooldown_start, cooldown_end, etc.
    reason TEXT,
    reason_detail TEXT,
    daily_pnl REAL,
    consecutive_losses INTEGER,
    current_balance REAL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS circuit_breakers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    breaker_id TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    reason_detail TEXT,
    daily_pnl_at_trigger REAL,
    consecutive_losses_at_trigger INTEGER,
    current_balance REAL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_at TIMESTAMP,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS trade_safety_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id TEXT NOT NULL UNIQUE,
    pnl REAL NOT NULL,
    safety_state TEXT,  -- JSON of SafetyState at trade time
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Graduation logic tables
CREATE TABLE IF NOT EXISTS strategy_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_type TEXT NOT NULL UNIQUE,
    mode TEXT DEFAULT 'shadow',  -- shadow, live, paused, archived
    total_trades INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_pnl REAL DEFAULT 0.0,
    avg_pnl REAL DEFAULT 0.0,
    win_rate REAL DEFAULT 0.0,
    avg_win_amount REAL DEFAULT 0.0,
    avg_loss_amount REAL DEFAULT 0.0,
    max_drawdown REAL DEFAULT 0.0,
    profit_factor REAL DEFAULT 0.0,
    sharpe_ratio REAL DEFAULT 0.0,
    first_trade_at TIMESTAMP,
    last_trade_at TIMESTAMP,
    mode_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graduation_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize strategy performance for all suggestion types
INSERT OR IGNORE INTO strategy_performance (suggestion_type, mode) VALUES
    ('reversion', 'shadow'),
    ('breakout', 'shadow'),
    ('volatility', 'shadow');

CREATE TABLE IF NOT EXISTS graduation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    suggestion_type TEXT NOT NULL,
    direction TEXT NOT NULL,  -- promotion, demotion
    from_mode TEXT NOT NULL,
    to_mode TEXT NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    performance_snapshot TEXT,  -- JSON of performance at transition
    threshold_triggered TEXT
);

-- Create indexes for safety and graduation tables
CREATE INDEX IF NOT EXISTS idx_safety_events_type ON safety_events(event_type);
CREATE INDEX IF NOT EXISTS idx_safety_events_triggered ON safety_events(triggered_at);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_active ON circuit_breakers(is_active);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_triggered ON circuit_breakers(triggered_at);
CREATE INDEX IF NOT EXISTS idx_graduation_events_type ON graduation_events(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_graduation_events_triggered ON graduation_events(triggered_at);
"""


@dataclass
class ConfidenceRecord:
    """Record of confidence parameters for a suggestion type."""
    suggestion_type: str
    alpha: float
    beta: float
    confidence: float  # alpha / (alpha + beta)
    updated_at: datetime


@dataclass
class TradeOutcomeRecord:
    """Record of a completed trade outcome."""
    trade_id: str
    user_id: str
    group_assignment: str
    suggestion_type: str
    confidence: float
    entry_price: float
    exit_price: Optional[float]
    pnl: Optional[float]
    outcome: Optional[bool]
    created_at: datetime
    completed_at: Optional[datetime]


@dataclass
class CircuitBreakerRecord:
    """Record of a circuit breaker event."""
    breaker_id: str
    reason: str
    reason_detail: str
    triggered_at: datetime
    reset_at: Optional[datetime]
    daily_pnl_at_trigger: float
    consecutive_losses_at_trigger: int
    current_balance: float


@dataclass
class StrategyPerformanceRecord:
    """Record of strategy performance."""
    suggestion_type: str
    mode: str
    total_trades: int
    wins: int
    losses: int
    total_pnl: float
    avg_pnl: float
    win_rate: float
    avg_win_amount: float
    avg_loss_amount: float
    max_drawdown: float
    profit_factor: float
    sharpe_ratio: float
    first_trade_at: Optional[datetime]
    last_trade_at: Optional[datetime]
    mode_since: datetime
    graduation_count: int


class MLDatabase:
    """SQLite database for ML Pipeline data.
    
    Parameters
    ----------
    db_path : str | Path
        Path to SQLite database file. If None, uses in-memory DB.
    
    Example
    -------
    >>> db = MLDatabase("/path/to/ml.db")
    >>> db.initialize()
    >>> 
    >>> # Get confidence for reversion strategy
    >>> params = db.get_confidence("reversion")
    >>> print(f"Alpha: {params.alpha}, Beta: {params.beta}")
    Alpha: 0.5, Beta: 0.5
    >>>
    >>> # Record a trade outcome
    >>> db.record_trade_outcome(
    ...     trade_id="trade_001",
    ...     user_id="user123",
    ...     group_assignment="treatment",
    ...     suggestion_type="breakout",
    ...     confidence=0.75,
    ...     entry_price=0.45
    ... )
    """
    
    def __init__(self, db_path: Optional[str | Path] = None):
        self.db_path = db_path or Path.home() / ".kalshi-trader" / "ml.db"
        self.db_path = Path(self.db_path)
        self._conn: Optional[sqlite3.Connection] = None
        
    def initialize(self) -> None:
        """Create database and tables if they don't exist."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(SCHEMA)
            conn.commit()
            
    def _get_connection(self) -> sqlite3.Connection:
        """Get or create database connection."""
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
        return self._conn
        
    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
            
    def get_confidence(self, suggestion_type: str) -> Optional[ConfidenceRecord]:
        """Get confidence parameters for a suggestion type."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM confidence_scores WHERE suggestion_type = ?",
            (suggestion_type,)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
            
        alpha = row["alpha"]
        beta = row["beta"]
        confidence = alpha / (alpha + beta) if (alpha + beta) > 0 else 0.5
        
        return ConfidenceRecord(
            suggestion_type=row["suggestion_type"],
            alpha=alpha,
            beta=beta,
            confidence=confidence,
            updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else datetime.now()
        )
        
    def update_confidence(self, suggestion_type: str, alpha: float, beta: float) -> None:
        """Update confidence parameters and record history."""
        conn = self._get_connection()
        
        # Update main table
        conn.execute(
            """INSERT INTO confidence_scores (suggestion_type, alpha, beta)
               VALUES (?, ?, ?)
               ON CONFLICT(suggestion_type) DO UPDATE SET
               alpha=excluded.alpha, beta=excluded.beta, updated_at=CURRENT_TIMESTAMP""",
            (suggestion_type, alpha, beta)
        )
        
        # Record history
        confidence = alpha / (alpha + beta) if (alpha + beta) > 0 else 0.5
        conn.execute(
            """INSERT INTO confidence_history 
               (suggestion_type, confidence, alpha, beta)
               VALUES (?, ?, ?, ?)""",
            (suggestion_type, confidence, alpha, beta)
        )
        
        conn.commit()
        
    def get_all_confidence(self) -> list[ConfidenceRecord]:
        """Get confidence parameters for all suggestion types."""
        conn = self._get_connection()
        cursor = conn.execute("SELECT * FROM confidence_scores ORDER BY suggestion_type")
        
        records = []
        for row in cursor.fetchall():
            alpha = row["alpha"]
            beta = row["beta"]
            confidence = alpha / (alpha + beta) if (alpha + beta) > 0 else 0.5
            
            records.append(ConfidenceRecord(
                suggestion_type=row["suggestion_type"],
                alpha=alpha,
                beta=beta,
                confidence=confidence,
                updated_at=datetime.fromisoformat(row["updated_at"]) if row["updated_at"] else datetime.now()
            ))
            
        return records
        
    def get_ab_assignment(self, user_id: str, date: str) -> Optional[str]:
        """Get A/B group assignment for a user on a specific date."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT group_assignment FROM ab_assignments WHERE user_id = ? AND date = ?",
            (user_id, date)
        )
        row = cursor.fetchone()
        return row["group_assignment"] if row else None
        
    def set_ab_assignment(self, user_id: str, date: str, group_assignment: str) -> None:
        """Set A/B group assignment for a user on a specific date."""
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO ab_assignments (user_id, date, group_assignment)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id, date) DO UPDATE SET
               group_assignment=excluded.group_assignment""",
            (user_id, date, group_assignment)
        )
        conn.commit()
        
    def record_trade_outcome(
        self,
        trade_id: str,
        user_id: str,
        group_assignment: str,
        suggestion_type: str,
        confidence: float,
        entry_price: float,
        exit_price: Optional[float] = None,
        pnl: Optional[float] = None,
        outcome: Optional[bool] = None
    ) -> None:
        """Record a new trade outcome."""
        conn = self._get_connection()
        
        if exit_price is not None:
            conn.execute(
                """INSERT INTO trade_outcomes 
                   (trade_id, user_id, group_assignment, suggestion_type,
                    confidence, entry_price, exit_price, pnl, outcome, completed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(trade_id) DO UPDATE SET
                   exit_price=excluded.exit_price,
                   pnl=excluded.pnl,
                   outcome=excluded.outcome,
                   completed_at=excluded.completed_at""",
                (trade_id, user_id, group_assignment, suggestion_type,
                 confidence, entry_price, exit_price, pnl, 1 if outcome else 0 if outcome is not None else None)
            )
        else:
            conn.execute(
                """INSERT INTO trade_outcomes 
                   (trade_id, user_id, group_assignment, suggestion_type,
                    confidence, entry_price)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON CONFLICT(trade_id) DO NOTHING""",
                (trade_id, user_id, group_assignment, suggestion_type,
                 confidence, entry_price)
            )
        conn.commit()
        
    def get_trade_outcomes(
        self,
        group_assignment: Optional[str] = None,
        suggestion_type: Optional[str] = None,
        limit: int = 100
    ) -> list[TradeOutcomeRecord]:
        """Get trade outcomes with optional filtering."""
        conn = self._get_connection()
        
        query = "SELECT * FROM trade_outcomes WHERE 1=1"
        params = []
        
        if group_assignment:
            query += " AND group_assignment = ?"
            params.append(group_assignment)
        if suggestion_type:
            query += " AND suggestion_type = ?"
            params.append(suggestion_type)
            
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        
        records = []
        for row in cursor.fetchall():
            records.append(TradeOutcomeRecord(
                trade_id=row["trade_id"],
                user_id=row["user_id"],
                group_assignment=row["group_assignment"],
                suggestion_type=row["suggestion_type"],
                confidence=row["confidence"],
                entry_price=row["entry_price"],
                exit_price=row["exit_price"],
                pnl=row["pnl"],
                outcome=bool(row["outcome"]) if row["outcome"] is not None else None,
                created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(),
                completed_at=datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None
            ))
            
        return records
        
    def get_confidence_history(
        self,
        suggestion_type: Optional[str] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get confidence history for trending."""
        conn = self._get_connection()
        
        query = "SELECT * FROM confidence_history WHERE 1=1"
        params = []
        
        if suggestion_type:
            query += " AND suggestion_type = ?"
            params.append(suggestion_type)
            
        query += " ORDER BY recorded_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        
        return [
            {
                "suggestion_type": row["suggestion_type"],
                "confidence": row["confidence"],
                "alpha": row["alpha"],
                "beta": row["beta"],
                "recorded_at": row["recorded_at"]
            }
            for row in cursor.fetchall()
        ]
        
    def get_ab_metrics(self) -> dict[str, dict]:
        """Get metrics for A/B groups."""
        conn = self._get_connection()
        
        metrics = {}
        for group in ["control", "treatment"]:
            cursor = conn.execute(
                """SELECT 
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN outcome = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN outcome = 0 THEN 1 ELSE 0 END) as losses,
                    SUM(pnl) as total_pnl,
                    AVG(pnl) as avg_pnl,
                    AVG(confidence) as avg_confidence
                 FROM trade_outcomes 
                 WHERE group_assignment = ? AND outcome IS NOT NULL""",
                (group,)
            )
            row = cursor.fetchone()
            
            total = row["total_trades"] or 0
            wins = row["wins"] or 0
            losses = row["losses"] or 0
            
            metrics[group] = {
                "total_trades": total,
                "wins": wins,
                "losses": losses,
                "win_rate": (wins / total * 100) if total > 0 else 0.0,
                "total_pnl": row["total_pnl"] or 0.0,
                "avg_pnl": row["avg_pnl"] or 0.0,
                "avg_confidence": row["avg_confidence"] or 0.0
            }
            
        return metrics
        
    def get_suggestion_type_metrics(self) -> dict[str, dict]:
        """Get metrics grouped by suggestion type."""
        conn = self._get_connection()
        
        cursor = conn.execute(
            """SELECT 
                suggestion_type,
                COUNT(*) as total_trades,
                SUM(CASE WHEN outcome = 1 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN outcome = 0 THEN 1 ELSE 0 END) as losses,
                SUM(pnl) as total_pnl,
                AVG(pnl) as avg_pnl
             FROM trade_outcomes 
             WHERE outcome IS NOT NULL
             GROUP BY suggestion_type"""
        )
        
        metrics = {}
        for row in cursor.fetchall():
            total = row["total_trades"]
            wins = row["wins"]
            
            metrics[row["suggestion_type"]] = {
                "total_trades": total,
                "wins": wins,
                "losses": row["losses"],
                "win_rate": (wins / total * 100) if total > 0 else 0.0,
                "total_pnl": row["total_pnl"] or 0.0,
                "avg_pnl": row["avg_pnl"] or 0.0
            }
            
        return metrics
    
    # Training data methods
    def save_training_sample(
        self,
        trade_id: str,
        suggestion_type: str,
        features: list[float],
        feature_names: list[str],
        outcome: Optional[bool] = None,
        pnl: Optional[float] = None,
        confidence: Optional[float] = None
    ) -> None:
        """Save a training sample with extracted features."""
        import json
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO training_data 
               (trade_id, suggestion_type, features, feature_names, outcome, pnl, confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(trade_id) DO UPDATE SET
               features=excluded.features,
               outcome=excluded.outcome,
               pnl=excluded.pnl""",
            (trade_id, suggestion_type, 
             json.dumps(features), json.dumps(feature_names),
             1 if outcome else 0 if outcome is not None else None,
             pnl, confidence)
        )
        conn.commit()
    
    def get_training_data(
        self,
        suggestion_type: Optional[str] = None,
        min_samples: int = 200,
        limit: int = 10000
    ) -> tuple[list[list[float]], list[bool], list[str]]:
        """Get training data for model training.
        
        Returns
        -------
        tuple
            (X, y, feature_names) where X is feature matrix, y is labels
        """
        import json
        conn = self._get_connection()
        
        query = """SELECT features, feature_names, outcome, suggestion_type 
                   FROM training_data 
                   WHERE outcome IS NOT NULL"""
        params = []
        
        if suggestion_type:
            query += " AND suggestion_type = ?"
            params.append(suggestion_type)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        
        X = []
        y = []
        feature_names = []
        
        for row in cursor.fetchall():
            features = json.loads(row["features"])
            X.append(features)
            y.append(bool(row["outcome"]))
            if not feature_names:
                feature_names = json.loads(row["feature_names"])
        
        return X, y, feature_names
    
    def get_training_data_count(self, suggestion_type: Optional[str] = None) -> int:
        """Get count of available training samples."""
        conn = self._get_connection()
        
        query = "SELECT COUNT(*) FROM training_data WHERE outcome IS NOT NULL"
        params = []
        
        if suggestion_type:
            query += " AND suggestion_type = ?"
            params.append(suggestion_type)
        
        cursor = conn.execute(query, params)
        return cursor.fetchone()[0]
    
    # Model prediction methods
    def record_model_prediction(
        self,
        prediction_id: str,
        trade_id: str,
        model_version: str,
        suggestion_type: str,
        predicted_outcome: float,
        features_used: Optional[dict] = None
    ) -> None:
        """Record a model prediction for later evaluation."""
        import json
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO model_predictions 
               (prediction_id, trade_id, model_version, suggestion_type, 
                predicted_outcome, features_used)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (prediction_id, trade_id, model_version, suggestion_type,
             predicted_outcome, json.dumps(features_used) if features_used else None)
        )
        conn.commit()
    
    def update_prediction_outcome(
        self,
        prediction_id: str,
        actual_outcome: bool
    ) -> None:
        """Update prediction with actual outcome."""
        conn = self._get_connection()
        conn.execute(
            """UPDATE model_predictions 
               SET actual_outcome = ?, completed_at = CURRENT_TIMESTAMP
               WHERE prediction_id = ?""",
            (1 if actual_outcome else 0, prediction_id)
        )
        conn.commit()
    
    def get_prediction_accuracy(self, model_version: str) -> dict:
        """Get accuracy metrics for a model version."""
        conn = self._get_connection()
        cursor = conn.execute(
            """SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN actual_outcome = 1 THEN 1 ELSE 0 END) as actual_wins,
                SUM(CASE WHEN predicted_outcome > 0.5 THEN 1 ELSE 0 END) as predicted_wins,
                SUM(CASE WHEN (predicted_outcome > 0.5 AND actual_outcome = 1) OR 
                          (predicted_outcome <= 0.5 AND actual_outcome = 0) 
                     THEN 1 ELSE 0 END) as correct
             FROM model_predictions 
             WHERE model_version = ? AND actual_outcome IS NOT NULL""",
            (model_version,)
        )
        row = cursor.fetchone()
        
        total = row["total"] or 0
        correct = row["correct"] or 0
        
        return {
            "total_predictions": total,
            "correct_predictions": correct,
            "accuracy": correct / total if total > 0 else 0.0,
            "actual_win_rate": (row["actual_wins"] or 0) / total if total > 0 else 0.0,
            "predicted_win_rate": (row["predicted_wins"] or 0) / total if total > 0 else 0.0,
        }
    
    # Training run methods
    def record_training_run(
        self,
        run_id: str,
        model_type: str,
        suggestion_type: Optional[str],
        n_samples: int,
        n_features: int,
        model_path: Optional[str] = None
    ) -> None:
        """Record the start of a training run."""
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO training_runs 
               (run_id, model_type, suggestion_type, n_samples, n_features, model_path, status)
               VALUES (?, ?, ?, ?, ?, ?, 'running')""",
            (run_id, model_type, suggestion_type, n_samples, n_features, model_path)
        )
        conn.commit()
    
    def complete_training_run(
        self,
        run_id: str,
        cv_accuracy: Optional[float] = None,
        cv_auc: Optional[float] = None,
        test_accuracy: Optional[float] = None,
        test_auc: Optional[float] = None,
        status: str = "completed"
    ) -> None:
        """Record completion of a training run."""
        conn = self._get_connection()
        conn.execute(
            """UPDATE training_runs 
               SET cv_accuracy = ?, cv_auc = ?, test_accuracy = ?, test_auc = ?,
                   status = ?, completed_at = CURRENT_TIMESTAMP
               WHERE run_id = ?""",
            (cv_accuracy, cv_auc, test_accuracy, test_auc, status, run_id)
        )
        conn.commit()
    
    def complete_trade(
        self,
        trade_id: str,
        exit_price: float,
        pnl: float
    ) -> None:
        """Complete a trade with exit price and PnL.
        
        Parameters
        ----------
        trade_id : str
            Trade identifier
        exit_price : float
            Exit price
        pnl : float
            Profit/loss
        """
        outcome = pnl > 0
        self.record_trade_outcome(
            trade_id=trade_id,
            user_id="",
            group_assignment="",
            suggestion_type="",
            confidence=0.0,
            entry_price=0.0,
            exit_price=exit_price,
            pnl=pnl,
            outcome=outcome
        )
    
    def get_training_runs(
        self,
        suggestion_type: Optional[str] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get training run history."""
        conn = self._get_connection()
        
        query = "SELECT * FROM training_runs WHERE 1=1"
        params = []
        
        if suggestion_type:
            query += " AND suggestion_type = ?"
            params.append(suggestion_type)
        
        query += " ORDER BY started_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        
        return [
            {
                "run_id": row["run_id"],
                "model_type": row["model_type"],
                "suggestion_type": row["suggestion_type"],
                "n_samples": row["n_samples"],
                "n_features": row["n_features"],
                "cv_accuracy": row["cv_accuracy"],
                "cv_auc": row["cv_auc"],
                "test_accuracy": row["test_accuracy"],
                "test_auc": row["test_auc"],
                "status": row["status"],
                "started_at": row["started_at"],
                "completed_at": row["completed_at"],
            }
            for row in cursor.fetchall()
        ]
    
    # Safety controls methods
    def record_circuit_breaker(self, record: CircuitBreakerRecord) -> None:
        """Record a circuit breaker event."""
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO circuit_breakers 
               (breaker_id, reason, reason_detail, daily_pnl_at_trigger, 
                consecutive_losses_at_trigger, current_balance, triggered_at, reset_at, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (record.breaker_id, record.reason, record.reason_detail,
             record.daily_pnl_at_trigger, record.consecutive_losses_at_trigger,
             record.current_balance, record.triggered_at.isoformat(),
             record.reset_at.isoformat() if record.reset_at else None)
        )
        conn.commit()
    
    def get_active_circuit_breaker(self) -> Optional[CircuitBreakerRecord]:
        """Get active circuit breaker if any."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM circuit_breakers WHERE is_active = 1 ORDER BY triggered_at DESC LIMIT 1"
        )
        row = cursor.fetchone()
        
        if not row:
            return None
        
        return CircuitBreakerRecord(
            breaker_id=row["breaker_id"],
            reason=row["reason"],
            reason_detail=row["reason_detail"] or "",
            triggered_at=datetime.fromisoformat(row["triggered_at"]),
            reset_at=datetime.fromisoformat(row["reset_at"]) if row["reset_at"] else None,
            daily_pnl_at_trigger=row["daily_pnl_at_trigger"] or 0.0,
            consecutive_losses_at_trigger=row["consecutive_losses_at_trigger"] or 0,
            current_balance=row["current_balance"] or 0.0
        )
    
    def reset_circuit_breaker(self) -> None:
        """Reset/deactivate active circuit breaker."""
        conn = self._get_connection()
        conn.execute(
            """UPDATE circuit_breakers 
               SET is_active = 0 
               WHERE is_active = 1"""
        )
        conn.commit()
    
    def get_circuit_breaker_count(self, date_str: str) -> int:
        """Count circuit breakers triggered on a specific date."""
        conn = self._get_connection()
        cursor = conn.execute(
            """SELECT COUNT(*) FROM circuit_breakers 
               WHERE date(triggered_at) = ?""",
            (date_str,)
        )
        return cursor.fetchone()[0]
    
    def get_daily_pnl(self, date_str: str) -> float:
        """Get total PnL for a specific date."""
        conn = self._get_connection()
        cursor = conn.execute(
            """SELECT SUM(pnl) FROM trade_safety_records 
               WHERE date(recorded_at) = ?""",
            (date_str,)
        )
        result = cursor.fetchone()[0]
        return result or 0.0
    
    def get_consecutive_losses(self) -> int:
        """Get number of consecutive losses from recent trades."""
        conn = self._get_connection()
        cursor = conn.execute(
            """SELECT pnl FROM trade_safety_records 
               ORDER BY recorded_at DESC LIMIT 10"""
        )
        
        consecutive = 0
        for row in cursor.fetchall():
            if row["pnl"] < 0:
                consecutive += 1
            else:
                break
        return consecutive
    
    def get_open_position_count(self) -> int:
        """Get count of open positions."""
        # This would need to be tracked separately in a positions table
        # For now, return 0 as placeholder
        return 0
    
    def record_trade_with_safety(
        self,
        trade_id: str,
        pnl: float,
        safety_state: dict
    ) -> None:
        """Record trade with safety state snapshot."""
        import json
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO trade_safety_records 
               (trade_id, pnl, safety_state)
               VALUES (?, ?, ?)
               ON CONFLICT(trade_id) DO UPDATE SET
               pnl=excluded.pnl, safety_state=excluded.safety_state""",
            (trade_id, pnl, json.dumps(safety_state))
        )
        conn.commit()
    
    def record_safety_event(
        self,
        event_id: str,
        event_type: str,
        reason: Optional[str] = None,
        reason_detail: Optional[str] = None,
        daily_pnl: Optional[float] = None,
        consecutive_losses: Optional[int] = None,
        current_balance: Optional[float] = None,
    ) -> None:
        """Record a safety event."""
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO safety_events 
               (event_id, event_type, reason, reason_detail, daily_pnl, 
                consecutive_losses, current_balance)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (event_id, event_type, reason, reason_detail, 
             daily_pnl, consecutive_losses, current_balance)
        )
        conn.commit()
    
    # Graduation logic methods
    def get_strategy_performance(self, suggestion_type: str) -> Optional[StrategyPerformanceRecord]:
        """Get performance record for a strategy."""
        conn = self._get_connection()
        cursor = conn.execute(
            "SELECT * FROM strategy_performance WHERE suggestion_type = ?",
            (suggestion_type,)
        )
        row = cursor.fetchone()
        
        if not row:
            return None
        
        return StrategyPerformanceRecord(
            suggestion_type=row["suggestion_type"],
            mode=row["mode"],
            total_trades=row["total_trades"] or 0,
            wins=row["wins"] or 0,
            losses=row["losses"] or 0,
            total_pnl=row["total_pnl"] or 0.0,
            avg_pnl=row["avg_pnl"] or 0.0,
            win_rate=row["win_rate"] or 0.0,
            avg_win_amount=row["avg_win_amount"] or 0.0,
            avg_loss_amount=row["avg_loss_amount"] or 0.0,
            max_drawdown=row["max_drawdown"] or 0.0,
            profit_factor=row["profit_factor"] or 0.0,
            sharpe_ratio=row["sharpe_ratio"] or 0.0,
            first_trade_at=datetime.fromisoformat(row["first_trade_at"]) if row["first_trade_at"] else None,
            last_trade_at=datetime.fromisoformat(row["last_trade_at"]) if row["last_trade_at"] else None,
            mode_since=datetime.fromisoformat(row["mode_since"]) if row["mode_since"] else datetime.now(),
            graduation_count=row["graduation_count"] or 0
        )
    
    def save_strategy_performance(
        self,
        performance: Any  # StrategyPerformance from graduation_logic
    ) -> None:
        """Save strategy performance to database."""
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO strategy_performance 
               (suggestion_type, mode, total_trades, wins, losses, total_pnl, 
                avg_pnl, win_rate, avg_win_amount, avg_loss_amount, max_drawdown,
                profit_factor, sharpe_ratio, first_trade_at, last_trade_at, 
                mode_since, graduation_count)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(suggestion_type) DO UPDATE SET
               mode=excluded.mode, total_trades=excluded.total_trades, wins=excluded.wins,
               losses=excluded.losses, total_pnl=excluded.total_pnl, avg_pnl=excluded.avg_pnl,
               win_rate=excluded.win_rate, avg_win_amount=excluded.avg_win_amount,
               avg_loss_amount=excluded.avg_loss_amount, max_drawdown=excluded.max_drawdown,
               profit_factor=excluded.profit_factor, sharpe_ratio=excluded.sharpe_ratio,
               first_trade_at=excluded.first_trade_at, last_trade_at=excluded.last_trade_at,
               mode_since=excluded.mode_since, graduation_count=excluded.graduation_count""",
            (performance.suggestion_type, performance.mode.value, performance.total_trades,
             performance.wins, performance.losses, performance.total_pnl, performance.avg_pnl,
             performance.win_rate, performance.avg_win_amount, performance.avg_loss_amount,
             performance.max_drawdown, performance.profit_factor, performance.sharpe_ratio,
             performance.first_trade_at.isoformat() if performance.first_trade_at else None,
             performance.last_trade_at.isoformat() if performance.last_trade_at else None,
             performance.mode_since.isoformat(), performance.graduation_count)
        )
        conn.commit()
    
    def record_graduation_event(self, event: Any) -> None:
        """Record a graduation event."""
        import json
        conn = self._get_connection()
        conn.execute(
            """INSERT INTO graduation_events 
               (event_id, suggestion_type, direction, from_mode, to_mode, 
                triggered_at, reason, performance_snapshot, threshold_triggered)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (event.event_id, event.suggestion_type, event.direction.value,
             event.from_mode.value, event.to_mode.value, event.triggered_at.isoformat(),
             event.reason, json.dumps(event.performance_at_transition), 
             event.threshold_triggered)
        )
        conn.commit()
    
    def get_graduation_events(
        self,
        suggestion_type: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """Get graduation events, optionally filtered by suggestion type."""
        from .graduation_logic import GraduationEvent, GraduationDirection, StrategyMode
        
        conn = self._get_connection()
        query = "SELECT * FROM graduation_events"
        params = []
        
        if suggestion_type:
            query += " WHERE suggestion_type = ?"
            params.append(suggestion_type)
        
        query += " ORDER BY triggered_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = conn.execute(query, params)
        
        events = []
        for row in cursor.fetchall():
            events.append(GraduationEvent(
                event_id=row["event_id"],
                suggestion_type=row["suggestion_type"],
                direction=GraduationDirection(row["direction"]),
                from_mode=StrategyMode(row["from_mode"]),
                to_mode=StrategyMode(row["to_mode"]),
                triggered_at=datetime.fromisoformat(row["triggered_at"]),
                reason=row["reason"],
                performance_at_transition=json.loads(row["performance_snapshot"]) if row["performance_snapshot"] else {},
                threshold_triggered=row["threshold_triggered"]
            ))
        
        return events
