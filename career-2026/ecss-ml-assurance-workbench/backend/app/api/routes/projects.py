"""Project endpoints."""

from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AppSettings, DbSession
from app.api.errors import not_found
from app.api.serializers import serialize_project
from app.models.project import Project
from app.repositories.base import get_active_dataset_for_project, get_project
from app.schemas.api import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.projects import ProjectService
from app.services.storage import FileStorage

router = APIRouter(prefix="/projects", tags=["projects"])


def _project_or_404(db: Session, project_id: str) -> Project:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("project")
    return project


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: DbSession, settings: AppSettings) -> ProjectRead:
    project = ProjectService(db, settings).create(payload)
    return serialize_project(db, project)


@router.get("", response_model=list[ProjectRead])
def list_projects(db: DbSession) -> list[ProjectRead]:
    stmt = select(Project).order_by(Project.updated_at.desc())
    projects = list(db.execute(stmt).scalars())
    return [serialize_project(db, p) for p in projects]


@router.get("/{project_id}", response_model=ProjectRead)
def get_project_detail(project_id: str, db: DbSession) -> ProjectRead:
    project = _project_or_404(db, project_id)
    return serialize_project(db, project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, db: DbSession) -> ProjectRead:
    project = _project_or_404(db, project_id)
    project = ProjectService(db).update(project, payload)
    return serialize_project(db, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: DbSession, settings: AppSettings) -> None:
    project = _project_or_404(db, project_id)
    dataset = get_active_dataset_for_project(db, project_id)
    if dataset is not None:
        FileStorage(settings).delete(dataset.stored_filename)
    ProjectService(db).delete(project)
