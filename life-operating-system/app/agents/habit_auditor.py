from __future__ import annotations

import json

from app.agents.prompts import HABIT_AUDITOR_SYSTEM_PROMPT
from app.services.llm import LLMProvider
from app.services.rules import analyze_habit_performance


class HabitAuditorAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def weekly_review(
        self,
        insight_date: str,
        habit_logs: list[dict[str, object]],
        recent_checkins: list[dict[str, object]],
        recent_plan_stats: list[dict[str, object]],
        recent_reflections: list[dict[str, object]],
    ) -> dict[str, str]:
        habit_performance = analyze_habit_performance(habit_logs)
        avg_sleep = round(sum(item["sleep_hours"] for item in recent_checkins) / len(recent_checkins), 2) if recent_checkins else 0
        incomplete_ratio = 0.0
        if recent_plan_stats:
            total = sum(item["task_count"] for item in recent_plan_stats)
            incomplete = sum(item["incomplete_count"] for item in recent_plan_stats)
            incomplete_ratio = round(incomplete / total, 2) if total else 0.0
        negative_reflections = sum(1 for item in recent_reflections if item.get("tone") == "negative")

        summary = (
            f"Habit completion is {habit_performance['completion_rate']}%. "
            f"Average sleep is {avg_sleep} hours and recent incomplete workload ratio is {incomplete_ratio}."
        )
        habit_signal = habit_performance["signal"]
        workload_signal = (
            "Recent plans are too heavy. Reduce planned scope and protect only essential work."
            if incomplete_ratio > 0.4
            else "Workload is mostly sustainable. Keep tasks tightly scoped."
        )
        recovery_signal = (
            "Recovery debt is visible across sleep or evening tone. Add simpler evenings and lighter starts."
            if avg_sleep < 6.5 or negative_reflections >= 2
            else "Recovery profile is acceptable. Maintain a shutdown ritual to keep it stable."
        )

        llm_text = self.llm.generate(
            HABIT_AUDITOR_SYSTEM_PROMPT,
            json.dumps(
                {
                    "date": insight_date,
                    "summary": summary,
                    "habit_signal": habit_signal,
                    "workload_signal": workload_signal,
                    "recovery_signal": recovery_signal,
                    "habit_logs": habit_logs,
                },
                ensure_ascii=False,
                indent=2,
            ),
            cache_key=f"habit-review:{insight_date}:{int(habit_performance['completion_rate'])}:{int(avg_sleep * 10)}:{negative_reflections}",
        )
        if llm_text:
            summary = llm_text.strip()

        return {
            "summary": summary,
            "habit_signal": habit_signal,
            "workload_signal": workload_signal,
            "recovery_signal": recovery_signal,
        }
