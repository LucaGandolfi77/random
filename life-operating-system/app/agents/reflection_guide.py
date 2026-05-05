from __future__ import annotations

import json

from app.agents.prompts import REFLECTION_GUIDE_SYSTEM_PROMPT
from app.schemas import ReflectionInput
from app.services.llm import LLMProvider
from app.services.rules import summarize_recent_reflection_tone


class ReflectionGuideAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    def build_questions(self, checkin: dict[str, object] | None, plan: dict[str, object] | None) -> list[str]:
        focus_text = checkin.get("focus_text") if checkin else "the most important work"
        mode = plan.get("plan_mode") if plan else "balanced"
        return [
            f"What actually moved {focus_text} forward today?",
            f"Where did the {mode} plan match or miss your real energy?",
            "What should tomorrow's version of you keep, reduce, or protect?",
        ]

    def synthesize(self, payload: ReflectionInput, recent_reflections: list[dict[str, object]]) -> tuple[str, str]:
        combined = " ".join(
            [payload.wins_text.strip(), payload.friction_text.strip(), payload.gratitude_text.strip(), payload.tomorrow_adjustment.strip()]
        ).lower()
        positive_words = sum(word in combined for word in ["good", "done", "calm", "progress", "better", "clear"])
        negative_words = sum(word in combined for word in ["tired", "stuck", "late", "avoid", "overwhelmed", "scattered"])
        tone = "negative" if negative_words > positive_words else "positive" if positive_words > negative_words else summarize_recent_reflection_tone(recent_reflections)
        tone = tone if tone in {"positive", "negative", "neutral"} else "neutral"

        extracted_signal = payload.tomorrow_adjustment.strip() or payload.friction_text.strip() or payload.wins_text.strip() or "Keep tomorrow simpler than your ambition and clearer than your mood."
        llm_text = self.llm.generate(
            REFLECTION_GUIDE_SYSTEM_PROMPT,
            json.dumps(
                {
                    "reflection": payload.model_dump(),
                    "recent_tones": [item.get("tone") for item in recent_reflections],
                    "default_signal": extracted_signal,
                },
                ensure_ascii=False,
                indent=2,
            ),
            cache_key=f"reflection:{payload.reflection_date}:{hash(combined)}",
        )
        if llm_text:
            extracted_signal = llm_text.strip()
        return extracted_signal, tone
