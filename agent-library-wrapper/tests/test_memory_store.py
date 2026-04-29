"""Tests for long-term memory stores and retrieval."""

from __future__ import annotations

from memory_agents.memory import InMemoryStore, JsonFileMemoryStore, SQLiteMemoryStore
from memory_agents.models import MemoryItem, MemoryQuery


def test_in_memory_store_respects_session_scoping() -> None:
    store = InMemoryStore()
    preferred = MemoryItem(
        session_id="alpha",
        text="My favorite programming language is Python.",
        category="preference",
        importance=0.9,
        tags=["python", "favorite"],
    )
    other = MemoryItem(
        session_id="beta",
        text="My favorite database is Postgres.",
        category="preference",
        importance=0.9,
        tags=["postgres"],
    )

    store.upsert(preferred)
    store.upsert(other)

    results = store.query(MemoryQuery(text="favorite programming language", session_id="alpha", top_k=3))

    assert len(results) == 1
    assert results[0].item.text == preferred.text


def test_json_file_store_persists_items(tmp_path) -> None:
    store_path = tmp_path / "memories.json"
    store = JsonFileMemoryStore(store_path)
    item = MemoryItem(
        session_id="alpha",
        text="The user prefers concise responses.",
        category="preference",
        importance=0.8,
        tags=["style", "concise"],
    )

    store.upsert(item)

    reloaded = JsonFileMemoryStore(store_path)
    items = reloaded.list(session_id="alpha")

    assert len(items) == 1
    assert items[0].text == item.text


def test_sqlite_store_matches_memory_store_interface(tmp_path) -> None:
    store_path = tmp_path / "memories.sqlite3"
    store = SQLiteMemoryStore(store_path)
    item = MemoryItem(
        session_id="alpha",
        text="The user deploys prototypes with SQLite first.",
        category="fact",
        importance=0.82,
        tags=["sqlite", "deployment"],
    )

    store.upsert(item)

    results = store.query(MemoryQuery(text="sqlite prototypes", session_id="alpha", top_k=5))
    listed = store.list(session_id="alpha")
    removed = store.delete(item.id)

    assert results
    assert results[0].item.text == item.text
    assert len(listed) == 1
    assert listed[0].text == item.text
    assert removed is True
