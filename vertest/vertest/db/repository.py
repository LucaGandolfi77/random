from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from vertest.db.models import (
    Base,
    Project,
    RequirementDB,
    RequirementLinkDB,
    TestCaseDB,
    TestResultDB,
    TestRunDB,
    TestSuiteDB,
)


class Repository:
    """Data access layer wrapping SQLAlchemy sessions."""

    def __init__(self, db_path: str | Path):
        self.engine = create_engine(f"sqlite:///{db_path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def create_project(self, name: str, source_root: str) -> Project:
        with self.Session() as s:
            p = Project(name=name, source_root=source_root)
            s.add(p)
            s.commit()
            s.refresh(p)
            return p

    def get_project(self, name: str) -> Optional[Project]:
        with self.Session() as s:
            return s.query(Project).filter_by(name=name).first()

    def list_projects(self) -> list[Project]:
        with self.Session() as s:
            return s.query(Project).all()

    def create_suite(
        self, project_id: int, name: str, source_file: str, target_function: str
    ) -> TestSuiteDB:
        with self.Session() as s:
            suite = TestSuiteDB(
                project_id=project_id,
                name=name,
                source_file=source_file,
                target_function=target_function,
            )
            s.add(suite)
            s.commit()
            s.refresh(suite)
            return suite

    def get_suite(self, suite_id: int) -> Optional[TestSuiteDB]:
        with self.Session() as s:
            return s.query(TestSuiteDB).filter_by(id=suite_id).first()

    def get_suite_by_name(self, project_id: int, name: str) -> Optional[TestSuiteDB]:
        with self.Session() as s:
            return s.query(TestSuiteDB).filter_by(project_id=project_id, name=name).first()

    def add_test_case(self, suite_id: int, **kwargs) -> TestCaseDB:
        with self.Session() as s:
            tc = TestCaseDB(
                suite_id=suite_id,
                args_json=json.dumps(kwargs.get("args", {})),
                expected_json=json.dumps(kwargs.get("expected", {})),
                stubs_json=json.dumps(kwargs.get("stubs", {})),
                name=kwargs.get("name", ""),
                function_name=kwargs.get("function_name", ""),
                description=kwargs.get("description", ""),
                requirement_ids=kwargs.get("requirement_ids", ""),
            )
            s.add(tc)
            s.commit()
            s.refresh(tc)
            return tc

    def list_cases(self, suite_id: int) -> list[TestCaseDB]:
        with self.Session() as s:
            return s.query(TestCaseDB).filter_by(suite_id=suite_id).all()

    def create_run(self, suite_id: int) -> TestRunDB:
        with self.Session() as s:
            run = TestRunDB(suite_id=suite_id)
            s.add(run)
            s.commit()
            s.refresh(run)
            return run

    def add_result(self, run_id: int, **kwargs) -> TestResultDB:
        with self.Session() as s:
            r = TestResultDB(run_id=run_id, **kwargs)
            s.add(r)
            s.commit()
            return r

    def get_run_results(self, run_id: int) -> list[TestResultDB]:
        with self.Session() as s:
            return s.query(TestResultDB).filter_by(run_id=run_id).all()

    def add_requirement(self, req_id: str, title: str = "", description: str = "") -> RequirementDB:
        with self.Session() as s:
            r = RequirementDB(req_id=req_id, title=title, description=description)
            s.add(r)
            s.commit()
            return r

    def link_requirement(self, req_id: str, test_case_id: int):
        with self.Session() as s:
            link = RequirementLinkDB(req_id=req_id, test_case_id=test_case_id)
            s.add(link)
            s.commit()
