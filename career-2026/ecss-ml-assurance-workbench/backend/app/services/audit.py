"""Audit logging service.

Events intentionally carry only metadata (ids, counts, column names) — never
dataset rows or payloads that could contain sensitive information.
"""

from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.audit import AuditEvent
from app.schemas.enums import AuditEventType


def record_event(
    db: Session,
    event_type: AuditEventType,
    project_id: str,
    dataset_id: str | None = None,
    run_id: str | None = None,
    details: dict[str, Any] | None = None,
    commit: bool = False,
) -> AuditEvent:
    event = AuditEvent(
        id=str(uuid4()),
        event_type=event_type.value,
        project_id=project_id,
        dataset_id=dataset_id,
        run_id=run_id,
        details=details or {},
    )
    db.add(event)
    if commit:
        db.commit()
    return event
