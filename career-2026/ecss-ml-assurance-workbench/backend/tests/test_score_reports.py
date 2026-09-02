"""Score determinism, report JSON and audit log tests."""

import json

from tests.factories import clean_csv_bytes, create_project, degraded_csv_bytes, run_analysis, upload


def _score(client, run_id: str) -> dict:
    response = client.get(f"/api/analysis/{run_id}/score")
    assert response.status_code == 200, response.text
    return response.json()


def test_score_is_deterministic(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run_a = run_analysis(client, project["id"])
    run_b = run_analysis(client, project["id"])
    score_a, score_b = _score(client, run_a["id"]), _score(client, run_b["id"])
    assert score_a == score_b
    assert score_a["overall_score"] is not None
    assert 0.0 <= score_a["overall_score"] <= 100.0


def test_score_explainable_and_has_coverage(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    score = _score(client, run["id"])
    names = [c["name"] for c in score["categories"]]
    assert names == [
        "Structure",
        "Completeness",
        "Consistency",
        "Duplicates",
        "Statistical Quality",
        "Target Quality",
        "Time Quality",
        "Traceability",
    ]
    evaluated = [c for c in score["categories"] if c["evaluated"]]
    not_evaluated = [c for c in score["categories"] if not c["evaluated"]]
    assert evaluated  # structure/completeness/statistical evaluated
    assert any(c["name"] == "Target Quality" for c in not_evaluated)  # no target configured
    assert 0.0 < score["coverage_pct"] < 100.0
    # degraded data must generate warnings or fails
    assert score["warning_count"] + score["fail_count"] > 0


def test_report_json_structure_and_disclaimer(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    response = client.post(f"/api/analysis/{run['id']}/report")
    assert response.status_code == 201, response.text
    report = response.json()
    assert report["schema_version"] == "1.0.0"

    content = client.get(f"/api/reports/{report['id']}").json()
    assert content["report_schema_version"] == "1.0.0"
    assert content["tool_version"]
    assert content["analyzer_version"]
    assert content["dataset"]["sha256"]
    assert "data_readiness_score" in content
    assert content["data_readiness_score"]["overall_score"] is not None
    assert len(content["findings"]) > 0
    assert "ECSS" in content["disclaimer"]
    assert any("certification" in limitation.lower() for limitation in content["known_limitations"])

    # download endpoint serves the same content
    dl = client.get(f"/api/reports/{report['id']}/download")
    assert dl.status_code == 200
    assert json.loads(dl.content)["report_id"] == content["report_id"]

    listed = client.get(f"/api/projects/{project['id']}/reports").json()
    assert len(listed) == 1
    assert listed[0]["id"] == report["id"]


def test_report_deterministic_modulo_ids_and_timestamps(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    client.post(f"/api/analysis/{run['id']}/report")
    client.post(f"/api/analysis/{run['id']}/report")
    reports = client.get(f"/api/projects/{project['id']}/reports").json()
    docs = [client.get(f"/api/reports/{r['id']}").json() for r in reports]
    stable_keys = {
        "report_schema_version",
        "tool_version",
        "analyzer_version",
        "project",
        "dataset",
        "analysis",
        "metrics",
        "data_readiness_score",
        "findings",
        "known_limitations",
        "disclaimer",
    }
    first = docs[0]
    for other in docs[1:]:
        for key in stable_keys:
            assert first[key] == other[key], f"non-deterministic section: {key}"
        assert first["report_id"] != other["report_id"]
        assert first["generated_at_utc"] != other["generated_at_utc"]


def test_audit_log_populated(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    client.post(f"/api/analysis/{run['id']}/report")
    events = client.get(f"/api/projects/{project['id']}/audit").json()
    types = {event["event_type"] for event in events}
    assert {
        "PROJECT_CREATED",
        "DATASET_UPLOADED",
        "ANALYSIS_STARTED",
        "ANALYSIS_COMPLETED",
        "REPORT_EXPORTED",
    } <= types
    for event in events:
        assert "rows" not in event.get("details", {})
        assert "content" not in event.get("details", {})


def test_health_and_error_contract(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["database"] == "ok"

    # unknown project -> structured 404
    error = client.get("/api/projects/unknown-id")
    assert error.status_code == 404
    body = error.json()
    assert body["code"] == "NOT_FOUND"
    assert "message" in body


def test_analysis_requires_dataset(client):
    project = create_project(client)
    response = client.post(f"/api/projects/{project['id']}/analysis")
    assert response.status_code == 409
    assert response.json()["code"] == "NO_DATASET"


def test_config_validation_rejects_unknown_column(client):
    project = create_project(client)
    upload(client, project["id"], clean_csv_bytes())
    response = client.put(
        f"/api/projects/{project['id']}/config",
        json={"target_column": "not_a_column"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "COLUMN_NOT_FOUND"
