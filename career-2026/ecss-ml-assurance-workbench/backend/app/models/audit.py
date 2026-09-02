"""Audit event and report ORM models."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.project import utcnow


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    dataset_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    run_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    run_id: Mapped[str] = mapped_column(String(36), index=True)
    schema_version: Mapped[str] = mapped_column(String(20))
    filename: Mapped[str] = mapped_column(String(120))
    size_bytes: Mapped[int] = mapped_column(default=0)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    content: Mapped[str] = mapped_column(Text, default="")  # cached JSON document
