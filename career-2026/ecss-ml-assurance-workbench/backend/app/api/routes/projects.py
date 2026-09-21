"""Project endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AppSettings, DbSession, require_editor, require_viewer
from app.api.errors import not_found
from app.api.serializers import serialize_project
from app.models.project import Project
from app.models.user import User
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
def create_project(
    payload: ProjectCreate,
    db: DbSession,
    settings: AppSettings,
    current_user: Annotated[User, Depends(require_editor)],
) -> ProjectRead:
    project = ProjectService(db, settings).create(payload)
    return serialize_project(db, project)


@router.get("", response_model=list[ProjectRead])
def list_projects(
    db: DbSession,
    current_user: Annotated[User, Depends(require_viewer)],
) -> list[ProjectRead]:
    stmt = select(Project).order_by(Project.updated_at.desc())
    projects = list(db.execute(stmt).scalars())
    return [serialize_project(db, p) for p in projects]


@router.get("/{project_id}", response_model=ProjectRead)
def get_project_detail(
    project_id: str,
    db: DbSession,
    current_user: Annotated[User, Depends(require_viewer)],
) -> ProjectRead:
    project = _project_or_404(db, project_id)
    return serialize_project(db, project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(require_editor)],
) -> ProjectRead:
    project = _project_or_404(db, project_id)
    project = ProjectService(db).update(project, payload)
    return serialize_project(db, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: DbSession,
    settings: AppSettings,
    current_user: Annotated[User, Depends(require_editor)],
) -> None:
    project = _project_or_404(db, project_id)
    dataset = get_active_dataset_for_project(db, project_id)
    if dataset is not None:
        FileStorage(settings).delete(dataset.stored_filename)
    ProjectService(db).delete(project)
