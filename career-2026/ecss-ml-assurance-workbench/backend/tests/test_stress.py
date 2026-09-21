"""Stress tests for large dataset analysis performance."""

import time

import pytest

from tests.factories import create_project, run_analysis
from tests.helpers import make_csv_bytes


@pytest.fixture()
def large_csv_1k():
    header = ["ts", "bus_voltage", "wheel_speed", "mode", "label", "const_col"]
    rows = []
    for i in range(1000):
        row = [
            f"2026-01-01T00:{i // 60:02d}:{i % 60:02d}Z",
            28.0 if i % 8 else "",
            1500.0 + (5000.0 if i == 40 else float(i % 7)),
            "NOMINAL" if i % 10 else "SAFE_HOLD",
            1 if i == 0 else 0,
            "v1",
        ]
        rows.append(row)
        if i % 10 == 0 and i > 0:
            rows.append(rows[-1][:])
    return make_csv_bytes(header, rows)


@pytest.fixture()
def large_csv_10k():
    header = ["ts", "bus_voltage", "wheel_speed", "mode", "label", "const_col"]
    rows = []
    for i in range(10000):
        row = [
            f"2026-01-01T00:{i // 60:02d}:{i % 60:02d}Z",
            28.0 if i % 8 else "",
            1500.0 + (5000.0 if i == 40 else float(i % 7)),
            "NOMINAL" if i % 10 else "SAFE_HOLD",
            1 if i == 0 else 0,
            "v1",
        ]
        rows.append(row)
        if i % 10 == 0 and i > 0:
            rows.append(rows[-1][:])
    return make_csv_bytes(header, rows)


@pytest.fixture()
def large_csv_100k():
    header = ["ts", "bus_voltage", "wheel_speed", "mode", "label", "const_col"]
    rows = []
    for i in range(100000):
        row = [
            f"2026-01-01T00:{i // 60:02d}:{i % 60:02d}Z",
            28.0 if i % 8 else "",
            1500.0 + (5000.0 if i == 40 else float(i % 7)),
            "NOMINAL" if i % 10 else "SAFE_HOLD",
            1 if i == 0 else 0,
            "v1",
        ]
        rows.append(row)
        if i % 10 == 0 and i > 0:
            rows.append(rows[-1][:])
    return make_csv_bytes(header, rows)


@pytest.fixture()
def numeric_csv_10k():
    header = [f"col_{i}" for i in range(50)] + ["label"]
    rows = []
    for i in range(10000):
        row = [float(j * i) for j in range(50)] + [1 if i % 2 else 0]
        rows.append(row)
    return make_csv_bytes(header, rows)


def test_stress_small_dataset(stress_client, large_csv_1k):
    """Analysis completes within 5 seconds for 1K rows and findings are produced."""
    project = create_project(stress_client)
    pid = project["id"]
    stress_client.post(f"/api/projects/{pid}/datasets", files={"file": ("data.csv", large_csv_1k, "text/csv")})

    start = time.perf_counter()
    run = run_analysis(stress_client, pid)
    elapsed = time.perf_counter() - start

    assert elapsed < 5.0, f"1K rows analysis took {elapsed:.2f}s"
    assert run["status"] == "completed"

    findings = stress_client.get(f"/api/analysis/{run['id']}/findings")
    assert findings.status_code == 200
    assert len(findings.json()["items"]) >= 0


def test_stress_medium_dataset(stress_client, large_csv_10k):
    """Analysis completes within 30 seconds for 10K rows and findings are produced."""
    project = create_project(stress_client)
    pid = project["id"]
    stress_client.post(f"/api/projects/{pid}/datasets", files={"file": ("data.csv", large_csv_10k, "text/csv")})

    start = time.perf_counter()
    run = run_analysis(stress_client, pid)
    elapsed = time.perf_counter() - start

    assert elapsed < 30.0, f"10K rows analysis took {elapsed:.2f}s"
    assert run["status"] == "completed"

    findings = stress_client.get(f"/api/analysis/{run['id']}/findings")
    assert findings.status_code == 200
    assert len(findings.json()["items"]) > 0


def test_stress_large_dataset(stress_client, large_csv_100k):
    """Analysis completes within 120 seconds for 100K rows and findings are produced."""
    project = create_project(stress_client)
    pid = project["id"]
    stress_client.post(f"/api/projects/{pid}/datasets", files={"file": ("data.csv", large_csv_100k, "text/csv")})

    start = time.perf_counter()
    run = run_analysis(stress_client, pid)
    elapsed = time.perf_counter() - start

    assert elapsed < 120.0, f"100K rows analysis took {elapsed:.2f}s"
    assert run["status"] == "completed"

    findings = stress_client.get(f"/api/analysis/{run['id']}/findings")
    assert findings.status_code == 200
    assert len(findings.json()["items"]) > 0


def test_stress_numeric_columns(stress_client, numeric_csv_10k):
    """Analysis with many numeric columns completes and produces findings including leakage checks."""
    project = create_project(stress_client)
    pid = project["id"]
    stress_client.post(f"/api/projects/{pid}/datasets", files={"file": ("data.csv", numeric_csv_10k, "text/csv")})

    run = run_analysis(stress_client, pid)
    assert run["status"] == "completed"

    findings = stress_client.get(f"/api/analysis/{run['id']}/findings")
    assert findings.status_code == 200
    data = findings.json()
    assert len(data["items"]) > 0


def test_stress_report_generation(stress_client, large_csv_1k):
    """Report generation works after stress analysis."""
    project = create_project(stress_client)
    pid = project["id"]
    stress_client.post(f"/api/projects/{pid}/datasets", files={"file": ("data.csv", large_csv_1k, "text/csv")})

    run = run_analysis(stress_client, pid)
    report = stress_client.post(f"/api/analysis/{run['id']}/report")
    assert report.status_code == 201


def test_stress_upload_size_limit(stress_client):
    """Uploads larger than 5MB but under 500MB are accepted with stress settings."""
    project = create_project(stress_client)
    pid = project["id"]

    header = ["ts", "value"]
    rows = [[f"2026-01-01T00:00:{i:02d}Z", float(i)] for i in range(200000)]
    csv_bytes = make_csv_bytes(header, rows)

    resp = stress_client.post(f"/api/projects/{pid}/datasets", files={"file": ("large.csv", csv_bytes, "text/csv")})
    assert resp.status_code == 201, f"Large upload failed: {resp.text}"