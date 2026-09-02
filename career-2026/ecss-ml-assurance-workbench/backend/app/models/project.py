"""Project ORM model + analysis configuration (1:1)."""

from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.schemas.enums import ApplicationType, CriticalityLevel, OperatingContext, ProjectStatus


def utcnow() -> datetime:
    return datetime.now(UTC)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    application_type: Mapped[str] = mapped_column(String(80), default=ApplicationType.OTHER.value)
    target_platform: Mapped[str] = mapped_column(String(120), default="")
    operating_context: Mapped[str] = mapped_column(String(20), default=OperatingContext.GROUND.value)
    criticality_level: Mapped[str] = mapped_column(String(60), default=CriticalityLevel.DEVELOPMENT.value)
    ml_function: Mapped[str] = mapped_column(String(160), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default=ProjectStatus.DRAFT.value)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    config: Mapped[Optional["AnalysisConfig"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )


class AnalysisConfig(Base):
    __tablename__ = "analysis_configs"

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    target_column: Mapped[str | None] = mapped_column(String(200), nullable=True)
    timestamp_column: Mapped[str | None] = mapped_column(String(200), nullable=True)
    id_column: Mapped[str | None] = mapped_column(String(200), nullable=True)
    missing_threshold_pct: Mapped[float] = mapped_column(default=10.0)
    iqr_multiplier: Mapped[float] = mapped_column(default=1.5)
    quasi_constant_threshold_pct: Mapped[float] = mapped_column(default=98.0)
    rare_category_threshold_pct: Mapped[float] = mapped_column(default=1.0)
    dominant_category_threshold_pct: Mapped[float] = mapped_column(default=90.0)
    high_cardinality_ratio: Mapped[float] = mapped_column(default=0.5)
    duplicate_rows_threshold_pct: Mapped[float] = mapped_column(default=5.0)
    imbalance_ratio_warn: Mapped[float] = mapped_column(default=10.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    project: Mapped["Project"] = relationship(back_populates="config")

    def as_dict(self) -> dict:
        return {
            "target_column": self.target_column,
            "timestamp_column": self.timestamp_column,
            "id_column": self.id_column,
            "missing_threshold_pct": self.missing_threshold_pct,
            "iqr_multiplier": self.iqr_multiplier,
            "quasi_constant_threshold_pct": self.quasi_constant_threshold_pct,
            "rare_category_threshold_pct": self.rare_category_threshold_pct,
            "dominant_category_threshold_pct": self.dominant_category_threshold_pct,
            "high_cardinality_ratio": self.high_cardinality_ratio,
            "duplicate_rows_threshold_pct": self.duplicate_rows_threshold_pct,
            "imbalance_ratio_warn": self.imbalance_ratio_warn,
        }

    def to_snapshot(self) -> dict:
        """Serializable config snapshot stored on each analysis run."""
        return self.as_dict()
