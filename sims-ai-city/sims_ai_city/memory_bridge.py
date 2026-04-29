"""Bridge layer between the life simulation and the memory_agents package."""

from __future__ import annotations

import json
import os
import random
from typing import Any

from pydantic import BaseModel, Field

from memory_agents import Agent, MemoryConfig, OpenRouterConfig, SQLiteMemoryStore

from sims_ai_city.config import SimulationConfig
from sims_ai_city.heuristics import LocalStoryClient
from sims_ai_city.models import Character, LifeEvent, MemoryRecord, Relationship, WorldState


ALLOWED_MEMORY_CATEGORIES = {"fact", "preference", "event", "summary", "note"}


class MindDecision(BaseModel):
    """Structured decision payload returned by each character mind."""

    text: str
    action: str
    tone: str
    memory_summary: str
    gossip_payload: str | None = None
    reaction_hint: str
    target_impression_delta: float = Field(default=0.0, ge=-1.0, le=1.0)


class CharacterMind:
    """A memory-enabled mind bound to a single resident."""

    def __init__(
        self,
        *,
        character: Character,
        config: SimulationConfig,
        store: SQLiteMemoryStore,
        rng: random.Random,
    ) -> None:
        self.character_id = character.id
        self.config = config
        self.rng = rng
        client = None if _should_use_openrouter(config) else LocalStoryClient(seed=config.random_seed)
        self.agent = Agent(
            name=character.full_name,
            system_prompt=build_character_system_prompt(character),
            llm=OpenRouterConfig(
                api_key_env="OPENROUTER_API_KEY",
                model=config.model,
                fallback_model=config.fallback_model,
                temperature=0.7,
                max_tokens=800,
            ),
            memory=MemoryConfig(short_term_messages=10, long_term_top_k=5, auto_store=True),
            store=store,
            client=client,
        )

    def plan_interaction(
        self,
        *,
        actor: Character,
        target: Character,
        relationship: Relationship,
        location: dict[str, Any],
        possible_actions: list[str],
        incident: str | None,
        world: WorldState,
    ) -> MindDecision:
        """Ask the character mind to choose a social move."""

        self.agent.system_prompt = build_character_system_prompt(actor)
        payload = {
            "task": "plan_interaction",
            "day_index": world.day_index,
            "actor_id": actor.id,
            "target_id": target.id,
            "actor": {
                "first_name": actor.first_name,
                "family_background": actor.family_background,
                "mood": actor.mood,
                "traits": actor.traits.model_dump(mode="json"),
            },
            "target": {
                "first_name": target.first_name,
                "family_background": target.family_background,
                "mood": target.mood,
                "traits": target.traits.model_dump(mode="json"),
            },
            "relationship": relationship.model_dump(mode="json"),
            "location": location,
            "possible_actions": possible_actions,
            "incident": incident,
            "active_story_hooks": world.active_story_hooks,
        }
        response = self.agent.ask(json.dumps(payload, ensure_ascii=False), session_id=self.character_id, response_model=MindDecision)
        decision = response.data
        if isinstance(decision, MindDecision):
            return decision
        return MindDecision.model_validate(decision)

    def remember_event(self, *, event: LifeEvent, about_character_id: str | None, summary: str, category: str, intensity: float, tags: list[str]) -> MemoryRecord:
        """Store a simulation event in the character's long-term memory."""

        normalized_category = _normalize_memory_category(category)
        self.agent.remember(
            summary,
            session_id=self.character_id,
            category=normalized_category,
            importance=intensity,
            tags=tags,
        )
        return MemoryRecord(
            character_id=self.character_id,
            about_character_id=about_character_id,
            summary=summary,
            category=normalized_category,
            intensity=intensity,
            created_day_index=event.day_index,
            tags=tags,
        )


class TownMindService:
    """Manage all resident minds and their shared long-term memory database."""

    def __init__(self, config: SimulationConfig, rng: random.Random) -> None:
        self.config = config
        self.rng = rng
        self.store = SQLiteMemoryStore(config.memory_database_path)
        self._minds: dict[str, CharacterMind] = {}

    def ensure_minds(self, world: WorldState) -> None:
        """Create any missing character minds for current residents."""

        for character in world.characters.values():
            if character.id not in self._minds:
                self._minds[character.id] = CharacterMind(character=character, config=self.config, store=self.store, rng=self.rng)

    def plan_interaction(
        self,
        *,
        actor: Character,
        target: Character,
        relationship: Relationship,
        location: dict[str, Any],
        possible_actions: list[str],
        incident: str | None,
        world: WorldState,
    ) -> MindDecision:
        """Retrieve a structured social plan from one resident's mind."""

        self.ensure_minds(world)
        return self._minds[actor.id].plan_interaction(
            actor=actor,
            target=target,
            relationship=relationship,
            location=location,
            possible_actions=possible_actions,
            incident=incident,
            world=world,
        )

    def remember_social_event(self, *, world: WorldState, event: LifeEvent, actor: Character, target: Character, decision: MindDecision) -> None:
        """Store mirrored memories for both sides of a social event."""

        self.ensure_minds(world)
        actor_summary = decision.memory_summary
        target_summary = f"{actor.first_name} involved me in a {decision.action.replace('_', ' ')} episode at {event.location_id or 'town'}."
        actor_record = self._minds[actor.id].remember_event(
            event=event,
            about_character_id=target.id,
            summary=actor_summary,
            category=_memory_category_for_action(decision.action),
            intensity=min(1.0, 0.55 + abs(decision.target_impression_delta)),
            tags=[decision.action, target.first_name.lower()],
        )
        target_record = self._minds[target.id].remember_event(
            event=event,
            about_character_id=actor.id,
            summary=target_summary,
            category=_memory_category_for_action(decision.action),
            intensity=min(1.0, 0.50 + abs(decision.target_impression_delta)),
            tags=[decision.action, actor.first_name.lower()],
        )
        world.memory_records.extend([actor_record, target_record])
        actor.notable_memories = _trim_notable_memories(actor.notable_memories + [actor_record.summary])
        target.notable_memories = _trim_notable_memories(target.notable_memories + [target_record.summary])

    def remember_major_event(self, *, world: WorldState, event: LifeEvent, summary_by_character: dict[str, str], category: str, tags: list[str], intensity: float = 0.75) -> None:
        """Store a milestone memory for all named participants."""

        self.ensure_minds(world)
        for character_id, summary in summary_by_character.items():
            if character_id not in self._minds:
                continue
            record = self._minds[character_id].remember_event(
                event=event,
                about_character_id=None,
                summary=summary,
                category=category,
                intensity=intensity,
                tags=tags,
            )
            world.memory_records.append(record)
            world.characters[character_id].notable_memories = _trim_notable_memories(world.characters[character_id].notable_memories + [summary])


def build_character_system_prompt(character: Character) -> str:
    """Build the system prompt used by a resident mind."""

    return (
        f"You are {character.full_name}, a resident of Mosswhistle. "
        f"Your temperament is {character.traits.temperament}. "
        f"Your social style is {character.traits.social_style}. "
        f"You care about {', '.join(character.traits.values) or 'chaos and kindness'}. "
        f"Your hobbies include {', '.join(character.hobbies) or 'staring at pigeons dramatically'}. "
        f"Your weird habits include {', '.join(character.weird_habits) or 'inventing harmless rituals'}. "
        f"Speak and think with playful emotional intensity. Prefer memorable, funny, socially consequential choices over bland ones."
    )


def _should_use_openrouter(config: SimulationConfig) -> bool:
    return config.use_openrouter and bool(os.getenv("OPENROUTER_API_KEY"))


def _memory_category_for_action(action: str) -> str:
    if action in {"flirt", "confess", "proposal", "argue", "soup_feud", "gift", "gossip"}:
        return "event"
    return "note"


def _normalize_memory_category(category: str) -> str:
    if category in ALLOWED_MEMORY_CATEGORIES:
        return category
    return "event"


def _trim_notable_memories(memories: list[str]) -> list[str]:
    return memories[-6:]
