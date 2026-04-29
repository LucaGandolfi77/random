"""Local heuristic mind logic used when OpenRouter is disabled or unavailable."""

from __future__ import annotations

import json
import random
from typing import Any

from pydantic import BaseModel

from memory_agents import ClientResult, RunMetadata, UsageStats

POSITIVE_TOKENS = {
    "friend",
    "gift",
    "wedding",
    "romance",
    "kiss",
    "forgave",
    "laugh",
    "promise",
    "baby",
}
NEGATIVE_TOKENS = {
    "betrayal",
    "grudge",
    "jealous",
    "argument",
    "awkward",
    "feud",
    "insult",
    "suspicious",
    "stormed",
}


class LocalStoryClient:
    """A drop-in client compatible with memory_agents.Agent for offline simulations."""

    def __init__(self, seed: int = 1) -> None:
        self.seed = seed

    def chat(
        self,
        messages: list[Any],
        response_model: type[BaseModel] | None = None,
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> ClientResult[Any]:
        """Produce a structured local response from a prompt payload."""

        _ = (temperature, max_tokens)
        system_prompt = str(messages[0].content if messages else "")
        user_content = str(messages[-1].content if messages else "{}")
        payload = _safe_json_load(user_content)
        rng = random.Random(f"{self.seed}:{payload.get('day_index', 0)}:{payload.get('actor_id', 'nobody')}:{payload.get('target_id', 'nobody')}")

        data = self._plan_interaction(payload, system_prompt, rng)
        parsed = response_model.model_validate(data) if response_model is not None else data
        return ClientResult(
            text=data["text"],
            parsed=parsed,
            metadata=RunMetadata(
                model=model or "local-story-client",
                fallback_used=False,
                structured_output=response_model is not None,
                usage=UsageStats(prompt_tokens=0, completion_tokens=0, total_tokens=0),
                raw_response=json.dumps(data, ensure_ascii=False),
            ),
        )

    def _plan_interaction(self, payload: dict[str, Any], system_prompt: str, rng: random.Random) -> dict[str, Any]:
        actor = payload.get("actor", {})
        target = payload.get("target", {})
        relationship = payload.get("relationship", {})
        possible_actions = list(payload.get("possible_actions", [])) or ["chat"]
        incident = payload.get("incident")
        location = payload.get("location", {})
        positive_bias, negative_bias = _memory_bias(system_prompt)

        scores: dict[str, float] = {}
        for action in possible_actions:
            romance = float(relationship.get("romance", 0.0))
            friendship = float(relationship.get("friendship", 0.0))
            resentment = float(relationship.get("resentment", 0.0))
            trust = float(relationship.get("trust", 0.0))
            spark = float(relationship.get("spark", 0.0))

            score = rng.uniform(0.01, 0.18)
            if action == "chat":
                score += 0.25 + friendship * 0.2
            elif action == "gossip":
                score += 0.18 + float(location.get("gossip_bonus", 0.0)) * 0.25
                if incident:
                    score += 0.12
            elif action == "gift":
                score += 0.12 + friendship * 0.16 + positive_bias * 0.05
            elif action == "flirt":
                score += romance * 0.55 + spark * 0.35 + positive_bias * 0.08 + float(location.get("romance_bonus", 0.0)) * 0.2
            elif action == "confess":
                score += romance * 0.48 + trust * 0.22 + positive_bias * 0.08
            elif action == "proposal":
                score += romance * 0.62 + trust * 0.25 - resentment * 0.4
            elif action == "argue":
                score += resentment * 0.55 + negative_bias * 0.08 + float(location.get("drama_bonus", 0.0)) * 0.18
            elif action == "soup_feud":
                score += resentment * 0.4 + negative_bias * 0.05
                if "soup" in actor.get("family_background", "").lower() or "soup" in target.get("family_background", "").lower():
                    score += 0.2
            elif action == "reconcile":
                score += max(resentment * 0.3 + trust * 0.18, 0.05)
            elif action == "awkward_family_meeting":
                score += 0.22 + resentment * 0.14

            scores[action] = score

        action = max(scores, key=scores.get)
        tone = _tone_for_action(action, positive_bias, negative_bias)
        text = _line_for_action(action, actor.get("first_name", "Someone"), target.get("first_name", "someone"), location.get("name", "somewhere"), incident, rng)
        memory_summary = _memory_summary_for_action(action, actor.get("first_name", "Someone"), target.get("first_name", "someone"), location.get("name", "somewhere"))
        reaction_hint = _reaction_hint(action, target.get("first_name", "someone"), rng)
        impression_delta = _impression_delta(action)

        return {
            "text": text,
            "action": action,
            "tone": tone,
            "memory_summary": memory_summary,
            "gossip_payload": incident if action == "gossip" and incident else None,
            "reaction_hint": reaction_hint,
            "target_impression_delta": impression_delta,
        }


def _safe_json_load(text: str) -> dict[str, Any]:
    try:
        loaded = json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}
    return loaded if isinstance(loaded, dict) else {"payload": loaded}


def _memory_bias(system_prompt: str) -> tuple[int, int]:
    lowered = system_prompt.lower()
    positive = sum(token in lowered for token in POSITIVE_TOKENS)
    negative = sum(token in lowered for token in NEGATIVE_TOKENS)
    return positive, negative


def _tone_for_action(action: str, positive_bias: int, negative_bias: int) -> str:
    if action in {"flirt", "confess", "proposal"}:
        return "breathlessly sincere" if positive_bias >= negative_bias else "alarmingly vulnerable"
    if action in {"argue", "soup_feud"}:
        return "furiously theatrical"
    if action == "reconcile":
        return "carefully hopeful"
    if action == "gossip":
        return "delightedly dangerous"
    return "warmly eccentric"


def _line_for_action(action: str, actor_name: str, target_name: str, location_name: str, incident: str | None, rng: random.Random) -> str:
    if action == "chat":
        return f"{actor_name} chats with {target_name} at {location_name}, somehow turning small talk into a confession about weather and destiny."
    if action == "gossip":
        gossip = incident or "a rumor about ornamental turnips"
        return f"{actor_name} leans toward {target_name} at {location_name} and shares {gossip}, with the gravity of a royal decree."
    if action == "gift":
        return f"{actor_name} presents {target_name} with a peace offering at {location_name}: heartfelt, odd, and probably wrapped in ribbon."
    if action == "flirt":
        return f"{actor_name} flirts with {target_name} at {location_name} using eye contact, wit, and an alarming amount of confidence."
    if action == "confess":
        return f"{actor_name} blurts out a romantic confession to {target_name} at {location_name} and immediately looks brave about it."
    if action == "proposal":
        return f"{actor_name} proposes to {target_name} at {location_name} with trembling sincerity and at least one oddly specific vow about soup."
    if action == "argue":
        return f"{actor_name} and {target_name} argue at {location_name} with the intense dignity of people who absolutely plan to discuss this for years."
    if action == "soup_feud":
        garnish = rng.choice(["parsley ethics", "broth honor", "ladle etiquette"])
        return f"{actor_name} launches a full soup feud against {target_name} at {location_name}, citing grave concerns about {garnish}."
    if action == "reconcile":
        return f"{actor_name} attempts a careful reconciliation with {target_name} at {location_name}, speaking softly as if the air itself might gossip."
    return f"{actor_name} and {target_name} survive an awkward family meeting at {location_name} and nobody entirely wins."


def _memory_summary_for_action(action: str, actor_name: str, target_name: str, location_name: str) -> str:
    if action in {"flirt", "confess", "proposal"}:
        return f"{actor_name} made a romantic move toward {target_name} at {location_name}."
    if action in {"argue", "soup_feud"}:
        return f"{actor_name} clashed with {target_name} at {location_name}."
    if action == "reconcile":
        return f"{actor_name} tried to repair things with {target_name} at {location_name}."
    if action == "gossip":
        return f"{actor_name} exchanged spicy gossip with {target_name} at {location_name}."
    if action == "gift":
        return f"{actor_name} gave {target_name} a memorable gift at {location_name}."
    return f"{actor_name} spent meaningful time with {target_name} at {location_name}."


def _reaction_hint(action: str, target_name: str, rng: random.Random) -> str:
    reactions = {
        "chat": f"{target_name} leaves feeling oddly seen.",
        "gossip": f"{target_name} promises nothing and absolutely spreads it later.",
        "gift": f"{target_name} looks touched and suspicious in equal measure.",
        "flirt": f"{target_name} blushes, laughs, or both at once.",
        "confess": f"{target_name} goes very still, then startlingly sincere.",
        "proposal": f"{target_name} makes the kind of face people remember for decades.",
        "argue": f"{target_name} responds with impressive indignation.",
        "soup_feud": f"{target_name} defends their broth philosophy with legendary spite.",
        "reconcile": f"{target_name} softens by one careful inch.",
        "awkward_family_meeting": f"{target_name} endures the encounter with heroic jaw tension.",
    }
    return reactions.get(action, f"{target_name} reacts with complicated eyebrows and destiny." )


def _impression_delta(action: str) -> float:
    return {
        "chat": 0.05,
        "gossip": 0.04,
        "gift": 0.09,
        "flirt": 0.08,
        "confess": 0.12,
        "proposal": 0.15,
        "argue": -0.11,
        "soup_feud": -0.15,
        "reconcile": 0.10,
        "awkward_family_meeting": -0.02,
    }.get(action, 0.0)
