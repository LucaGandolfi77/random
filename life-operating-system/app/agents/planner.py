from __future__ import annotations

import json

from app.agents.prompts import PLANNER_SYSTEM_PROMPT
from app.schemas import PlanResult
from app.services.llm import LLMProvider
from app.services.rules import build_rule_based_plan


class PlannerAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def plan(
        self,
        checkin: dict[str, object],
        baseline_sleep_hours: float,
        baseline_energy: int,
        recent_plan_stats: list[dict[str, object]],
        weekly_focus_blocks: list[dict[str, object]] | None = None,
        carryover_tasks: list[dict[str, object]] | None = None,
    ) -> PlanResult:
        rule_plan = build_rule_based_plan(
            checkin,
            baseline_sleep_hours,
            baseline_energy,
            recent_plan_stats,
            weekly_focus_blocks=weekly_focus_blocks,
            carryover_tasks=carryover_tasks,
        )
        llm_summary = self.llm.generate(
            PLANNER_SYSTEM_PROMPT,
            json.dumps(
                {
                    "checkin": checkin,
                    "plan_mode": rule_plan.plan_mode,
                    "energy_score": rule_plan.energy_score,
                    "weekly_focus_blocks": weekly_focus_blocks or [],
                    "carryover_tasks": carryover_tasks or [],
                    "tasks": [task.model_dump() for task in rule_plan.tasks],
                    "summary": rule_plan.summary,
                },
                ensure_ascii=False,
                indent=2,
            ),
            cache_key=f"planner:{checkin['checkin_date']}:{rule_plan.plan_mode}:{int(rule_plan.energy_score)}",
        )
        if llm_summary:
            return rule_plan.model_copy(update={"summary": llm_summary.strip()})
        return rule_plan
