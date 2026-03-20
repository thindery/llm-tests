# Phase 5: Production Integration & Monitoring

## Overview

This phase integrates the ML pipeline with the existing Kalshi momentum trading strategy and provides comprehensive monitoring, alerting, and deployment capabilities.

## Components

### 1. Production Integration (`trading_integration.py`)

**MLEnhancedTrader** - ML-enhanced trading wrapper that:
- Integrates with existing momentum strategy
- Provides ML-enhanced trade suggestions
- Implements graceful degradation (fallback to momentum)
- Supports multiple ML feature levels (DISABLED, SHADOW, ENHANCED, FULL)

**MLTradingLoop** - Main trading loop that:
- Wraps momentum strategy with ML enhancements
- Manages ML pipeline lifecycle
- Provides callbacks for circuit breakers and ML failures

**Configuration System** (`config.py`):
- Environment-based configuration (dev/staging/prod)
- Feature-level toggles
- Notification settings
- Path configuration

### 2. Monitoring & Alerting (`monitoring/`)

**AlertManager** - Centralized alerting system:
- Slack notifications via webhooks
- Email notifications via SMTP
- Circuit breaker alerts
- Model drift detection alerts
- Daily/weekly P&L reports

**MetricsCollector** - Performance metrics tracking:
- Real-time P&L monitoring
- Win rate calculation
- Strategy performance breakdown
- ML prediction tracking with fallback counting

**HealthChecker** - System health monitoring:
- Database connectivity checks
- ML pipeline status
- Model registry health
- Safety controls status
- API endpoint for Kubernetes probes

**PnLReporter** - Automated reporting:
- Scheduled daily/weekly/monthly reports
- Markdown and JSON export formats
- Strategy insights generation
- Email delivery

### 3. Deployment

**Docker Configuration**:
- Multi-stage Dockerfile (base, production, development, dashboard)
- docker-compose.yml with service orchestration
- Health checks and graceful shutdown
- Volume mounts for data persistence

**API Endpoints** (`api/health.py`):
- `/` - Service information
- `/health` - Liveness probe
- `/ready` - Readiness probe
- `/health/detailed` - Detailed health status
- `/metrics` - Current metrics
- `/shutdown` - Graceful shutdown

**Dashboard** (`dashboard_monitoring.py`):
- New monitoring tab for Streamlit dashboard
- Real-time metrics display
- Health status cards
- Alert center
- Circuit breaker controls
- Model drift visualization
- Integration status panel

## Configuration

### Environment Variables

```bash
# Environment
KALSHI_ENV=production  # development, staging, production

# ML Feature Level
ML_FEATURE_LEVEL=enhanced  # disabled, shadow, enhanced, full
FALLBACK_TO_MOMENTUM=true

# Monitoring
HEALTH_CHECK_INTERVAL=60
LOG_LEVEL=INFO
DRIFT_THRESHOLD=0.05

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SLACK_CHANNEL=#alerts
EMAIL_TO_ADDRESSES=alert@example.com
SMTP_HOST=smtp.gmail.com
SMTP_USER=user@example.com
SMTP_PASSWORD=secret

# Paths
DB_PATH=/app/data/ml_pipeline.db
MODEL_REGISTRY_PATH=/app/data/models
```

### Configuration File

```json
{
  "environment": "production",
  "integration": {
    "ml_feature_level": "enhanced",
    "fallback_to_momentum": true,
    "momentum_confidence_threshold": 0.6,
    "ml_override_threshold": 0.75,
    "bayesian_weight": 0.4,
    "ml_weight": 0.6
  },
  "monitoring": {
    "health_check_interval_seconds": 60,
    "metrics_retention_days": 30,
    "dashboard_port": 8501,
    "api_port": 8000,
    "drift_threshold": 0.05
  },
  "notifications": {
    "circuit_breaker_alert": true,
    "daily_loss_alert": true,
    "model_drift_alert": true,
    "pnl_report": true
  }
}
```

## Usage

### Basic ML-Enhanced Trading

```python
from kalshi_trader.ml import MLEnhancedTrader, load_config

# Initialize trader
config = load_config()
trader = MLEnhancedTrader(config=config)
trader.initialize(balance=1000.0)

# Get ML-enhanced suggestion
from kalshi_trader.ml import PriceHistory, SuggestionType

price_history = PriceHistory(prices=[...], market_id="...")
suggestion = trader.get_suggestion(
    price_history=price_history,
    suggestion_type=SuggestionType.BREAKOUT,
    momentum_confidence=0.65,
)

if suggestion.should_trade:
    size = trader.calculate_position_size(suggestion)
    print(f"Execute trade: ${size:.2f}")
    print(f"ML Confidence: {suggestion.ml_confidence:.2%}")
```

### Running the API Server

```bash
# Production
uvicorn kalshi_trader.api.health:app --host 0.0.0.0 --port 8000 --workers 2

# Development with auto-reload
uvicorn kalshi_trader.api.health:app --host 0.0.0.0 --port 8000 --reload
```

### Running the Dashboard

```bash
streamlit run src/kalshi_trader/dashboard.py --server.port=8501
```

### Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# Run specific service
docker-compose up -d api
docker-compose up -d dashboard

# View logs
docker-compose logs -f

# Scale API instances
docker-compose up -d --scale api=3
```

## Testing

```bash
# Run integration tests
pytest tests/kalshi_trader/ml/test_integration.py -v

# Run monitoring tests
pytest tests/kalshi_trader/ml/test_monitoring.py -v

# Run all tests
pytest tests/kalshi_trader/ml/ -v
```

## Health Check Integration

The health check system integrates with Kubernetes and Docker:

```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

# Kubernetes readiness probe
readinessProbe:
  httpGet:
    path: /ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Alert Response Playbooks

### Circuit Breaker Triggered
1. Check current P&L and consecutive losses
2. Review recent trades in dashboard
3. Determine if manual intervention needed
4. Wait for automatic reset or manual reset
5. Consider strategy adjustment before resuming

### Model Drift Detected
1. Review drift score vs threshold
2. Check feature distributions
3. Consider model retraining
4. May temporarily switch to shadow mode

### Health Check Failure
1. Review detailed health status
2. Check component logs
3. Potentially restart affected service
4. Escalate if database connectivity issues

## Acceptance Criteria

- [x] ML pipeline integrates with existing momentum strategy
- [x] Trade suggestions include ML confidence scores
- [x] Monitoring dashboard shows real-time metrics
- [x] Alerts sent on circuit breaker triggers
- [x] System gracefully degrades if ML components fail
- [x] Docker image builds and runs successfully
- [x] Health check endpoints operational
- [x] Daily/weekly P&L reports generated
- [x] Model drift detection alerts functional
- [x] Comprehensive test coverage

## Migration Guide

### From Phase 4 to Phase 5

1. Update `requirements.txt` with new dependencies:
   ```bash
   pip install fastapi uvicorn streamlit plotly
   ```

2. Add environment variables (see Configuration section)

3. Deploy using Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Update any existing strategy code to use `MLEnhancedTrader`:
   ```python
   # Before (Phase 4)
   from kalshi_trader.ml import MLPipeline
   pipeline = MLPipeline()
   
   # After (Phase 5)
   from kalshi_trader.ml import MLEnhancedTrader
   trader = MLEnhancedTrader()
   ```

## API Documentation

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service information |
| `/health` | GET | Liveness probe (returns 200 if alive) |
| `/ready` | GET | Readiness probe (returns 200 if ready, 503 if not) |
| `/health/detailed` | GET | Detailed health status with component checks |
| `/metrics` | GET | Current performance metrics |
| `/shutdown` | POST | Graceful shutdown |

### Response Codes

- `200 OK` - Service healthy and ready
- `503 Service Unavailable` - Service starting up or unhealthy

## Troubleshooting

### Docker Issues

**Issue**: Container exits immediately
```bash
# Check logs
docker-compose logs api

# Verify environment variables
docker-compose config
```

**Issue**: Database not found
```bash
# Ensure volume is mounted
docker-compose down -v
docker-compose up -d

# Check permissions
ls -la data/
```

### ML Pipeline Issues

**Issue**: High fallback rate
- Check model versions are registered
- Verify feature engineering is working
- Review safety control settings

**Issue**: Low ML confidence
- May need more training data
- Check model drift detection
- Consider retraining models

### Monitoring Issues

**Issue**: Alerts not received
- Verify Slack webhook URL
- Check SMTP credentials
- Review alert filtering configuration

**Issue**: Health checks failing
- Check database connectivity
- Verify ML pipeline initialization
- Review logs for specific component errors

## Future Enhancements

- [ ] Grafana integration for advanced dashboards
- [ ] Prometheus metrics export
- [ ] Distributed tracing with Jaeger
- [ ] Automated model retraining pipeline
- [ ] Multi-market support
- [ ] WebSocket real-time updates
- [ ] Mobile app for monitoring
- [ ] ML model explainability dashboard

## References

- Phase 2: Confidence Scoring & A/B Testing
- Phase 3: Feature Engineering & Model Training
- Phase 4: Safety Controls & Graduation Logic
- **Phase 5: Production Integration & Monitoring** (this document)
