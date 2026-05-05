from __future__ import annotations

import json

from app.agents.prompts import WEEKLY_PLANNER_SYSTEM_PROMPT
from app.schemas import WeeklyPlanResult, WeeklyPlanningInput
from app.services.llm import LLMProvider
from app.services.rules import build_weekly_plan


class WeeklyPlannerAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def plan(
        self,
        payload: WeeklyPlanningInput,
        recent_checkins: list[dict[str, object]],
        recent_plan_stats: list[dict[str, object]],
    ) -> WeeklyPlanResult:
        rule_plan = build_weekly_plan(
            week_start=payload.week_start,
            weekly_theme=payload.weekly_theme,
            top_priorities_text=payload.top_priorities_text,
            known_constraints_text=payload.known_constraints_text,
            focus_areas_text=payload.focus_areas_text,
            non_negotiables_text=payload.non_negotiables_text,
            recent_checkins=recent_checkins,
            recent_plan_stats=recent_plan_stats,
        )
        llm_summary = self.llm.generate(
            WEEKLY_PLANNER_SYSTEM_PROMPT,
            json.dumps(
                {
                    "input": payload.model_dump(),
                    "summary": rule_plan.summary,
                    "risk_note": rule_plan.risk_note,
                    "recovery_note": rule_plan.recovery_note,
                    "focus_blocks": [block.model_dump() for block in rule_plan.focus_blocks],
                },
                ensure_ascii=False,
                indent=2,
            ),
            cache_key=f"weekly-plan:{payload.week_start}:{hash(payload.top_priorities_text)}:{hash(payload.known_constraints_text)}",
        )
        if llm_summary:
            return rule_plan.model_copy(update={"summary": llm_summary.strip()})
        return rule_plan
