from __future__ import annotations

import json

from app.agents.prompts import MARKET_AGENT_PROMPT
from app.services.llm import LLMProvider


class MarketAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def summarize(self, startup: dict[str, object], state: dict[str, object]) -> str:
        rules_text = (
            "Traction is mostly fragile and still exposed to long Italian sales cycles."
            if float(state.get("traction_score", 0)) < 20
            else "There is emerging signal, but it still needs conversion into stable paying demand."
        )
        llm_text = self.llm.generate(
            MARKET_AGENT_PROMPT,
            json.dumps({"startup": startup, "state": state}, ensure_ascii=False, indent=2),
            cache_key=f"market:{state.get('cycle_number', 0)}:{int(float(state.get('traction_score', 0)))}",
        )
        return llm_text.strip() if llm_text else rules_text
