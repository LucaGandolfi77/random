"""Assurance registry domain.

Normalized domain model for the assurance registry of externally-managed ML
projects. Entities in this package are decoupled from the Workbench's own
analysis domain (projects/datasets/analysis runs) because they describe
*other* projects that the Workbench tracks, compares and packages.

Availability states follow a strict convention — absence of data is never
translated into a positive or negative result:

- NOT_AVAILABLE    -> no artefact exists in the repository
- NOT_PROVIDED     -> expected but not provided by the source project
- NOT_EXECUTED     -> expected activity not performed
- NOT_APPLICABLE   -> does not apply to this project
- PENDING_REVIEW   -> exists but not yet reviewed
- EVIDENCE_MISSING -> required evidence not attached
- DECISION_PENDING -> decision not yet taken
- AVAILABLE        -> present and usable
"""

from enum import Enum


class AvailabilityState(str, Enum):
    AVAILABLE = "Available"
    NOT_AVAILABLE = "Not Available"
    NOT_PROVIDED = "Not Provided"
    NOT_EXECUTED = "Not Executed"
    NOT_APPLICABLE = "Not Applicable"
    PENDING_REVIEW = "Pending Review"
    EVIDENCE_MISSING = "Evidence Missing"
    DECISION_PENDING = "Decision Pending"


class TestOutcome(str, Enum):
    PASSED = "Passed"
    FAILED = "Failed"
    NOT_EXECUTED = "Not Executed"
    NOT_APPLICABLE = "Not Applicable"
    PENDING_REVIEW = "Pending Review"


class LifecycleStatus(str, Enum):
    CONCEPT = "Concept"
    DEVELOPMENT = "Development"
    VERIFICATION = "Verification"
    OPERATIONAL = "Operational"
    RETIRED = "Retired"
    NOT_STARTED = "Not Started"


class AssuranceStatus(str, Enum):
    NOT_AVAILABLE = "Not Available"
    IN_PROGRESS = "In Progress"
    PENDING_REVIEW = "Pending Review"
    ASSURED = "Assured"
    GAPS_OPEN = "Gaps Open"


# Documents tracked in the registry (keys of AssuranceProject.artefact_availability)
REGISTRY_ARTEFACTS: tuple[str, ...] = (
    "PROJECT_CHARTER",
    "DATA_READINESS_REVIEW",
    "OPERATIONAL_DESIGN_DOMAIN",
    "MODEL_CARD",
    "TEST_PLAN",
    "FMEA",
    "ASSURANCE_CASE",
    "DEPLOYMENT_REPORT",
    "MONITORING_STRATEGY",
)

PACKAGE_SECTIONS: tuple[str, ...] = (
    "project_summary",
    "model_card",
    "data_quality_report",
    "operational_design_domain",
    "test_results",
    "fmea",
    "deployment_report",
    "monitoring_strategy",
    "evidence_index",
    "manifest",
)
