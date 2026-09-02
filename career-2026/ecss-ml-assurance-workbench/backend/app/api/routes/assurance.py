"""Assurance registry — REST endpoints.

Read-only registry + evidence-package generation. No importer endpoint exists
yet: importing real artefacts is planned (see README/docs) and will be added
without changing these contracts.
"""

from fastapi import APIRouter, Response, status

from app.api.deps import AppSettings, DbSession
from app.api.errors import ApiException, not_found
from app.assurance import REGISTRY_ARTEFACTS
from app.assurance.models import AssuranceProject
from app.assurance.schemas import (
    RegistryPackageRead,
    RegistryProjectRead,
    RegistrySummaryRead,
    to_package,
    to_summary,
)
from app.assurance.seed import seed_registry
from app.assurance.service import (
    generate_package,
    get_package,
    get_project,
    list_evidence,
    list_packages,
    list_projects,
    list_requirements,
    list_risks,
    list_tests,
    package_zip_path,
)

router = APIRouter(prefix="/assurance", tags=["assurance-registry"])


def _counts(db: DbSession, project: AssuranceProject) -> dict:
    tests = list_tests(db, project.id)
    evidence = list_evidence(db, project.id)
    passed = sum(1 for t in tests if t.outcome == "Passed")
    failed = sum(1 for t in tests if t.outcome == "Failed")
    not_executed = sum(1 for t in tests if t.outcome == "Not Executed")
    available = sum(1 for state in project.artefact_availability.values() if state == "Available")
    return {
        "requirements": len(list_requirements(db, project.id)),
        "tests_registered": len(tests),
        "tests_passed": passed,
        "tests_failed": failed,
        "tests_not_executed": not_executed,
        "risks": len(list_risks(db, project.id)),
        "evidence": len(evidence),
        "packages": len(list_packages(db, project.id)),
        "artefact_available": available,
        "artefact_total": len(REGISTRY_ARTEFACTS),
    }


def _project_or_404(db: DbSession, project_id: str) -> AssuranceProject:
    project = get_project(db, project_id)
    if project is None:
        raise not_found("assurance project")
    return project


@router.get("/projects", response_model=list[RegistryProjectRead])
def list_assurance_projects(db: DbSession) -> list[RegistryProjectRead]:
    seed_registry(db)  # idempotent; ensures the registry is present even without a restart
    return [RegistryProjectRead.model_validate(p) for p in list_projects(db)]


@router.get("/projects/summary", response_model=list[RegistrySummaryRead])
def assurance_projects_summary(db: DbSession) -> list[RegistrySummaryRead]:
    seed_registry(db)
    return [to_summary(project, _counts(db, project)) for project in list_projects(db)]


@router.get("/projects/{project_id}", response_model=dict)
def get_assurance_project(project_id: str, db: DbSession) -> dict:
    seed_registry(db)
    project = _project_or_404(db, project_id)
    base = RegistryProjectRead.model_validate(project).model_dump(mode="json")
    base["counts"] = _counts(db, project)
    base["requirements"] = list(_requirements(db, project_id))
    base["tests"] = list(_tests(db, project_id))
    base["evidence"] = list(_evidence(db, project_id))
    base["risks"] = list(_risks(db, project_id))
    base["packages"] = [to_package(p).model_dump(mode="json") for p in list_packages(db, project_id)]
    base["import_procedure"] = project.import_procedure
    return base


def _requirements(db: DbSession, project_id: str) -> list[dict]:
    return [
        {
            "requirement_id": r.requirement_id,
            "category": r.category,
            "title": r.title,
            "description": r.description,
            "rationale": r.rationale,
            "source": r.source,
            "verification_method": r.verification_method,
            "state": r.state,
            "related_tests": r.related_tests,
            "related_risks": r.related_risks,
            "related_evidence": r.related_evidence,
        }
        for r in list_requirements(db, project_id)
    ]


def _tests(db: DbSession, project_id: str) -> list[dict]:
    return [
        {
            "test_id": t.test_id,
            "title": t.title,
            "level": t.level,
            "method": t.method,
            "objective": t.objective,
            "dataset_version": t.dataset_version,
            "outcome": t.outcome,
            "actual_result": t.actual_result,
            "related_requirements": t.related_requirements,
            "evidence_links": t.evidence_links,
        }
        for t in list_tests(db, project_id)
    ]


def _evidence(db: DbSession, project_id: str) -> list[dict]:
    return [
        {
            "evidence_id": e.evidence_id,
            "evidence_type": e.evidence_type,
            "description": e.description,
            "source_document": e.source_document,
            "source_version": e.source_version,
            "state": e.state,
            "location": e.location,
            "related_tests": e.related_tests,
            "reviewer": e.reviewer,
        }
        for e in list_evidence(db, project_id)
    ]


def _risks(db: DbSession, project_id: str) -> list[dict]:
    return [
        {
            "risk_id": r.risk_id,
            "kind": r.kind,
            "title": r.title,
            "description": r.description,
            "severity": r.severity,
            "likelihood": r.likelihood,
            "detection_mechanism": r.detection_mechanism,
            "mitigation": r.mitigation,
            "residual_risk": r.residual_risk,
            "state": r.state,
            "related_requirements": r.related_requirements,
            "related_tests": r.related_tests,
            "evidence_links": r.evidence_links,
        }
        for r in list_risks(db, project_id)
    ]


@router.post(
    "/projects/{project_id}/evidence-packages",
    response_model=RegistryPackageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_evidence_package(project_id: str, db: DbSession, settings: AppSettings) -> RegistryPackageRead:
    seed_registry(db)
    project = _project_or_404(db, project_id)
    package = generate_package(db, project, settings)
    return to_package(package)


@router.get("/projects/{project_id}/evidence-packages", response_model=list[RegistryPackageRead])
def list_evidence_packages(project_id: str, db: DbSession) -> list[RegistryPackageRead]:
    _project_or_404(db, project_id)
    return [to_package(p) for p in list_packages(db, project_id)]


@router.get("/evidence-packages/{package_id}/download")
def download_evidence_package(package_id: str, db: DbSession, settings: AppSettings) -> Response:
    package = get_package(db, package_id)
    if package is None:
        raise not_found("evidence package")
    path = package_zip_path(settings, package.filename)
    if not path.exists():
        raise ApiException("PACKAGE_FILE_MISSING", "The stored package file is missing.", status.HTTP_409_CONFLICT)
    return Response(
        content=path.read_bytes(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{package.filename}"'},
    )


@router.get("/artefact-types", response_model=list[str])
def artefact_types(_settings: AppSettings) -> list[str]:
    return list(REGISTRY_ARTEFACTS)
