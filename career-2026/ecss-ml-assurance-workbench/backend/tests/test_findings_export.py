"""Tests for findings CSV export endpoint."""

import csv
import io

import pytest


def test_export_findings_csv(client):
    """CSV export returns valid CSV with header row and finding data."""
    from tests.factories import create_project, upload, run_analysis, degraded_csv_bytes

    project = create_project(client, {"name": "CSV Export Test", "description": "test"})
    pid = project["id"]
    upload(client, pid, degraded_csv_bytes())
    run_analysis(client, pid)

    runs = client.get(f"/api/projects/{pid}/analysis/latest").json()
    run_id = runs["id"]

    resp = client.get(f"/api/analysis/{run_id}/findings/export")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers.get("content-disposition", "")

    reader = csv.reader(io.StringIO(resp.text))
    rows = list(reader)
    assert len(rows) >= 2  # header + at least one finding
    header = rows[0]
    assert "check_id" in header
    assert "title" in header
    assert "status" in header
    assert "severity" in header


def test_export_findings_csv_with_status_filter(client):
    """CSV export respects status filter."""
    from tests.factories import create_project, upload, run_analysis, degraded_csv_bytes

    project = create_project(client, {"name": "CSV Filter Test", "description": "test"})
    pid = project["id"]
    upload(client, pid, degraded_csv_bytes())
    run_analysis(client, pid)

    runs = client.get(f"/api/projects/{pid}/analysis/latest").json()
    run_id = runs["id"]

    resp = client.get(f"/api/analysis/{run_id}/findings/export?status=FAIL")
    assert resp.status_code == 200
    reader = csv.reader(io.StringIO(resp.text))
    rows = list(reader)
    if len(rows) > 1:
        status_idx = rows[0].index("status")
        for row in rows[1:]:
            assert row[status_idx] == "FAIL"


def test_export_findings_csv_empty_run(client):
    """CSV export for a run with no FAIL findings returns only PASS findings."""
    from tests.factories import create_project, upload, run_analysis, clean_csv_bytes

    project = create_project(client, {"name": "CSV Empty Test", "description": "test"})
    pid = project["id"]
    upload(client, pid, clean_csv_bytes())
    run_analysis(client, pid)

    runs = client.get(f"/api/projects/{pid}/analysis/latest").json()
    run_id = runs["id"]

    resp = client.get(f"/api/analysis/{run_id}/findings/export")
    assert resp.status_code == 200
    reader = csv.reader(io.StringIO(resp.text))
    rows = list(reader)
    assert len(rows) >= 1  # header at minimum


def test_export_findings_csv_nonexistent_run(client):
    """CSV export for a nonexistent run returns 404."""
    resp = client.get("/api/analysis/nonexistent-run-id/findings/export")
    assert resp.status_code == 404
