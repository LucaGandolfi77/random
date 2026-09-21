"""Tests for report generation, retrieval, and download endpoints.

Covers POST /api/analysis/{run_id}/report, GET /api/reports/{report_id},
and GET /api/reports/{report_id}/download.
"""

import json

from tests.factories import PROJECT_PAYLOAD, degraded_csv_bytes, run_analysis, upload


def _create_and_analyse(client):
    """Helper: create project, upload CSV, configure target, run analysis."""
    project = client.post("/api/projects", json=PROJECT_PAYLOAD).json()
    dataset = upload(client, project["id"], degraded_csv_bytes(), filename="telemetry.csv")
    client.put(
        f"/api/projects/{project['id']}/config",
        json={"target_column": "label", "timestamp_column": "ts"},
    )
    run = run_analysis(client, project["id"])
    return project, dataset, run


def test_generate_report_returns_201(client):
    project, dataset, run = _create_and_analyse(client)

    resp = client.post(f"/api/analysis/{run['id']}/report")
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert body["run_id"] == run["id"]
    assert body["project_id"] == project["id"]


def test_report_content_structure(client):
    project, dataset, run = _create_and_analyse(client)
    report = client.post(f"/api/analysis/{run['id']}/report").json()

    content = client.get(f"/api/reports/{report['id']}").json()
    assert content["project"]["id"] == project["id"]
    assert content["dataset"]["sha256"] == dataset["sha256"]
    assert content["analysis"]["run_id"] == run["id"]
    assert "findings" in content
    assert isinstance(content["findings"], list)
    assert len(content["findings"]) > 0
    assert "data_readiness_score" in content
    assert content["data_readiness_score"]["overall_score"] is not None


def test_report_disclaimer_and_limitations(client):
    project, dataset, run = _create_and_analyse(client)
    report = client.post(f"/api/analysis/{run['id']}/report").json()
    content = client.get(f"/api/reports/{report['id']}").json()

    assert "ECSS" in content["disclaimer"]
    assert "NOT" in content["disclaimer"]
    assert isinstance(content["known_limitations"], list)
    assert len(content["known_limitations"]) > 0


def test_download_report_returns_json_file(client):
    project, dataset, run = _create_and_analyse(client)
    report = client.post(f"/api/analysis/{run['id']}/report").json()

    resp = client.get(f"/api/reports/{report['id']}/download")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    assert "attachment" in resp.headers.get("content-disposition", "")
    downloaded = json.loads(resp.content)
    assert downloaded["report_id"] == report["id"]


def test_get_nonexistent_report_returns_404(client):
    resp = client.get("/api/reports/REPORT-FAKE-999")
    assert resp.status_code == 404


def test_download_nonexistent_report_returns_404(client):
    resp = client.get("/api/reports/REPORT-FAKE-999/download")
    assert resp.status_code == 404


def test_generate_report_for_nonexistent_run_returns_404(client):
    resp = client.post("/api/analysis/RUN-FAKE-999/report")
    assert resp.status_code == 404


def test_report_generation_for_incomplete_run_returns_409(client):
    project = client.post("/api/projects", json=PROJECT_PAYLOAD).json()
    upload(client, project["id"], degraded_csv_bytes())
    client.put(
        f"/api/projects/{project['id']}/config",
        json={"target_column": "label", "timestamp_column": "ts"},
    )
    run = client.post(f"/api/projects/{project['id']}/analysis").json()
    if run["status"] != "completed":
        resp = client.post(f"/api/analysis/{run['id']}/report")
        assert resp.status_code == 409


def test_list_project_reports(client):
    project, dataset, run = _create_and_analyse(client)
    client.post(f"/api/analysis/{run['id']}/report")

    resp = client.get(f"/api/projects/{project['id']}/reports")
    assert resp.status_code == 200
    reports = resp.json()
    assert isinstance(reports, list)
    assert len(reports) >= 1
    assert reports[0]["project_id"] == project["id"]
