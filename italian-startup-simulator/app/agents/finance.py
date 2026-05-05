from __future__ import annotations

import json

from app.agents.prompts import FINANCE_AGENT_PROMPT
from app.services.llm import LLMProvider


class FinanceAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def summarize(self, finance_state: dict[str, object], simulation_state: dict[str, object]) -> str:
        runway = float(finance_state.get("runway_months", 0.0))
        rules_text = (
            "Runway is critically short. The company needs either immediate revenue or burn reduction."
            if runway < 4
            else "Runway is limited but manageable if execution remains disciplined."
            if runway < 9
            else "Runway is acceptable for now, but delayed receivables can still hurt."
        )
        llm_text = self.llm.generate(
            FINANCE_AGENT_PROMPT,
            json.dumps({"finance_state": finance_state, "simulation_state": simulation_state}, ensure_ascii=False, indent=2),
            cache_key=f"finance:{simulation_state.get('cycle_number',0)}:{int(runway*10)}",
        )
        return llm_text.strip() if llm_text else rules_text
