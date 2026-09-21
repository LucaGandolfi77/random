"""Test helpers: isolated app/client per test with file-backed SQLite + tmp storage."""

from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from app.api.deps import get_current_user
from app.core.config import Settings, get_settings
from app.database.base import Base
from app.database.session import get_db
from app.main import create_app
from app.models.user import User
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@dataclass
class TestEnv:
    storage_dir: Path
    db_path: Path


def make_settings(env: TestEnv) -> Settings:
    return Settings(
        storage_dir=env.storage_dir,
        database_url=f"sqlite:///{env.db_path}",
        max_upload_size_mb=5,
        environment="test",
    )


def make_stress_settings(env: TestEnv) -> Settings:
    return Settings(
        storage_dir=env.storage_dir,
        database_url=f"sqlite:///{env.db_path}",
        max_upload_size_mb=500,
        environment="test",
    )


def _create_test_user(session) -> User:
    """Create a default test user for authenticated tests."""
    user = session.query(User).filter(User.username == "testuser").first()
    if user is None:
        user = User(
            id=str(uuid4()),
            email="test@test.com",
            username="testuser",
            hashed_password="hashed_password_not_used_in_tests",
            full_name="Test User",
            role="editor",
            is_active=True,
            is_superuser=False,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def make_client(env: TestEnv, *, authenticated: bool = True) -> TestClient:
    """Create a test client.

    Args:
        env: Test environment with storage/db paths.
        authenticated: If True, overrides auth to return a default editor user.
    """
    settings = make_settings(env)
    settings.ensure_directories()
    engine = create_engine(
        f"sqlite:///{env.db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_settings] = lambda: settings

    if authenticated:
        def _override_get_current_user() -> Generator[User, None, None]:
            db = testing_session()
            try:
                user = _create_test_user(db)
                yield user
            finally:
                db.close()

        app.dependency_overrides[get_current_user] = _override_get_current_user

    return TestClient(app)


def make_stress_client(env: TestEnv, *, authenticated: bool = True) -> TestClient:
    """Create a test client with relaxed upload limits for stress testing."""
    settings = make_stress_settings(env)
    settings.ensure_directories()
    engine = create_engine(
        f"sqlite:///{env.db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_settings] = lambda: settings

    if authenticated:
        def _override_get_current_user() -> Generator[User, None, None]:
            db = testing_session()
            try:
                user = _create_test_user(db)
                yield user
            finally:
                db.close()

        app.dependency_overrides[get_current_user] = _override_get_current_user

    return TestClient(app)


def csv_files(filename: str = "telemetry.csv", content: bytes | None = None, content_type: str = "text/csv"):
    if content is None:
        content = b""
    return {"file": (filename, content, content_type)}


def make_csv_bytes(header: list[str], rows: list[list]) -> bytes:
    import csv
    import io

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")
