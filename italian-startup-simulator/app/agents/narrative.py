from __future__ import annotations

import json

from app.agents.prompts import NARRATIVE_REPORTER_PROMPT
from app.services.llm import LLMProvider


class NarrativeReporterAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def report(self, startup: dict[str, object], state: dict[str, object], events: list[dict[str, object]], founder_note: str, ops_note: str, market_note: str, finance_note: str) -> str:
        base = (
            f"{startup.get('startup_name')} is now at cycle {state.get('cycle_number')}. "
            f"Cash is €{float(state.get('cash', 0)):,.0f}, runway is {state.get('runway_months')} months, and traction is {state.get('traction_score')}. "
            f"The current mood is shaped by {events[0]['title'] if events else 'steady pressure'} in the Italian operating context."
        )
        llm_text = self.llm.generate(
            NARRATIVE_REPORTER_PROMPT,
            json.dumps({
                "startup": startup,
                "state": state,
                "events": events,
                "founder_note": founder_note,
                "ops_note": ops_note,
                "market_note": market_note,
                "finance_note": finance_note,
            }, ensure_ascii=False, indent=2),
            cache_key=f"narrative:{state.get('cycle_number',0)}:{int(float(state.get('cash',0)))}",
        )
        return llm_text.strip() if llm_text else base
