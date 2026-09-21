"""Analysis execution and results endpoints."""

import csv
import io
from fastapi import APIRouter, Query, Response, status
from sqlalchemy import case, func, select

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.api.serializers import serialize_run_summary
from app.models.analysis import AnalysisRun, Finding, ScoreResult
from app.repositories.base import (
    get_active_dataset_for_project,
    get_project,
    get_run,
    get_score,
    latest_run_for_project,
)
from app.schemas.api import FindingRead, FindingsPage, RunSummary, ScoreCategory, ScoreRead
from app.services.analysis import AnalysisError, DataReadinessService
from app.tasks.analysis import run_analysis_task

_SEVERITY_RANK = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFO": 1,
}

router = APIRouter(tags=["analysis"])


def _run_or_404(db: DbSession, run_id: str) -> AnalysisRun:
    run = get_run(db, run_id)
    if run is None:
        raise not_found("analysis run")
    return run


def _score_to_read(score: ScoreResult) -> ScoreRead:
    categories = [
        ScoreCategory(
            name=name,
            weight=data.get("weight", 0.0),
            score=data.get("score"),
            evaluated=data.get("evaluated", False),
            pass_count=data.get("pass_count", 0),
            warning_count=data.get("warning_count", 0),
            fail_count=data.get("fail_count", 0),
            not_applicable_count=data.get("not_applicable_count", 0),
        )
        for name, data in score.category_scores.items()
    ]
    return ScoreRead(
        overall_score=score.overall_score,
        coverage_pct=score.coverage_pct,
        categories=categories,
        pass_count=score.pass_count,
        warning_count=score.warning_count,
        fail_count=score.fail_count,
        not_applicable_count=score.not_applicable_count,
        not_evaluated_count=score.not_evaluated_count,
        method=f"weighted-penalty {score.score_method_version}",
    )


@router.post("/projects/{project_id}/analysis", response_model=RunSummary, status_code=status.HTTP_202_ACCEPTED)
def run_analysis(project_id: str, db: DbSession, settings: AppSettings) -> RunSummary:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("project")
    if get_active_dataset_for_project(db, project_id) is None:
        raise ApiException("NO_DATASET", "Upload a dataset before running the analysis.", status.HTTP_409_CONFLICT)
    run = DataReadinessService(db, settings).create_run(project)
    task = run_analysis_task.delay(project_id, run.id)
    run.celery_task_id = task.id
    db.commit()
    summary = serialize_run_summary(db, run)
    assert summary is not None
    return summary


@router.get("/projects/{project_id}/analysis/latest", response_model=RunSummary)
def latest_analysis(project_id: str, db: DbSession) -> RunSummary:
    if get_project(db, project_id) is None:
        raise not_found("project")
    run = latest_run_for_project(db, project_id)
    if run is None:
        raise ApiException("NO_ANALYSIS", "No analysis has been run for this project yet.", status.HTTP_404_NOT_FOUND)
    summary = serialize_run_summary(db, run)
    assert summary is not None
    return summary


@router.get("/analysis/{run_id}", response_model=RunSummary)
def get_analysis(run_id: str, db: DbSession) -> RunSummary:
    run = _run_or_404(db, run_id)
    summary = serialize_run_summary(db, run)
    assert summary is not None
    return summary


@router.get("/analysis/{run_id}/status")
def get_analysis_status(run_id: str, db: DbSession) -> dict:
    run = _run_or_404(db, run_id)
    return {
        "task_id": run.celery_task_id,
        "status": run.status,
        "progress": None,
        "error_message": run.error_message,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


@router.get("/analysis/{run_id}/findings", response_model=FindingsPage)
def list_findings(
    run_id: str,
    db: DbSession,
    status_filter: str | None = Query(
        default=None, alias="status", description="PASS|WARNING|FAIL|NOT_APPLICABLE|NOT_EVALUATED"
    ),
    severity: str | None = Query(default=None),
    category: str | None = Query(default=None),
    column: str | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    sort: str = Query(default="severity", pattern="^(severity|status|category|title|check_id)$"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> FindingsPage:
    _run_or_404(db, run_id)
    stmt = select(Finding).where(Finding.run_id == run_id)
    count_stmt = select(func.count(Finding.id)).where(Finding.run_id == run_id)

    applied: dict = {}
    if status_filter:
        stmt = stmt.where(Finding.status == status_filter.upper())
        count_stmt = count_stmt.where(Finding.status == status_filter.upper())
        applied["status"] = status_filter.upper()
    if severity:
        stmt = stmt.where(Finding.severity == severity.upper())
        count_stmt = count_stmt.where(Finding.severity == severity.upper())
        applied["severity"] = severity.upper()
    if category:
        stmt = stmt.where(Finding.category == category)
        count_stmt = count_stmt.where(Finding.category == category)
        applied["category"] = category
    if column:
        # JSON array membership: SQLite JSON1 extension.
        stmt = stmt.where(Finding.columns.contains(f'"{column}"'))
        count_stmt = count_stmt.where(Finding.columns.contains(f'"{column}"'))
        applied["column"] = column
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Finding.title.ilike(like)) | (Finding.description.ilike(like)) | (Finding.check_id.ilike(like))
        )
        count_stmt = count_stmt.where(
            (Finding.title.ilike(like)) | (Finding.description.ilike(like)) | (Finding.check_id.ilike(like))
        )
        applied["q"] = q

    if sort == "severity":
        stmt = stmt.order_by(
            case(_SEVERITY_RANK, value=Finding.severity, else_=0).desc(),
            Finding.created_at.asc(),
        )
    else:
        sort_col = {
            "status": Finding.status,
            "category": Finding.category,
            "title": Finding.title,
            "check_id": Finding.check_id,
        }[sort]
        stmt = stmt.order_by(sort_col.desc() if order == "desc" else sort_col.asc(), Finding.created_at.asc())
    total = int(db.execute(count_stmt).scalar_one())
    items = list(db.execute(stmt.offset(offset).limit(limit)).scalars())
    return FindingsPage(
        items=[FindingRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
        applied_filters=applied,
    )


@router.get("/analysis/{run_id}/score", response_model=ScoreRead)
def get_run_score(run_id: str, db: DbSession) -> ScoreRead:
    run = _run_or_404(db, run_id)
    score = get_score(db, run.id)
    if score is None:
        raise ApiException(
            "NO_SCORE", "Score not available for this run (analysis may have failed).", status.HTTP_404_NOT_FOUND
        )
    return _score_to_read(score)


@router.get("/analysis/{run_id}/findings/export")
def export_findings_csv(
    run_id: str,
    db: DbSession,
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> Response:
    """Export findings as CSV with optional filters."""
    _run_or_404(db, run_id)
    stmt = select(Finding).where(Finding.run_id == run_id)
    if status_filter:
        stmt = stmt.where(Finding.status == status_filter.upper())
    if severity:
        stmt = stmt.where(Finding.severity == severity.upper())
    if category:
        stmt = stmt.where(Finding.category == category)
    stmt = stmt.order_by(Finding.severity.desc(), Finding.created_at.asc())
    findings = list(db.execute(stmt).scalars())

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "check_id", "title", "category", "status", "severity",
        "description", "columns", "observed_value", "threshold", "recommendation",
    ])
    for f in findings:
        writer.writerow([
            f.check_id,
            f.title,
            f.category,
            f.status,
            f.severity,
            f.description,
            "|".join(f.columns) if f.columns else "",
            f.observed_value or "",
            f.threshold or "",
            f.recommendation or "",
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=findings-{run_id[:8]}.csv"},
    )
