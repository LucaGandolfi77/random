"""Week-7 continuous assurance API (prefix /api/continuous)."""

from fastapi import APIRouter, File, Form, Response, UploadFile

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.continuous.engine import (
    ActionItem,
    AssuranceSnapshot,
    RegressionFinding,
    actions_from_regressions,
    close_action,
    compare_snapshots,
    create_snapshot,
    export_actions_csv,
    generate_review_pack,
    ingest_results,
    issue_draft,
    list_snapshots,
    regressions_from_comparison,
    reproducibility_record,
)
from app.portfolio.models import PortfolioProject
from app.portfolio.seed import seed_portfolio

router = APIRouter(prefix="/continuous", tags=["continuous-assurance"])


def _project(db: DbSession, settings: AppSettings, project_id: str) -> PortfolioProject:
    seed_portfolio(db, settings)
    project = db.get(PortfolioProject, project_id)
    if project is None:
        raise not_found("portfolio project")
    return project


def _snapshot(db: DbSession, snapshot_id: str) -> AssuranceSnapshot:
    snapshot = db.get(AssuranceSnapshot, snapshot_id)
    if snapshot is None:
        raise not_found("snapshot")
    return snapshot


def _as_dict(row) -> dict:
    return {c.key: getattr(row, c.key) for c in row.__table__.columns}


@router.post("/projects/{project_id}/ingest")
def ingest(
    project_id: str, db: DbSession, settings: AppSettings, file: UploadFile = File(...), source_type: str = Form(...)
) -> dict:
    project = _project(db, settings, project_id)
    content = file.file.read()
    try:
        record = ingest_results(db, project, content, source_type=source_type, source_file=file.filename or "")
    except (ValueError, Exception) as exc:
        raise ApiException("INGESTION_FAILED", str(exc)) from exc
    return _as_dict(record)


@router.post("/projects/{project_id}/snapshots", response_model=dict)
def snapshot(project_id: str, db: DbSession, settings: AppSettings, body: dict | None = None) -> dict:
    project = _project(db, settings, project_id)
    body = body or {}
    snap = create_snapshot(
        db,
        project,
        reason=body.get("reason", ""),
        role=body.get("role", "Development Baseline"),
        created_by=body.get("created_by", "system"),
        notes=body.get("notes", ""),
    )
    return _as_dict(snap)


@router.get("/projects/{project_id}/snapshots", response_model=list[dict])
def snapshots(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _project(db, settings, project_id)
    return [_as_dict(s) for s in list_snapshots(db, project_id)]


@router.post("/snapshots/compare", response_model=dict)
def compare(db: DbSession, payload: dict) -> dict:
    a = _snapshot(db, payload.get("baseline_a", ""))
    b = _snapshot(db, payload.get("baseline_b", ""))
    if a.project_id != b.project_id:
        raise ApiException("INVALID_COMPARISON", "Baselines must belong to the same project.")
    return compare_snapshots(a, b)


@router.post("/projects/{project_id}/regressions", response_model=list[dict])
def detect_regressions(project_id: str, db: DbSession, settings: AppSettings, payload: dict) -> list[dict]:
    project = _project(db, settings, project_id)
    a = _snapshot(db, payload.get("baseline_a", ""))
    b = _snapshot(db, payload.get("baseline_b", ""))
    comparison = compare_snapshots(a, b)
    findings = regressions_from_comparison(db, project, comparison)
    actions_from_regressions(db, project, findings)
    return [_as_dict(f) for f in findings]


@router.get("/projects/{project_id}/regressions", response_model=list[dict])
def list_regressions(project_id: str, db: DbSession) -> list[dict]:
    return [_as_dict(f) for f in db.query(RegressionFinding).filter(RegressionFinding.project_id == project_id).all()]


@router.get("/projects/{project_id}/actions", response_model=list[dict])
def list_actions(project_id: str, db: DbSession) -> list[dict]:
    return [
        _as_dict(a)
        for a in db.query(ActionItem).filter(ActionItem.project_id == project_id).order_by(ActionItem.created_at).all()
    ]


@router.get("/projects/{project_id}/actions/export")
def export_actions(project_id: str, db: DbSession) -> Response:
    actions = db.query(ActionItem).filter(ActionItem.project_id == project_id).all()
    return Response(
        content=export_actions_csv(actions),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="actions-{project_id}.csv"'},
    )


@router.post("/actions/{action_id}/issue-draft", response_model=dict)
def issue_draft_endpoint(action_id: str, db: DbSession) -> dict:
    action = db.get(ActionItem, action_id)
    if action is None:
        raise not_found("action")
    return {"draft": issue_draft(action)}


@router.post("/actions/{action_id}/close", response_model=dict)
def action_close(action_id: str, db: DbSession, payload: dict) -> dict:
    action = db.get(ActionItem, action_id)
    if action is None:
        raise not_found("action")
    close_action(db, action, payload.get("resolution", ""), payload.get("closing_evidence", ""))
    return _as_dict(action)


@router.post("/projects/{project_id}/reproducibility", response_model=dict)
def reproducibility(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    return reproducibility_record(db, project, settings=settings)


@router.post("/projects/{project_id}/review-pack", response_model=dict)
def review_pack(project_id: str, db: DbSession, settings: AppSettings, payload: dict | None = None) -> dict:
    project = _project(db, settings, project_id)
    payload = payload or {}
    a = _snapshot(db, payload.get("baseline_a", "")) if payload.get("baseline_a") else None
    b = _snapshot(db, payload.get("baseline_b", "")) if payload.get("baseline_b") else None
    return generate_review_pack(
        db,
        project,
        review_type=payload.get("review_type", "Portfolio Demonstration Review"),
        baseline_a=a,
        baseline_b=b,
    )
