"""Long-term memory store implementations."""

from __future__ import annotations

import json
import sqlite3
from abc import ABC, abstractmethod
from pathlib import Path
from threading import RLock
from typing import Iterable

from memory_agents.memory.retrieval import rank_memory_items
from memory_agents.models import MemoryItem, MemoryQuery, RetrievalResult


class MemoryStore(ABC):
    """Abstract interface for long-term memory stores."""

    @abstractmethod
    def upsert(self, item: MemoryItem) -> MemoryItem:
        """Insert or replace a memory item."""

    @abstractmethod
    def query(self, query: MemoryQuery) -> list[RetrievalResult]:
        """Search memory items relevant to the given query."""

    @abstractmethod
    def list(self, session_id: str | None = None) -> list[MemoryItem]:
        """List memory items, optionally scoped to a session."""

    @abstractmethod
    def delete(self, item_id: str) -> bool:
        """Delete a memory item by identifier."""

    @abstractmethod
    def clear_session(self, session_id: str) -> int:
        """Delete all memory items for a session and return the removed count."""


class InMemoryStore(MemoryStore):
    """Volatile long-term memory store backed by a Python list."""

    def __init__(self, items: Iterable[MemoryItem] | None = None) -> None:
        self._items: list[MemoryItem] = list(items or [])
        self._lock = RLock()

    def upsert(self, item: MemoryItem) -> MemoryItem:
        with self._lock:
            self._items = [existing for existing in self._items if existing.id != item.id]
            self._items.append(item)
        return item

    def query(self, query: MemoryQuery) -> list[RetrievalResult]:
        with self._lock:
            candidates = [
                item
                for item in self._items
                if query.session_id is None or item.session_id in {None, query.session_id}
            ]
        return rank_memory_items(candidates, query)

    def list(self, session_id: str | None = None) -> list[MemoryItem]:
        with self._lock:
            items = list(self._items)
        if session_id is None:
            return sorted(items, key=lambda item: item.updated_at)
        return sorted(
            [item for item in items if item.session_id == session_id],
            key=lambda item: item.updated_at,
        )

    def delete(self, item_id: str) -> bool:
        with self._lock:
            before = len(self._items)
            self._items = [item for item in self._items if item.id != item_id]
        return len(self._items) != before

    def clear_session(self, session_id: str) -> int:
        with self._lock:
            to_remove = [item for item in self._items if item.session_id == session_id]
            self._items = [item for item in self._items if item.session_id != session_id]
        return len(to_remove)


class JsonFileMemoryStore(MemoryStore):
    """JSON-backed long-term memory store with atomic writes."""

    def __init__(self, file_path: str | Path) -> None:
        self.file_path = Path(file_path)
        self._lock = RLock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self._write_items([])

    def upsert(self, item: MemoryItem) -> MemoryItem:
        with self._lock:
            items = self._read_items()
            items = [existing for existing in items if existing.id != item.id]
            items.append(item)
            self._write_items(items)
        return item

    def query(self, query: MemoryQuery) -> list[RetrievalResult]:
        with self._lock:
            items = self._read_items()
        candidates = [
            item for item in items if query.session_id is None or item.session_id in {None, query.session_id}
        ]
        return rank_memory_items(candidates, query)

    def list(self, session_id: str | None = None) -> list[MemoryItem]:
        with self._lock:
            items = self._read_items()
        if session_id is None:
            return sorted(items, key=lambda item: item.updated_at)
        return sorted(
            [item for item in items if item.session_id == session_id],
            key=lambda item: item.updated_at,
        )

    def delete(self, item_id: str) -> bool:
        with self._lock:
            items = self._read_items()
            filtered = [item for item in items if item.id != item_id]
            self._write_items(filtered)
        return len(filtered) != len(items)

    def clear_session(self, session_id: str) -> int:
        with self._lock:
            items = self._read_items()
            filtered = [item for item in items if item.session_id != session_id]
            self._write_items(filtered)
        return len(items) - len(filtered)

    def _read_items(self) -> list[MemoryItem]:
        raw = json.loads(self.file_path.read_text(encoding="utf-8"))
        rows = raw.get("items", []) if isinstance(raw, dict) else []
        return [MemoryItem.model_validate(row) for row in rows]

    def _write_items(self, items: list[MemoryItem]) -> None:
        temp_path = self.file_path.with_suffix(self.file_path.suffix + ".tmp")
        payload = {"items": [item.model_dump(mode="json") for item in items]}
        temp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temp_path.replace(self.file_path)


class SQLiteMemoryStore(MemoryStore):
    """SQLite-backed long-term memory store with the same interface as other stores."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)
        self._lock = RLock()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_database()

    def upsert(self, item: MemoryItem) -> MemoryItem:
        payload = self._serialize_item(item)
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO memory_items (
                    id,
                    session_id,
                    text,
                    category,
                    importance,
                    score,
                    tags,
                    source,
                    created_at,
                    updated_at,
                    metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    session_id=excluded.session_id,
                    text=excluded.text,
                    category=excluded.category,
                    importance=excluded.importance,
                    score=excluded.score,
                    tags=excluded.tags,
                    source=excluded.source,
                    created_at=excluded.created_at,
                    updated_at=excluded.updated_at,
                    metadata=excluded.metadata
                """,
                payload,
            )
            connection.commit()
        return item

    def query(self, query: MemoryQuery) -> list[RetrievalResult]:
        sql = "SELECT * FROM memory_items"
        params: tuple[object, ...] = ()
        if query.session_id is not None:
            sql += " WHERE session_id = ? OR session_id IS NULL"
            params = (query.session_id,)

        with self._lock, self._connect() as connection:
            rows = connection.execute(sql, params).fetchall()

        items = [self._row_to_item(row) for row in rows]
        return rank_memory_items(items, query)

    def list(self, session_id: str | None = None) -> list[MemoryItem]:
        sql = "SELECT * FROM memory_items"
        params: tuple[object, ...] = ()
        if session_id is not None:
            sql += " WHERE session_id = ?"
            params = (session_id,)
        sql += " ORDER BY updated_at ASC"

        with self._lock, self._connect() as connection:
            rows = connection.execute(sql, params).fetchall()
        return [self._row_to_item(row) for row in rows]

    def delete(self, item_id: str) -> bool:
        with self._lock, self._connect() as connection:
            cursor = connection.execute("DELETE FROM memory_items WHERE id = ?", (item_id,))
            connection.commit()
        return cursor.rowcount > 0

    def clear_session(self, session_id: str) -> int:
        with self._lock, self._connect() as connection:
            row = connection.execute(
                "SELECT COUNT(*) AS count FROM memory_items WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            connection.execute("DELETE FROM memory_items WHERE session_id = ?", (session_id,))
            connection.commit()
        return int(row["count"] if row is not None else 0)

    def _initialize_database(self) -> None:
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_items (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    text TEXT NOT NULL,
                    category TEXT NOT NULL,
                    importance REAL NOT NULL,
                    score REAL NOT NULL,
                    tags TEXT NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_items_session_id ON memory_items(session_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_memory_items_updated_at ON memory_items(updated_at)"
            )
            connection.commit()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _serialize_item(self, item: MemoryItem) -> tuple[object, ...]:
        return (
            item.id,
            item.session_id,
            item.text,
            item.category,
            item.importance,
            item.score,
            json.dumps(item.tags, ensure_ascii=False),
            item.source,
            item.created_at.isoformat(),
            item.updated_at.isoformat(),
            json.dumps(item.metadata, ensure_ascii=False),
        )

    def _row_to_item(self, row: sqlite3.Row) -> MemoryItem:
        return MemoryItem.model_validate(
            {
                "id": row["id"],
                "session_id": row["session_id"],
                "text": row["text"],
                "category": row["category"],
                "importance": row["importance"],
                "score": row["score"],
                "tags": json.loads(row["tags"]),
                "source": row["source"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "metadata": json.loads(row["metadata"]),
            }
        )
