"""Week-7 continuous assurance tests (service-level)."""
import json
import zipfile

import pytest
import sqlalchemy as sa
from app.database.base import Base
from app.portfolio.models import PortfolioProject
from app.portfolio.seed import seed_portfolio
from sqlalchemy.orm import sessionmaker
from tests.helpers import TestEnv, make_settings

JUNIT = (
    b"<testsuites><testsuite tests=\"4\" failures=\"1\" errors=\"0\" skipped=\"1\">"
    b"<testcase name=\"a\"/><testcase name=\"b\"><failure/></testcase>"
    b"<testcase name=\"c\"><skipped/></testcase><testcase name=\"d\"/></testsuite></testsuites>"
)


@pytest.fixture()
def db_session(tmp_path):
    env = TestEnv(storage_dir=tmp_path / "storage", db_path=tmp_path / "db.sqlite")
    engine = sa.create_engine(f"sqlite:///{env.db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    settings = make_settings(env)
    session = factory()
    seed_portfolio(session, settings)
    yield session, settings
    session.close()


def test_ingest_junit_idempotent(db_session):
    session, _ = db_session
    project = session.get(PortfolioProject, "PRJ-TAD-001")
    from app.continuous.engine import ingest_results

    first = ingest_results(session, project, JUNIT, source_type="junit-xml", source_file="results.xml")
    second = ingest_results(session, project, JUNIT, source_type="junit-xml", source_file="results.xml")
    assert second.status == "Already Imported"
    assert first.status in ("Imported", "Already Imported")
    from app.continuous.engine import IngestionRecord

    assert session.query(IngestionRecord).count() == 1  # never duplicated
    assert second.failed == 1 and second.skipped == 1 and second.passed == 2


def test_ingest_rejects_malformed_and_json_summary(db_session):
    session, _ = db_session
    project = session.get(PortfolioProject, "PRJ-SEU-001")
    from app.continuous.engine import ingest_results

    with pytest.raises((ValueError, SyntaxError)):
        ingest_results(session, project, b"<testsuites", source_type="junit-xml")
    payload = json.dumps({"summary": {"total_tests": 10, "passed": 8, "failed": 2}, "test_tool": "fixture"}).encode()
    record = ingest_results(session, project, payload, source_type="json-summary", source_file="summary.json")
    assert record.passed == 8 and record.failed == 2


def test_snapshot_compare_and_regression(db_session):
    session, _ = db_session
    project = session.get(PortfolioProject, "PRJ-TAD-001")
    from app.continuous.engine import compare_snapshots, create_snapshot

    a = create_snapshot(session, project, reason="baseline A")
    b = create_snapshot(session, project, reason="candidate")
    comp = compare_snapshots(a, b)
    assert comp["regression_facts"] == []  # identical states -> no regression
    # simulate a regression: newer snapshot loses one passed test
    state = dict(b.state)
    state["tests_passed"] = state["tests_passed"][:-1]
    b.state = state
    b.checksum = __import__("hashlib").sha256(json.dumps(state, sort_keys=True).encode()).hexdigest()
    session.commit()
    comp2 = compare_snapshots(a, b)
    assert comp2["regression_facts"], "expected regression facts for lost passed test"
    fact = comp2["regression_facts"][0]
    assert fact["previous"] == "Passed"
    assert fact["current"] in ("Failed or missing", "missing")


def test_actions_from_regressions_and_close(db_session):
    session, _ = db_session
    project = session.get(PortfolioProject, "PRJ-TAD-001")
    from app.continuous.engine import (
        close_action,
        create_action,
        create_snapshot,
        regressions_from_comparison,
    )

    a = create_snapshot(session, project, reason="a")
    b = create_snapshot(session, project, reason="b")
    state = dict(b.state)
    state["tests_passed"] = state["tests_passed"][:-1]
    b.state = state
    session.commit()
    from app.continuous.engine import compare_snapshots

    findings = regressions_from_comparison(session, project, compare_snapshots(a, b))
    assert findings, "no findings produced"
    action = create_action(session, project, "regression", findings[0].id, "Investigate", "rationale")
    close_action(session, action, "fixed", "evidence-ref")
    assert action.status == "Closed" and action.closed_at


def test_technical_review_pack_and_reproducibility(db_session):
    session, settings = db_session
    project = session.get(PortfolioProject, "PRJ-LLS-001")
    from app.continuous.engine import generate_review_pack, reproducibility_record

    pack = generate_review_pack(session, project, settings=settings)
    assert pack["filename"].endswith(".zip")
    path = settings.storage_dir / "technical-review-packs" / pack["filename"]
    assert path.exists()
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        assert "technical-review-pack/MANIFEST.json" in names
        assert "technical-review-pack/QUESTIONS_FOR_REVIEW.md" in names
    record = reproducibility_record(session, project, settings=settings)
    assert record["reproducibility_status"] in ("Reproducible", "Partially Reproducible", "Not Reproducible",
                                                "Not Evaluated", "Missing Inputs")
    assert record["_files"]


def test_evidence_provenance_fields(db_session):
    session, _ = db_session
    project = session.get(PortfolioProject, "PRJ-SEU-001")
    from app.portfolio.service import serialized_payload

    evidence = serialized_payload(session, project)["evidence"]
    assert evidence
    for item in evidence:
        assert "tool_name" in item and "content_hash" in item and "source" in item
