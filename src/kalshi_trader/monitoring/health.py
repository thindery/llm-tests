"""Health Check System.

Provides health monitoring for all ML pipeline components
with configurable checks and reporting.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Dict, List, Optional, Any, Callable

from ..ml.database import MLDatabase
from ..ml.model_registry import ModelRegistry

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health check status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheck:
    """Single health check result."""
    component: str
    status: HealthStatus
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    last_success: Optional[datetime] = None
    latency_ms: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'component': self.component,
            'status': self.status.value,
            'message': self.message,
            'timestamp': self.timestamp.isoformat(),
            'last_success': self.last_success.isoformat() if self.last_success else None,
            'latency_ms': self.latency_ms,
            'details': self.details,
        }


@dataclass 
class HealthReport:
    """Overall health report."""
    status: HealthStatus
    timestamp: datetime
    checks: List[HealthCheck]
    overall_message: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'status': self.status.value,
            'timestamp': self.timestamp.isoformat(),
            'overall_message': self.overall_message,
            'checks': [c.to_dict() for c in self.checks],
        }


class HealthChecker:
    """Health check system for ML pipeline.
    
    Monitors all components and provides health status reporting
    with customizable checks and alerting.
    
    Parameters
    ----------
    db : MLDatabase
        Database connection for persistence
    check_interval_seconds : int
        How often to run health checks
    
    Example
    -------
    >>> from kalshi_trader.monitoring import HealthChecker
    >>> 
    >>> checker = HealthChecker()
    >>> checker.register_check("database", check_database_func)
    >>> checker.register_check("models", check_models_func)
    >>> 
    >>> report = checker.run_checks()
    >>> print(report.status)
    """
    
    def __init__(
        self,
        db: Optional[MLDatabase] = None,
        check_interval_seconds: int = 60,
    ):
        self.db = db
        self.check_interval_seconds = check_interval_seconds
        
        self._checks: Dict[str, Callable[[], HealthCheck]] = {}
        self._last_results: Dict[str, HealthCheck] = {}
        
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    def register_check(
        self,
        component: str,
        check_fn: Callable[[], HealthCheck],
    ) -> None:
        """Register a health check function.
        
        Parameters
        ----------
        component : str
            Component name
        check_fn : callable
            Function that returns HealthCheck
        """
        self._checks[component] = check_fn
        logger.info(f"Health check registered for {component}")
    
    def run_check(self, component: str) -> Optional[HealthCheck]:
        """Run a specific health check.
        
        Parameters
        ----------
        component : str
            Component to check
            
        Returns
        -------
        HealthCheck | None
            Check result or None if not registered
        """
        if component not in self._checks:
            return None
        
        start = datetime.now()
        try:
            result = self._checks[component]()
            result.latency_ms = (datetime.now() - start).total_seconds() * 1000
            
            if result.status == HealthStatus.HEALTHY:
                result.last_success = datetime.now()
            
            self._last_results[component] = result
            return result
            
        except Exception as e:
            logger.error(f"Health check failed for {component}: {e}")
            result = HealthCheck(
                component=component,
                status=HealthStatus.UNHEALTHY,
                message=f"Check failed: {str(e)}",
                latency_ms=(datetime.now() - start).total_seconds() * 1000,
            )
            self._last_results[component] = result
            return result
    
    def run_checks(self) -> HealthReport:
        """Run all registered health checks.
        
        Returns
        -------
        HealthReport
            Overall health report
        """
        checks = []
        has_unhealthy = False
        has_degraded = False
        
        for component in self._checks:
            result = self.run_check(component)
            if result:
                checks.append(result)
                
                if result.status == HealthStatus.UNHEALTHY:
                    has_unhealthy = True
                elif result.status == HealthStatus.DEGRADED:
                    has_degraded = True
        
        # Determine overall status
        if has_unhealthy:
            overall_status = HealthStatus.UNHEALTHY
        elif has_degraded:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        report = HealthReport(
            status=overall_status,
            timestamp=datetime.now(),
            checks=checks,
            overall_message=f"{len([c for c in checks if c.status == HealthStatus.HEALTHY])}/{len(checks)} components healthy",
        )
        
        # Persist to database
        if self.db:
            self._persist_health_report(report)
        
        return report
    
    def get_component_status(self, component: str) -> HealthStatus:
        """Get status of a specific component.
        
        Parameters
        ----------
        component : str
            Component name
            
        Returns
        -------
        HealthStatus
            Component health status
        """
        if component in self._last_results:
            return self._last_results[component].status
        return HealthStatus.UNKNOWN
    
    def is_healthy(self, component: Optional[str] = None) -> bool:
        """Check if system or component is healthy.
        
        Parameters
        ----------
        component : str | None
            Specific component or all if None
            
        Returns
        -------
        bool
            True if healthy
        """
        if component:
            return self.get_component_status(component) == HealthStatus.HEALTHY
        
        for comp, result in self._last_results.items():
            if result.status != HealthStatus.HEALTHY:
                return False
        
        return len(self._last_results) == len(self._checks)
    
    def get_degraded_components(self) -> List[str]:
        """Get list of degraded components."""
        return [
            comp for comp, result in self._last_results.items()
            if result.status == HealthStatus.DEGRADED
        ]
    
    def get_unhealthy_components(self) -> List[str]:
        """Get list of unhealthy components."""
        return [
            comp for comp, result in self._last_results.items()
            if result.status == HealthStatus.UNHEALTHY
        ]
    
    async def start_monitoring(self) -> None:
        """Start continuous health monitoring."""
        if self._running:
            return
        
        self._running = True
        
        while self._running:
            try:
                self.run_checks()
                await asyncio.sleep(self.check_interval_seconds)
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(5)  # Short sleep on error
    
    def stop_monitoring(self) -> None:
        """Stop continuous health monitoring."""
        self._running = False
        if self._task:
            self._task.cancel()
    
    def _persist_health_report(self, report: HealthReport) -> None:
        """Persist health report to database."""
        try:
            self.db.cursor.execute("""
                INSERT INTO health_checks 
                (check_time, component, status, message, latency_ms)
                VALUES (?, ?, ?, ?, ?)
            """, (
                report.timestamp.isoformat(),
                'overall',
                report.status.value,
                report.overall_message,
                0.0,
            ))
            
            for check in report.checks:
                self.db.cursor.execute("""
                    INSERT INTO health_checks 
                    (check_time, component, status, message, latency_ms)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    check.timestamp.isoformat(),
                    check.component,
                    check.status.value,
                    check.message,
                    check.latency_ms,
                ))
            
            self.db.conn.commit()
        except Exception as e:
            logger.error(f"Failed to persist health report: {e}")


def create_default_health_checks(
    pipeline: Any,
    db: MLDatabase,
) -> Dict[str, Callable[[], HealthCheck]]:
    """Create default health check functions.
    
    Parameters
    ----------
    pipeline : MLPipeline
        ML pipeline instance
    db : MLDatabase
        Database instance
        
    Returns
    -------
    Dict[str, callable]
        Dictionary of health check functions
    """
    def check_database() -> HealthCheck:
        """Check database connectivity."""
        try:
            db.cursor.execute("SELECT 1")
            return HealthCheck(
                component="database",
                status=HealthStatus.HEALTHY,
                message="Database connection active",
            )
        except Exception as e:
            return HealthCheck(
                component="database",
                status=HealthStatus.UNHEALTHY,
                message=f"Database error: {str(e)}",
            )
    
    def check_ml_pipeline() -> HealthCheck:
        """Check ML pipeline status."""
        if pipeline is None:
            return HealthCheck(
                component="ml_pipeline",
                status=HealthStatus.UNHEALTHY,
                message="ML pipeline not initialized",
            )
        
        try:
            status = pipeline.get_status()
            if status.get('initialized'):
                return HealthCheck(
                    component="ml_pipeline",
                    status=HealthStatus.HEALTHY,
                    message="ML pipeline operational",
                    details=status,
                )
            else:
                return HealthCheck(
                    component="ml_pipeline",
                    status=HealthStatus.DEGRADED,
                    message="ML pipeline not fully initialized",
                )
        except Exception as e:
            return HealthCheck(
                component="ml_pipeline",
                status=HealthStatus.UNHEALTHY,
                message=f"ML pipeline error: {str(e)}",
            )
    
    def check_model_registry() -> HealthCheck:
        """Check model registry."""
        try:
            registry = ModelRegistry()
            status = registry.get_registry_status()
            
            if status.get('models_count', 0) > 0:
                return HealthCheck(
                    component="model_registry",
                    status=HealthStatus.HEALTHY,
                    message=f"{status['models_count']} models registered",
                    details=status,
                )
            else:
                return HealthCheck(
                    component="model_registry",
                    status=HealthStatus.DEGRADED,
                    message="No models registered",
                )
        except Exception as e:
            return HealthCheck(
                component="model_registry",
                status=HealthStatus.UNHEALTHY,
                message=f"Registry error: {str(e)}",
            )
    
    def check_safety_controls() -> HealthCheck:
        """Check safety controls status."""
        if pipeline is None or not hasattr(pipeline, 'safety'):
            return HealthCheck(
                component="safety_controls",
                status=HealthStatus.DEGRADED,
                message="Safety controls not available",
            )
        
        try:
            safety_status = pipeline.get_safety_status()
            state = safety_status.get('state', {})
            
            if state.get('status') == 'circuit_breaker':
                return HealthCheck(
                    component="safety_controls",
                    status=HealthStatus.DEGRADED,
                    message=f"Circuit breaker active: {state.get('circuit_breaker_reason')}",
                    details=safety_status,
                )
            
            return HealthCheck(
                component="safety_controls",
                status=HealthStatus.HEALTHY,
                message=f"Safety controls active - Daily PnL: ${state.get('daily_pnl', 0):.2f}",
                details=safety_status,
            )
        except Exception as e:
            return HealthCheck(
                component="safety_controls",
                status=HealthStatus.UNHEALTHY,
                message=f"Safety controls error: {str(e)}",
            )
    
    return {
        "database": check_database,
        "ml_pipeline": check_ml_pipeline,
        "model_registry": check_model_registry,
        "safety_controls": check_safety_controls,
    }
