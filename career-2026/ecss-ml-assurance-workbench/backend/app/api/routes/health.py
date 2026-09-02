"""Health check endpoints."""

from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import AppSettings, DbSession
from app.core.version import TOOL_VERSION
from app.schemas.api import HealthRead

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthRead)
def health(db: DbSession, settings: AppSettings) -> HealthRead:
    database_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_ok = False
    return HealthRead(
        status="ok" if database_ok else "degraded",
        version=TOOL_VERSION,
        environment=settings.environment,
        database="ok" if database_ok else "error",
        timestamp=datetime.now(UTC),
    )


@router.get("/health/live", include_in_schema=True)
def health_live() -> dict:
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}


@router.get("/health/ready", include_in_schema=True)
def health_ready(db: DbSession) -> dict:
    checks = {"database": "ok", "storage": "ok"}
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "error"
    try:
        from app.core.config import get_settings

        (get_settings().storage_dir / "portfolio").mkdir(parents=True, exist_ok=True)
    except Exception:
        checks["storage"] = "error"
    ready = all(v == "ok" for v in checks.values())
    return {"status": "ready" if ready else "not_ready", "checks": checks, "timestamp": datetime.now(UTC).isoformat()}


@router.get("/version", include_in_schema=True)
def version_endpoint() -> dict:
    from app.core.version import ANALYZER_VERSION, TOOL_VERSION

    return {"version": TOOL_VERSION, "analyzer_version": ANALYZER_VERSION}
