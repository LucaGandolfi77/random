"""Database engine/session management."""

from collections.abc import Generator

from app.core.config import get_settings
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

_settings = get_settings()

_connect_args: dict = {}
if _settings.database_url.startswith("sqlite"):
    # SQLite with FastAPI's threadpool requires check_same_thread=False.
    _connect_args["check_same_thread"] = False

engine = create_engine(
    _settings.database_url,
    echo=_settings.database_echo,
    future=True,
    connect_args=_connect_args or None,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables idempotently. Import models so metadata is populated."""
    from app.database.base import Base
    from app.models import analysis, audit, dataset, project  # noqa: F401

    if _settings.database_url.startswith("sqlite"):
        from sqlalchemy import event

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    Base.metadata.create_all(bind=engine)
