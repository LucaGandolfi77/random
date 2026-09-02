"""Analyzer behaviour through the API (findings, severity, heuristics)."""

from tests.factories import (
    clean_csv_bytes,
    create_project,
    degraded_csv_bytes,
    leakage_csv_bytes,
    run_analysis,
    upload,
)


def _findings(client, run_id: str, **params) -> list[dict]:
    response = client.get(f"/api/analysis/{run_id}/findings", params=params)
    assert response.status_code == 200, response.text
    return response.json()["items"]


def test_missing_values_detected(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    findings = _findings(client, run["id"])
    ids = {f["check_id"] for f in findings}
    assert "completeness.total_missing" in ids
    missing = [f for f in findings if f["check_id"] == "completeness.column_missing_above_threshold"]
    assert any("bus_voltage" in f["columns"] for f in missing)
    statuses = {f["status"] for f in missing}
    assert statuses <= {"WARNING", "FAIL", "PASS"}


def test_duplicates_detected(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    dup = [f for f in _findings(client, run["id"]) if f["check_id"] == "duplicates.rows"]
    assert dup and dup[0]["status"] in ("WARNING", "FAIL")
    assert int(float(dup[0]["observed_value"].split()[0])) > 0


def test_constant_column_detected(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    const = [f for f in _findings(client, run["id"]) if f["check_id"] == "struct.constant_columns"]
    assert const and const[0]["status"] == "WARNING"
    assert "const_col" in const[0]["columns"]


def test_iqr_outliers_detected(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    outliers = [f for f in _findings(client, run["id"]) if f["check_id"] == "numerical.outliers_iqr"]
    assert outliers
    assert any("wheel_speed" in f["columns"] for f in outliers)
    assert outliers[0]["severity"] in ("LOW", "MEDIUM")
    assert "statistical" in outliers[0]["description"].lower()


def test_type_error_tokens_flagged(client):
    import csv
    import io

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["a", "b"])
    for i in range(100):
        w.writerow([f"{i}", "ERR" if i % 20 == 0 else f"{i * 2}"])
    content = buf.getvalue().encode()
    project = create_project(client)
    upload(client, project["id"], content)
    run = run_analysis(client, project["id"])
    compat = [f for f in _findings(client, run["id"]) if f["check_id"] == "consistency.type_compat_values"]
    assert compat and compat[0]["status"] == "WARNING"
    assert any("b" in f["columns"] for f in compat)


def test_imbalanced_categorical_target(client):
    import csv
    import io

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["f1", "label"])
    for i in range(200):
        w.writerow([i, "A" if i < 195 else "B"])
    project = create_project(client)
    upload(client, project["id"], buf.getvalue().encode())
    cfg = client.put(f"/api/projects/{project['id']}/config", json={"target_column": "label"})
    assert cfg.status_code == 200
    run = run_analysis(client, project["id"])
    imbalance = [f for f in _findings(client, run["id"]) if f["check_id"] == "target.imbalance"]
    assert imbalance and imbalance[0]["status"] == "WARNING"
    assert imbalance[0]["category"] == "Target Quality"


def test_target_quality_not_evaluated_without_target(client):
    project = create_project(client)
    upload(client, project["id"], clean_csv_bytes())
    run = run_analysis(client, project["id"])
    score = client.get(f"/api/analysis/{run['id']}/score").json()
    target_cat = next(c for c in score["categories"] if c["name"] == "Target Quality")
    assert target_cat["evaluated"] is False
    assert target_cat["score"] is None
    assert score["coverage_pct"] < 100.0


def test_irregular_timestamps_detected(client):
    import csv
    import io
    from datetime import datetime, timedelta

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ts", "v"])
    current = datetime(2026, 1, 1, 0, 0, 0)
    for i in range(60):
        step = timedelta(minutes=30) if (i > 0 and i % 20 == 0) else timedelta(minutes=2)
        current = current + step
        w.writerow([current.strftime("%Y-%m-%d %H:%M:%S"), i])
    project = create_project(client)
    upload(client, project["id"], buf.getvalue().encode())
    cfg = client.put(f"/api/projects/{project['id']}/config", json={"timestamp_column": "ts"})
    assert cfg.status_code == 200
    run = run_analysis(client, project["id"])
    ids = {f["check_id"] for f in _findings(client, run["id"])}
    assert "time.suspicious_gaps" in ids
    assert "time.intervals" in ids


def test_leakage_heuristics_detected(client):
    project = create_project(client)
    upload(client, project["id"], leakage_csv_bytes())
    cfg = client.put(f"/api/projects/{project['id']}/config", json={"target_column": "anomaly_label"})
    assert cfg.status_code == 200
    run = run_analysis(client, project["id"])
    findings = _findings(client, run["id"])
    identical = [f for f in findings if f["check_id"] == "leakage.identical_to_target"]
    assert identical and identical[0]["status"] == "FAIL"
    assert "post_event_diagnosis" in identical[0]["columns"]
    assert "engineering review" in identical[0]["recommendation"].lower()
    unique_id = [f for f in findings if f["check_id"] == "leakage.unique_identifier_features"]
    assert unique_id and any("component_id" in f["columns"] for f in unique_id)


def test_findings_filtering_and_search(client):
    project = create_project(client)
    upload(client, project["id"], degraded_csv_bytes())
    run = run_analysis(client, project["id"])
    page = client.get(f"/api/analysis/{run['id']}/findings", params={"status": "WARNING", "severity": "MEDIUM"}).json()
    assert page["total"] >= 1
    assert all(f["status"] == "WARNING" and f["severity"] == "MEDIUM" for f in page["items"])
    by_column = client.get(f"/api/analysis/{run['id']}/findings", params={"column": "bus_voltage"}).json()
    assert by_column["total"] >= 1
    assert all("bus_voltage" in f["columns"] for f in by_column["items"])
    search = client.get(f"/api/analysis/{run['id']}/findings", params={"q": "outlier"}).json()
    assert search["total"] >= 1
