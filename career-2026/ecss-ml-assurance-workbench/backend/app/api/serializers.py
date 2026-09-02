"""Serialization helpers: ORM -> API schemas."""

import json

from sqlalchemy.orm import Session

from app.models.analysis import AnalysisRun
from app.models.dataset import Dataset
from app.models.project import Project
from app.repositories.base import get_active_dataset_for_project, get_score, latest_run_for_project
from app.schemas.api import ColumnInfo, DatasetRead, ProjectRead, RunSummary
from app.schemas.enums import RunStatus


def serialize_run_summary(db: Session, run: AnalysisRun | None) -> RunSummary | None:
    if run is None:
        return None
    score = None
    if run.status == "completed":
        score_result = get_score(db, run.id)
        if score_result is not None:
            score = score_result.overall_score
    return RunSummary(
        id=run.id,
        project_id=run.project_id,
        dataset_id=run.dataset_id or "",
        status=RunStatus(run.status),
        error_message=run.error_message,
        started_at=run.started_at,
        completed_at=run.completed_at,
        config_snapshot=run.config_snapshot,
        overall_score=score,
    )


def serialize_project(db: Session, project: Project) -> ProjectRead:
    dataset = get_active_dataset_for_project(db, project.id)
    latest = latest_run_for_project(db, project.id)
    return ProjectRead(
        id=project.id,
        name=project.name,
        description=project.description,
        application_type=project.application_type,
        target_platform=project.target_platform,
        operating_context=project.operating_context,
        criticality_level=project.criticality_level,
        ml_function=project.ml_function,
        notes=project.notes,
        status=project.status,
        version=project.version,
        created_at=project.created_at,
        updated_at=project.updated_at,
        has_dataset=dataset is not None,
        latest_run=serialize_run_summary(db, latest),
    )


def serialize_dataset(dataset: Dataset) -> DatasetRead:
    return DatasetRead(
        id=dataset.id,
        project_id=dataset.project_id,
        original_filename=dataset.original_filename,
        sha256=dataset.sha256,
        size_bytes=dataset.size_bytes,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        columns=[ColumnInfo(**c) for c in json.loads(dataset.columns_json)],
        uploaded_at=dataset.uploaded_at,
    )
