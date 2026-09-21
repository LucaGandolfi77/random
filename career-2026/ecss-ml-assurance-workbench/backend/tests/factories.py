"""Shared builders for test datasets."""

from tests.helpers import make_csv_bytes

PROJECT_PAYLOAD = {
    "name": "ADCS anomaly detector",
    "description": "Anomaly detection on reaction wheel telemetry",
    "application_type": "Telemetry anomaly detection",
    "target_platform": "LEO CubeSat (simulated)",
    "operating_context": "onboard",
    "criticality_level": "Medium - development",
    "ml_function": "classify wheel anomaly",
    "notes": "demo project",
}


def degraded_csv_bytes() -> bytes:
    """Small telemetry CSV with the typical week-1 problems."""
    header = ["ts", "bus_voltage", "wheel_speed", "mode", "label", "const_col"]
    rows: list[list] = []
    for i in range(120):
        row = [
            f"2026-01-01T00:{i // 60:02d}:{i % 60:02d}Z",
            28.0 if i % 8 else "",  # ~12.5% missing
            1500.0 + (5000.0 if i == 40 else float(i % 7)),  # outlier at i=40
            "NOMINAL" if i % 10 else "SAFE_HOLD",
            1 if i == 0 else 0,  # imbalanced target
            "v1",
        ]
        rows.append(row)
        if i % 10 == 0 and i > 0:
            rows.append(rows[-1][:])  # ~9% duplicate rows
    return make_csv_bytes(header, rows)


def clean_csv_bytes() -> bytes:
    header = ["ts", "value_a", "value_b", "category", "label"]
    rows = [[f"2026-01-01T00:00:{i:02d}Z", float(i), float(i * 2), f"cat{i % 3}", 1 if i % 2 else 0] for i in range(60)]
    return make_csv_bytes(header, rows)


def leakage_csv_bytes() -> bytes:
    header = ["ts", "component_id", "sensor_a", "anomaly_label", "post_event_diagnosis"]
    rows = [
        [f"2026-01-01T00:00:{i:02d}Z", f"CMP-{i:04d}", 50.0 + (i % 10), i % 2, i % 2]  # identical leak col
        for i in range(120)
    ]
    return make_csv_bytes(header, rows)


def create_project(client, payload: dict | None = None) -> dict:
    response = client.post("/api/projects", json=payload or PROJECT_PAYLOAD)
    assert response.status_code == 201, response.text
    return response.json()


def upload(
    client, project_id: str, content: bytes, filename: str = "telemetry.csv", content_type: str = "text/csv"
) -> dict:
    response = client.post(
        f"/api/projects/{project_id}/datasets",
        files={"file": (filename, content, content_type)},
    )
    assert response.status_code == 201, response.text
    return response.json()


def run_analysis(client, project_id: str) -> dict:
    response = client.post(f"/api/projects/{project_id}/analysis")
    assert response.status_code == 202, response.text
    return response.json()
