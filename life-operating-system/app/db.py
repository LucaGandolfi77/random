from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    planning_style TEXT NOT NULL,
    primary_focus TEXT,
    baseline_sleep_hours REAL NOT NULL DEFAULT 7.5,
    baseline_energy INTEGER NOT NULL DEFAULT 7,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS energy_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    baseline_sleep_hours REAL NOT NULL DEFAULT 7.5,
    baseline_energy INTEGER NOT NULL DEFAULT 7,
    baseline_stress INTEGER NOT NULL DEFAULT 4,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checkin_date TEXT NOT NULL UNIQUE,
    sleep_hours REAL NOT NULL,
    sleep_quality INTEGER NOT NULL,
    perceived_energy INTEGER NOT NULL,
    mood INTEGER NOT NULL,
    stress_level INTEGER NOT NULL,
    context_label TEXT NOT NULL,
    available_minutes INTEGER NOT NULL,
    focus_text TEXT,
    constraints_text TEXT,
    required_tasks_text TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_date TEXT NOT NULL UNIQUE,
    plan_mode TEXT NOT NULL,
    energy_score REAL NOT NULL,
    summary TEXT NOT NULL,
    coach_message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    priority_score REAL NOT NULL,
    estimated_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    is_protected INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    target_frequency INTEGER NOT NULL DEFAULT 5,
    minimum_viable TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    log_date TEXT NOT NULL,
    completed INTEGER NOT NULL,
    note TEXT,
    UNIQUE(habit_id, log_date),
    FOREIGN KEY(habit_id) REFERENCES habits(id)
);

CREATE TABLE IF NOT EXISTS reflection_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reflection_date TEXT NOT NULL UNIQUE,
    wins_text TEXT,
    friction_text TEXT,
    gratitude_text TEXT,
    tomorrow_adjustment TEXT,
    extracted_signal TEXT,
    tone TEXT NOT NULL DEFAULT 'neutral',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    habit_signal TEXT NOT NULL,
    workload_signal TEXT NOT NULL,
    recovery_signal TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL UNIQUE,
    weekly_theme TEXT,
    top_priorities_text TEXT NOT NULL,
    known_constraints_text TEXT,
    focus_areas_text TEXT,
    non_negotiables_text TEXT,
    summary TEXT NOT NULL,
    risk_note TEXT NOT NULL,
    recovery_note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_focus_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    weekday TEXT NOT NULL,
    block_label TEXT NOT NULL,
    objective TEXT NOT NULL,
    load TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_cache (
    cache_key TEXT PRIMARY KEY,
    response_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_connection(db_path: Path) -> Iterator[sqlite3.Connection]:
    ensure_parent(db_path)
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db(db_path: Path) -> None:
    with get_connection(db_path) as connection:
        connection.executescript(SCHEMA)
