from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from app.db import get_connection, init_db
from app.schemas import DailyCheckinInput, HabitCreateInput, HabitLogInput, PlanResult, ReflectionInput, WeeklyPlanResult, WeeklyPlanningInput
from app.services.rules import analyze_habit_performance, load_to_numeric, today_iso, week_start_for

EXPORT_TABLES = [
    "user_profile",
    "energy_profile",
    "daily_checkins",
    "daily_plans",
    "tasks",
    "habits",
    "habit_logs",
    "reflection_entries",
    "weekly_insights",
    "weekly_plans",
    "weekly_focus_blocks",
]


class MemoryService:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        init_db(db_path)

    def bootstrap_defaults(self) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO user_profile (id, name, planning_style, primary_focus, baseline_sleep_hours, baseline_energy)
                VALUES (1, 'Solo Builder', 'adaptive', 'Protect energy while still shipping', 7.5, 7)
                ON CONFLICT(id) DO NOTHING
                """
            )
            connection.execute(
                """
                INSERT INTO energy_profile (id, baseline_sleep_hours, baseline_energy, baseline_stress)
                VALUES (1, 7.5, 7, 4)
                ON CONFLICT(id) DO NOTHING
                """
            )
            habit_count = connection.execute("SELECT COUNT(*) AS count FROM habits").fetchone()["count"]
            if habit_count == 0:
                connection.executemany(
                    """
                    INSERT INTO habits (name, target_frequency, minimum_viable)
                    VALUES (?, ?, ?)
                    """,
                    [
                        ("Morning sunlight", 5, "5 minutes outside after waking"),
                        ("Focused block", 4, "25 minutes on the main task"),
                        ("Evening shutdown", 5, "write tomorrow's top 1 priority"),
                    ],
                )

    def get_profile(self) -> dict[str, Any]:
        with get_connection(self.db_path) as connection:
            profile = connection.execute("SELECT * FROM user_profile WHERE id = 1").fetchone()
            energy_profile = connection.execute("SELECT * FROM energy_profile WHERE id = 1").fetchone()
        return {
            "profile": dict(profile) if profile else {},
            "energy_profile": dict(energy_profile) if energy_profile else {},
        }

    def save_daily_checkin(self, payload: DailyCheckinInput) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO daily_checkins (
                    checkin_date, sleep_hours, sleep_quality, perceived_energy, mood,
                    stress_level, context_label, available_minutes, focus_text,
                    constraints_text, required_tasks_text, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(checkin_date) DO UPDATE SET
                    sleep_hours=excluded.sleep_hours,
                    sleep_quality=excluded.sleep_quality,
                    perceived_energy=excluded.perceived_energy,
                    mood=excluded.mood,
                    stress_level=excluded.stress_level,
                    context_label=excluded.context_label,
                    available_minutes=excluded.available_minutes,
                    focus_text=excluded.focus_text,
                    constraints_text=excluded.constraints_text,
                    required_tasks_text=excluded.required_tasks_text,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    payload.checkin_date,
                    payload.sleep_hours,
                    payload.sleep_quality,
                    payload.perceived_energy,
                    payload.mood,
                    payload.stress_level,
                    payload.context_label,
                    payload.available_minutes,
                    payload.focus_text,
                    payload.constraints_text,
                    payload.required_tasks_text,
                ),
            )

    def get_checkin(self, checkin_date: str | None = None) -> dict[str, Any] | None:
        resolved_date = checkin_date or today_iso()
        with get_connection(self.db_path) as connection:
            row = connection.execute(
                "SELECT * FROM daily_checkins WHERE checkin_date = ?",
                (resolved_date,),
            ).fetchone()
        return dict(row) if row else None

    def get_recent_checkins(self, limit: int = 7) -> list[dict[str, Any]]:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                "SELECT * FROM daily_checkins ORDER BY checkin_date DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def save_daily_plan(self, plan_date: str, plan: PlanResult) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                "DELETE FROM tasks WHERE task_date = ?",
                (plan_date,),
            )
            connection.execute(
                """
                INSERT INTO daily_plans (plan_date, plan_mode, energy_score, summary, coach_message, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(plan_date) DO UPDATE SET
                    plan_mode=excluded.plan_mode,
                    energy_score=excluded.energy_score,
                    summary=excluded.summary,
                    coach_message=excluded.coach_message,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (plan_date, plan.plan_mode, plan.energy_score, plan.summary, plan.coach_message),
            )
            connection.executemany(
                """
                INSERT INTO tasks (
                    task_date, title, category, priority_score, estimated_minutes,
                    status, is_protected, reason
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                [
                    (
                        plan_date,
                        task.title,
                        task.category,
                        task.priority_score,
                        task.estimated_minutes,
                        int(task.is_protected),
                        task.reason,
                    )
                    for task in plan.tasks
                ],
            )

    def get_plan(self, plan_date: str | None = None) -> dict[str, Any] | None:
        resolved_date = plan_date or today_iso()
        with get_connection(self.db_path) as connection:
            plan_row = connection.execute(
                "SELECT * FROM daily_plans WHERE plan_date = ?",
                (resolved_date,),
            ).fetchone()
            task_rows = connection.execute(
                "SELECT * FROM tasks WHERE task_date = ? ORDER BY is_protected DESC, priority_score DESC, id ASC",
                (resolved_date,),
            ).fetchall()
        if not plan_row:
            return None
        return {
            **dict(plan_row),
            "tasks": [dict(row) for row in task_rows],
        }

    def get_recent_plan_stats(self, limit: int = 5) -> list[dict[str, Any]]:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                """
                SELECT
                    task_date,
                    COUNT(*) AS task_count,
                    SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) AS incomplete_count,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count
                FROM tasks
                GROUP BY task_date
                ORDER BY task_date DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_open_tasks_for_week(self, target_date: str) -> list[dict[str, Any]]:
        week_start = week_start_for(target_date)
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM tasks
                WHERE task_date >= ?
                  AND task_date < ?
                  AND task_date < ?
                  AND status IN ('pending', 'moved')
                ORDER BY task_date ASC, is_protected DESC, priority_score DESC
                LIMIT 6
                """,
                (week_start, target_date, target_date),
            ).fetchall()
        return [dict(row) for row in rows]

    def update_task_status(self, task_id: int, status: str) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, task_id),
            )

    def create_habit(self, payload: HabitCreateInput) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                "INSERT OR IGNORE INTO habits (name, target_frequency, minimum_viable) VALUES (?, ?, ?)",
                (payload.name, payload.target_frequency, payload.minimum_viable),
            )

    def list_habits(self) -> list[dict[str, Any]]:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                "SELECT * FROM habits WHERE active = 1 ORDER BY created_at ASC"
            ).fetchall()
        return [dict(row) for row in rows]

    def save_habit_log(self, habit_id: int, payload: HabitLogInput) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO habit_logs (habit_id, log_date, completed, note)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(habit_id, log_date) DO UPDATE SET
                    completed=excluded.completed,
                    note=excluded.note
                """,
                (habit_id, payload.log_date, int(payload.completed), payload.note),
            )

    def get_habits_with_status(self, log_date: str | None = None) -> list[dict[str, Any]]:
        resolved_date = log_date or today_iso()
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                """
                SELECT h.*, hl.completed, hl.note
                FROM habits h
                LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.log_date = ?
                WHERE h.active = 1
                ORDER BY h.created_at ASC
                """,
                (resolved_date,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_recent_habit_logs(self, days: int = 7) -> list[dict[str, Any]]:
        start_date = (date.today() - timedelta(days=days - 1)).isoformat()
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                """
                SELECT hl.*, h.name, h.minimum_viable, h.target_frequency
                FROM habit_logs hl
                JOIN habits h ON h.id = hl.habit_id
                WHERE hl.log_date >= ?
                ORDER BY hl.log_date DESC, h.name ASC
                """,
                (start_date,),
            ).fetchall()
        return [dict(row) for row in rows]

    def save_reflection(self, payload: ReflectionInput, extracted_signal: str, tone: str) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO reflection_entries (
                    reflection_date, wins_text, friction_text, gratitude_text,
                    tomorrow_adjustment, extracted_signal, tone, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(reflection_date) DO UPDATE SET
                    wins_text=excluded.wins_text,
                    friction_text=excluded.friction_text,
                    gratitude_text=excluded.gratitude_text,
                    tomorrow_adjustment=excluded.tomorrow_adjustment,
                    extracted_signal=excluded.extracted_signal,
                    tone=excluded.tone,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    payload.reflection_date,
                    payload.wins_text,
                    payload.friction_text,
                    payload.gratitude_text,
                    payload.tomorrow_adjustment,
                    extracted_signal,
                    tone,
                ),
            )

    def get_reflection(self, reflection_date: str | None = None) -> dict[str, Any] | None:
        resolved_date = reflection_date or today_iso()
        with get_connection(self.db_path) as connection:
            row = connection.execute(
                "SELECT * FROM reflection_entries WHERE reflection_date = ?",
                (resolved_date,),
            ).fetchone()
        return dict(row) if row else None

    def get_recent_reflections(self, limit: int = 5) -> list[dict[str, Any]]:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                "SELECT * FROM reflection_entries ORDER BY reflection_date DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def save_weekly_insight(self, insight_date: str, summary: str, habit_signal: str, workload_signal: str, recovery_signal: str) -> None:
        week_start = week_start_for(insight_date)
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO weekly_insights (week_start, summary, habit_signal, workload_signal, recovery_signal, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(week_start) DO UPDATE SET
                    summary=excluded.summary,
                    habit_signal=excluded.habit_signal,
                    workload_signal=excluded.workload_signal,
                    recovery_signal=excluded.recovery_signal,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (week_start, summary, habit_signal, workload_signal, recovery_signal),
            )

    def get_latest_weekly_insight(self) -> dict[str, Any] | None:
        with get_connection(self.db_path) as connection:
            row = connection.execute(
                "SELECT * FROM weekly_insights ORDER BY week_start DESC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

    def save_weekly_plan(self, payload: WeeklyPlanningInput, plan: WeeklyPlanResult) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute("DELETE FROM weekly_focus_blocks WHERE week_start = ?", (payload.week_start,))
            connection.execute(
                """
                INSERT INTO weekly_plans (
                    week_start, weekly_theme, top_priorities_text, known_constraints_text,
                    focus_areas_text, non_negotiables_text, summary, risk_note,
                    recovery_note, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(week_start) DO UPDATE SET
                    weekly_theme=excluded.weekly_theme,
                    top_priorities_text=excluded.top_priorities_text,
                    known_constraints_text=excluded.known_constraints_text,
                    focus_areas_text=excluded.focus_areas_text,
                    non_negotiables_text=excluded.non_negotiables_text,
                    summary=excluded.summary,
                    risk_note=excluded.risk_note,
                    recovery_note=excluded.recovery_note,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    payload.week_start,
                    plan.weekly_theme,
                    payload.top_priorities_text,
                    payload.known_constraints_text,
                    payload.focus_areas_text,
                    payload.non_negotiables_text,
                    plan.summary,
                    plan.risk_note,
                    plan.recovery_note,
                ),
            )
            connection.executemany(
                """
                INSERT INTO weekly_focus_blocks (week_start, weekday, block_label, objective, load)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    (payload.week_start, block.weekday, block.block_label, block.objective, block.load)
                    for block in plan.focus_blocks
                ],
            )

    def get_weekly_plan(self, week_start: str) -> dict[str, Any] | None:
        with get_connection(self.db_path) as connection:
            plan_row = connection.execute(
                "SELECT * FROM weekly_plans WHERE week_start = ?",
                (week_start,),
            ).fetchone()
            block_rows = connection.execute(
                "SELECT * FROM weekly_focus_blocks WHERE week_start = ? ORDER BY id ASC",
                (week_start,),
            ).fetchall()
        if not plan_row:
            return None
        return {**dict(plan_row), "focus_blocks": [dict(row) for row in block_rows]}

    def list_recent_weekly_plans(self, limit: int = 6) -> list[dict[str, Any]]:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                "SELECT * FROM weekly_plans ORDER BY week_start DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def build_weekly_dashboard(self, week_start: str) -> dict[str, Any]:
        weekly_plan = self.get_weekly_plan(week_start)
        recent_checkins = self.get_recent_checkins(limit=14)
        recent_plan_stats = self.get_recent_plan_stats(limit=7)
        latest_insight = self.get_latest_weekly_insight()
        completion_trend = list(reversed(recent_plan_stats))
        focus_blocks = weekly_plan.get("focus_blocks", []) if weekly_plan else []
        return {
            "week_start": week_start,
            "weekly_plan": weekly_plan,
            "recent_weekly_plans": self.list_recent_weekly_plans(limit=6),
            "latest_insight": latest_insight,
            "recent_checkins": recent_checkins,
            "recent_plan_stats": recent_plan_stats,
            "chart_data": {
                "energy_sleep": [
                    {
                        "date": item["checkin_date"],
                        "energy": item["perceived_energy"],
                        "sleep": item["sleep_hours"],
                    }
                    for item in reversed(recent_checkins)
                ],
                "completion_mix": [
                    {
                        "date": item["task_date"],
                        "done": item["done_count"],
                        "incomplete": item["incomplete_count"],
                    }
                    for item in completion_trend
                ],
                "planned_load": [
                    {
                        "weekday": item["weekday"],
                        "load": item["load"],
                        "load_value": load_to_numeric(str(item["load"])),
                    }
                    for item in focus_blocks
                ],
            },
        }

    def build_dashboard(self, target_date: str | None = None) -> dict[str, Any]:
        resolved_date = target_date or today_iso()
        recent_checkins = self.get_recent_checkins(limit=7)
        habits = self.get_habits_with_status(resolved_date)
        latest_plan = self.get_plan(resolved_date)
        latest_reflection = self.get_reflection(resolved_date)
        weekly_insight = self.get_latest_weekly_insight()
        recent_habit_logs = self.get_recent_habit_logs(days=7)
        carryover_context = self.get_daily_carryover_context(resolved_date)

        energy_avg = round(sum(item["perceived_energy"] for item in recent_checkins) / len(recent_checkins), 2) if recent_checkins else 0
        sleep_avg = round(sum(item["sleep_hours"] for item in recent_checkins) / len(recent_checkins), 2) if recent_checkins else 0
        trend = [
            {
                "date": item["checkin_date"],
                "energy": item["perceived_energy"],
                "sleep": item["sleep_hours"],
            }
            for item in reversed(recent_checkins)
        ]
        habit_performance = analyze_habit_performance(recent_habit_logs)
        habit_streaks = self._compute_habit_streaks()

        return {
            "target_date": resolved_date,
            "today_checkin": self.get_checkin(resolved_date),
            "today_plan": latest_plan,
            "today_reflection": latest_reflection,
            "habits": habits,
            "energy_average": energy_avg,
            "sleep_average": sleep_avg,
            "habit_performance": habit_performance,
            "habit_streaks": habit_streaks,
            "trend": trend,
            "carryover_context": carryover_context,
            "chart_data": {
                "trend": trend,
                "habit_streaks": habit_streaks,
                "task_status": self._task_status_breakdown(resolved_date),
            },
            "weekly_insight": weekly_insight,
        }

    def export_snapshot(self) -> dict[str, Any]:
        snapshot: dict[str, Any] = {
            "version": 1,
            "exported_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "tables": {},
        }
        with get_connection(self.db_path) as connection:
            for table in EXPORT_TABLES:
                rows = connection.execute(f"SELECT * FROM {table}").fetchall()
                snapshot["tables"][table] = [dict(row) for row in rows]
        return snapshot

    def export_csv_bundle(self) -> bytes:
        snapshot = self.export_snapshot()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            manifest = io.StringIO()
            manifest_writer = csv.writer(manifest)
            manifest_writer.writerow(["table", "rows"])
            for table, rows in snapshot["tables"].items():
                manifest_writer.writerow([table, len(rows)])
                csv_buffer = io.StringIO()
                if rows:
                    fieldnames = list(rows[0].keys())
                    writer = csv.DictWriter(csv_buffer, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(rows)
                else:
                    csv_buffer.write("empty\n")
                archive.writestr(f"{table}.csv", csv_buffer.getvalue())
            archive.writestr("manifest.csv", manifest.getvalue())
        return buffer.getvalue()

    def import_snapshot(self, snapshot: dict[str, Any]) -> None:
        tables = snapshot.get("tables", {})
        with get_connection(self.db_path) as connection:
            for table in reversed(EXPORT_TABLES):
                connection.execute(f"DELETE FROM {table}")
            for table in EXPORT_TABLES:
                rows = tables.get(table, [])
                if not rows:
                    continue
                columns = list(rows[0].keys())
                placeholders = ", ".join(["?"] * len(columns))
                column_list = ", ".join(columns)
                connection.executemany(
                    f"INSERT INTO {table} ({column_list}) VALUES ({placeholders})",
                    [tuple(row.get(column) for column in columns) for row in rows],
                )

    def _task_status_breakdown(self, target_date: str) -> list[dict[str, Any]]:
        with get_connection(self.db_path) as connection:
            rows = connection.execute(
                """
                SELECT status, COUNT(*) AS total
                FROM tasks
                WHERE task_date = ?
                GROUP BY status
                ORDER BY total DESC
                """,
                (target_date,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_daily_carryover_context(self, target_date: str) -> dict[str, Any]:
        week_start = week_start_for(target_date)
        weekly_plan = self.get_weekly_plan(week_start)
        weekday_name = datetime.fromisoformat(target_date).strftime("%A")
        weekly_focus_blocks = [
            block for block in (weekly_plan.get("focus_blocks", []) if weekly_plan else []) if block.get("weekday") == weekday_name
        ]
        return {
            "weekly_focus_blocks": weekly_focus_blocks,
            "carryover_tasks": self.get_open_tasks_for_week(target_date),
        }

    def _compute_habit_streaks(self) -> list[dict[str, Any]]:
        habits = self.list_habits()
        streaks: list[dict[str, Any]] = []
        with get_connection(self.db_path) as connection:
            for habit in habits:
                rows = connection.execute(
                    """
                    SELECT log_date, completed
                    FROM habit_logs
                    WHERE habit_id = ?
                    ORDER BY log_date DESC
                    LIMIT 30
                    """,
                    (habit["id"],),
                ).fetchall()
                streak = 0
                expected_date = date.today()
                for row in rows:
                    log_date = datetime.fromisoformat(row["log_date"]).date()
                    if log_date != expected_date:
                        break
                    if not bool(row["completed"]):
                        break
                    streak += 1
                    expected_date -= timedelta(days=1)
                streaks.append({"habit": habit["name"], "streak": streak})
        return streaks

    def get_cached_response(self, cache_key: str) -> str | None:
        with get_connection(self.db_path) as connection:
            row = connection.execute(
                "SELECT response_text FROM llm_cache WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
        return row["response_text"] if row else None

    def set_cached_response(self, cache_key: str, response_text: str) -> None:
        with get_connection(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO llm_cache (cache_key, response_text)
                VALUES (?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET response_text=excluded.response_text
                """,
                (cache_key, response_text),
            )
