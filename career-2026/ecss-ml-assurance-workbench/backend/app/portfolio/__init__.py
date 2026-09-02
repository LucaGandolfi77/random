"""Week-3 portfolio domain: four integrated demo projects.

Entities live in separate `portfolio_*` tables so the previous weeks' modules
(Workbench analysis + week-2 assurance registry) remain untouched: no schema
migration of existing tables is required — SQLAlchemy ``create_all`` only adds
the new tables.

All portfolio content is *synthetic demonstration data* (clearly marked). No
project claims ECSS certification.
"""

LIFECYCLE_STATES = (
    "DRAFT",
    "UNDER_DEVELOPMENT",
    "UNDER_VERIFICATION",
    "REVIEW_REQUIRED",
    "DEPLOYMENT_CANDIDATE",
    "DEPLOYED",
    "MONITORING",
    "ARCHIVED",
)

ASSURANCE_STATES = (
    "NOT_ASSESSED",
    "INCOMPLETE",
    "PARTIALLY_SUPPORTED",
    "SUPPORTED_WITH_LIMITATIONS",
    "REVIEW_REQUIRED",
    "NOT_SUPPORTED",
)

REQ_CATEGORIES = (
    "FUNCTIONAL",
    "PERFORMANCE",
    "DATA",
    "ROBUSTNESS",
    "RELIABILITY",
    "SAFETY",
    "SECURITY",
    "EMBEDDED_RESOURCE",
    "INTERFACE",
    "MONITORING",
    "DEPLOYMENT",
)

REQ_STATUS = ("DRAFT", "APPROVED", "IMPLEMENTED", "VERIFIED", "FAILED", "NOT_VERIFIED", "NOT_APPLICABLE")

VERIFICATION_METHODS = ("TEST", "ANALYSIS", "INSPECTION", "REVIEW", "DEMONSTRATION")

EVIDENCE_TYPES = (
    "DOCUMENT",
    "TEST_RESULT",
    "DATA_QUALITY_RESULT",
    "MODEL_METRIC",
    "BENCHMARK",
    "PLOT",
    "LOG",
    "CONFIGURATION",
    "SOURCE_REFERENCE",
    "REVIEW_RECORD",
    "FAULT_INJECTION_RESULT",
    "RUNTIME_MONITORING_RESULT",
)

TEST_TYPES = (
    "UNIT",
    "DATASET",
    "SCENARIO",
    "ROBUSTNESS",
    "LATENCY",
    "RESOURCE",
    "FAULT_INJECTION",
    "QUANTIZATION",
    "MONTE_CARLO",
    "INTEGRATION",
    "SYSTEM",
)

VERDICTS = ("PASS", "FAIL", "BLOCKED", "NOT_EXECUTED", "INCONCLUSIVE", "NOT_APPLICABLE")

RISK_ACCEPTANCE = (
    "NOT_ASSESSED",
    "ACCEPTABLE",
    "ACCEPTABLE_WITH_LIMITATIONS",
    "REQUIRES_MITIGATION",
    "NOT_ACCEPTABLE",
    "REVIEW_REQUIRED",
)

DEPLOYMENT_DECISIONS = ("GO", "CONDITIONAL_GO", "NO_GO", "DEFERRED", "REVIEW_REQUIRED")

LIMITATION_STATUS = ("OPEN", "MITIGATED", "ACCEPTED", "CLOSED", "UNDER_REVIEW")

PACKAGE_COMPLETENESS_CATEGORIES = (
    "project_summary",
    "model_card",
    "data_quality",
    "odd",
    "requirements",
    "test_results",
    "fmea",
    "residual_risks",
    "deployment_report",
    "monitoring_strategy",
    "limitations",
    "traceability",
    "integrity_manifest",
)

COMPLETENESS_STATE = ("COMPLETE", "PARTIAL", "MISSING", "NOT_APPLICABLE", "INVALID")

PACKAGE_SCHEMA_VERSION = "3.0.0"

DISCLAIMER = (
    "This Workbench supports engineering assessment and evidence organization. It does not provide "
    "ECSS certification and does not replace mission-specific verification, validation, safety "
    "analysis or independent review."
)

SYNTHETIC_NOTE = "Synthetic engineering example requiring project-specific review."
