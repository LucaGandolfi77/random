"""Repository helpers used by the services."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analysis import AnalysisRun, Finding, ScoreResult
from app.models.audit import AuditEvent, Report
from app.models.dataset import Dataset
from app.models.project import AnalysisConfig, Project
from app.schemas.enums import DatasetStatus


def get_project(db: Session, project_id: str) -> Project | None:
    return db.get(Project, project_id)


def get_dataset(db: Session, dataset_id: str) -> Dataset | None:
    return db.get(Dataset, dataset_id)


def get_active_dataset_for_project(db: Session, project_id: str) -> Dataset | None:
    stmt = (
        select(Dataset)
        .where(Dataset.project_id == project_id, Dataset.status == DatasetStatus.AVAILABLE.value)
        .order_by(Dataset.uploaded_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def get_config(db: Session, project_id: str) -> AnalysisConfig | None:
    return db.get(AnalysisConfig, project_id)


def latest_run_for_project(db: Session, project_id: str) -> AnalysisRun | None:
    stmt = (
        select(AnalysisRun).where(AnalysisRun.project_id == project_id).order_by(AnalysisRun.started_at.desc()).limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def get_run(db: Session, run_id: str) -> AnalysisRun | None:
    return db.get(AnalysisRun, run_id)


def get_score(db: Session, run_id: str) -> ScoreResult | None:
    return db.get(ScoreResult, run_id)


def list_findings_for_run(db: Session, run_id: str) -> list[Finding]:
    stmt = select(Finding).where(Finding.run_id == run_id).order_by(Finding.created_at.asc())
    return list(db.execute(stmt).scalars())


def list_reports(db: Session, project_id: str) -> list[Report]:
    stmt = select(Report).where(Report.project_id == project_id).order_by(Report.generated_at.desc())
    return list(db.execute(stmt).scalars())


def get_report(db: Session, report_id: str) -> Report | None:
    return db.get(Report, report_id)


def list_audit_events(db: Session, project_id: str | None = None, limit: int = 200) -> list[AuditEvent]:
    stmt = select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)
    if project_id:
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.project_id == project_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
        )
    return list(db.execute(stmt).scalars())
