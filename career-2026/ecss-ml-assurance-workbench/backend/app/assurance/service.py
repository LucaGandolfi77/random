"""Assurance registry service: read model + evidence-package generation."""

import json
import zipfile
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.assurance import PACKAGE_SECTIONS
from app.assurance.models import (
    AssuranceEvidence,
    AssurancePackage,
    AssuranceProject,
    AssuranceRequirement,
    AssuranceRisk,
    AssuranceTest,
)
from app.core.config import Settings
from app.core.version import TOOL_VERSION

PACKAGE_SCHEMA_VERSION = "1.0.0"

_ECSS_DISCLAIMER = (
    "This evidence package is produced by an ECSS-informed, assurance-oriented engineering support "
    "tool. It does not certify, qualify or declare ECSS compliance for any project or artefact."
)

# Generic evidence classes a project must attach; shown as gaps until provided.
_REQUIRED_EVIDENCE_CLASSES = (
    "requirements_baseline",
    "dataset_manifest",
    "model_artefact",
    "test_report",
    "fmea_record",
    "deployment_record",
    "monitoring_plan",
)


def _now() -> datetime:
    return datetime.now(UTC)


def _fmt(value: object, fallback: str = "Not Provided") -> str:
    if value in (None, "", [], {}):
        return fallback
    return str(value)


def _state_row(label: str, state: str, detail: str) -> dict:
    return {"label": label, "state": state, "detail": detail}


def list_projects(db: Session) -> list[AssuranceProject]:
    stmt = select(AssuranceProject).order_by(AssuranceProject.id.asc())
    return list(db.execute(stmt).scalars())


def get_project(db: Session, project_id: str) -> AssuranceProject | None:
    return db.get(AssuranceProject, project_id)


def list_tests(db: Session, project_id: str) -> list[AssuranceTest]:
    stmt = select(AssuranceTest).where(AssuranceTest.project_id == project_id).order_by(AssuranceTest.test_id.asc())
    return list(db.execute(stmt).scalars())


def list_requirements(db: Session, project_id: str) -> list[AssuranceRequirement]:
    stmt = (
        select(AssuranceRequirement)
        .where(AssuranceRequirement.project_id == project_id)
        .order_by(AssuranceRequirement.requirement_id.asc())
    )
    return list(db.execute(stmt).scalars())


def list_evidence(db: Session, project_id: str) -> list[AssuranceEvidence]:
    stmt = (
        select(AssuranceEvidence)
        .where(AssuranceEvidence.project_id == project_id)
        .order_by(AssuranceEvidence.evidence_id.asc())
    )
    return list(db.execute(stmt).scalars())


def list_risks(db: Session, project_id: str) -> list[AssuranceRisk]:
    stmt = select(AssuranceRisk).where(AssuranceRisk.project_id == project_id).order_by(AssuranceRisk.risk_id.asc())
    return list(db.execute(stmt).scalars())


def list_packages(db: Session, project_id: str) -> list[AssurancePackage]:
    stmt = (
        select(AssurancePackage)
        .where(AssurancePackage.project_id == project_id)
        .order_by(AssurancePackage.generated_at.desc())
    )
    return list(db.execute(stmt).scalars())


def get_package(db: Session, package_id: str) -> AssurancePackage | None:
    return db.get(AssurancePackage, package_id)


# ------------------------------------------------------------------ package builder
def _project_section(project: AssuranceProject) -> dict:
    return {
        "project_id": project.id,
        "name": project.name,
        "slug": project.slug,
        "short_description": project.short_description,
        "project_type": project.project_type,
        "domain": project.domain,
        "criticality": project.criticality,
        "owner": _fmt(project.owner),
        "reviewers": project.reviewers or [],
        "version": _fmt(project.version),
        "lifecycle_status": _fmt(project.lifecycle_status),
        "assurance_status": _fmt(project.assurance_status),
        "model_status": _fmt(project.model_status),
        "deployment_status": _fmt(project.deployment_status),
        "source_type": _fmt(project.source_type),
        "source_manifest": _fmt(project.source_manifest),
        "repository_path": _fmt(project.repository_path, "Not Available"),
        "documentation_path": _fmt(project.documentation_path, "Not Available"),
        "known_limitations": project.known_limitations,
        "open_actions": project.open_actions,
        "notes": project.notes,
    }


def _section_data(db: Session, project: AssuranceProject) -> dict[str, dict]:
    tests = list_tests(db, project.id)
    evidence = list_evidence(db, project.id)
    risks = list_risks(db, project.id)

    counts = {"passed": 0, "failed": 0, "not_executed": 0, "not_applicable": 0, "pending_review": 0}
    for test in tests:
        key = test.outcome.lower().replace(" ", "_")
        if key in counts:
            counts[key] += 1

    return {
        "project_summary": {
            "project": _project_section(project),
            "related_assets": project.related_assets,
            "artefact_availability": project.artefact_availability,
        },
        "model_card": {
            "model_status": _fmt(project.model_status),
            "model_name": "Not Available",
            "state_rows": [
                _state_row("Selected model", "Not Available", "No model artefact registered for this project."),
                _state_row("Model metrics", "Not Available", "No metrics available; do not infer performance."),
                _state_row("Model hash", "Evidence Missing", "Compute and register the model artefact hash on import."),
            ],
            "limitations": project.known_limitations,
        },
        "data_quality_report": {
            "data_status": "Not Available",
            "state_rows": [
                _state_row("Dataset inventory", "Not Available", "No dataset registered."),
                _state_row(
                    "Data quality decision",
                    "Decision Pending",
                    "Run the Workbench Data Readiness Inspector on a real dataset.",
                ),
                _state_row("Split strategy", "Not Provided", "Document splits only with real dataset content."),
            ],
        },
        "operational_design_domain": {
            "odd_status": "Not Available",
            "state_rows": [
                _state_row("ODD document", "Not Available", "Use the ODD template before registering conditions."),
                _state_row("ODD-to-data coverage", "Not Executed", "Requires a registered dataset and ODD."),
                _state_row("ODD-to-test coverage", "Not Executed", "Requires registered tests."),
            ],
        },
        "test_results": {
            "registered_tests": len(tests),
            "counts": counts,
            "tests": [
                {
                    "test_id": t.test_id,
                    "title": t.title,
                    "level": t.level,
                    "method": t.method,
                    "outcome": t.outcome,
                    "actual_result": _fmt(t.actual_result, "Not Provided"),
                    "related_requirements": t.related_requirements,
                    "evidence_links": t.evidence_links,
                }
                for t in tests
            ],
            "note": "Tests are not registered yet. Zero registered tests are reported as such and are "
            "never represented as passed or failed.",
        },
        "fmea": {
            "failure_modes_registered": len([r for r in risks if r.kind == "failure_mode"]),
            "failure_modes": [
                {
                    "risk_id": r.risk_id,
                    "title": r.title,
                    "severity": r.severity,
                    "detection_mechanism": r.detection_mechanism,
                    "mitigation": r.mitigation,
                    "state": r.state,
                    "related_tests": r.related_tests,
                }
                for r in risks
                if r.kind == "failure_mode"
            ],
            "note": "No FMEA rows registered; risk analysis is Not Provided until real analysis exists.",
        },
        "deployment_report": {
            "deployment_status": _fmt(project.deployment_status),
            "state_rows": [
                _state_row(
                    "Deployment decision", "Decision Pending", "Explicit decision required; absence is not approval."
                ),
                _state_row("Target platform", "Not Provided", "Describe the deployment target."),
                _state_row("Deployment evidence", "Evidence Missing", "Attach integration/run evidence."),
            ],
        },
        "monitoring_strategy": {
            "monitoring_status": "Not Available",
            "state_rows": [
                _state_row("Monitoring plan", "Not Available", "No operational monitoring strategy registered."),
                _state_row("Drift thresholds", "Not Provided", "Requires ODD and deployment context."),
            ],
        },
        "evidence_index": {
            "registered_evidence": len(evidence),
            "evidence": [
                {
                    "evidence_id": e.evidence_id,
                    "evidence_type": e.evidence_type,
                    "description": e.description,
                    "source_document": e.source_document,
                    "source_version": e.source_version,
                    "state": e.state,
                    "location": e.location,
                }
                for e in evidence
            ],
            "missing_classes": [
                {"evidence_class": cls, "state": "Evidence Missing", "detail": "No item registered."}
                for cls in _REQUIRED_EVIDENCE_CLASSES
            ],
        },
    }


def _markdown(section: str, data: dict, project: AssuranceProject) -> str:
    lines: list[str] = [f"# {section.replace('_', ' ').title()}", ""]
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| Project | {project.name} ({project.id}) |")
    lines.append(f"| Package schema | {PACKAGE_SCHEMA_VERSION} |")
    lines.append(f"| Generated (UTC) | {_now().isoformat()} |")
    lines.append("")
    if section == "project_summary":
        lines.append("```json")
        lines.append(json.dumps(data, indent=2, sort_keys=True))
        lines.append("```")
    else:
        lines.append("```json")
        lines.append(json.dumps(data, indent=2, sort_keys=True))
        lines.append("```")
    lines.append("")
    lines.append(f"> {_ECSS_DISCLAIMER}")
    return "\n".join(lines)


def generate_package(db: Session, project: AssuranceProject, settings: Settings) -> AssurancePackage:
    """Build and persist a deterministic (except id/time) evidence package zip."""
    sections_data = _section_data(db, project)
    package_id = f"PKG-{project.slug.upper()[:12]}-{uuid4().hex[:12]}"
    generated = _now().isoformat()

    manifest = {
        "package_id": package_id,
        "package_schema_version": PACKAGE_SCHEMA_VERSION,
        "tool_version": TOOL_VERSION,
        "project": {"id": project.id, "name": project.name, "slug": project.slug},
        "generated_at_utc": generated,
        "sections": [
            {"section": name, "file": f"{index:02d}_{name}.json"} for index, name in enumerate(PACKAGE_SECTIONS)
        ],
        "artefact_availability": project.artefact_availability,
        "states_summary": _states_summary(sections_data),
        "disclaimer": _ECSS_DISCLAIMER,
    }

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for index, name in enumerate(PACKAGE_SECTIONS):
            data = sections_data.get(name, {"state": "Not Available"})
            archive.writestr(f"{index:02d}_{name}.json", json.dumps(data, indent=2, sort_keys=True))
            archive.writestr(f"{index:02d}_{name}.md", _markdown(name, data, project))
        archive.writestr("manifest.json", json.dumps(manifest, indent=2, sort_keys=True))

    directory: Path = settings.storage_dir / "evidence-packages"
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"evidence-package-{package_id}.zip"
    (directory / filename).write_bytes(buffer.getvalue())

    package = AssurancePackage(
        id=package_id,
        project_id=project.id,
        schema_version=PACKAGE_SCHEMA_VERSION,
        filename=filename,
        size_bytes=len(buffer.getvalue()),
        sections=list(PACKAGE_SECTIONS),
        states_summary=manifest["states_summary"],
    )
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


def _states_summary(sections_data: dict[str, dict]) -> dict:
    """Count prominent availability markers present in the package content."""
    markers = (
        "Not Available",
        "Not Provided",
        "Not Executed",
        "Not Applicable",
        "Pending Review",
        "Evidence Missing",
        "Decision Pending",
        "Available",
    )
    counts = {marker: 0 for marker in markers}
    raw = json.dumps(sections_data)
    for marker in markers:
        counts[marker] = raw.count(marker)
    return counts


def package_zip_path(settings: Settings, filename: str) -> Path:
    return settings.storage_dir / "evidence-packages" / filename
