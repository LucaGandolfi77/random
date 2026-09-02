"""Test helpers: isolated app/client per test with file-backed SQLite + tmp storage."""

from dataclasses import dataclass
from pathlib import Path

from app.core.config import Settings, get_settings
from app.database.base import Base
from app.database.session import get_db
from app.main import create_app
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


def make_client(env: TestEnv) -> TestClient:
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
