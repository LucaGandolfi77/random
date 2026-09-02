"""Dataset upload, preview and deletion endpoints."""

from fastapi import APIRouter, File, Query, UploadFile, status

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.api.serializers import serialize_dataset
from app.models.project import Project
from app.repositories.base import get_active_dataset_for_project, get_project
from app.schemas.api import DatasetPreview, DatasetRead
from app.services.datasets import DatasetValidationError
from app.services.datasets_service import DatasetService

router = APIRouter(tags=["datasets"])


def _project(db: DbSession, project_id: str) -> Project:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("project")
    return project


@router.post(
    "/projects/{project_id}/datasets",
    response_model=DatasetRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_dataset(
    project_id: str,
    db: DbSession,
    settings: AppSettings,
    file: UploadFile = File(...),
) -> DatasetRead:
    project = _project(db, project_id)
    try:
        dataset = DatasetService(db, settings).upload(project, file)
    except DatasetValidationError as exc:
        raise ApiException(exc.code, exc.message) from exc
    return serialize_dataset(dataset)


@router.get("/projects/{project_id}/dataset", response_model=DatasetRead)
def get_current_dataset(project_id: str, db: DbSession) -> DatasetRead:
    _project(db, project_id)
    dataset = get_active_dataset_for_project(db, project_id)
    if dataset is None:
        raise ApiException("NO_DATASET", "No dataset uploaded for this project yet.", status.HTTP_404_NOT_FOUND)
    return serialize_dataset(dataset)


@router.get("/projects/{project_id}/dataset/preview", response_model=DatasetPreview)
def get_dataset_preview(
    project_id: str,
    db: DbSession,
    settings: AppSettings,
    limit: int = Query(default=100, ge=1, le=500),
) -> DatasetPreview:
    _project(db, project_id)
    dataset = get_active_dataset_for_project(db, project_id)
    if dataset is None:
        raise ApiException("NO_DATASET", "No dataset uploaded for this project yet.", status.HTTP_404_NOT_FOUND)
    return DatasetService(db, settings).preview(dataset, limit=limit)


@router.delete("/projects/{project_id}/dataset", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_dataset(project_id: str, db: DbSession, settings: AppSettings) -> None:
    _project(db, project_id)
    dataset = get_active_dataset_for_project(db, project_id)
    if dataset is None:
        raise not_found("dataset")
    DatasetService(db, settings).delete(dataset)
