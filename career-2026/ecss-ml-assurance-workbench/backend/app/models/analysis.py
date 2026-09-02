"""Analysis run, finding and score ORM models."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.project import utcnow
from app.schemas.enums import RunStatus


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    dataset_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default=RunStatus.PENDING.value, index=True)
    config_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    error_message: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    findings: Mapped[list["Finding"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def is_terminal(self) -> bool:
        return self.status in (RunStatus.COMPLETED.value, RunStatus.FAILED.value)


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True)
    check_id: Mapped[str] = mapped_column(String(80), index=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), index=True)
    severity: Mapped[str] = mapped_column(String(20), index=True)
    observed_value: Mapped[str] = mapped_column(Text, default="")
    threshold: Mapped[str] = mapped_column(Text, default="")
    columns: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    risk: Mapped[str] = mapped_column(Text, default="")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    analyzer_version: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    run: Mapped["AnalysisRun"] = relationship(back_populates="findings")


class ScoreResult(Base):
    __tablename__ = "score_results"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), primary_key=True
    )
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    coverage_pct: Mapped[float] = mapped_column(Float, default=0.0)
    category_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    pass_count: Mapped[int] = mapped_column(Integer, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    fail_count: Mapped[int] = mapped_column(Integer, default=0)
    not_applicable_count: Mapped[int] = mapped_column(Integer, default=0)
    not_evaluated_count: Mapped[int] = mapped_column(Integer, default=0)
    weights_json: Mapped[dict] = mapped_column(JSON, default=dict)
    score_method_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
