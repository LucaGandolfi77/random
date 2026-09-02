"""Shared enums used by ORM models, Pydantic schemas and analyzers."""

from enum import Enum


class FindingStatus(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    NOT_EVALUATED = "NOT_EVALUATED"


class Severity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProjectStatus(str, Enum):
    DRAFT = "Draft"
    DATA_UPLOADED = "Data Uploaded"
    ANALYSIS_COMPLETED = "Analysis Completed"
    REVIEW_REQUIRED = "Review Required"
    READY_FOR_NEXT_STAGE = "Ready for Next Stage"


class OperatingContext(str, Enum):
    ONBOARD = "onboard"
    GROUND = "ground"


class CriticalityLevel(str, Enum):
    """Descriptive internal assessment levels.

    NOT an official or certified classification — see the ECSS disclaimer.
    """

    DEMO = "Low - demonstration"
    DEVELOPMENT = "Medium - development"
    ENGINEERING = "High - engineering model"
    MISSION = "Critical - mission review required"


class ApplicationType(str, Enum):
    TELEMETRY_ANOMALY_DETECTION = "Telemetry anomaly detection"
    HEALTH_MONITORING = "Health monitoring"
    PREDICTIVE_MAINTENANCE = "Predictive maintenance"
    COMPUTER_VISION = "Computer vision"
    NATURAL_LANGUAGE = "Natural language processing"
    OTHER = "Other"


class DatasetStatus(str, Enum):
    AVAILABLE = "available"
    DELETED = "deleted"


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AuditEventType(str, Enum):
    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_UPDATED = "PROJECT_UPDATED"
    PROJECT_DELETED = "PROJECT_DELETED"
    DATASET_UPLOADED = "DATASET_UPLOADED"
    DATASET_DELETED = "DATASET_DELETED"
    DATASET_REPLACED = "DATASET_REPLACED"
    ANALYSIS_CONFIG_UPDATED = "ANALYSIS_CONFIG_UPDATED"
    ANALYSIS_STARTED = "ANALYSIS_STARTED"
    ANALYSIS_COMPLETED = "ANALYSIS_COMPLETED"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
    REPORT_EXPORTED = "REPORT_EXPORTED"
    # Week 3 portfolio events
    PROJECT_IMPORTED = "PROJECT_IMPORTED"
    REQUIREMENT_UPDATED = "REQUIREMENT_UPDATED"
    EVIDENCE_REGISTERED = "EVIDENCE_REGISTERED"
    TEST_RESULT_IMPORTED = "TEST_RESULT_IMPORTED"
    RISK_REVIEWED = "RISK_REVIEWED"
    DEPLOYMENT_DECISION_CREATED = "DEPLOYMENT_DECISION_CREATED"
    EVIDENCE_PACKAGE_GENERATION_STARTED = "EVIDENCE_PACKAGE_GENERATION_STARTED"
    EVIDENCE_PACKAGE_GENERATED = "EVIDENCE_PACKAGE_GENERATED"
    EVIDENCE_PACKAGE_GENERATION_FAILED = "EVIDENCE_PACKAGE_GENERATION_FAILED"
    EVIDENCE_PACKAGE_DOWNLOADED = "EVIDENCE_PACKAGE_DOWNLOADED"
    EVIDENCE_PACKAGE_VERIFIED = "EVIDENCE_PACKAGE_VERIFIED"
    EVIDENCE_PACKAGE_VERIFICATION_FAILED = "EVIDENCE_PACKAGE_VERIFICATION_FAILED"
