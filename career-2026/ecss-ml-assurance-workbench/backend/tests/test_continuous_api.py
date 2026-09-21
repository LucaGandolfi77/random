"""Tests for the continuous assurance API endpoints (/api/continuous/*).

Covers: ingestion, snapshots, comparisons, regressions, actions, CSV export,
issue drafts, closing actions, reproducibility records, and review packs.
"""

import json

import pytest

JUNIT_XML = (
    b'<testsuites><testsuite tests="6" failures="2" errors="0" skipped="1">'
    b'<testcase name="t1"/><testcase name="t2"><failure message="bad"/></testcase>'
    b'<testcase name="t3"><failure message="oops"/></testcase>'
    b'<testcase name="t4"><skipped/></testcase>'
    b'<testcase name="t5"/><testcase name="t6"/></testsuite></testsuites>'
)

JUNIT_XML_2 = (
    b'<testsuites><testsuite tests="6" failures="0" errors="0" skipped="0">'
    b'<testcase name="t1"/><testcase name="t2"/><testcase name="t3"/>'
    b'<testcase name="t4"/><testcase name="t5"/><testcase name="t6"/>'
    b'</testsuite></testsuites>'
)

JSON_SUMMARY = json.dumps({
    "summary": {"total_tests": 10, "passed": 8, "failed": 2, "skipped": 0},
    "test_tool": "pytest",
}).encode()


# ── Ingestion ────────────────────────────────────────────────────────


def test_ingest_junit_xml(client):
    resp = client.post(
        "/api/continuous/projects/PRJ-TAD-001/ingest",
        files={"file": ("results.xml", JUNIT_XML, "text/xml")},
        data={"source_type": "junit-xml"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["source_type"] == "junit-xml"
    assert body["total_tests"] == 6
    assert body["failed"] == 2
    assert body["skipped"] == 1
    assert body["passed"] == 3
    assert body["status"] == "Imported"


def test_ingest_json_summary(client):
    resp = client.post(
        "/api/continuous/projects/PRJ-TAD-001/ingest",
        files={"file": ("summary.json", JSON_SUMMARY, "application/json")},
        data={"source_type": "json-summary"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["source_type"] == "workbench-json"
    assert body["passed"] == 8
    assert body["failed"] == 2


def test_ingest_duplicate_is_idempotent(client):
    payload = {"file": ("results.xml", JUNIT_XML, "text/xml"), "source_type": "junit-xml"}
    r1 = client.post("/api/continuous/projects/PRJ-TAD-001/ingest", files={"file": payload["file"]}, data={"source_type": "junit-xml"})
    r2 = client.post("/api/continuous/projects/PRJ-TAD-001/ingest", files={"file": payload["file"]}, data={"source_type": "junit-xml"})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r2.json()["status"] == "Already Imported"


def test_ingest_nonexistent_project_returns_404(client):
    resp = client.post(
        "/api/continuous/projects/PRJ-FAKE-999/ingest",
        files={"file": ("r.xml", JUNIT_XML, "text/xml")},
        data={"source_type": "junit-xml"},
    )
    assert resp.status_code == 404


# ── Snapshots ────────────────────────────────────────────────────────


def test_create_and_list_snapshots(client):
    r1 = client.post(
        "/api/continuous/projects/PRJ-TAD-001/snapshots",
        json={"reason": "baseline v1", "role": "Development Baseline", "created_by": "test"},
    )
    assert r1.status_code == 200
    snap1 = r1.json()
    assert snap1["reason"] == "baseline v1"
    assert snap1["project_id"] == "PRJ-TAD-001"
    assert snap1["id"].startswith("SNP-")

    r2 = client.post(
        "/api/continuous/projects/PRJ-TAD-001/snapshots",
        json={"reason": "candidate v2", "role": "Release Candidate"},
    )
    assert r2.status_code == 200

    listing = client.get("/api/continuous/projects/PRJ-TAD-001/snapshots")
    assert listing.status_code == 200
    snaps = listing.json()
    assert len(snaps) >= 2
    ids = [s["id"] for s in snaps]
    assert snap1["id"] in ids


def test_snapshot_nonexistent_project_returns_404(client):
    resp = client.post("/api/continuous/projects/PRJ-FAKE-999/snapshots", json={"reason": "x"})
    assert resp.status_code == 404


# ── Comparison ────────────────────────────────────────────────────────


def test_compare_two_snapshots(client):
    s1 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "a"}).json()
    s2 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "b"}).json()

    resp = client.post(
        "/api/continuous/snapshots/compare",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    )
    assert resp.status_code == 200
    comp = resp.json()
    assert comp["baseline_a"] == s1["id"]
    assert comp["baseline_b"] == s2["id"]
    assert comp["project_id"] == "PRJ-TAD-001"
    assert "comparison" in comp
    assert "regression_facts" in comp


def test_compare_cross_project_rejected(client):
    s1 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "a"}).json()
    s2 = client.post("/api/continuous/projects/PRJ-SEU-001/snapshots", json={"reason": "b"}).json()

    resp = client.post(
        "/api/continuous/snapshots/compare",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    )
    assert resp.status_code in (400, 422)


# ── Regressions ──────────────────────────────────────────────────────


def test_detect_and_list_regressions(client):
    s1 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "baseline"}).json()
    s2 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "candidate"}).json()

    resp = client.post(
        "/api/continuous/projects/PRJ-TAD-001/regressions",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    )
    assert resp.status_code == 200
    findings = resp.json()
    assert isinstance(findings, list)
    for f in findings:
        assert "id" in f
        assert f["project_id"] == "PRJ-TAD-001"

    listing = client.get("/api/continuous/projects/PRJ-TAD-001/regressions")
    assert listing.status_code == 200
    assert isinstance(listing.json(), list)


# ── Actions ──────────────────────────────────────────────────────────


def test_list_actions_empty(client):
    resp = client.get("/api/continuous/projects/PRJ-TAD-001/actions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_detect_regressions_creates_actions(client):
    s1 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "baseline"}).json()
    s2 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "candidate"}).json()

    client.post(
        "/api/continuous/projects/PRJ-TAD-001/regressions",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    )

    resp = client.get("/api/continuous/projects/PRJ-TAD-001/actions")
    assert resp.status_code == 200
    actions = resp.json()
    assert isinstance(actions, list)


def test_export_actions_csv(client):
    resp = client.get("/api/continuous/projects/PRJ-TAD-001/actions/export")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment" in resp.headers.get("content-disposition", "")


# ── Issue draft & close ──────────────────────────────────────────────


def test_issue_draft_and_close_action(client):
    s1 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "a"}).json()
    s2 = client.post("/api/continuous/projects/PRJ-TAD-001/snapshots", json={"reason": "b"}).json()

    client.post(
        "/api/continuous/projects/PRJ-TAD-001/regressions",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    )

    actions = client.get("/api/continuous/projects/PRJ-TAD-001/actions").json()
    if not actions:
        pytest.skip("No actions generated from regression detection")

    action_id = actions[0]["id"]

    draft_resp = client.post(f"/api/continuous/actions/{action_id}/issue-draft")
    assert draft_resp.status_code == 200
    assert "draft" in draft_resp.json()

    close_resp = client.post(
        f"/api/continuous/actions/{action_id}/close",
        json={"resolution": "Fixed in build 42", "closing_evidence": "CI run #1234"},
    )
    assert close_resp.status_code == 200
    closed = close_resp.json()
    assert closed["status"] == "Closed"
    assert closed["resolution"] == "Fixed in build 42"


def test_close_nonexistent_action_returns_404(client):
    resp = client.post(
        "/api/continuous/actions/ACT-FAKE-999/close",
        json={"resolution": "x"},
    )
    assert resp.status_code == 404


def test_issue_draft_nonexistent_action_returns_404(client):
    resp = client.post("/api/continuous/actions/ACT-FAKE-999/issue-draft")
    assert resp.status_code == 404


# ── Reproducibility ──────────────────────────────────────────────────


def test_reproducibility_record(client):
    resp = client.post("/api/continuous/projects/PRJ-TAD-001/reproducibility")
    assert resp.status_code == 200
    body = resp.json()
    assert body["project_id"] == "PRJ-TAD-001"
    assert body["reproducibility_status"] in (
        "Reproducible", "Partially Reproducible", "Not Reproducible",
        "Not Evaluated", "Missing Inputs",
    )
    assert "_files" in body


# ── Review pack ──────────────────────────────────────────────────────


def test_review_pack_generation(client):
    resp = client.post(
        "/api/continuous/projects/PRJ-TAD-001/review-pack",
        json={"review_type": "Portfolio Demonstration Review"},
    )
    assert resp.status_code == 200
    pack = resp.json()
    assert pack["project_id"] == "PRJ-TAD-001"
    assert pack["filename"].endswith(".zip")
    assert pack["size_bytes"] > 0
    assert pack["review_type"] == "Portfolio Demonstration Review"


def test_review_pack_invalid_type_raises_error(client):
    with pytest.raises(ValueError, match="unsupported review type"):
        client.post(
            "/api/continuous/projects/PRJ-TAD-001/review-pack",
            json={"review_type": "Invalid Review Type"},
        )


# ── Full flow ────────────────────────────────────────────────────────


def test_full_continuous_flow(client, env):
    project_id = "PRJ-TAD-001"

    r1 = client.post(
        f"/api/continuous/projects/{project_id}/ingest",
        files={"file": ("results.xml", JUNIT_XML, "text/xml")},
        data={"source_type": "junit-xml"},
    )
    assert r1.status_code == 200

    s1 = client.post(f"/api/continuous/projects/{project_id}/snapshots", json={"reason": "baseline"}).json()

    r2 = client.post(
        f"/api/continuous/projects/{project_id}/ingest",
        files={"file": ("results2.xml", JUNIT_XML_2, "text/xml")},
        data={"source_type": "junit-xml"},
    )
    assert r2.status_code == 200

    s2 = client.post(f"/api/continuous/projects/{project_id}/snapshots", json={"reason": "improved"}).json()

    comp = client.post(
        "/api/continuous/snapshots/compare",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    ).json()
    assert "comparison" in comp

    findings = client.post(
        f"/api/continuous/projects/{project_id}/regressions",
        json={"baseline_a": s1["id"], "baseline_b": s2["id"]},
    ).json()
    assert isinstance(findings, list)

    actions = client.get(f"/api/continuous/projects/{project_id}/actions").json()
    assert isinstance(actions, list)

    csv_resp = client.get(f"/api/continuous/projects/{project_id}/actions/export")
    assert csv_resp.status_code == 200

    repro = client.post(f"/api/continuous/projects/{project_id}/reproducibility").json()
    assert "reproducibility_status" in repro

    pack = client.post(f"/api/continuous/projects/{project_id}/review-pack", json={"review_type": "Portfolio Demonstration Review"}).json()
    assert pack["filename"].endswith(".zip")
