from __future__ import annotations

import json

from app.agents.prompts import ENERGY_COACH_SYSTEM_PROMPT
from app.services.llm import LLMProvider


class EnergyCoachAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def coach(self, checkin: dict[str, object], plan: dict[str, object], recent_reflections: list[dict[str, object]]) -> str:
        sleep_hours = float(checkin.get("sleep_hours", 0))
        stress_level = int(checkin.get("stress_level", 5))
        perceived_energy = int(checkin.get("perceived_energy", 5))

        guidance = []
        if sleep_hours < 6:
            guidance.append("Protect the first two tasks only; defer optional depth until energy proves itself.")
        if stress_level >= 7:
            guidance.append("Use shorter work blocks and insert a deliberate reset before switching contexts.")
        if perceived_energy >= 8:
            guidance.append("Front-load the hardest cognitive block before meetings or admin dilute the window.")
        if not guidance:
            guidance.append("Keep one meaningful deep block, one maintenance task, and leave buffer for recovery.")
        guidance.append("If resistance spikes, reduce the next task to a 10-minute entry version instead of abandoning the plan.")
        rules_text = "\n".join(f"- {item}" for item in guidance[:3])

        llm_text = self.llm.generate(
            ENERGY_COACH_SYSTEM_PROMPT,
            json.dumps(
                {
                    "checkin": checkin,
                    "plan_mode": plan.get("plan_mode"),
                    "energy_score": plan.get("energy_score"),
                    "recent_reflection_tones": [item.get("tone") for item in recent_reflections],
                    "rule_guidance": guidance,
                },
                ensure_ascii=False,
                indent=2,
            ),
            cache_key=f"energy:{checkin['checkin_date']}:{plan.get('plan_mode')}:{int(float(plan.get('energy_score', 0)))}",
        )
        return llm_text.strip() if llm_text else rules_text
