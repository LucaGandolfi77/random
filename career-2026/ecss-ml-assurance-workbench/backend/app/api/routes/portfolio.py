"""Week-3 portfolio endpoints (prefix /api/portfolio)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Response, status

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.models.audit import AuditEvent
from app.portfolio import PACKAGE_COMPLETENESS_CATEGORIES
from app.portfolio.models import PortfolioPackage, PortfolioProject
from app.portfolio.package import generate_package, package_zip_bytes, verify_package_file
from app.portfolio.seed import seed_portfolio
from app.portfolio.service import (
    deployment_checklist,
    get_project,
    latest_decision,
    list_projects,
    project_packages,
    serialized_payload,
    traceability_matrix,
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _ensure_seed(db: DbSession, settings: AppSettings) -> None:
    seed_portfolio(db, settings)


def _audit(
    db: DbSession, event_type: str, project_id: str, details: dict | None = None, package_id: str | None = None
) -> None:
    db.add(
        AuditEvent(
            id=str(uuid.uuid4()),
            event_type=event_type,
            project_id=project_id,
            dataset_id=None,
            run_id=None,
            details={"actor": "system", "package_id": package_id, **(details or {})},
            created_at=datetime.now(UTC),
        )
    )
    db.commit()


def _project_or_404(db: DbSession, project_id: str) -> PortfolioProject:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("portfolio project")
    return project


@router.get("/projects", response_model=list[dict])
def portfolio_projects(db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    return [serialized_payload(db, p)["project"] for p in list_projects(db)]


@router.get("/projects/summary", response_model=list[dict])
def portfolio_projects_summary(db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    out = []
    for project in list_projects(db):
        payload = serialized_payload(db, project)
        counts = payload["coverage"]["verdict_counts"]
        compl = payload["completeness"]
        decision = payload.get("deployment_decision") or {}
        out.append(
            {
                "id": project.id,
                "slug": project.slug,
                "name": project.name,
                "short_description": project.short_description,
                "lifecycle_status": project.lifecycle_status,
                "assurance_status": project.assurance_status,
                "deployment_decision": decision.get("decision", "none"),
                "version": project.version,
                "model_version": project.model_version,
                "dataset_version": project.dataset_version,
                "criticality": project.criticality,
                "updated_at": project.updated_at,
                "requirements_total": len(payload["requirements"]),
                "requirements_verified": sum(1 for r in payload["requirements"] if r["status"] == "VERIFIED"),
                "tests_defined": len(payload["tests"]),
                "tests_passed": counts.get("PASS", 0),
                "tests_failed": counts.get("FAIL", 0),
                "tests_blocked": counts.get("BLOCKED", 0),
                "tests_not_executed": counts.get("NOT_EXECUTED", 0),
                "tests_inconclusive": counts.get("INCONCLUSIVE", 0),
                "evidence_count": len(payload["evidence"]),
                "risk_count": len(payload["risks"]),
                "open_limitations": sum(1 for lim in payload["limitations"] if lim["status"] != "CLOSED"),
                "fmea_count": len(payload["fmea"]),
                "package_completeness_pct": compl["overall_indicator_pct"],
                "package_missing_manifest": compl["categories"]["integrity_manifest"]["state"],
            }
        )
    return out


@router.get("/projects/{project_id}", response_model=dict)
def portfolio_project_detail(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    project = _project_or_404(db, project_id)
    payload = serialized_payload(db, project)
    payload["deployment_checklist"] = deployment_checklist(db, project_id)
    payload["packages"] = [pkg_dict(p) for p in project_packages(db, project_id)]
    return payload


@router.get("/projects/{project_id}/requirements", response_model=list[dict])
def project_requirements(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    project = _project_or_404(db, project_id)
    return serialized_payload(db, project)["requirements"]


@router.get("/projects/{project_id}/traceability", response_model=list[dict])
def project_traceability(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return traceability_matrix(db, project_id)


@router.get("/projects/{project_id}/evidence", response_model=list[dict])
def project_evidence(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["evidence"]


@router.get("/projects/{project_id}/tests", response_model=dict)
def project_tests(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    payload = serialized_payload(db, _project_or_404(db, project_id))
    return {"tests": payload["tests"], "coverage": payload["coverage"]}


@router.get("/projects/{project_id}/fmea", response_model=list[dict])
def project_fmea(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["fmea"]


@router.get("/projects/{project_id}/risks", response_model=list[dict])
def project_risks(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["risks"]


@router.get("/projects/{project_id}/limitations", response_model=list[dict])
def project_limitations(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["limitations"]


@router.get("/projects/{project_id}/deployment-decision", response_model=dict)
def project_deployment_decision(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    decision = latest_decision(db, project_id)
    return {
        "decision": decision
        and {
            c.name: getattr(decision, c.name) for c in decision.__table__.columns if c.key not in ("id", "project_id")
        },
        "checklist": deployment_checklist(db, project_id),
    }


@router.get("/projects/{project_id}/monitoring", response_model=dict)
def project_monitoring(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["monitoring"]


@router.get("/projects/{project_id}/odd", response_model=dict)
def project_odd(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["odd"]


@router.get("/projects/{project_id}/completeness", response_model=dict)
def project_completeness(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return serialized_payload(db, _project_or_404(db, project_id))["completeness"]


@router.get("/projects/{project_id}/evidence-packages", response_model=list[dict])
def portfolio_packages(project_id: str, db: DbSession, settings: AppSettings) -> list[dict]:
    _ensure_seed(db, settings)
    _project_or_404(db, project_id)
    return [pkg_dict(p) for p in project_packages(db, project_id)]


@router.post("/projects/{project_id}/evidence-packages", response_model=dict, status_code=status.HTTP_201_CREATED)
def generate_portfolio_package(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    _ensure_seed(db, settings)
    project = _project_or_404(db, project_id)
    package = generate_package(db, project, settings)
    _audit(db, "EVIDENCE_PACKAGE_GENERATED", project_id, {"package_id": package.id, "version": package.package_version})
    return pkg_dict(package)


@router.get("/evidence-packages/{package_id}/download")
def download_portfolio_package(package_id: str, db: DbSession, settings: AppSettings) -> Response:
    package = _package_or_404(db, package_id)
    try:
        content = package_zip_bytes(settings, package)
    except (OSError, ValueError):
        raise ApiException(
            "PACKAGE_FILE_MISSING", "Stored package file is not available.", status.HTTP_409_CONFLICT
        ) from None
    _audit(db, "EVIDENCE_PACKAGE_DOWNLOADED", package.project_id, None, package_id)
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{package.filename}"'},
    )


@router.post("/evidence-packages/{package_id}/verify", response_model=dict)
def verify_portfolio_package(package_id: str, db: DbSession, settings: AppSettings) -> dict:
    package = _package_or_404(db, package_id)
    result = verify_package_file(settings, package)
    package.verification = result
    db.commit()
    _audit(
        db,
        "EVIDENCE_PACKAGE_VERIFIED" if result["status"] == "VALID" else "EVIDENCE_PACKAGE_VERIFICATION_FAILED",
        package.project_id,
        {"package_id": package_id, "status": result["status"]},
    )
    return {"package_id": package_id, "status": result["status"], "detail": result.get("detail", "")}


def _package_or_404(db: DbSession, package_id: str) -> PortfolioPackage:
    package = db.get(PortfolioPackage, package_id)
    if package is None:
        raise not_found("evidence package")
    return package


def pkg_dict(package: PortfolioPackage) -> dict:
    return {
        "id": package.id,
        "project_id": package.project_id,
        "package_version": package.package_version,
        "package_schema_version": package.package_schema_version,
        "filename": package.filename,
        "size_bytes": package.size_bytes,
        "document_count": len(package.document_list),
        "evidence_count": len(package.evidence_list),
        "snapshot_status": package.snapshot_status,
        "verification": package.verification,
        "generated_at": package.generated_at,
    }


# expose completeness categories for UI filter lists
@router.get("/meta/completeness-categories", response_model=list[str])
def completeness_categories() -> list[str]:
    return list(PACKAGE_COMPLETENESS_CATEGORIES)
