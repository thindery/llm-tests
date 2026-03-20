"""API Middleware for Kalshi Trader ML Pipeline.

Provides request logging, error handling, and CORS configuration.
"""

from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests with timing."""
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request with logging."""
        start_time = time.time()
        
        # Log request
        logger.info(f"{request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            logger.info(
                f"{request.method} {request.url.path} - "
                f"{response.status_code} - {duration_ms:.2f}ms"
            )
            
            # Add timing header
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"{request.method} {request.url.path} - ERROR - "
                f"{duration_ms:.2f}ms - {str(e)}"
            )
            raise


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Handle errors gracefully."""
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request with error handling."""
        try:
            return await call_next(request)
        except Exception as e:
            logger.exception("Unhandled exception in request")
            
            from fastapi.responses import JSONResponse
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "detail": str(e) if __debug__ else "See logs for details",
                    "path": request.url.path,
                },
            )


def setup_middleware(app: FastAPI) -> None:
    """Configure middleware for FastAPI app.
    
    Parameters
    ----------
    app : FastAPI
        Application to configure
    """
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Request logging
    app.add_middleware(RequestLoggingMiddleware)
    
    # Error handling
    app.add_middleware(ErrorHandlerMiddleware)
    
    logger.info("API middleware configured")
