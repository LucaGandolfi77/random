"""API tests for the local web inspector."""

from __future__ import annotations

from fastapi.testclient import TestClient

from sims_ai_city.config import SimulationConfig
from sims_ai_city.web.api import create_app


def test_status_step_and_reset_endpoints(tmp_path) -> None:
    config = SimulationConfig(runtime_dir=tmp_path / "runtime", autosave_every_days=1, random_seed=13)
    client = TestClient(create_app(config))

    initial = client.get("/api/status")
    assert initial.status_code == 200
    initial_payload = initial.json()
    assert initial_payload["day_index"] == 0

    stepped = client.post("/api/step?days=4")
    assert stepped.status_code == 200
    stepped_payload = stepped.json()
    assert stepped_payload["day_index"] == 4
    assert stepped_payload["recent_events"]

    reset = client.post("/api/reset?seed=29")
    assert reset.status_code == 200
    reset_payload = reset.json()
    assert reset_payload["day_index"] == 0
    assert reset_payload["reset_seed"] == 29
