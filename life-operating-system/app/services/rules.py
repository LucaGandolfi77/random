from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta
from statistics import mean
from typing import Iterable

from app.schemas import PlanResult, TaskDraft, WeeklyBlockDraft, WeeklyPlanResult

CATEGORY_KEYWORDS = {
    "deep": ("write", "design", "study", "research", "build", "code", "draft", "plan"),
    "admin": ("email", "inbox", "admin", "expense", "book", "schedule", "organize"),
    "routine": ("call", "meeting", "review", "update", "errand", "check"),
    "recovery": ("walk", "rest", "stretch", "nap", "journal", "reset", "breathe"),
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def infer_category(title: str) -> str:
    lowered = title.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return "deep" if len(title.split()) > 3 else "admin"


def parse_required_tasks(required_tasks_text: str) -> list[dict[str, object]]:
    tasks: list[dict[str, object]] = []
    for raw_line in required_tasks_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = [part.strip() for part in line.split("|")]
        title = parts[0]
        estimated_minutes = 45
        category = infer_category(title)
        if len(parts) >= 2:
            try:
                estimated_minutes = int(parts[1])
            except ValueError:
                estimated_minutes = 45
        if len(parts) >= 3 and parts[2]:
            category = parts[2].lower()
        tasks.append(
            {
                "title": title,
                "estimated_minutes": max(15, estimated_minutes),
                "category": category,
            }
        )
    return tasks


def compute_energy_score(checkin: dict[str, object], baseline_sleep_hours: float = 7.5, baseline_energy: int = 7) -> float:
    sleep_hours = float(checkin.get("sleep_hours", 0))
    sleep_quality = int(checkin.get("sleep_quality", 5))
    perceived_energy = int(checkin.get("perceived_energy", baseline_energy))
    mood = int(checkin.get("mood", 5))
    stress_level = int(checkin.get("stress_level", 5))

    sleep_ratio = clamp(sleep_hours / max(baseline_sleep_hours, 1), 0.4, 1.15)
    energy_delta = perceived_energy / 10
    mood_delta = mood / 10
    stress_delta = 1 - (stress_level / 10)
    quality_delta = sleep_quality / 10

    score = (sleep_ratio * 32) + (energy_delta * 28) + (mood_delta * 14) + (quality_delta * 14) + (stress_delta * 12)
    return round(clamp(score, 0, 100), 1)


def classify_plan_mode(energy_score: float, sleep_hours: float, stress_level: int, incomplete_ratio: float) -> str:
    if sleep_hours < 5.5 or energy_score < 38:
        return "recovery"
    if energy_score < 55 or stress_level >= 8 or incomplete_ratio > 0.45:
        return "conservative"
    if energy_score >= 78 and incomplete_ratio < 0.25 and sleep_hours >= 7:
        return "ambitious"
    return "balanced"


def compute_incomplete_ratio(recent_plan_stats: Iterable[dict[str, object]]) -> float:
    totals = 0
    incomplete = 0
    for stat in recent_plan_stats:
        totals += int(stat.get("task_count", 0))
        incomplete += int(stat.get("incomplete_count", 0))
    if totals == 0:
        return 0.0
    return round(incomplete / totals, 2)


def _category_priority(category: str) -> float:
    return {
        "deep": 1.0,
        "admin": 0.72,
        "routine": 0.64,
        "recovery": 0.55,
    }.get(category, 0.7)


def expand_task(title: str, estimated_minutes: int, category: str) -> list[TaskDraft]:
    if estimated_minutes <= 90:
        return [
            TaskDraft(
                title=title,
                category=category,
                priority_score=_category_priority(category),
                estimated_minutes=estimated_minutes,
                reason="Required task from daily input.",
            )
        ]

    first_chunk = min(60, estimated_minutes)
    second_chunk = estimated_minutes - first_chunk
    chunks = [
        TaskDraft(
            title=f"{title} — focus block",
            category=category,
            priority_score=_category_priority(category),
            estimated_minutes=first_chunk,
            reason="Large task split into a realistic first block.",
        )
    ]
    if second_chunk > 0:
        chunks.append(
            TaskDraft(
                title=f"{title} — follow-up",
                category="admin" if category == "deep" else category,
                priority_score=max(0.45, _category_priority(category) - 0.12),
                estimated_minutes=second_chunk,
                reason="Follow-up kept visible without overloading the day.",
            )
        )
    return chunks


def _default_focus_tasks(checkin: dict[str, object], plan_mode: str) -> list[TaskDraft]:
    focus_text = str(checkin.get("focus_text") or "Protect one meaningful outcome")
    context_label = str(checkin.get("context_label") or "default")
    default_tasks = [
        TaskDraft(
            title=f"Clarify success criteria for: {focus_text}",
            category="deep" if plan_mode in {"balanced", "ambitious"} else "admin",
            priority_score=0.9,
            estimated_minutes=30,
            reason=f"Starter task aligned to today's context ({context_label}).",
        )
    ]
    if plan_mode == "recovery":
        default_tasks.append(
            TaskDraft(
                title="Low-friction recovery block",
                category="recovery",
                priority_score=0.7,
                estimated_minutes=20,
                reason="Recovery mode adds explicit energy protection.",
            )
        )
    return default_tasks


def build_rule_based_plan(
    checkin: dict[str, object],
    baseline_sleep_hours: float,
    baseline_energy: int,
    recent_plan_stats: list[dict[str, object]],
    weekly_focus_blocks: list[dict[str, object]] | None = None,
    carryover_tasks: list[dict[str, object]] | None = None,
) -> PlanResult:
    energy_score = compute_energy_score(checkin, baseline_sleep_hours, baseline_energy)
    incomplete_ratio = compute_incomplete_ratio(recent_plan_stats)
    plan_mode = classify_plan_mode(
        energy_score,
        float(checkin.get("sleep_hours", 0)),
        int(checkin.get("stress_level", 5)),
        incomplete_ratio,
    )

    parsed_tasks = parse_required_tasks(str(checkin.get("required_tasks_text") or ""))
    task_drafts: list[TaskDraft] = []

    weekday_name = datetime.fromisoformat(str(checkin.get("checkin_date"))).strftime("%A")
    matching_weekly_blocks = [
        block for block in (weekly_focus_blocks or []) if str(block.get("weekday")) == weekday_name
    ]

    if matching_weekly_blocks:
        for block in matching_weekly_blocks:
            load = str(block.get("load", "moderate"))
            estimated_minutes = 70 if load == "heavy" else 45 if load == "moderate" else 25
            category = "deep" if load in {"heavy", "moderate"} else "routine"
            task_drafts.append(
                TaskDraft(
                    title=f"Weekly carry-over focus: {block.get('objective')}",
                    category=category,
                    priority_score=0.96 if load == "heavy" else 0.84,
                    estimated_minutes=estimated_minutes,
                    is_protected=True,
                    reason=f"Pulled from the weekly focus block for {weekday_name.lower()}.",
                )
            )

    for carryover in carryover_tasks or []:
        title = str(carryover.get("title") or "Carry-over task")
        task_drafts.append(
            TaskDraft(
                title=f"Carry-over: {title}",
                category=str(carryover.get("category") or infer_category(title)),
                priority_score=min(1.0, float(carryover.get("priority_score") or 0.75) + 0.08),
                estimated_minutes=min(60, int(carryover.get("estimated_minutes") or 30)),
                is_protected=True,
                reason="Open task carried from earlier in the current week.",
            )
        )

    for parsed in parsed_tasks:
        task_drafts.extend(
            expand_task(
                title=str(parsed["title"]),
                estimated_minutes=int(parsed["estimated_minutes"]),
                category=str(parsed["category"]),
            )
        )

    if not task_drafts:
        task_drafts.extend(_default_focus_tasks(checkin, plan_mode))

    deduped_tasks: list[TaskDraft] = []
    seen_titles: set[str] = set()
    for task in task_drafts:
        normalized_title = task.title.strip().lower()
        if normalized_title in seen_titles:
            continue
        seen_titles.add(normalized_title)
        deduped_tasks.append(task)
    task_drafts = deduped_tasks

    workload_multiplier = {
        "recovery": 0.45,
        "conservative": 0.6,
        "balanced": 0.78,
        "ambitious": 0.92,
    }[plan_mode]
    weekly_load = matching_weekly_blocks[0].get("load", "moderate") if matching_weekly_blocks else "moderate"
    weekly_load_multiplier = {
        "light": 0.74,
        "moderate": 1.0,
        "heavy": 1.14,
    }.get(str(weekly_load), 1.0)
    plan_mode_cap = {
        "recovery": 0.52,
        "conservative": 0.7,
        "balanced": 0.9,
        "ambitious": 0.98,
    }[plan_mode]
    available_minutes = int(checkin.get("available_minutes", 240))
    target_minutes = max(60, int(available_minutes * workload_multiplier * weekly_load_multiplier))
    target_minutes = min(target_minutes, int(available_minutes * plan_mode_cap))
    if incomplete_ratio > 0.35:
        target_minutes = int(target_minutes * 0.85)

    protected_slots = 2 if plan_mode in {"recovery", "conservative"} else 1
    ordered_tasks = sorted(
        task_drafts,
        key=lambda task: (
            (task.category in {"recovery", "routine"}, task.category == "admin", task.category != "deep") if str(weekly_load) == "heavy"
            else (task.category == "deep", task.category == "admin", task.category == "recovery") if str(weekly_load) == "light"
            else (task.category != "deep" if plan_mode == "ambitious" else task.category == "deep", False, False),
            -task.priority_score,
            task.estimated_minutes,
        ),
    )

    final_tasks: list[TaskDraft] = []
    consumed = 0
    for index, task in enumerate(ordered_tasks):
        if consumed + task.estimated_minutes > target_minutes and final_tasks:
            continue
        final_tasks.append(
            task.model_copy(update={
                "is_protected": index < protected_slots,
                "reason": task.reason or "Selected by rules-first planner.",
            })
        )
        consumed += task.estimated_minutes

    has_recovery = any(task.category == "recovery" for task in final_tasks)
    if plan_mode == "recovery" and not has_recovery:
        final_tasks.append(
            TaskDraft(
                title="Recovery reset: walk, water, stretch, no-screen pause",
                category="recovery",
                priority_score=0.75,
                estimated_minutes=20,
                is_protected=True,
                reason="Low sleep or low energy requires an explicit recovery block.",
            )
        )
    elif plan_mode == "conservative" and Counter(task.category for task in final_tasks)["admin"] == 0:
        final_tasks.append(
            TaskDraft(
                title="Admin reset to reduce mental drag",
                category="admin",
                priority_score=0.6,
                estimated_minutes=20,
                reason="A small admin task creates progress without cognitive overload.",
            )
        )

    summary = {
        "recovery": "Today is a protect-and-stabilize day. Keep only the essential outcomes and preserve energy.",
        "conservative": "Today favors a narrower plan: protect the must-do work, reduce deep work, and keep momentum sustainable.",
        "balanced": "Today supports a realistic mix of focused work, admin, and maintenance without overload.",
        "ambitious": "Today supports a deep-work-forward plan. Use the window well, but keep a buffer for context switching.",
    }[plan_mode]
    weekly_load_note = {
        "light": f"The weekly plan marks {weekday_name} as a lighter-load day, so suggested minutes are intentionally compressed.",
        "moderate": f"The weekly plan treats {weekday_name} as a moderate-load day, so suggested minutes stay near the normal range.",
        "heavy": f"The weekly plan marks {weekday_name} as a heavier-load day, so the planner keeps more usable minutes available for meaningful work.",
    }[str(weekly_load)]
    summary = f"{summary} {weekly_load_note}"

    coach_message = {
        "recovery": "Lower the bar, not your standards. Protect one or two essential outputs and add recovery on purpose.",
        "conservative": "Aim for completion density, not task volume. A short clean list will outperform an aspirational one.",
        "balanced": "You have enough energy for meaningful progress. Anchor the day around one substantial block and a clean finish.",
        "ambitious": "Energy is supportive today. Front-load the most cognitively demanding task before shallow work expands.",
    }[plan_mode]

    return PlanResult(
        plan_mode=plan_mode,
        energy_score=energy_score,
        summary=summary,
        coach_message=coach_message,
        tasks=final_tasks,
    )


def parse_text_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def historical_weekday_energy_patterns(recent_checkins: list[dict[str, object]]) -> dict[str, float]:
    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    weekday_scores: dict[str, list[float]] = {weekday: [] for weekday in weekdays}
    for item in recent_checkins:
        checkin_date = item.get("checkin_date")
        if not checkin_date:
            continue
        try:
            weekday = datetime.fromisoformat(str(checkin_date)).strftime("%A")
        except ValueError:
            continue
        if weekday not in weekday_scores:
            continue
        energy = float(item.get("perceived_energy", 0))
        sleep = float(item.get("sleep_hours", 0))
        mood = float(item.get("mood", 6))
        stress = float(item.get("stress_level", 4))
        score = (energy * 0.55) + (sleep * 0.25) + (mood * 0.15) + ((10 - stress) * 0.05)
        weekday_scores[weekday].append(score)

    return {
        weekday: round(mean(scores), 2) if scores else 0.0
        for weekday, scores in weekday_scores.items()
    }


def build_weekly_plan(
    week_start: str,
    weekly_theme: str,
    top_priorities_text: str,
    known_constraints_text: str,
    focus_areas_text: str,
    non_negotiables_text: str,
    recent_checkins: list[dict[str, object]],
    recent_plan_stats: list[dict[str, object]],
) -> WeeklyPlanResult:
    priorities = parse_text_lines(top_priorities_text)
    constraints = parse_text_lines(known_constraints_text)
    focus_areas = parse_text_lines(focus_areas_text)
    non_negotiables = parse_text_lines(non_negotiables_text)

    avg_sleep = rolling_average([float(item["sleep_hours"]) for item in recent_checkins])
    avg_energy = rolling_average([float(item["perceived_energy"]) for item in recent_checkins])
    incomplete_ratio = compute_incomplete_ratio(recent_plan_stats)
    tension_level = "high" if incomplete_ratio > 0.4 or avg_sleep < 6.4 else "normal"
    weekday_pattern_scores = historical_weekday_energy_patterns(recent_checkins)

    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    source_items = priorities or focus_areas or ["Protect maintenance work", "One strategic outcome", "Recovery buffer"]
    ranked_weekdays = sorted(
        weekdays,
        key=lambda weekday: (weekday_pattern_scores.get(weekday, 0.0), -weekdays.index(weekday)),
        reverse=True,
    )
    deep_focus_count = min(len(priorities) if priorities else 1, 3 if tension_level == "normal" and avg_energy >= 6.5 else 2)
    deep_focus_days = ranked_weekdays[:deep_focus_count]
    recovery_days = ranked_weekdays[-2:] if tension_level == "high" else [ranked_weekdays[-1]]
    deep_focus_assignments = {
        weekday: priorities[index]
        for index, weekday in enumerate(deep_focus_days)
        if index < len(priorities)
    }
    secondary_items = focus_areas or priorities[deep_focus_count:] or ["Maintenance and follow-through", "Admin compression", "Recovery buffer"]

    focus_blocks: list[WeeklyBlockDraft] = []
    for index, weekday in enumerate(weekdays):
        item = deep_focus_assignments.get(weekday, secondary_items[index % len(secondary_items)])
        if index == 4 and non_negotiables:
            item = non_negotiables[0]

        pattern_score = weekday_pattern_scores.get(weekday, 0.0)
        if weekday in deep_focus_days:
            block_label = "Deep focus"
            load = "heavy" if pattern_score >= 6.6 and avg_sleep >= 6.5 else "moderate"
        elif weekday in recovery_days:
            block_label = "Recovery-protected execution" if tension_level == "high" else "Stabilize and review"
            load = "light"
        else:
            block_label = "Execution"
            load = "moderate"

        focus_blocks.append(
            WeeklyBlockDraft(
                weekday=weekday,
                block_label=block_label,
                objective=item,
                load=load,
            )
        )

    if not weekly_theme.strip():
        weekly_theme = priorities[0] if priorities else "Protect energy while moving the highest-leverage priority"

    summary = (
        f"This week is about {weekly_theme}. Keep the scope narrow, front-load the highest leverage work early, "
        f"and preserve at least one lighter block before fatigue compounds."
    )
    if any(score > 0 for score in weekday_pattern_scores.values()):
        summary += f" Based on your recent energy patterns, the best deep-work windows are {', '.join(deep_focus_days)}."
    risk_note = (
        "Recent carry-over risk is elevated. Limit new commitments and define what can be intentionally deferred."
        if incomplete_ratio > 0.4
        else "Main risk is fragmentation. Batch shallow work and avoid scattering the week across too many fronts."
    )
    recovery_note = (
        "Recovery needs protection this week: lower Wednesday load, preserve shutdowns, and avoid treating Friday as catch-up overflow."
        if avg_sleep < 6.5 or avg_energy < 5.8
        else "Recovery profile is acceptable. Keep one lighter buffer block so the week does not become cumulative overload."
    )

    if constraints:
        summary += f" Known constraints: {', '.join(constraints[:3])}."

    return WeeklyPlanResult(
        week_start=week_start,
        weekly_theme=weekly_theme,
        summary=summary,
        risk_note=risk_note,
        recovery_note=recovery_note,
        focus_blocks=focus_blocks,
    )


def analyze_habit_performance(habit_logs: list[dict[str, object]]) -> dict[str, object]:
    if not habit_logs:
        return {
            "completion_rate": 0.0,
            "missed_days": 0,
            "signal": "No data yet. Start with a minimum viable version of each habit.",
        }

    completion_rate = round(mean(1 if bool(log["completed"]) else 0 for log in habit_logs) * 100, 1)
    missed_days = sum(1 for log in habit_logs if not bool(log["completed"]))
    if completion_rate >= 80:
        signal = "Habit system is stable. Keep the habit small enough to remain automatic."
    elif completion_rate >= 55:
        signal = "Consistency is mixed. Shrink the habit on busy days to protect the streak."
    else:
        signal = "Current habit setup has too much friction. Reduce scope or attach it to an existing routine."
    return {
        "completion_rate": completion_rate,
        "missed_days": missed_days,
        "signal": signal,
    }


def summarize_recent_reflection_tone(reflections: list[dict[str, object]]) -> str:
    if not reflections:
        return "neutral"
    tones = Counter(str(item.get("tone", "neutral")) for item in reflections)
    return tones.most_common(1)[0][0]


def week_start_for(day_value: str) -> str:
    day_date = datetime.fromisoformat(day_value).date()
    monday = day_date - timedelta(days=day_date.weekday())
    return monday.isoformat()


def rolling_average(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(mean(values), 2)


def load_to_numeric(load: str) -> int:
    return {"light": 1, "moderate": 2, "heavy": 3}.get(load, 2)


def today_iso() -> str:
    return date.today().isoformat()
