# AgentTrace Backend

FastAPI backend for AgentTrace - Session replay and analytics for AI agents.

## Features

- ✅ FastAPI + Hypercorn (async, high performance)
- ✅ PostgreSQL with SQLAlchemy + asyncpg
- ✅ Database migrations with Alembic
- ✅ Cloudflare R2 storage with local fallback
- ✅ Health checks (/health, /ready, /live)
- ✅ Prometheus metrics (/metrics)
- ✅ Security headers + CORS
- ✅ Railway deployment ready

## Quick Start

### 1. Setup Environment

```bash
cd projects/agenttrace-backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run Database Migrations

```bash
alembic upgrade head
```

### 4. Start Development Server

```bash
hypercorn src.agenttrace_backend.main:app --reload
```

Or for local development:
```bash
uvicorn src.agenttrace_backend.main:app --reload
```

### 5. Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# API info
curl http://localhost:8000/api/v1/info
```

## Deploy to Railway

See [RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md) for detailed instructions.

**Quick deploy:**
```bash
railway login
railway init
railway add --database  # Add PostgreSQL
railway up
```

## Project Structure

```
agenttrace-backend/
├── src/agenttrace_backend/
│   ├── __init__.py
│   ├── main.py            # FastAPI app
│   ├── config.py          # Settings (Pydantic)
│   ├── database.py        # PostgreSQL + asyncpg
│   ├── models.py          # SQLAlchemy models
│   ├── storage.py         # R2 + local storage
│   └── middleware.py      # Security headers + CORS
├── alembic/
│   ├── env.py             # Migration environment
│   └── versions/          # Migration files
├── railway.toml           # Railway config
├── Procfile               # Process config
├── alembic.ini            # Migration config
└── requirements.txt
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT signing key |
| `R2_*` | No | Cloudflare R2 storage |
| `DEBUG` | No | Enable debug mode (default: false) |

See `railway.env.example` for full reference.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Full health check (DB + Storage) |
| `/ready` | GET | Kubernetes ready probe |
| `/live` | GET | Liveness probe |
| `/metrics` | GET | Prometheus metrics |
| `/api/v1/info` | GET | API information |

## Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Storage Configuration

**Local only (default):**
- Sessions stored in `LOCAL_STORAGE_PATH`
- Good for development

**R2 + Local fallback:**
- Primary: Cloudflare R2 (global, fast)
- Fallback: Local storage
- Set all `R2_*` environment variables

## Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=src/agenttrace_backend --cov-report=html
```

## Monitoring

**Health checks:**
- `/health` - Returns app, database, and storage status
- Returns 503 if unhealthy (for load balancers)

**Metrics:**
- `/metrics` - Prometheus-compatible metrics
- HTTP requests, latency histograms

## License

MIT