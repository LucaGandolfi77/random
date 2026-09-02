"""Audit log endpoints."""

from fastapi import APIRouter, Query

from app.api.deps import DbSession
from app.api.errors import not_found
from app.repositories.base import get_project, list_audit_events
from app.schemas.api import AuditEventRead

router = APIRouter(tags=["audit"])


@router.get("/audit", response_model=list[AuditEventRead])
def get_audit(
    db: DbSession,
    project_id: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[AuditEventRead]:
    if project_id is not None and get_project(db, project_id) is None:
        raise not_found("project")
    return [AuditEventRead.model_validate(e) for e in list_audit_events(db, project_id=project_id, limit=limit)]


@router.get("/projects/{project_id}/audit", response_model=list[AuditEventRead])
def get_project_audit(
    project_id: str, db: DbSession, limit: int = Query(default=200, ge=1, le=1000)
) -> list[AuditEventRead]:
    if get_project(db, project_id) is None:
        raise not_found("project")
    return [AuditEventRead.model_validate(e) for e in list_audit_events(db, project_id=project_id, limit=limit)]
