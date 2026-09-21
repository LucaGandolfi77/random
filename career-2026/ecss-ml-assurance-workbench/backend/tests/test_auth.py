"""Authentication tests."""

import pytest
from fastapi.testclient import TestClient

from tests.helpers import TestEnv, make_client


@pytest.fixture()
def env(tmp_path) -> TestEnv:
    return TestEnv(storage_dir=tmp_path / "storage", db_path=tmp_path / "workbench.db")


@pytest.fixture()
def client(env: TestEnv) -> TestClient:
    return make_client(env, authenticated=False)


@pytest.fixture()
def auth_headers(client: TestClient) -> dict:
    """Create a test user and return auth headers."""
    # Register user
    client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword123",
            "full_name": "Test User",
            "role": "editor",
        },
    )
    # Login
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword123"},
    )
    data = response.json()
    return {"Authorization": f"Bearer {data['access_token']}"}


@pytest.fixture()
def admin_headers(client: TestClient) -> dict:
    """Create an admin user and return auth headers."""
    # Register admin user
    client.post(
        "/api/auth/register",
        json={
            "email": "admin@example.com",
            "username": "admin",
            "password": "adminpassword123",
            "full_name": "Admin User",
            "role": "admin",
            "is_superuser": True,
        },
    )
    # Login
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "adminpassword123"},
    )
    data = response.json()
    return {"Authorization": f"Bearer {data['access_token']}"}


class TestRegistration:
    def test_register_success(self, client: TestClient):
        response = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "username": "newuser",
                "password": "password123",
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert data["username"] == "newuser"
        assert data["role"] == "viewer"  # default role
        assert "id" in data

    def test_register_duplicate_username(self, client: TestClient):
        client.post(
            "/api/auth/register",
            json={
                "email": "user1@example.com",
                "username": "duplicate",
                "password": "password123",
            },
        )
        response = client.post(
            "/api/auth/register",
            json={
                "email": "user2@example.com",
                "username": "duplicate",
                "password": "password456",
            },
        )
        assert response.status_code == 409
        assert "Username already exists" in response.json()["message"]

    def test_register_duplicate_email(self, client: TestClient):
        client.post(
            "/api/auth/register",
            json={
                "email": "same@example.com",
                "username": "user1",
                "password": "password123",
            },
        )
        response = client.post(
            "/api/auth/register",
            json={
                "email": "same@example.com",
                "username": "user2",
                "password": "password456",
            },
        )
        assert response.status_code == 409
        assert "Email already exists" in response.json()["message"]

    def test_register_short_password(self, client: TestClient):
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "short",
            },
        )
        assert response.status_code == 422  # validation error


class TestLogin:
    def test_login_success(self, client: TestClient):
        # Register
        client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "testpassword123",
            },
        )
        # Login
        response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_login_with_email(self, client: TestClient):
        # Register
        client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "testpassword123",
            },
        )
        # Login with email
        response = client.post(
            "/api/auth/login",
            json={"username": "test@example.com", "password": "testpassword123"},
        )
        assert response.status_code == 200

    def test_login_wrong_password(self, client: TestClient):
        # Register
        client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "testpassword123",
            },
        )
        # Login with wrong password
        response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["message"]

    def test_login_nonexistent_user(self, client: TestClient):
        response = client.post(
            "/api/auth/login",
            json={"username": "nonexistent", "password": "password123"},
        )
        assert response.status_code == 401


class TestTokenRefresh:
    def test_refresh_success(self, client: TestClient):
        # Register and login
        client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "testpassword123",
            },
        )
        login_response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "testpassword123"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_invalid_token(self, client: TestClient):
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 401


class TestProtectedEndpoints:
    def test_access_without_token(self, client: TestClient):
        response = client.get("/api/projects")
        assert response.status_code == 401

    def test_access_with_valid_token(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/projects", headers=auth_headers)
        assert response.status_code == 200

    def test_access_with_invalid_token(self, client: TestClient):
        response = client.get(
            "/api/projects",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401


class TestRBAC:
    def test_viewer_cannot_create_project(self, client: TestClient):
        # Register viewer
        client.post(
            "/api/auth/register",
            json={
                "email": "viewer@example.com",
                "username": "viewer",
                "password": "viewerpassword123",
                "role": "viewer",
            },
        )
        login_response = client.post(
            "/api/auth/login",
            json={"username": "viewer", "password": "viewerpassword123"},
        )
        headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

        # Try to create project
        response = client.post(
            "/api/projects",
            json={"name": "Test Project"},
            headers=headers,
        )
        assert response.status_code == 403
        assert "not in required roles" in response.json()["message"]

    def test_editor_can_create_project(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/projects",
            json={"name": "Test Project"},
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_admin_can_access_admin_endpoints(self, client: TestClient, admin_headers: dict):
        response = client.get("/api/auth/users", headers=admin_headers)
        assert response.status_code == 200

    def test_editor_cannot_access_admin_endpoints(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/auth/users", headers=auth_headers)
        assert response.status_code == 403


class TestUserInfo:
    def test_get_current_user(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    def test_update_current_user(self, client: TestClient, auth_headers: dict):
        response = client.patch(
            "/api/auth/me",
            json={"full_name": "Updated Name"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"

    def test_get_current_user_after_update(self, client: TestClient, auth_headers: dict):
        # Update
        client.patch(
            "/api/auth/me",
            json={"full_name": "Verified Name"},
            headers=auth_headers,
        )
        # Get
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["full_name"] == "Verified Name"
