"""Analysis configuration endpoints (target / timestamp / ID / thresholds)."""

import json

from fastapi import APIRouter

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.repositories.base import get_active_dataset_for_project, get_project
from app.schemas.api import AnalysisConfigRead, AnalysisConfigUpdate
from app.schemas.enums import AuditEventType
from app.services.analysis import ensure_config
from app.services.audit import record_event

router = APIRouter(tags=["analysis-config"])


def _validate_references(project_id: str, payload: AnalysisConfigUpdate, db: DbSession) -> None:
    """Referenced columns must exist when a dataset is present."""
    dataset = get_active_dataset_for_project(db, project_id)
    if dataset is None:
        return
    available = {c["name"] for c in json.loads(dataset.columns_json)}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in ("target_column", "timestamp_column", "id_column") and value and value not in available:
            raise ApiException(
                "COLUMN_NOT_FOUND",
                f"Column '{value}' does not exist in the dataset.",
                details={"field": field, "column": value, "available": sorted(available)},
            )


@router.get("/projects/{project_id}/config", response_model=AnalysisConfigRead)
def get_config_endpoint(project_id: str, db: DbSession, settings: AppSettings) -> AnalysisConfigRead:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("project")
    config = ensure_config(db, project_id, settings)
    db.commit()
    return AnalysisConfigRead(project_id=project_id, **config.as_dict())


@router.put("/projects/{project_id}/config", response_model=AnalysisConfigRead)
def update_config_endpoint(
    project_id: str, payload: AnalysisConfigUpdate, db: DbSession, settings: AppSettings
) -> AnalysisConfigRead:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("project")
    _validate_references(project_id, payload, db)
    config = ensure_config(db, project_id, settings)
    changes: dict = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in changes.items():
        setattr(config, field, value)
    record_event(
        db,
        AuditEventType.ANALYSIS_CONFIG_UPDATED,
        project_id=project_id,
        details={"fields": sorted(changes.keys())},
    )
    db.commit()
    db.refresh(config)
    return AnalysisConfigRead(project_id=project_id, **config.as_dict())
