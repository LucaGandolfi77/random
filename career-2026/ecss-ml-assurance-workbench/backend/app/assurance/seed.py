"""Static seed data for the assurance registry.

The registry records projects *tracked by the Workbench*. None of the four
projects currently exists in /career-2026 (verified by recursive search of
source, docs and config). Seed content therefore contains only:

- stable identifiers and neutral descriptions;
- availability states (Not Available / Not Provided / ...);
- required-artefact lists and import procedures;
- genuine references to reusable assets already in the repository.

No requirement, metric, test result, failure mode, risk or deployment decision
is invented. Rows for those entities are intentionally absent from the seed.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.assurance import REGISTRY_ARTEFACTS
from app.assurance.models import AssuranceProject

# Reusable assets that genuinely exist in this workspace (repo-relative paths).
_ASSETS_TEMPLATES = [
    {
        "kind": "doc_templates",
        "path": "/career-2026/templates/ml-assurance",
        "note": "ECSS-informed documentation templates (not a certification artefact).",
    },
    {
        "kind": "workbench_module",
        "path": "/career-2026/ecss-ml-assurance-workbench",
        "note": "Data Readiness Inspector + report generation available in the Workbench.",
    },
]

_IMPORT_PROCEDURE = (
    "Not available in the repository. To import: (1) copy the ECSS-informed templates from "
    "/career-2026/templates/ml-assurance into the project documentation folder; (2) register real "
    "requirements, tests, evidence and risks via the registry importer or API; (3) link artefacts by "
    "repository path without copying them; (4) re-run the evidence-package generator. Missing artefacts "
    "remain 'Not Available' until real content is provided."
)


def _project(
    project_id: str,
    name: str,
    slug: str,
    short_description: str,
    project_type: str,
    domain: str,
    criticality: str,
    tags: list[str],
    extra_assets: list[dict],
    notes: str,
) -> AssuranceProject:
    artefact = {key: "Not Available" for key in REGISTRY_ARTEFACTS}
    return AssuranceProject(
        id=project_id,
        name=name,
        slug=slug,
        short_description=short_description,
        project_type=project_type,
        domain=domain,
        repository_path="",
        documentation_path="",
        owner="Not Provided",
        reviewers=[],
        version="Not Provided",
        lifecycle_status="Not Started",
        assurance_status="Not Available",
        model_status="Not Available",
        deployment_status="Decision Pending",
        criticality=criticality,
        source_type="Not Available",
        source_manifest="Not Provided",
        artefact_availability=artefact,
        related_assets=[*_ASSETS_TEMPLATES, *extra_assets],
        tags=tags,
        known_limitations=[
            "No source code, dataset or documentation for this project was found in /career-2026.",
            "All quality indicators are placeholders until real artefacts are imported.",
        ],
        open_actions=[
            "Create the project documentation with the ml-assurance templates.",
            "Register the repository path and source manifest.",
            "Import requirements, tests, evidence and risks from real artefacts.",
        ],
        notes=notes,
        import_procedure=_IMPORT_PROCEDURE,
    )


def registry_seed() -> list[AssuranceProject]:
    """Deterministic registry seed. Content is metadata only — see module docstring."""
    return [
        _project(
            "PRJ-TAD-001",
            "Telemetry Anomaly Detector",
            "telemetry-anomaly-detector",
            "Planned ML function to detect anomalies in spacecraft telemetry. Not present in the "
            "repository; registered to track import status and assurance evidence.",
            "ml_classification",
            "onboard-telemetry-monitoring",
            "High - engineering model",
            ["telemetry", "anomaly-detection", "onboard"],
            [
                {
                    "kind": "reference_dataset",
                    "path": "/career-2026/ecss-ml-assurance-workbench/sample-data/nominal_telemetry.csv",
                    "note": "Synthetic telemetry dataset shipped by the Workbench (not a project artefact).",
                }
            ],
            "Registry entry only. Workbench references 'Telemetry anomaly detection' as an application "
            "type and ships synthetic telemetry samples for its own demonstration flows.",
        ),
        _project(
            "PRJ-QNT-001",
            "Onboard Vision Quantization Lab",
            "onboard-vision-quantization-lab",
            "Planned laboratory for evaluating post-training quantization of vision models for onboard "
            "inference. Not present in the repository.",
            "ml_optimization_lab",
            "onboard-computer-vision",
            "Medium - development",
            ["vision", "quantization", "post-training-optimization", "onboard"],
            [],
            "Registry entry only. No quantization dataset, model or measurement script exists in "
            "/career-2026 for this project.",
        ),
        _project(
            "PRJ-SEU-001",
            "SEU Fault Injector",
            "seu-fault-injector",
            "Planned embedded verification tool to inject single-event-upset (bit-flip) faults into "
            "model memory and verify detection/fallback. Not present in the repository.",
            "verification_tool",
            "embedded-verification",
            "Medium - development",
            ["fault-injection", "seu", "embedded", "resilience"],
            [],
            "Registry entry only. No fault-injection harness or SEU test reports exist in /career-2026.",
        ),
        _project(
            "PRJ-LLS-001",
            "Lunar Landing Safety Cage",
            "lunar-landing-safety-cage",
            "Planned safety monitoring layer (safety cage) for a lunar-landing ML function. Not present "
            "in the repository.",
            "safety_monitoring",
            "landing-safety",
            "Critical - mission review required",
            ["safety-cage", "landing", "monitoring", "fallback"],
            [],
            "Registry entry only. 'Safety cage' appears only as a planned module of the Workbench; no "
            "project artefacts exist.",
        ),
    ]


def seed_registry(db: Session) -> int:
    """Insert registry seed once. Returns number of created rows (0 if already seeded)."""
    existing = db.execute(select(AssuranceProject.id).limit(1)).scalar_one_or_none()
    if existing is not None:
        return 0
    projects = registry_seed()
    db.add_all(projects)
    db.commit()
    return len(projects)
