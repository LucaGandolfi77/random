from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    source_root: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    suites: Mapped[list["TestSuiteDB"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class TestSuiteDB(Base):
    __tablename__ = "test_suites"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(String(255))
    source_file: Mapped[str] = mapped_column(Text)
    target_function: Mapped[str] = mapped_column(String(255))

    project: Mapped["Project"] = relationship(back_populates="suites")
    cases: Mapped[list["TestCaseDB"]] = relationship(back_populates="suite", cascade="all, delete-orphan")
    runs: Mapped[list["TestRunDB"]] = relationship(back_populates="suite", cascade="all, delete-orphan")


class TestCaseDB(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    suite_id: Mapped[int] = mapped_column(ForeignKey("test_suites.id"))
    name: Mapped[str] = mapped_column(String(255))
    function_name: Mapped[str] = mapped_column(String(255))
    args_json: Mapped[str] = mapped_column(Text, default="{}")
    expected_json: Mapped[str] = mapped_column(Text, default="{}")
    stubs_json: Mapped[str] = mapped_column(Text, default="{}")
    description: Mapped[str] = mapped_column(Text, default="")
    requirement_ids: Mapped[str] = mapped_column(Text, default="")

    suite: Mapped["TestSuiteDB"] = relationship(back_populates="cases")


class TestRunDB(Base):
    __tablename__ = "test_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    suite_id: Mapped[int] = mapped_column(ForeignKey("test_suites.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    passed_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)

    suite: Mapped["TestSuiteDB"] = relationship(back_populates="runs")
    results: Mapped[list["TestResultDB"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class TestResultDB(Base):
    __tablename__ = "test_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("test_runs.id"))
    test_name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50))
    duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    message: Mapped[str] = mapped_column(Text, default="")
    stdout: Mapped[str] = mapped_column(Text, default="")
    stderr: Mapped[str] = mapped_column(Text, default="")

    run: Mapped["TestRunDB"] = relationship(back_populates="results")


class RequirementDB(Base):
    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(primary_key=True)
    req_id: Mapped[str] = mapped_column(String(255), unique=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(255), default="")


class RequirementLinkDB(Base):
    __tablename__ = "requirement_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    req_id: Mapped[str] = mapped_column(String(255))
    test_case_id: Mapped[int] = mapped_column(ForeignKey("test_cases.id"))
    link_type: Mapped[str] = mapped_column(String(50), default="tests")
