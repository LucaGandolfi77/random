from __future__ import annotations

import json

from app.agents.prompts import FOUNDER_AGENT_PROMPT
from app.services.llm import LLMProvider


class FounderAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def interpret(self, founder: dict[str, object], state: dict[str, object], recent_events: list[dict[str, object]]) -> tuple[str, float, float]:
        stress = float(state.get("founder_stress", founder.get("stress", 5.0)))
        conviction = float(founder.get("conviction", 7.0))
        discipline = float(founder.get("discipline", 6.0))
        if stress > 7:
            conviction = max(3.0, conviction - 0.35)
            discipline = max(2.5, discipline - 0.25)
        elif float(state.get("traction_score", 0)) > 25:
            conviction = min(9.5, conviction + 0.2)
        note = (
            "The founder is becoming reactive and vulnerable to noisy decisions."
            if stress > 7
            else "The founder still has psychological room to make strategic decisions."
        )
        llm_note = self.llm.generate(
            FOUNDER_AGENT_PROMPT,
            json.dumps({"founder": founder, "state": state, "events": recent_events[-3:]}, ensure_ascii=False, indent=2),
            cache_key=f"founder:{state.get('cycle_number', 0)}:{int(stress*10)}:{int(conviction*10)}",
        )
        return (llm_note.strip() if llm_note else note, round(conviction, 2), round(discipline, 2))
