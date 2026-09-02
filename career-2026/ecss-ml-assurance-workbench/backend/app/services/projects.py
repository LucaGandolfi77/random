"""Project lifecycle service."""

from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.project import AnalysisConfig, Project
from app.schemas.api import ProjectCreate, ProjectUpdate
from app.schemas.enums import AuditEventType, ProjectStatus
from app.services.audit import record_event


class ProjectService:
    def __init__(self, db: Session, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    def create(self, payload: ProjectCreate) -> Project:
        project = Project(
            id=str(uuid4()),
            name=payload.name.strip(),
            description=payload.description,
            application_type=payload.application_type.value,
            target_platform=payload.target_platform,
            operating_context=payload.operating_context.value,
            criticality_level=payload.criticality_level.value,
            ml_function=payload.ml_function,
            notes=payload.notes,
            status=ProjectStatus.DRAFT.value,
            version=1,
        )
        config = AnalysisConfig(
            project_id=project.id,
            missing_threshold_pct=self.settings.default_missing_threshold_pct,
            iqr_multiplier=self.settings.iqr_multiplier,
        )
        self.db.add(project)
        self.db.add(config)
        self.db.flush()
        record_event(
            self.db,
            AuditEventType.PROJECT_CREATED,
            project_id=project.id,
            details={"name": project.name, "application_type": project.application_type},
        )
        self.db.commit()
        self.db.refresh(project)
        return project

    def update(self, project: Project, payload: ProjectUpdate) -> Project:
        changes: dict = payload.model_dump(exclude_unset=True, exclude_none=True)
        if not changes:
            return project
        allowed_statuses = {status.value for status in ProjectStatus}
        for field, value in changes.items():
            if field == "status":
                if value not in allowed_statuses:
                    continue
                setattr(project, field, value)
            elif isinstance(value, str):
                setattr(project, field, value.strip())
            else:
                setattr(project, field, value)
        project.version += 1
        record_event(
            self.db,
            AuditEventType.PROJECT_UPDATED,
            project_id=project.id,
            details={"fields": sorted(changes.keys()), "version": project.version},
        )
        self.db.commit()
        self.db.refresh(project)
        return project

    def set_status(self, project: Project, status: ProjectStatus, *, version_bump: bool = False) -> Project:
        project.status = status.value
        if version_bump:
            project.version += 1
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        record_event(self.db, AuditEventType.PROJECT_DELETED, project_id=project.id, details={"name": project.name})
        self.db.delete(project)
        self.db.commit()
