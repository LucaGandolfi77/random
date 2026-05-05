from app.services.rules import build_rule_based_plan, compute_energy_score


def test_compute_energy_score_penalizes_low_sleep_and_stress():
    score = compute_energy_score(
        {
            "sleep_hours": 5.0,
            "sleep_quality": 4,
            "perceived_energy": 4,
            "mood": 5,
            "stress_level": 8,
        },
        baseline_sleep_hours=7.5,
        baseline_energy=7,
    )
    assert score < 50


def test_plan_adaptation_moves_to_recovery_when_sleep_is_low():
    plan = build_rule_based_plan(
        checkin={
            "checkin_date": "2026-05-05",
            "sleep_hours": 5.0,
            "sleep_quality": 4,
            "perceived_energy": 4,
            "mood": 5,
            "stress_level": 8,
            "available_minutes": 360,
            "context_label": "Home",
            "focus_text": "Ship a draft",
            "required_tasks_text": "Write chapter draft | 120 | deep\nReply to invoices | 20 | admin",
        },
        baseline_sleep_hours=7.5,
        baseline_energy=7,
        recent_plan_stats=[{"task_count": 4, "incomplete_count": 2}],
    )
    assert plan.plan_mode == "recovery"
    assert any(task.category == "recovery" for task in plan.tasks)
    assert sum(task.estimated_minutes for task in plan.tasks) < 260
