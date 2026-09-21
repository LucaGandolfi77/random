import pytest
from fastapi.testclient import TestClient

from tests.helpers import TestEnv, make_client, make_stress_client


@pytest.fixture()
def env(tmp_path) -> TestEnv:
    return TestEnv(storage_dir=tmp_path / "storage", db_path=tmp_path / "workbench.db")


@pytest.fixture()
def client(env: TestEnv) -> TestClient:
    return make_client(env)


@pytest.fixture()
def restarted_client(env: TestEnv) -> TestClient:
    return make_client(env)


@pytest.fixture()
def auth_client(env: TestEnv) -> tuple[TestClient, dict]:
    client = make_client(env)
    client.post(
        "/api/auth/register",
        json={
            "email": "editor@test.com",
            "username": "editor",
            "password": "editorpass123",
            "full_name": "Test Editor",
            "role": "editor",
        },
    )
    response = client.post(
        "/api/auth/login",
        json={"username": "editor", "password": "editorpass123"},
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return client, headers


@pytest.fixture()
def stress_env(tmp_path) -> TestEnv:
    return TestEnv(storage_dir=tmp_path / "stress_storage", db_path=tmp_path / "stress_workbench.db")


@pytest.fixture()
def stress_client(stress_env: TestEnv) -> TestClient:
    return make_stress_client(stress_env)
