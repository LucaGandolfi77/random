"""ORM models for the assurance registry (tables prefixed assurance_)."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.project import utcnow


class AssuranceProject(Base):
    """Registry row for an externally-managed project (stable id, e.g. PRJ-TAD-001)."""

    __tablename__ = "assurance_projects"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # stable id, not the display name
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(120), index=True)
    short_description: Mapped[str] = mapped_column(Text, default="")
    project_type: Mapped[str] = mapped_column(String(80), default="")
    domain: Mapped[str] = mapped_column(String(80), default="")
    repository_path: Mapped[str] = mapped_column(Text, default="")
    documentation_path: Mapped[str] = mapped_column(Text, default="")
    owner: Mapped[str] = mapped_column(String(120), default="")
    reviewers: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[str] = mapped_column(String(30), default="")
    lifecycle_status: Mapped[str] = mapped_column(String(40), default="")
    assurance_status: Mapped[str] = mapped_column(String(40), default="")
    model_status: Mapped[str] = mapped_column(String(40), default="")
    deployment_status: Mapped[str] = mapped_column(String(40), default="")
    criticality: Mapped[str] = mapped_column(String(80), default="")
    source_type: Mapped[str] = mapped_column(String(60), default="")
    source_manifest: Mapped[str] = mapped_column(Text, default="")
    artefact_availability: Mapped[dict] = mapped_column(JSON, default=dict)  # REGISTRY_ARTEFACTS -> state
    related_assets: Mapped[list] = mapped_column(JSON, default=list)  # genuine, verifiable references
    tags: Mapped[list] = mapped_column(JSON, default=list)
    known_limitations: Mapped[list] = mapped_column(JSON, default=list)
    open_actions: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    import_procedure: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    requirements: Mapped[list["AssuranceRequirement"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    evidence: Mapped[list["AssuranceEvidence"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    tests: Mapped[list["AssuranceTest"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    risks: Mapped[list["AssuranceRisk"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    packages: Mapped[list["AssurancePackage"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )


class AssuranceRequirement(Base):
    __tablename__ = "assurance_requirements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("assurance_projects.id", ondelete="CASCADE"), index=True
    )
    requirement_id: Mapped[str] = mapped_column(String(60))  # e.g. REQ-F-001
    category: Mapped[str] = mapped_column(String(40), default="")
    title: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    rationale: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(120), default="")
    verification_method: Mapped[str] = mapped_column(String(60), default="")
    state: Mapped[str] = mapped_column(String(40), default="Not Provided")
    related_tests: Mapped[list] = mapped_column(JSON, default=list)
    related_risks: Mapped[list] = mapped_column(JSON, default=list)
    related_evidence: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["AssuranceProject"] = relationship(back_populates="requirements")


class AssuranceEvidence(Base):
    __tablename__ = "assurance_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("assurance_projects.id", ondelete="CASCADE"), index=True
    )
    evidence_id: Mapped[str] = mapped_column(String(60))  # e.g. EVID-001
    evidence_type: Mapped[str] = mapped_column(String(60), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    source_document: Mapped[str] = mapped_column(String(200), default="")
    source_version: Mapped[str] = mapped_column(String(30), default="")
    state: Mapped[str] = mapped_column(String(40), default="Evidence Missing")
    location: Mapped[str] = mapped_column(Text, default="")
    related_tests: Mapped[list] = mapped_column(JSON, default=list)
    reviewer: Mapped[str] = mapped_column(String(120), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["AssuranceProject"] = relationship(back_populates="evidence")


class AssuranceTest(Base):
    __tablename__ = "assurance_tests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("assurance_projects.id", ondelete="CASCADE"), index=True
    )
    test_id: Mapped[str] = mapped_column(String(60))  # e.g. TEST-001
    title: Mapped[str] = mapped_column(String(200), default="")
    level: Mapped[str] = mapped_column(String(40), default="")
    method: Mapped[str] = mapped_column(String(120), default="")
    objective: Mapped[str] = mapped_column(Text, default="")
    dataset_version: Mapped[str] = mapped_column(String(80), default="")
    outcome: Mapped[str] = mapped_column(String(40), default="Not Executed")
    actual_result: Mapped[str] = mapped_column(Text, default="")
    related_requirements: Mapped[list] = mapped_column(JSON, default=list)
    evidence_links: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["AssuranceProject"] = relationship(back_populates="tests")


class AssuranceRisk(Base):
    """Project risk or functional failure mode (FMEA row) for the registry."""

    __tablename__ = "assurance_risks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("assurance_projects.id", ondelete="CASCADE"), index=True
    )
    risk_id: Mapped[str] = mapped_column(String(60))  # e.g. RISK-001 or FM-001
    kind: Mapped[str] = mapped_column(String(30), default="risk")  # risk | failure_mode
    title: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20), default="")
    likelihood: Mapped[str] = mapped_column(String(20), default="")
    detection_mechanism: Mapped[str] = mapped_column(Text, default="")
    mitigation: Mapped[str] = mapped_column(Text, default="")
    residual_risk: Mapped[str] = mapped_column(String(20), default="")
    state: Mapped[str] = mapped_column(String(40), default="Not Provided")
    related_requirements: Mapped[list] = mapped_column(JSON, default=list)
    related_tests: Mapped[list] = mapped_column(JSON, default=list)
    evidence_links: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["AssuranceProject"] = relationship(back_populates="risks")


class AssurancePackage(Base):
    """Generated evidence package (zip archive + stored manifest)."""

    __tablename__ = "assurance_packages"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # e.g. PKG-TAD-001-...
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("assurance_projects.id", ondelete="CASCADE"), index=True
    )
    schema_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    filename: Mapped[str] = mapped_column(String(160), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    sections: Mapped[list] = mapped_column(JSON, default=list)  # section names included
    states_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped["AssuranceProject"] = relationship(back_populates="packages")
