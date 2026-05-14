"""FastAPI application for AgentTrace backend - Railway deployment ready."""

import time
import logging
from contextlib import asynccontextmanager

import orjson
from fastapi import FastAPI, Request, status, Depends
from fastapi.responses import JSONResponse, ORJSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from .config import settings
from .database import db_manager, init_models
from .middleware import setup_middleware
from .storage import storage

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Prometheus metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"]
)

http_request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["method", "endpoint"]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    db_manager.init_db()
    
    # Test database connection
    db_healthy = await db_manager.check_connection()
    if not db_healthy:
        logger.warning("Database connection check failed, will retry on demand")
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await db_manager.close()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="Session replay and agent analytics API",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )
    
    # Setup middleware
    setup_middleware(app)
    
    # Request timing middleware
    @app.middleware("http")
    async def add_request_timing(request: Request, call_next):
        """Add request timing and metrics."""
        start_time = time.time()
        method = request.method
        path = request.url.path
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            # Record metrics
            status_code = str(response.status_code)
            http_requests_total.labels(
                method=method,
                endpoint=path,
                status_code=status_code
            ).inc()
            http_request_duration.labels(
                method=method,
                endpoint=path
            ).observe(duration)
            
            # Add timing header
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            
            return response
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Request failed: {method} {path} - {e}", exc_info=True)
            
            # Record failed request
            http_requests_total.labels(
                method=method,
                endpoint=path,
                status_code="500"
            ).inc()
            http_request_duration.labels(
                method=method,
                endpoint=path
            ).observe(duration)
            
            raise
    
    return app


# Create app instance
app = create_app()


# ==================== Health Endpoints ====================

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Detailed health check with database and R2 status.
    
    Returns:
        - status: "healthy" or "degraded"
        - database: Connection status
        - storage: R2/local storage status
        - version: App version
        - timestamp: UTC timestamp
    """
    start = time.time()
    
    # Check database
    db_check_start = time.time()
    db_healthy = await db_manager.check_connection()
    db_response_time = time.time() - db_check_start
    
    # Check storage
    storage_check_start = time.time()
    storage_status = await storage.health_check()
    storage_response_time = time.time() - storage_check_start
    
    total_time = time.time() - start
    
    status_code = "healthy" if (db_healthy and storage_status["healthy"]) else "degraded"
    http_status = status.HTTP_200_OK if db_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    response = {
        "status": status_code,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "response_ms": round(db_response_time * 1000, 2),
            },
            "storage": {
                "status": "healthy" if storage_status["healthy"] else "unhealthy",
                "r2_configured": storage_status.get("r2_configured", False),
                "r2_connected": storage_status.get("r2_connected", False),
                "local_accessible": storage_status.get("local_accessible", False),
                "response_ms": round(storage_response_time * 1000, 2),
            },
            "app": {
                "status": "healthy",
                "total_check_time_ms": round(total_time * 1000, 2),
            }
        }
    }
    
    return JSONResponse(
        content=response,
        status_code=http_status
    )


@app.get("/ready", tags=["Health"])
async def readiness_check():
    """
    Kubernetes/Railway ready check - minimal overhead.
    
    Returns 200 when ready to accept traffic.
    """
    return {
        "ready": True,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@app.get("/live", tags=["Health"])
async def liveness_check():
    """
    Kubernetes liveness check.
    
    Returns 200 if process is alive.
    """
    return {
        "alive": True,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


# ==================== Metrics Endpoint ====================

@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """
    Prometheus metrics endpoint.
    
    Returns:
        Prometheus-formatted metrics for monitoring.
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# Need to import Response from starlette for metrics endpoint
from starlette.responses import Response


# ==================== API Routes ====================

@app.get("/api/v1/info", tags=["API"])
async def api_info():
    """Get API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "features": {
            "storage_r2": settings.r2_enabled,
            "storage_local": settings.USE_LOCAL_STORAGE,
        }
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with basic info."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else None,
        "health": "/health",
        "status": "ok"
    }


# ==================== Error Handlers ====================

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    """Handle internal server errors."""
    logger.error(f"Internal error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred" if not settings.DEBUG else str(exc)
        }
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    """Handle 404 not found."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Not found",
            "message": f"Endpoint {request.url.path} not found"
        }
    )