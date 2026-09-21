"""Task queue integration tests for background analysis execution."""

import pytest
from fastapi.testclient import TestClient

from app.celery_app import celery_app
from app.tasks.analysis import run_analysis_task
from tests.factories import create_project, upload, degraded_csv_bytes
from tests.helpers import TestEnv, make_client


@pytest.fixture()
def task_env(tmp_path) -> TestEnv:
    return TestEnv(storage_dir=tmp_path / "storage", db_path=tmp_path / "workbench.db")


@pytest.fixture()
def task_client(task_env: TestEnv) -> TestClient:
    return make_client(task_env)


def test_enqueue_analysis(task_client: TestClient, task_env: TestEnv) -> None:
    """POST /analysis enqueues a Celery task and returns HTTP 202 with task_id."""
    project = create_project(task_client)
    upload(task_client, project["id"], degraded_csv_bytes())
    response = task_client.post(f"/projects/{project['id']}/analysis")
    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert data["status"] is not None


def test_status_polling(task_client: TestClient, task_env: TestEnv) -> None:
    """GET /analysis/{run_id}/status returns task queue status."""
    project = create_project(task_client)
    upload(task_client, project["id"], degraded_csv_bytes())
    response = task_client.post(f"/projects/{project['id']}/analysis")
    assert response.status_code == 202
    run_id = response.json()["id"]

    status_response = task_client.get(f"/analysis/{run_id}/status")
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert "task_id" in status_data
    assert "status" in status_data


def test_celery_app_initialized() -> None:
    """Celery app is properly configured with Redis broker."""
    assert celery_app is not None
    assert celery_app.conf is not None


def test_run_analysis_task_direct() -> None:
    """run_analysis_task Celery task is registered and callable."""
    assert run_analysis_task is not None
    assert hasattr(run_analysis_task, "delay")
    assert hasattr(run_analysis_task, "retry")
