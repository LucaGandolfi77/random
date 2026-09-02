"""Report generation and download endpoints."""

from fastapi import APIRouter, Response, status

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.reports.service import ReportService
from app.repositories.base import (
    get_dataset,
    get_project,
    get_report,
    get_run,
    get_score,
    list_findings_for_run,
    list_reports,
)
from app.schemas.api import ReportRead
from app.schemas.enums import RunStatus
from app.services.analysis import AnalysisError

router = APIRouter(tags=["reports"])


def _report_or_404(db: DbSession, report_id: str):
    report = get_report(db, report_id)
    if report is None:
        raise not_found("report")
    return report


@router.post("/analysis/{run_id}/report", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def generate_report(run_id: str, db: DbSession, settings: AppSettings) -> ReportRead:
    run = get_run(db, run_id)
    if run is None:
        raise not_found("analysis run")
    if run.status != RunStatus.COMPLETED.value:
        raise ApiException(
            "RUN_NOT_COMPLETED", "Report generation requires a completed analysis run.", status.HTTP_409_CONFLICT
        )
    project = get_project(db, run.project_id)
    if project is None:
        raise not_found("project")
    score = get_score(db, run.id)
    if score is None:
        raise ApiException("NO_SCORE", "No score available for this run.", status.HTTP_409_CONFLICT)
    findings = list_findings_for_run(db, run.id)
    dataset = get_dataset(db, run.dataset_id) if run.dataset_id else None
    if dataset is None:
        raise ApiException(
            "NO_DATASET_RECORD", "Dataset record for this run is no longer available.", status.HTTP_409_CONFLICT
        )
    try:
        report = ReportService(db, settings).generate(project, run, dataset, score, findings)
    except AnalysisError as exc:
        raise ApiException("REPORT_FAILED", str(exc)) from exc
    return ReportRead.model_validate(report)


@router.get("/projects/{project_id}/reports", response_model=list[ReportRead])
def list_project_reports(project_id: str, db: DbSession) -> list[ReportRead]:
    if get_project(db, project_id) is None:
        raise not_found("project")
    return [ReportRead.model_validate(r) for r in list_reports(db, project_id)]


@router.get("/reports/{report_id}", response_model=dict)
def get_report_content(report_id: str, db: DbSession) -> dict:
    report = _report_or_404(db, report_id)
    import json

    try:
        return json.loads(report.content)
    except json.JSONDecodeError as exc:
        raise ApiException("REPORT_CORRUPT", "Stored report content is not valid JSON.") from exc


@router.get("/reports/{report_id}/download")
def download_report(report_id: str, db: DbSession) -> Response:
    report = _report_or_404(db, report_id)
    return Response(
        content=report.content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{report.filename}"'},
    )
