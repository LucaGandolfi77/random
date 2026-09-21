"""Pydantic schemas for projects, datasets, analysis, score, reports, audit."""

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import (
    ApplicationType,
    AuditEventType,
    CriticalityLevel,
    FindingStatus,
    OperatingContext,
    ProjectStatus,
    RunStatus,
    Severity,
)


# ---------------------------------------------------------------- common
class ApiError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


# ---------------------------------------------------------------- projects
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    application_type: ApplicationType = ApplicationType.OTHER
    target_platform: str = Field(default="", max_length=120)
    operating_context: OperatingContext = OperatingContext.GROUND
    criticality_level: CriticalityLevel = CriticalityLevel.DEVELOPMENT
    ml_function: str = Field(default="", max_length=160)
    notes: str = Field(default="", max_length=5000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    application_type: ApplicationType | None = None
    target_platform: str | None = Field(default=None, max_length=120)
    operating_context: OperatingContext | None = None
    criticality_level: CriticalityLevel | None = None
    ml_function: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=5000)
    status: ProjectStatus | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    application_type: str
    target_platform: str
    operating_context: str
    criticality_level: str
    ml_function: str
    notes: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime
    has_dataset: bool = False
    latest_run: Optional["RunSummary"] = None


# ---------------------------------------------------------------- datasets
class ColumnInfo(BaseModel):
    name: str
    index: int
    inferred_type: str
    missing_count: int = 0
    missing_pct: float = 0.0
    unique_count: int = 0
    non_null_count: int = 0


class DatasetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    original_filename: str
    sha256: str
    size_bytes: int
    row_count: int
    column_count: int
    columns: list[ColumnInfo] = Field(default_factory=list)
    uploaded_at: datetime


class DatasetPreview(BaseModel):
    dataset_id: str
    columns: list[ColumnInfo]
    rows: list[list[Any]]
    truncated: bool = False
    limit: int = 100
    dtypes_summary: dict[str, int] = Field(default_factory=dict)


class AnalysisConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: str
    target_column: str | None = None
    timestamp_column: str | None = None
    id_column: str | None = None
    missing_threshold_pct: float
    iqr_multiplier: float
    quasi_constant_threshold_pct: float
    rare_category_threshold_pct: float
    dominant_category_threshold_pct: float
    high_cardinality_ratio: float
    duplicate_rows_threshold_pct: float
    imbalance_ratio_warn: float


class AnalysisConfigUpdate(BaseModel):
    target_column: str | None = None
    timestamp_column: str | None = None
    id_column: str | None = None
    missing_threshold_pct: float | None = Field(default=None, ge=0, le=100)
    iqr_multiplier: float | None = Field(default=None, ge=0.1, le=10)
    quasi_constant_threshold_pct: float | None = Field(default=None, ge=50, le=100)
    rare_category_threshold_pct: float | None = Field(default=None, ge=0, le=50)
    dominant_category_threshold_pct: float | None = Field(default=None, ge=50, le=100)
    high_cardinality_ratio: float | None = Field(default=None, ge=0.05, le=1.0)
    duplicate_rows_threshold_pct: float | None = Field(default=None, ge=0, le=100)
    imbalance_ratio_warn: float | None = Field(default=None, ge=1, le=10000)


# ---------------------------------------------------------------- analysis
class FindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    check_id: str
    category: str
    title: str
    description: str
    status: FindingStatus
    severity: Severity
    observed_value: str
    threshold: str
    columns: list[str]
    evidence: dict[str, Any]
    risk: str
    recommendation: str
    analyzer_version: str
    created_at: datetime


class ScoreCategory(BaseModel):
    name: str
    weight: float
    score: float | None = None
    evaluated: bool
    pass_count: int = 0
    warning_count: int = 0
    fail_count: int = 0
    not_applicable_count: int = 0


class ScoreRead(BaseModel):
    overall_score: float | None
    coverage_pct: float
    categories: list[ScoreCategory]
    pass_count: int
    warning_count: int
    fail_count: int
    not_applicable_count: int
    not_evaluated_count: int
    method: str = "weighted-penalty v1.0.0"


class RunSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    dataset_id: str
    status: RunStatus
    celery_task_id: str | None = None
    error_message: str = ""
    started_at: datetime
    completed_at: datetime | None = None
    config_snapshot: dict[str, Any] = Field(default_factory=dict)
    overall_score: float | None = None


class RunCreate(BaseModel):
    pass  # analysis runs against the project's current dataset + config


# ---------------------------------------------------------------- reports
class ReportCreate(BaseModel):
    pass


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    run_id: str
    schema_version: str
    filename: str
    size_bytes: int
    generated_at: datetime


class FindingsPage(BaseModel):
    items: list[FindingRead]
    total: int
    limit: int
    offset: int
    applied_filters: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------- audit
class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_type: AuditEventType
    project_id: str
    dataset_id: str | None = None
    run_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class HealthRead(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    environment: str
    database: Literal["ok", "error"]
    timestamp: datetime


ProjectRead.model_rebuild()
