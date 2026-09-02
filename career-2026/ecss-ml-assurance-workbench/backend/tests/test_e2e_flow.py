"""End-to-end backend flow test for the main week-1 path.

Create project -> upload degraded CSV -> configure target -> run analysis ->
findings present -> report exportable -> audit populated.
"""

from tests.factories import PROJECT_PAYLOAD, degraded_csv_bytes, upload


def test_end_to_end_main_flow(client):
    # 1. create project
    created = client.post("/api/projects", json=PROJECT_PAYLOAD)
    assert created.status_code == 201
    project = created.json()

    # 2. upload degraded telemetry
    dataset = upload(client, project["id"], degraded_csv_bytes(), filename="degraded_telemetry.csv")
    assert dataset["row_count"] > 0

    # 3. configure target
    config_resp = client.put(
        f"/api/projects/{project['id']}/config",
        json={"target_column": "label", "timestamp_column": "ts"},
    )
    assert config_resp.status_code == 200
    config = config_resp.json()
    assert config["target_column"] == "label"

    # 4. run analysis
    run_resp = client.post(f"/api/projects/{project['id']}/analysis")
    assert run_resp.status_code == 201
    run = run_resp.json()
    assert run["status"] == "completed"

    # 5. at least one WARNING/FAIL finding + a Target Quality evaluation
    page = client.get(f"/api/analysis/{run['id']}/findings", params={"limit": 500}).json()
    assert page["total"] > 0
    issues = [f for f in page["items"] if f["status"] in ("WARNING", "FAIL")]
    assert issues
    assert any(f["category"] == "Target Quality" for f in page["items"])

    # 6. score available and explainable
    score = client.get(f"/api/analysis/{run['id']}/score").json()
    assert score["overall_score"] is not None
    assert score["coverage_pct"] > 0
    target_cat = next(c for c in score["categories"] if c["name"] == "Target Quality")
    assert target_cat["evaluated"] is True

    # 7. export report
    report_resp = client.post(f"/api/analysis/{run['id']}/report")
    assert report_resp.status_code == 201
    content = client.get(f"/api/reports/{report_resp.json()['id']}").json()
    assert content["project"]["id"] == project["id"]
    assert content["dataset"]["sha256"] == dataset["sha256"]
    assert len(content["findings"]) == page["total"]

    # 8. audit trail
    events = client.get(f"/api/projects/{project['id']}/audit").json()
    event_types = {e["event_type"] for e in events}
    assert "ANALYSIS_COMPLETED" in event_types
    assert "REPORT_EXPORTED" in event_types
    assert "DATASET_UPLOADED" in event_types
