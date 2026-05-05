from __future__ import annotations

import json

from app.agents.prompts import STRATEGY_AGENT_PROMPT
from app.schemas import StrategyMemo
from app.services.llm import LLMProvider


class StrategyAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def advise(self, startup: dict[str, object], state: dict[str, object], options: list[dict[str, str]]) -> StrategyMemo:
        recommendation = options[0]["label"] if options else "Reduce complexity and protect cash"
        memo = StrategyMemo(
            headline="Italian operating reality requires narrow focus",
            recommendation=recommendation,
            confidence="medium",
        )
        llm_text = self.llm.generate(
            STRATEGY_AGENT_PROMPT,
            json.dumps({"startup": startup, "state": state, "options": options}, ensure_ascii=False, indent=2),
            cache_key=f"strategy:{state.get('cycle_number', 0)}:{int(float(state.get('survival_probability',0)))}",
        )
        if llm_text:
            return StrategyMemo(headline="Strategic recommendation", recommendation=llm_text.strip(), confidence=memo.confidence)
        return memo
