"""Data Readiness analysis orchestrator.

The orchestration is intentionally synchronous for week 1 (small datasets).
Every check is a pure function over an ``AnalysisContext``; the service only
loads the file, builds the context, executes the fixed registry, persists the
findings and computes the score. Moving execution to a worker queue later only
requires replacing the synchronous call site.
"""

import logging
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.analyzers.context import CheckResult, build_context
from app.analyzers.registry import REGISTRY, category_rank
from app.analyzers.score import build_score_result
from app.core.config import Settings, get_settings
from app.core.version import ANALYZER_VERSION
from app.models.analysis import AnalysisRun, Finding
from app.models.dataset import Dataset
from app.models.project import AnalysisConfig, Project
from app.schemas.enums import AuditEventType, FindingStatus, ProjectStatus, RunStatus
from app.services.audit import record_event
from app.services.datasets import stored_to_df

logger = logging.getLogger(__name__)


class AnalysisError(Exception):
    """Raised when an analysis cannot be executed (not a dataset finding)."""


def ensure_config(db: Session, project_id: str, settings: Settings | None = None) -> AnalysisConfig:
    config = db.get(AnalysisConfig, project_id)
    if config is None:
        cfg = settings or get_settings()
        config = AnalysisConfig(
            project_id=project_id,
            missing_threshold_pct=cfg.default_missing_threshold_pct,
            iqr_multiplier=cfg.iqr_multiplier,
        )
        db.add(config)
        db.flush()
    return config


def _result_sort_key(result: CheckResult) -> tuple:
    return (
        category_rank(result.category),
        result.check_id,
        ",".join(result.columns),
        result.title,
    )


class DataReadinessService:
    def __init__(self, db: Session, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    def create_run(self, project: Project) -> AnalysisRun:
        from app.repositories.base import get_active_dataset_for_project

        dataset = get_active_dataset_for_project(self.db, project.id)
        if dataset is None:
            raise AnalysisError("No dataset uploaded for this project yet.")
        config = ensure_config(self.db, project.id)
        config_snapshot = config.to_snapshot()
        config_snapshot["recorded_row_count"] = dataset.row_count
        config_snapshot["dataset_id"] = dataset.id

        run = AnalysisRun(
            id=str(uuid4()),
            project_id=project.id,
            dataset_id=dataset.id,
            status=RunStatus.QUEUED.value,
            config_snapshot=config_snapshot,
        )
        self.db.add(run)
        self.db.flush()
        self.db.commit()
        return run

    def run(self, project: Project) -> AnalysisRun:
        from app.repositories.base import get_active_dataset_for_project

        dataset = get_active_dataset_for_project(self.db, project.id)
        if dataset is None:
            raise AnalysisError("No dataset uploaded for this project yet.")
        config = ensure_config(self.db, project.id)
        config_snapshot = config.to_snapshot()
        config_snapshot["recorded_row_count"] = dataset.row_count
        config_snapshot["dataset_id"] = dataset.id

        run = AnalysisRun(
            id=str(uuid4()),
            project_id=project.id,
            dataset_id=dataset.id,
            status=RunStatus.RUNNING.value,
            config_snapshot=config_snapshot,
        )
        self.db.add(run)
        self.db.flush()
        record_event(
            self.db,
            AuditEventType.ANALYSIS_STARTED,
            project_id=project.id,
            dataset_id=dataset.id,
            run_id=run.id,
            details={"dataset_sha256": dataset.sha256, "row_count": dataset.row_count},
        )
        self.db.commit()

        try:
            self._execute(project, dataset, config_snapshot, run)
            return run
        except Exception as exc:
            logger.exception("analysis failed for project %s", project.id)
            run.status = RunStatus.FAILED.value
            run.error_message = f"{exc.__class__.__name__}: {exc}"
            record_event(
                self.db,
                AuditEventType.ANALYSIS_FAILED,
                project_id=project.id,
                dataset_id=dataset.id,
                run_id=run.id,
                details={"error_type": exc.__class__.__name__},
            )
            self.db.commit()
            raise AnalysisError(str(exc)) from exc

    def _execute(
        self,
        project: Project,
        dataset: Dataset,
        config_snapshot: dict,
        run: AnalysisRun,
    ) -> None:
        df = stored_to_df(self.settings.datasets_dir / dataset.stored_filename)
        ctx = build_context(df, config_snapshot, sha256=dataset.sha256)
        results: list[CheckResult] = []
        for check in REGISTRY:
            results.extend(check(ctx))
        results.sort(key=_result_sort_key)

        findings: list[Finding] = []
        for result in results:
            findings.append(
                Finding(
                    id=str(uuid4()),
                    run_id=run.id,
                    check_id=result.check_id,
                    category=result.category,
                    title=result.title,
                    description=result.description,
                    status=result.status.value,
                    severity=result.severity.value,
                    observed_value=result.observed_value,
                    threshold=result.threshold,
                    columns=result.columns,
                    evidence=result.evidence,
                    risk=result.risk,
                    recommendation=result.recommendation,
                    analyzer_version=ANALYZER_VERSION,
                )
            )
        self.db.add_all(findings)
        self.db.flush()

        score = build_score_result(run.id, findings)
        self.db.add(score)
        self.db.flush()

        run.status = RunStatus.COMPLETED.value
        run.completed_at = datetime.now(UTC)

        severe_fail = any(f.status == FindingStatus.FAIL.value and f.severity in ("HIGH", "CRITICAL") for f in findings)
        project.status = ProjectStatus.REVIEW_REQUIRED.value if severe_fail else ProjectStatus.ANALYSIS_COMPLETED.value
        record_event(
            self.db,
            AuditEventType.ANALYSIS_COMPLETED,
            project_id=project.id,
            dataset_id=dataset.id,
            run_id=run.id,
            details={
                "finding_count": len(findings),
                "fail_count": score.fail_count,
                "warning_count": score.warning_count,
                "overall_score": score.overall_score,
            },
        )
        self.db.commit()
        self.db.refresh(run)
        logger.info(
            "analysis completed project=%s run=%s findings=%s score=%s",
            project.id,
            run.id,
            len(findings),
            score.overall_score,
        )
