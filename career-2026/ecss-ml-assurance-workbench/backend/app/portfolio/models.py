"""ORM models for the week-3 portfolio (tables prefixed portfolio_)."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.project import utcnow
from app.portfolio import PACKAGE_SCHEMA_VERSION


class PortfolioProject(Base):
    __tablename__ = "portfolio_projects"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # PRJ-TAD-001
    slug: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(160))
    short_description: Mapped[str] = mapped_column(Text, default="")
    detailed_description: Mapped[str] = mapped_column(Text, default="")
    domain: Mapped[str] = mapped_column(String(80), default="")
    use_case: Mapped[str] = mapped_column(String(120), default="")
    operational_context: Mapped[str] = mapped_column(String(120), default="")
    criticality: Mapped[str] = mapped_column(String(60), default="")
    deployment_target: Mapped[str] = mapped_column(String(120), default="")
    execution_environment: Mapped[str] = mapped_column(String(120), default="")
    lifecycle_status: Mapped[str] = mapped_column(String(40), default="UNDER_VERIFICATION")
    assurance_status: Mapped[str] = mapped_column(String(40), default="INCOMPLETE")
    owner: Mapped[str] = mapped_column(String(120), default="")
    version: Mapped[str] = mapped_column(String(20), default="0.1.0")  # project version
    model_version: Mapped[str] = mapped_column(String(40), default="")
    dataset_version: Mapped[str] = mapped_column(String(40), default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    requirements: Mapped[list["PortfolioRequirement"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    evidence: Mapped[list["PortfolioEvidence"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    test_cases: Mapped[list["PortfolioTestCase"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    test_results: Mapped[list["PortfolioTestResult"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    risks: Mapped[list["PortfolioRisk"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    limitations: Mapped[list["PortfolioLimitation"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    fmea_items: Mapped[list["PortfolioFmeaItem"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    decisions: Mapped[list["PortfolioDeploymentDecision"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    packages: Mapped[list["PortfolioPackage"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )


class _OneToOneMixin:
    """Shared columns for 1:1 project documents stored mostly as JSON."""

    content: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PortfolioRequirement(Base):
    __tablename__ = "portfolio_requirements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    requirement_id: Mapped[str] = mapped_column(String(60), index=True)  # e.g. REQ-F-001 (unique per project)
    external_id: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(30), index=True)
    source: Mapped[str] = mapped_column(String(120), default="")
    verification_method: Mapped[str] = mapped_column(String(30))
    acceptance_criteria: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")  # HIGH/MEDIUM/LOW
    status: Mapped[str] = mapped_column(String(30), index=True, default="APPROVED")
    parent_requirement_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    related_hazard_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["PortfolioProject"] = relationship(back_populates="requirements")


class PortfolioEvidence(Base):
    __tablename__ = "portfolio_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[str] = mapped_column(String(60), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    evidence_type: Mapped[str] = mapped_column(String(40))
    source: Mapped[str] = mapped_column(String(160), default="")
    file_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), default="")
    generated_at: Mapped[str] = mapped_column(String(30), default="")  # ISO date
    collected_at: Mapped[str] = mapped_column(String(30), default="")
    tool_name: Mapped[str] = mapped_column(String(120), default="")
    tool_version: Mapped[str] = mapped_column(String(40), default="")
    author: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(30), default="VALID")  # VALID / STALE / SUPERSEDED
    related_requirement_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_test_ids: Mapped[list] = mapped_column(JSON, default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    limitations: Mapped[str] = mapped_column(Text, default="")

    project: Mapped["PortfolioProject"] = relationship(back_populates="evidence")


class PortfolioTestCase(Base):
    __tablename__ = "portfolio_test_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    test_id: Mapped[str] = mapped_column(String(60), index=True)
    external_id: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    objective: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    test_type: Mapped[str] = mapped_column(String(30))
    preconditions: Mapped[str] = mapped_column(Text, default="")
    input_description: Mapped[str] = mapped_column(Text, default="")
    procedure: Mapped[str] = mapped_column(Text, default="")
    expected_result: Mapped[str] = mapped_column(Text, default="")
    acceptance_criteria: Mapped[str] = mapped_column(Text, default="")
    related_requirement_ids: Mapped[list] = mapped_column(JSON, default=list)
    severity_on_failure: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    automation_status: Mapped[str] = mapped_column(String(20), default="MANUAL")

    project: Mapped["PortfolioProject"] = relationship(back_populates="test_cases")


class PortfolioTestResult(Base):
    __tablename__ = "portfolio_test_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    test_run_id: Mapped[str] = mapped_column(String(60), index=True)
    test_id: Mapped[str] = mapped_column(String(60), index=True)  # references PortfolioTestCase.test_id
    execution_timestamp: Mapped[str] = mapped_column(String(30), default="")
    environment: Mapped[str] = mapped_column(String(120), default="")
    configuration: Mapped[str] = mapped_column(Text, default="")
    model_version: Mapped[str] = mapped_column(String(40), default="")
    dataset_version: Mapped[str] = mapped_column(String(40), default="")
    actual_result: Mapped[str] = mapped_column(Text, default="")
    measured_metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    verdict: Mapped[str] = mapped_column(String(20), index=True)
    log_reference: Mapped[str] = mapped_column(String(200), default="")
    evidence_ids: Mapped[list] = mapped_column(JSON, default=list)
    failure_reason: Mapped[str] = mapped_column(Text, default="")
    reviewer_notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped["PortfolioProject"] = relationship(back_populates="test_results")


class PortfolioRisk(Base):
    __tablename__ = "portfolio_risks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    risk_id: Mapped[str] = mapped_column(String(60), index=True)
    external_id: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    hazardous_condition: Mapped[str] = mapped_column(Text, default="")
    cause: Mapped[str] = mapped_column(Text, default="")
    possible_effect: Mapped[str] = mapped_column(Text, default="")
    initial_severity: Mapped[int] = mapped_column(Integer, default=1)
    initial_likelihood: Mapped[int] = mapped_column(Integer, default=1)
    initial_risk_level: Mapped[str] = mapped_column(String(10), default="")
    mitigation: Mapped[str] = mapped_column(Text, default="")
    verification_evidence: Mapped[str] = mapped_column(Text, default="")
    residual_severity: Mapped[int] = mapped_column(Integer, default=1)
    residual_likelihood: Mapped[int] = mapped_column(Integer, default=1)
    residual_risk_level: Mapped[str] = mapped_column(String(10), default="")
    acceptance_status: Mapped[str] = mapped_column(String(40), default="NOT_ASSESSED")
    acceptance_rationale: Mapped[str] = mapped_column(Text, default="")
    owner: Mapped[str] = mapped_column(String(120), default="")
    review_date: Mapped[str] = mapped_column(String(30), default="")
    related_requirement_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_test_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_fmea_item_ids: Mapped[list] = mapped_column(JSON, default=list)

    project: Mapped["PortfolioProject"] = relationship(back_populates="risks")


class PortfolioLimitation(Base):
    __tablename__ = "portfolio_limitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    limitation_id: Mapped[str] = mapped_column(String(60), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    affected_scope: Mapped[str] = mapped_column(String(60), default="")
    impact: Mapped[str] = mapped_column(Text, default="")
    workaround: Mapped[str] = mapped_column(Text, default="")
    operational_constraint: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(30), default="OPEN")
    related_requirement_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_risk_ids: Mapped[list] = mapped_column(JSON, default=list)

    project: Mapped["PortfolioProject"] = relationship(back_populates="limitations")


class PortfolioFmeaItem(Base):
    __tablename__ = "portfolio_fmea_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    fmea_item_id: Mapped[str] = mapped_column(String(60), index=True)
    function: Mapped[str] = mapped_column(String(200))
    failure_mode: Mapped[str] = mapped_column(String(200))
    local_effect: Mapped[str] = mapped_column(Text, default="")
    system_effect: Mapped[str] = mapped_column(Text, default="")
    possible_cause: Mapped[str] = mapped_column(Text, default="")
    detection_method: Mapped[str] = mapped_column(Text, default="")
    existing_control: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[int] = mapped_column(Integer, default=1)
    occurrence: Mapped[int] = mapped_column(Integer, default=1)
    detectability: Mapped[int] = mapped_column(Integer, default=1)
    initial_risk: Mapped[str] = mapped_column(String(10), default="")  # L / M / H / C
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    mitigation: Mapped[str] = mapped_column(Text, default="")
    residual_risk: Mapped[str] = mapped_column(String(10), default="")
    status: Mapped[str] = mapped_column(String(30), default="OPEN")
    related_requirement_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_test_ids: Mapped[list] = mapped_column(JSON, default=list)
    evidence_ids: Mapped[list] = mapped_column(JSON, default=list)

    project: Mapped["PortfolioProject"] = relationship(back_populates="fmea_items")


class PortfolioDeploymentDecision(Base):
    __tablename__ = "portfolio_deployment_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    decision_id: Mapped[str] = mapped_column(String(60), index=True)
    decision: Mapped[str] = mapped_column(String(30))  # GO / CONDITIONAL_GO / NO_GO / ...
    decision_date: Mapped[str] = mapped_column(String(30), default="")
    project_version: Mapped[str] = mapped_column(String(20), default="")
    model_version: Mapped[str] = mapped_column(String(40), default="")
    dataset_version: Mapped[str] = mapped_column(String(40), default="")
    decision_summary: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[str] = mapped_column(Text, default="")
    blocking_findings: Mapped[list] = mapped_column(JSON, default=list)
    accepted_risks: Mapped[list] = mapped_column(JSON, default=list)
    required_mitigations: Mapped[list] = mapped_column(JSON, default=list)
    operational_constraints: Mapped[list] = mapped_column(JSON, default=list)
    monitoring_requirements: Mapped[list] = mapped_column(JSON, default=list)
    rollback_strategy: Mapped[str] = mapped_column(Text, default="")
    approver: Mapped[str] = mapped_column(String(120), default="")
    review_status: Mapped[str] = mapped_column(String(30), default="PENDING")
    evidence_snapshot_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped["PortfolioProject"] = relationship(back_populates="decisions")


class PortfolioPackage(Base):
    __tablename__ = "portfolio_packages"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)  # PKG-<uuid>
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), index=True
    )
    package_version: Mapped[int] = mapped_column(Integer, default=1)  # monotonically increasing
    package_schema_version: Mapped[str] = mapped_column(String(20), default=PACKAGE_SCHEMA_VERSION)
    filename: Mapped[str] = mapped_column(String(200))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    document_list: Mapped[list] = mapped_column(JSON, default=list)
    evidence_list: Mapped[list] = mapped_column(JSON, default=list)
    manifest: Mapped[dict] = mapped_column(JSON, default=dict)
    snapshot_status: Mapped[str] = mapped_column(String(20), default="FINAL")
    verification: Mapped[dict] = mapped_column(JSON, default=dict)  # last verification result
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped["PortfolioProject"] = relationship(back_populates="packages")


class PortfolioModelCard(_OneToOneMixin, Base):
    __tablename__ = "portfolio_model_cards"
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), primary_key=True
    )
    model_name: Mapped[str] = mapped_column(String(160), default="")
    model_version: Mapped[str] = mapped_column(String(40), default="")
    model_type: Mapped[str] = mapped_column(String(80), default="")


class PortfolioDataQuality(_OneToOneMixin, Base):
    __tablename__ = "portfolio_data_quality"
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), primary_key=True
    )
    dataset_name: Mapped[str] = mapped_column(String(160), default="")
    dataset_version: Mapped[str] = mapped_column(String(40), default="")


class PortfolioOdd(_OneToOneMixin, Base):
    __tablename__ = "portfolio_odd"
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(30), default="PARTIAL")  # PARTIAL / COMPLETE


class PortfolioMonitoringStrategy(_OneToOneMixin, Base):
    __tablename__ = "portfolio_monitoring"
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("portfolio_projects.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(30), default="PARTIAL")
