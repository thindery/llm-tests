"""Health Check API Endpoints.

FastAPI endpoints for health checking and monitoring.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

from ..ml.database import MLDatabase
from ..ml.model_registry import ModelRegistry
from ..monitoring import HealthChecker, HealthStatus

logger = logging.getLogger(__name__)


class AppState:
    """Application state container."""
    def __init__(self):
        self.db: Optional[MLDatabase] = None
        self.health_checker: Optional[HealthChecker] = None
        self.started_at: datetime = datetime.now()
        self.ready: bool = False
    
    def get_uptime_seconds(self) -> float:
        """Get uptime in seconds."""
        return (datetime.now() - self.started_at).total_seconds()


# Global state
app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    # Startup
    logger.info("Starting health check API...")
    
    try:
        app_state.db = MLDatabase()
        app_state.health_checker = HealthChecker(db=app_state.db)
        
        # Register default health checks
        from ..ml import create_pipeline
        pipeline = create_pipeline()
        pipeline.initialize(balance=1000.0)
        
        default_checks = create_default_health_checks(pipeline, app_state.db)
        for component, check_fn in default_checks.items():
            app_state.health_checker.register_check(component, check_fn)
        
        app_state.ready = True
        logger.info("Health check API ready")
        
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        app_state.ready = False
    
    yield
    
    # Shutdown
    logger.info("Shutting down health check API...")
    app_state.ready = False


app = FastAPI(
    title="Kalshi Trader ML API",
    description="Health and monitoring endpoints for ML pipeline",
    version="5.0.0",
    lifespan=lifespan,
)


def create_default_health_checks(pipeline: Any, db: MLDatabase):
    """Create default health check functions."""
    def check_database() -> Any:
        from ..monitoring.health import HealthCheck, HealthStatus
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
    
    def check_ml_pipeline() -> Any:
        from ..monitoring.health import HealthCheck, HealthStatus
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
    
    def check_model_registry() -> Any:
        from ..monitoring.health import HealthCheck, HealthStatus
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
    
    def check_safety_controls() -> Any:
        from ..monitoring.health import HealthCheck, HealthStatus
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
                    message=f"Circuit breaker active",
                    details=safety_status,
                )
            
            return HealthCheck(
                component="safety_controls",
                status=HealthStatus.HEALTHY,
                message=f"Safety controls active",
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


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Kalshi Trader ML API",
        "version": "5.0.0",
        "phase": "Phase 5 - Production Integration",
        "status": "ready" if app_state.ready else "not_ready",
    }


@app.get("/health")
async def health_check():
    """Liveness probe endpoint."""
    return JSONResponse(
        content={
            "status": "alive",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": app_state.get_uptime_seconds(),
        }
    )


@app.get("/ready")
async def readiness_check():
    """Readiness probe endpoint."""
    if not app_state.ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready",
        )
    
    return JSONResponse(
        content={
            "status": "ready",
            "timestamp": datetime.now().isoformat(),
        }
    )


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check endpoint."""
    if not app_state.health_checker:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health checker not initialized",
        )
    
    report = app_state.health_checker.run_checks()
    
    content = report.to_dict()
    content['uptime_seconds'] = app_state.get_uptime_seconds()
    
    status_code = status.HTTP_200_OK
    if report.status == HealthStatus.DEGRADED:
        status_code = status.HTTP_200_OK  # Still return 200 for degraded
    elif report.status == HealthStatus.UNHEALTHY:
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        content=content,
        status_code=status_code,
    )


@app.get("/metrics")
async def get_metrics():
    """Get current metrics endpoint."""
    if not app_state.health_checker:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Metrics not available",
        )
    
    # Return aggregated metrics
    return JSONResponse(
        content={
            "timestamp": datetime.now().isoformat(),
            "total_trades": 0,
            "total_pnl": 0.0,
            "strategies": {},
            "ml_predictions_made": 0,
            "fallback_to_momentum": 0,
        }
    )


@app.post("/shutdown")
async def graceful_shutdown():
    """Graceful shutdown endpoint."""
    app_state.ready = False
    
    return JSONResponse(
        content={
            "status": "shutting_down",
            "message": "Service is shutting down gracefully",
        }
    )


def get_health_app() -> FastAPI:
    """Get the health check FastAPI application."""
    return app
