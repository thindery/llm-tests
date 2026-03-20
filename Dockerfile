# Kalshi Trader ML Pipeline - Production Image
# Phase 5: Production Integration & Monitoring

FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONFAULTHANDLER=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM base AS production

# Copy application code
COPY src/ ./src/
COPY config/ ./config/ 2>/dev/null || true

# Set Python path
ENV PYTHONPATH=/app/src

# Create non-root user
RUN useradd -m -u 1000 kalshi && \
    mkdir -p /app/data /app/logs /app/reports && \
    chown -R kalshi:kalshi /app

USER kalshi

# Expose ports
EXPOSE 8000  
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Default command (API server)
CMD ["uvicorn", "kalshi_trader.api.health:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

# Development stage
FROM base AS development

# Install dev dependencies
RUN pip install pytest pytest-asyncio black isort mypy

# Copy full repository
COPY . .

# Set Python path
ENV PYTHONPATH=/app/src:/app/tests

# Run development server
CMD ["uvicorn", "kalshi_trader.api.health:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Dashboard stage
FROM production AS dashboard

# Command to run Streamlit dashboard
CMD ["streamlit", "run", "src/kalshi_trader/dashboard.py", "--server.port=8501", "--server.address=0.0.0.0"]
