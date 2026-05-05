from __future__ import annotations

import json

from app.agents.prompts import OPERATIONS_AGENT_PROMPT
from app.services.llm import LLMProvider


class OperationsAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def summarize(self, startup: dict[str, object], state: dict[str, object], event: dict[str, object] | None) -> str:
        rules_text = (
            "Operational drag is becoming a real tax on speed. Expect invoicing, contracts, or grant paperwork to slow execution."
            if float(state.get("bureaucracy_pressure", 0)) > 6.5
            else "Operations are still manageable, but administrative drag in Italy remains a background cost."
        )
        llm_text = self.llm.generate(
            OPERATIONS_AGENT_PROMPT,
            json.dumps({"startup": startup, "state": state, "event": event}, ensure_ascii=False, indent=2),
            cache_key=f"ops:{state.get('cycle_number', 0)}:{int(float(state.get('bureaucracy_pressure',0))*10)}",
        )
        return llm_text.strip() if llm_text else rules_text
