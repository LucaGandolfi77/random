from pathlib import Path
import io
import zipfile

from app.schemas import DailyCheckinInput
from app.schemas import WeeklyPlanningInput
from app.services.memory import MemoryService
from app.services.rules import build_rule_based_plan, build_weekly_plan


def test_weekly_plan_builds_focus_blocks():
    plan = build_weekly_plan(
        week_start="2026-05-04",
        weekly_theme="Protect energy while shipping",
        top_priorities_text="Ship onboarding polish\nClose proposal",
        known_constraints_text="Demo Wednesday 14:00",
        focus_areas_text="Product\nSales",
        non_negotiables_text="Evening shutdown twice",
        recent_checkins=[
            {"sleep_hours": 6.0, "perceived_energy": 5},
            {"sleep_hours": 6.2, "perceived_energy": 6},
        ],
        recent_plan_stats=[{"task_count": 6, "incomplete_count": 3}],
    )
    assert len(plan.focus_blocks) == 5
    assert plan.focus_blocks[0].weekday == "Monday"
    assert "risk" not in plan.summary.lower()


def test_weekly_plan_allocates_deep_work_to_historically_strong_days():
    plan = build_weekly_plan(
        week_start="2026-05-04",
        weekly_theme="Protect strategic output",
        top_priorities_text="Ship onboarding polish\nClose proposal\nDesign retention test",
        known_constraints_text="Team sync Wednesday 15:00",
        focus_areas_text="Product\nSales\nResearch",
        non_negotiables_text="Friday shutdown review",
        recent_checkins=[
            {"checkin_date": "2026-04-20", "sleep_hours": 6.0, "perceived_energy": 5, "mood": 6, "stress_level": 5},
            {"checkin_date": "2026-04-21", "sleep_hours": 7.4, "perceived_energy": 8, "mood": 7, "stress_level": 4},
            {"checkin_date": "2026-04-22", "sleep_hours": 5.9, "perceived_energy": 4, "mood": 5, "stress_level": 7},
            {"checkin_date": "2026-04-23", "sleep_hours": 7.6, "perceived_energy": 9, "mood": 8, "stress_level": 3},
            {"checkin_date": "2026-04-27", "sleep_hours": 6.1, "perceived_energy": 5, "mood": 6, "stress_level": 5},
            {"checkin_date": "2026-04-28", "sleep_hours": 7.2, "perceived_energy": 8, "mood": 7, "stress_level": 4},
            {"checkin_date": "2026-04-29", "sleep_hours": 6.0, "perceived_energy": 4, "mood": 5, "stress_level": 7},
            {"checkin_date": "2026-04-30", "sleep_hours": 7.5, "perceived_energy": 9, "mood": 8, "stress_level": 3},
        ],
        recent_plan_stats=[{"task_count": 8, "incomplete_count": 2}],
    )

    deep_days = [block.weekday for block in plan.focus_blocks if block.block_label == "Deep focus"]
    assert "Tuesday" in deep_days
    assert "Thursday" in deep_days
    assert "best deep-work windows are Tuesday, Thursday" in plan.summary or "best deep-work windows are Thursday, Tuesday" in plan.summary


def test_memory_export_import_roundtrip(tmp_path: Path):
    source = MemoryService(tmp_path / "source.db")
    source.bootstrap_defaults()
    payload = WeeklyPlanningInput(
        week_start="2026-05-04",
        weekly_theme="Calm shipping",
        top_priorities_text="Ship feature\nRecover sleep",
        known_constraints_text="Travel Friday",
        focus_areas_text="Product\nRecovery",
        non_negotiables_text="No late-night work",
    )
    plan = build_weekly_plan(
        week_start=payload.week_start,
        weekly_theme=payload.weekly_theme,
        top_priorities_text=payload.top_priorities_text,
        known_constraints_text=payload.known_constraints_text,
        focus_areas_text=payload.focus_areas_text,
        non_negotiables_text=payload.non_negotiables_text,
        recent_checkins=[],
        recent_plan_stats=[],
    )
    source.save_weekly_plan(payload, plan)

    snapshot = source.export_snapshot()

    target = MemoryService(tmp_path / "target.db")
    target.bootstrap_defaults()
    target.import_snapshot(snapshot)

    imported = target.get_weekly_plan("2026-05-04")
    assert imported is not None
    assert imported["weekly_theme"] == "Calm shipping"
    assert len(imported["focus_blocks"]) == 5


def test_daily_plan_includes_weekly_carryover_and_open_tasks(tmp_path: Path):
    memory = MemoryService(tmp_path / "carryover.db")
    memory.bootstrap_defaults()
    weekly_payload = WeeklyPlanningInput(
        week_start="2026-05-04",
        weekly_theme="Ship carefully",
        top_priorities_text="Close proposal\nFinish onboarding polish",
        known_constraints_text="",
        focus_areas_text="",
        non_negotiables_text="",
    )
    weekly_plan = build_weekly_plan(
        week_start=weekly_payload.week_start,
        weekly_theme=weekly_payload.weekly_theme,
        top_priorities_text=weekly_payload.top_priorities_text,
        known_constraints_text=weekly_payload.known_constraints_text,
        focus_areas_text=weekly_payload.focus_areas_text,
        non_negotiables_text=weekly_payload.non_negotiables_text,
        recent_checkins=[],
        recent_plan_stats=[],
    )
    memory.save_weekly_plan(weekly_payload, weekly_plan)

    monday_checkin = DailyCheckinInput(
        checkin_date="2026-05-05",
        sleep_hours=7.0,
        sleep_quality=7,
        perceived_energy=7,
        mood=7,
        stress_level=4,
        context_label="Office",
        available_minutes=360,
        focus_text="Proposal",
        constraints_text="",
        required_tasks_text="Draft proposal | 60 | deep",
    )
    memory.save_daily_checkin(monday_checkin)
    monday_plan = build_rule_based_plan(
        checkin=memory.get_checkin("2026-05-05"),
        baseline_sleep_hours=7.5,
        baseline_energy=7,
        recent_plan_stats=[],
        weekly_focus_blocks=memory.get_daily_carryover_context("2026-05-05")["weekly_focus_blocks"],
        carryover_tasks=[],
    )
    memory.save_daily_plan("2026-05-05", monday_plan)
    saved_plan = memory.get_plan("2026-05-05")
    carry_task_id = saved_plan["tasks"][0]["id"]
    memory.update_task_status(carry_task_id, "moved")

    tuesday_checkin = DailyCheckinInput(
        checkin_date="2026-05-06",
        sleep_hours=6.8,
        sleep_quality=7,
        perceived_energy=6,
        mood=6,
        stress_level=5,
        context_label="Office",
        available_minutes=360,
        focus_text="Onboarding",
        constraints_text="",
        required_tasks_text="",
    )
    memory.save_daily_checkin(tuesday_checkin)
    carryover_context = memory.get_daily_carryover_context("2026-05-06")
    tuesday_plan = build_rule_based_plan(
        checkin=memory.get_checkin("2026-05-06"),
        baseline_sleep_hours=7.5,
        baseline_energy=7,
        recent_plan_stats=memory.get_recent_plan_stats(limit=5),
        weekly_focus_blocks=carryover_context["weekly_focus_blocks"],
        carryover_tasks=carryover_context["carryover_tasks"],
    )

    titles = [task.title for task in tuesday_plan.tasks]
    assert any(title.startswith("Carry-over:") for title in titles)
    assert any(title.startswith("Weekly carry-over focus:") for title in titles)


def test_weekly_load_rebalances_suggested_minutes():
    base_checkin = {
        "checkin_date": "2026-05-05",
        "sleep_hours": 7.2,
        "sleep_quality": 7,
        "perceived_energy": 7,
        "mood": 7,
        "stress_level": 4,
        "available_minutes": 480,
        "context_label": "Office",
        "focus_text": "Ship the proposal",
        "required_tasks_text": "Write proposal draft | 90 | deep\nReview roadmap | 75 | deep\nSend follow-ups | 30 | admin\nUpdate CRM | 30 | admin\nPlan next sprint | 60 | deep\nInbox reset | 25 | admin",
    }

    heavy_plan = build_rule_based_plan(
        checkin=base_checkin,
        baseline_sleep_hours=7.5,
        baseline_energy=7,
        recent_plan_stats=[],
        weekly_focus_blocks=[{"weekday": "Tuesday", "objective": "Push strategic work", "load": "heavy"}],
        carryover_tasks=[],
    )
    light_plan = build_rule_based_plan(
        checkin=base_checkin,
        baseline_sleep_hours=7.5,
        baseline_energy=7,
        recent_plan_stats=[],
        weekly_focus_blocks=[{"weekday": "Tuesday", "objective": "Protect recovery", "load": "light"}],
        carryover_tasks=[],
    )

    assert sum(task.estimated_minutes for task in heavy_plan.tasks) > sum(task.estimated_minutes for task in light_plan.tasks)
    assert "heavier-load day" in heavy_plan.summary
    assert "lighter-load day" in light_plan.summary


def test_csv_bundle_export_contains_manifest_and_tables(tmp_path: Path):
    memory = MemoryService(tmp_path / "csv.db")
    memory.bootstrap_defaults()
    bundle = memory.export_csv_bundle()
    archive = zipfile.ZipFile(io.BytesIO(bundle))
    names = archive.namelist()
    assert "manifest.csv" in names
    assert "habits.csv" in names
