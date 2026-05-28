"""Basic tests for AgentTrace backend."""

import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from src.agenttrace_backend.main import app
from src.agenttrace_backend.database import Base, get_db
from src.agenttrace_backend.config import Settings


# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client():
    """Create test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test root endpoint returns basic info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test health endpoint returns status."""
    response = await client.get("/health")
    # May return 200 or 503 depending on DB availability
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_ready_endpoint(client):
    """Test ready endpoint."""
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True


@pytest.mark.asyncio
async def test_live_endpoint(client):
    """Test live endpoint."""
    response = await client.get("/live")
    assert response.status_code == 200
    data = response.json()
    assert data["alive"] is True


@pytest.mark.asyncio
async def test_api_info(client):
    """Test API info endpoint."""
    response = await client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data