"""Week-5 assurance engine API (prefix /api/assurance-engine)."""

from fastapi import APIRouter

from app.api.deps import AppSettings, DbSession
from app.api.errors import not_found
from app.assurance_engine.engine import (
    analyze_gaps,
    dimensions,
    gate_evaluate,
    monitoring_readiness,
    traceability_issues,
)
from app.assurance_engine.packages import validate_package_full
from app.assurance_engine.reports import generate_assurance_report
from app.portfolio.models import PortfolioPackage, PortfolioProject
from app.portfolio.seed import seed_portfolio

router = APIRouter(prefix="/assurance-engine", tags=["assurance-engine"])


def _project(db: DbSession, settings: AppSettings, project_id: str) -> PortfolioProject:
    seed_portfolio(db, settings)
    project = db.get(PortfolioProject, project_id)
    if project is None:
        raise not_found("portfolio project")
    return project


def _package(db: DbSession, package_id: str) -> PortfolioPackage:
    package = db.get(PortfolioPackage, package_id)
    if package is None:
        raise not_found("evidence package")
    return package


@router.get("/projects/{project_id}/gaps")
def get_gaps(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    gaps = analyze_gaps(db, project)
    return {
        "project_id": project_id,
        "gap_count": len(gaps),
        "blocking_count": len([g for g in gaps if g["blocking"]]),
        "gaps": gaps,
    }


@router.get("/projects/{project_id}/traceability-issues")
def get_traceability_issues(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    return traceability_issues(db, project)


@router.get("/projects/{project_id}/dimensions")
def get_dimensions(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    return dimensions(db, project)


@router.get("/projects/{project_id}/deployment-gate")
def get_gate(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    return gate_evaluate(db, project)


@router.get("/projects/{project_id}/monitoring")
def get_monitoring(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    return monitoring_readiness(db, project)


@router.post("/projects/{project_id}/assurance-report")
def create_report(project_id: str, db: DbSession, settings: AppSettings) -> dict:
    project = _project(db, settings, project_id)
    return generate_assurance_report(db, project, settings)


@router.post("/evidence-packages/{package_id}/validate")
def validate_package(package_id: str, db: DbSession, settings: AppSettings) -> dict:
    package = _package(db, package_id)
    result = validate_package_full(settings, package)
    package.verification = {
        "status": "VALID"
        if result["validation_status"] == "Valid"
        else (
            "Valid with Warnings"
            if result["validation_status"] == "Valid with Warnings"
            else result["validation_status"]
        ),
        "detail": f"{result['validation_status']} ({result['error_count']} errors, {result['warning_count']} warnings)",
        "validation": result,
    }
    db.commit()
    return result
