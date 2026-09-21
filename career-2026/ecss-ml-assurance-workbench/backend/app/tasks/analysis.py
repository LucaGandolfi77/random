from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.database.base import Base
from app.models.analysis import AnalysisRun, Finding, ScoreResult
from app.models.project import Project, utcnow
from app.services.analysis import DataReadinessService, AnalysisError
from app.api.serializers import serialize_run_summary

settings = get_settings()
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_analysis_task(self, project_id: str, run_id: str) -> str:
    """Celery task that runs the full data readiness analysis."""
    db_session = SessionLocal()
    try:
        run = db_session.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
        if run is None:
            return "FAILED: run not found"

        run.status = "running"
        run.started_at = utcnow()
        db_session.commit()

        project = db_session.query(Project).filter(Project.id == project_id).first()
        if project is None:
            run.status = "failed"
            run.error_message = "Project not found"
            run.completed_at = utcnow()
            db_session.commit()
            return "FAILED: project not found"

        try:
            service = DataReadinessService(db_session, settings)
            service.run(project)
            run.status = "completed"
            run.completed_at = utcnow()
            db_session.commit()
            return "COMPLETED"
        except AnalysisError as exc:
            run.status = "failed"
            run.error_message = str(exc)
            run.completed_at = utcnow()
            db_session.commit()
            return f"FAILED: {exc}"
    except Exception as exc:
        try:
            run = db_session.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
            if run:
                run.status = "failed"
                run.error_message = str(exc)
                run.completed_at = utcnow()
                db_session.commit()
        except Exception:
            pass
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return f"FAILED: {exc}"
    finally:
        db_session.close()