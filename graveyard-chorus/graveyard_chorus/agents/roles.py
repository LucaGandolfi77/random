from __future__ import annotations

import logging
import random
from dataclasses import dataclass

from pydantic import BaseModel, Field

from ..client import OpenRouterClient
from ..memory import MemoryStore
from ..models import (
    ActionDecision,
    Character,
    ChronicleEntry,
    Epitaph,
    Family,
    LifeEvent,
    MemoryRecord,
    Relationship,
    TownEvent,
    TownState,
)

EMOTIONAL_ACTION_TAGS = {
    "gossip": ["scandal", "rumor", "status"],
    "help": ["mercy", "duty", "kinship"],
    "court": ["love", "desire", "longing"],
    "feud": ["grudge", "pride", "inheritance"],
    "reconcile": ["peace", "memory", "forgiveness"],
    "reveal": ["truth", "confession", "burden"],
    "conceal": ["shame", "fear", "survival"],
    "care": ["family", "aging", "duty"],
    "work": ["labor", "routine", "reputation"],
    "reflect": ["memory", "self", "time"],
}
OCCUPATION_MOTIFS = {
    "midwife": ["linen", "lamplight", "first cries"],
    "miller": ["river-wheel", "flour dust", "wet timber"],
    "schoolteacher": ["chalk", "copybook", "ink-stained fingers"],
    "bartender": ["glass light", "counter wood", "midnight laughter"],
    "nurse": ["vinegar", "bandage", "a hand kept steady"],
    "preacher": ["bell rope", "hymn breath", "winter pews"],
    "dressmaker": ["pins", "hemline", "borrowed silk"],
    "mayor": ["ledger", "seal wax", "public promises"],
    "undertaker": ["spade", "black wool", "quiet hands"],
}
logger = logging.getLogger(__name__)


class EpitaphDraft(BaseModel):
    text: str
    mood: str
    hidden_truths: list[str] = Field(default_factory=list)
    public_contradictions: list[str] = Field(default_factory=list)
    referenced_character_names: list[str] = Field(default_factory=list)
    referenced_event_titles: list[str] = Field(default_factory=list)


class ChronicleDraft(BaseModel):
    title: str
    summary: str
    mood: str


@dataclass(slots=True)
class NarrativeAgent:
    name: str
    memory_store: MemoryStore
    client: OpenRouterClient | None = None

    def llm_available(self, state: TownState) -> bool:
        return bool(self.client and self.client.enabled and state.config.llm_enabled and not state.config.offline_mode)


class CharacterLifeAgent(NarrativeAgent):
    def decide(self, state: TownState, character: Character, season: str, rng: random.Random) -> ActionDecision:
        memories = self.memory_store.retrieve(
            state,
            character,
            tags=[season, *character.desires[:2], *character.fears[:1]],
            participant_ids=character.relationships.keys(),
            limit=5,
        )
        strongest_rival = self._strongest_by(character, state, key="rivalry")
        closest_confidant = self._strongest_by(character, state, key="trust")
        warmest_tie = self._strongest_by(character, state, key="affinity")
        potential_suitor = self._romantic_target(character, state)
        secret = character.primary_secret()
        support_memory_ids = [memory.id for memory in memories]

        if character.life_stage in {"child", "adolescent"}:
            target = closest_confidant.target_id if closest_confidant else (character.parents[0] if character.parents else None)
            return ActionDecision(
                actor_id=character.id,
                kind="care" if target else "reflect",
                target_id=target,
                intent="Lean on kin before the year can harden.",
                urgency=0.48,
                supporting_memory_ids=support_memory_ids,
                tags=["family", season],
            )

        if secret and secret.public_risk >= 0.7 and any(tag in state.gossip_themes for tag in secret.tags):
            return ActionDecision(
                actor_id=character.id,
                kind="conceal",
                intent="Keep a dangerous truth tucked under ordinary gestures.",
                urgency=0.82,
                supporting_memory_ids=support_memory_ids,
                tags=[*secret.tags[:2], season],
            )

        if secret and character.age >= 60 and rng.random() < 0.28:
            return ActionDecision(
                actor_id=character.id,
                kind="reveal",
                target_id=(closest_confidant.target_id if closest_confidant else None),
                intent="Confess before the grave turns witness on its own.",
                urgency=0.77,
                supporting_memory_ids=support_memory_ids,
                tags=[*secret.tags[:2], "confession"],
            )

        if strongest_rival and strongest_rival.rivalry >= 0.55:
            return ActionDecision(
                actor_id=character.id,
                kind="feud" if rng.random() < 0.56 else "gossip",
                target_id=strongest_rival.target_id,
                intent="Answer an old slight with fresh theater.",
                urgency=0.66,
                supporting_memory_ids=support_memory_ids,
                tags=["feud", season],
            )

        if potential_suitor and ("love" in character.desires or "belonging" in character.desires):
            return ActionDecision(
                actor_id=character.id,
                kind="court",
                target_id=potential_suitor.id,
                intent="Risk tenderness in a town that inventories every glance.",
                urgency=0.69,
                supporting_memory_ids=support_memory_ids,
                tags=["courtship", season],
            )

        if warmest_tie and ("duty" in character.virtues or character.age >= 50):
            return ActionDecision(
                actor_id=character.id,
                kind="help",
                target_id=warmest_tie.target_id,
                intent="Offer practical mercy before pride can interrupt.",
                urgency=0.61,
                supporting_memory_ids=support_memory_ids,
                tags=["mutual_aid", season],
            )

        if closest_confidant and closest_confidant.rivalry <= 0.1 and rng.random() < 0.22:
            return ActionDecision(
                actor_id=character.id,
                kind="reconcile",
                target_id=closest_confidant.target_id,
                intent="Say something gentle before the habit passes.",
                urgency=0.44,
                supporting_memory_ids=support_memory_ids,
                tags=["reconciliation", season],
            )

        return ActionDecision(
            actor_id=character.id,
            kind="work" if rng.random() < 0.6 else "reflect",
            intent="Continue the ordinary performance that keeps a life stitched together.",
            urgency=0.33,
            supporting_memory_ids=support_memory_ids,
            tags=[season, "routine"],
        )

    def _strongest_by(self, character: Character, state: TownState, *, key: str) -> Relationship | None:
        relations = [
            relation
            for relation in character.relationships.values()
            if relation.target_id in state.characters and state.characters[relation.target_id].alive
        ]
        if not relations:
            return None
        return sorted(relations, key=lambda relation: getattr(relation, key), reverse=True)[0]

    def _romantic_target(self, character: Character, state: TownState) -> Character | None:
        if not character.is_available_for_courtship() or character.spouses:
            return None
        candidates = []
        for other in state.alive_characters():
            if other.id == character.id or not other.is_available_for_courtship():
                continue
            if other.family_id == character.family_id or other.id in character.parents or other.id in character.siblings:
                continue
            relationship = character.relationships.get(other.id)
            affinity = relationship.affinity if relationship else 0.0
            intimacy = relationship.intimacy if relationship else 0.0
            class_bonus = 0.08 if other.class_status == character.class_status else -0.04
            score = affinity + intimacy + class_bonus
            candidates.append((score, other))
        candidates.sort(key=lambda item: item[0], reverse=True)
        return candidates[0][1] if candidates and candidates[0][0] >= 0.12 else None


class RelationshipCuratorAgent(NarrativeAgent):
    def apply_decision(self, state: TownState, decision: ActionDecision, season: str) -> LifeEvent:
        actor = state.characters[decision.actor_id]
        target = state.characters.get(decision.target_id) if decision.target_id else None
        relation = self._link(actor, target) if target else None
        reverse = self._link(target, actor) if target else None

        title, description, public = self._describe(actor, target, decision)
        impact = 0.28 + decision.urgency * 0.5
        event = LifeEvent(
            year=state.current_year,
            season=season,
            event_type=decision.kind,
            title=title,
            description=description,
            participant_ids=[actor.id, *( [target.id] if target else [])],
            district=state.households.get(actor.household_id).district if actor.household_id in state.households else None,
            public=public,
            impact=impact,
            tags=sorted({*decision.tags, *EMOTIONAL_ACTION_TAGS[decision.kind]}),
        )

        if decision.kind == "help" and relation and reverse:
            relation.affinity += 0.18
            relation.trust += 0.2
            reverse.affinity += 0.14
            reverse.trust += 0.18
            actor.reputation.warmth += 0.06
            target.reputation.trustworthiness += 0.02
        elif decision.kind == "gossip" and relation and reverse:
            relation.rivalry += 0.14
            relation.trust -= 0.12
            reverse.trust -= 0.09
            actor.reputation.suspected_for = self._push_unique(actor.reputation.suspected_for, "loose talk")
            if target:
                target.reputation.scandal += 0.07
                target.reputation.gossip_topics[target.surname.lower()] = target.reputation.gossip_topics.get(target.surname.lower(), 0.0) + 0.12
            state.gossip_themes = self._push_unique(state.gossip_themes, decision.tags[0] if decision.tags else "rumor")
        elif decision.kind == "court" and relation and reverse:
            relation.kind = "lover"
            reverse.kind = "lover"
            relation.affinity += 0.16
            reverse.affinity += 0.16
            relation.intimacy += 0.22
            reverse.intimacy += 0.22
            actor.lovers = self._push_unique(actor.lovers, target.id)
            if target:
                target.lovers = self._push_unique(target.lovers, actor.id)
        elif decision.kind == "reconcile" and relation and reverse:
            relation.rivalry = max(0.0, relation.rivalry - 0.18)
            reverse.rivalry = max(0.0, reverse.rivalry - 0.16)
            relation.trust += 0.08
            reverse.trust += 0.08
        elif decision.kind == "feud" and relation and reverse:
            relation.rivalry += 0.24
            reverse.rivalry += 0.2
            relation.trust -= 0.14
            reverse.trust -= 0.11
            actor.reputation.scandal += 0.04
            if target:
                target.reputation.scandal += 0.05
        elif decision.kind == "reveal":
            secret = actor.primary_secret()
            if secret is not None:
                secret.revealed = True
                secret.revealed_year = state.current_year
                event.secret_ids.append(secret.id)
                actor.reputation.public_summary = f"{actor.given_name} finally said aloud what the town had only guessed."
                actor.reputation.scandal += 0.12
                event.tags = self._push_unique(event.tags, "confession")
        elif decision.kind == "conceal":
            actor.reputation.public_summary = f"{actor.given_name} looked composed while hiding a strain no one measured correctly."
            actor.last_reflection = decision.intent
        elif decision.kind == "care" and relation and reverse:
            relation.trust += 0.1
            reverse.trust += 0.1
            relation.dependency += 0.08
        else:
            actor.reputation.trustworthiness += 0.01

        state.life_events.append(event)
        self.memory_store.imprint_life_event(state, event)
        return event

    def decay_relationships(self, state: TownState) -> None:
        for character in state.characters.values():
            for relation in character.relationships.values():
                relation.affinity *= 1.0 - state.config.relationship_decay * 0.3
                relation.trust *= 1.0 - state.config.relationship_decay * 0.22
                relation.intimacy *= 1.0 - state.config.relationship_decay * 0.18
                relation.rivalry *= 1.0 - state.config.relationship_decay * 0.08

    def _link(self, source: Character | None, target: Character | None) -> Relationship | None:
        if source is None or target is None:
            return None
        if target.id not in source.relationships:
            source.relationships[target.id] = Relationship(
                source_id=source.id,
                target_id=target.id,
                kind="neighbor",
                affinity=0.06 if source.household_id == target.household_id else 0.0,
                trust=0.03,
                public_label="known to each other",
                family_tie=target.id in source.parents + source.children + source.siblings + source.spouses + source.cousins,
            )
        return source.relationships[target.id]

    def _describe(self, actor: Character, target: Character | None, decision: ActionDecision) -> tuple[str, str, bool]:
        if decision.kind == "gossip" and target:
            return (
                f"{actor.full_name} let a rumor walk in public shoes",
                f"{actor.full_name} repeated a sharp version of {target.full_name}'s affairs, and the tale reached the market before noon.",
                True,
            )
        if decision.kind == "help" and target:
            return (
                f"{actor.full_name} carried a burden for {target.full_name}",
                f"{actor.full_name} stepped beside {target.full_name} with practical kindness and made the hard hour look almost ordinary.",
                True,
            )
        if decision.kind == "court" and target:
            return (
                f"{actor.full_name} tested the weather of love",
                f"{actor.full_name} offered {target.full_name} a courtship so careful it sounded at first like conversation.",
                True,
            )
        if decision.kind == "reconcile" and target:
            return (
                f"{actor.full_name} loosened an old knot",
                f"{actor.full_name} spoke to {target.full_name} without armor and made a little peace where habit had expected theatre.",
                True,
            )
        if decision.kind == "feud" and target:
            return (
                f"{actor.full_name} renewed a family bitterness",
                f"{actor.full_name} turned an old grievance against {target.full_name} into a new public scene.",
                True,
            )
        if decision.kind == "reveal":
            if target:
                return (
                    f"{actor.full_name} spoke what should have stayed buried",
                    f"{actor.full_name} told {target.full_name} a truth so long concealed that it changed both of them before supper.",
                    False,
                )
            return (
                f"{actor.full_name} gave a secret a mouth",
                f"{actor.full_name} finally confessed what years of silence had enlarged.",
                True,
            )
        if decision.kind == "conceal":
            return (
                f"{actor.full_name} kept the face the town expected",
                f"{actor.full_name} moved through the day with perfect ordinary manners while protecting something costly and unspoken.",
                False,
            )
        if decision.kind == "care" and target:
            return (
                f"{actor.full_name} kept vigil for kin",
                f"{actor.full_name} spent the season tending {target.full_name}, learning again that devotion is a form of weather.",
                False,
            )
        if decision.kind == "work":
            return (
                f"{actor.full_name} held to daily labor",
                f"{actor.full_name} worked at being necessary, which is the nearest thing some lives come to applause.",
                True,
            )
        return (
            f"{actor.full_name} listened to an inward verdict",
            f"{actor.full_name} spent the season in reflection, revising private beliefs against the evidence of time.",
            False,
        )

    @staticmethod
    def _push_unique(items: list[str], value: str) -> list[str]:
        return items if value in items else [*items, value]


class FamilyChronicleAgent(NarrativeAgent):
    def absorb_life_event(self, state: TownState, event: LifeEvent) -> None:
        impacted_families: dict[str, Family] = {}
        for participant_id in event.participant_ids:
            character = state.characters.get(participant_id)
            if character is None:
                continue
            family = state.families.get(character.family_id)
            if family is not None:
                impacted_families[family.id] = family

        for family in impacted_families.values():
            family.chronicle_notes.append(f"{event.year}: {event.title}.")
            family.collective_memory = family.collective_memory[-state.config.memory_limit :]

        if event.event_type == "feud" and len(impacted_families) >= 2:
            family_list = list(impacted_families.values())
            left, right = family_list[0], family_list[1]
            left.feud_family_ids = self._push_unique(left.feud_family_ids, right.id)
            right.feud_family_ids = self._push_unique(right.feud_family_ids, left.id)

    def register_birth(self, state: TownState, child: Character, parent_ids: list[str]) -> None:
        family = state.families[child.family_id]
        family.member_ids = self._push_unique(family.member_ids, child.id)
        family.chronicle_notes.append(f"{state.current_year}: {child.full_name} was born into the {family.name} branch.")

        for parent_id in parent_ids:
            parent = state.characters[parent_id]
            parent.children = self._push_unique(parent.children, child.id)
            child.parents = self._push_unique(child.parents, parent.id)

        inherited_secret = self._inherit_secret(state, parent_ids)
        if inherited_secret is not None:
            inherited_secret.inherited_by = self._push_unique(inherited_secret.inherited_by, child.id)
            family.inherited_secrets = self._push_unique(family.inherited_secrets, inherited_secret.summary)

    def register_marriage(self, state: TownState, left: Character, right: Character) -> LifeEvent:
        left.spouses = self._push_unique(left.spouses, right.id)
        right.spouses = self._push_unique(right.spouses, left.id)
        relation_left = left.relationships.get(right.id)
        relation_right = right.relationships.get(left.id)
        if relation_left:
            relation_left.kind = "spouse"
            relation_left.intimacy += 0.22
            relation_left.trust += 0.15
        if relation_right:
            relation_right.kind = "spouse"
            relation_right.intimacy += 0.22
            relation_right.trust += 0.15

        left_family = state.families[left.family_id]
        right_family = state.families[right.family_id]
        left_family.allied_family_ids = self._push_unique(left_family.allied_family_ids, right_family.id)
        right_family.allied_family_ids = self._push_unique(right_family.allied_family_ids, left_family.id)
        state.family_alliances = self._push_unique(state.family_alliances, f"{left_family.name}-{right_family.name}")

        event = LifeEvent(
            year=state.current_year,
            season="summer",
            event_type="marriage",
            title=f"{left.full_name} and {right.full_name} married under public scrutiny",
            description=f"{left.full_name} and {right.full_name} married, turning affection into a civic event and family strategy at once.",
            participant_ids=[left.id, right.id],
            district=state.households[left.household_id].district if left.household_id in state.households else None,
            public=True,
            impact=0.74,
            tags=["marriage", "family", "alliance"],
        )
        state.life_events.append(event)
        self.memory_store.imprint_life_event(state, event)
        return event

    def record_death(self, state: TownState, character: Character, *, season: str, cause: str) -> LifeEvent:
        character.alive = False
        character.death_year = state.current_year
        description = f"{character.full_name} died in {season} when {cause}."
        event = LifeEvent(
            year=state.current_year,
            season=season,
            event_type="death",
            title=f"{character.full_name} was carried into town memory",
            description=description,
            participant_ids=[character.id],
            district=state.households[character.household_id].district if character.household_id in state.households else None,
            public=True,
            impact=0.95,
            tags=["death", "memory", character.surname.lower()],
        )
        state.life_events.append(event)
        self.memory_store.imprint_life_event(state, event)
        family = state.families.get(character.family_id)
        if family is not None:
            family.chronicle_notes.append(f"{state.current_year}: {character.full_name} died.")
        return event

    def _inherit_secret(self, state: TownState, parent_ids: list[str]):
        secrets = []
        for parent_id in parent_ids:
            parent = state.characters[parent_id]
            secret = parent.primary_secret()
            if secret is not None and not secret.revealed:
                secrets.append(secret)
        secrets.sort(key=lambda item: item.severity, reverse=True)
        return secrets[0] if secrets else None

    @staticmethod
    def _push_unique(items: list[str], value: str) -> list[str]:
        return items if value in items else [*items, value]


class MemorySummarizerAgent(NarrativeAgent):
    def summarize(self, state: TownState) -> list[MemoryRecord]:
        summaries: list[MemoryRecord] = []
        for character in state.characters.values():
            summary = self.memory_store.summarize_character(
                character,
                current_year=state.current_year,
                memory_limit=state.config.memory_limit,
            )
            if summary is not None:
                summaries.append(summary)
                character.last_reflection = summary.summary
        return summaries


class TownHistorianAgent(NarrativeAgent):
    def compose_year_entry(self, state: TownState, *, year: int, year_events: list[LifeEvent], year_town_events: list[TownEvent]) -> ChronicleEntry:
        deterministic = self._build_deterministic_entry(state, year=year, year_events=year_events, year_town_events=year_town_events)
        if not self.llm_available(state):
            return deterministic

        try:
            draft, model_used = self._llm_draft(
                state,
                year=year,
                year_events=year_events,
                year_town_events=year_town_events,
                deterministic=deterministic,
            )
        except Exception as exc:
            logger.warning("Town historian LLM draft failed | year=%s | error=%s", year, exc)
            return deterministic

        return deterministic.model_copy(
            update={
                "title": draft.title.strip() or deterministic.title,
                "summary": draft.summary.strip() or deterministic.summary,
                "mood": draft.mood.strip() or deterministic.mood,
                "model_used": model_used,
            }
        )

    def _build_deterministic_entry(
        self,
        state: TownState,
        *,
        year: int,
        year_events: list[LifeEvent],
        year_town_events: list[TownEvent],
    ) -> ChronicleEntry:
        public_events = [event for event in year_events if event.public]
        major_titles = [event.title for event in sorted(public_events, key=lambda event: event.impact, reverse=True)[:3]]
        town_titles = [event.title for event in sorted(year_town_events, key=lambda event: event.public_impact, reverse=True)[:2]]
        mood = self._mood(public_events, year_town_events)
        summary_parts = []
        if major_titles:
            summary_parts.append(f"The town kept talking about {', '.join(major_titles)}")
        if town_titles:
            summary_parts.append(f"while {', '.join(town_titles)} reset the public weather")
        if not summary_parts:
            summary_parts.append("Ordinary labor, old gossip, and private griefs made the year look quiet from a distance")
        summary_parts.append(f"In {state.town_name}, even patience left a footprint.")
        return ChronicleEntry(
            year=year,
            title=f"{state.town_name} in {year}",
            summary=". ".join(summary_parts) + ".",
            mood=mood,
            linked_event_ids=[event.id for event in public_events[:4]] + [event.id for event in year_town_events[:2]],
            linked_character_ids=sorted({participant for event in public_events for participant in event.participant_ids})[:8],
            contradictions=[event.title for event in year_events if not event.public][:2],
            model_used=None,
        )

    def _llm_draft(
        self,
        state: TownState,
        *,
        year: int,
        year_events: list[LifeEvent],
        year_town_events: list[TownEvent],
        deterministic: ChronicleEntry,
    ) -> tuple[ChronicleDraft, str]:
        prompt = self._chronicle_prompt(
            state,
            year=year,
            year_events=year_events,
            year_town_events=year_town_events,
            deterministic=deterministic,
        )
        system_prompt = (
            "You are the Town Historian Agent for a literary small-town simulation. "
            "Write English-only annual chronicle prose grounded only in the supplied facts. "
            "Keep it public-facing, concrete, and slightly lyrical. "
            "Do not invent events, names, or secrets beyond the supplied material."
        )
        draft, result = self.client.complete_json(
            system_prompt=system_prompt,
            user_prompt=prompt,
            schema_model=ChronicleDraft,
            model=state.config.primary_model,
            stats_label="chronicle",
            temperature=0.4,
            max_tokens=520,
        )
        return draft, result.model_used

    def _chronicle_prompt(
        self,
        state: TownState,
        *,
        year: int,
        year_events: list[LifeEvent],
        year_town_events: list[TownEvent],
        deterministic: ChronicleEntry,
    ) -> str:
        public_events = [event for event in year_events if event.public]
        event_lines = [
            self._format_public_life_event(state, event) for event in sorted(public_events, key=lambda item: item.impact, reverse=True)[:6]
        ]
        town_lines = [
            self._format_town_event(event) for event in sorted(year_town_events, key=lambda item: item.public_impact, reverse=True)[:4]
        ]
        focus_names = [state.characters[character_id].full_name for character_id in deterministic.linked_character_ids if character_id in state.characters]
        rumor_lines = deterministic.contradictions or ["No explicit contradiction logged this year."]
        sections = [
            f"Town: {state.town_name}",
            f"Year: {year}",
            f"Baseline mood: {deterministic.mood}",
            f"Focus characters: {', '.join(focus_names) if focus_names else 'Not named publicly.'}",
            "Public life events:",
        ]
        sections.extend(event_lines or ["- The public record stayed sparse and ordinary."])
        sections.extend(
            [
            "Town-wide events:",
            ]
        )
        sections.extend(town_lines or ["- No major civic rupture was recorded."])
        sections.extend(
            [
            "Rumors or tensions under the year:",
            ]
        )
        sections.extend([f"- {line}" for line in rumor_lines])
        sections.extend(
            [
            "Return JSON with title, summary, and mood.",
            "title: 4 to 10 words.",
            "summary: 2 to 4 sentences, English only, grounded in the facts above.",
            "mood: one evocative adjective or short adjective phrase.",
            ]
        )
        return "\n".join(sections)

    @staticmethod
    def _format_public_life_event(state: TownState, event: LifeEvent) -> str:
        names = [state.characters[character_id].full_name for character_id in event.participant_ids if character_id in state.characters][:4]
        named = ", ".join(names) if names else "No named participants"
        return f"- {event.title} | participants: {named} | detail: {event.description}"

    @staticmethod
    def _format_town_event(event: TownEvent) -> str:
        institution = f" | institution: {event.institution}" if event.institution else ""
        return f"- {event.title}{institution} | detail: {event.description}"

    @staticmethod
    def _mood(year_events: list[LifeEvent], year_town_events: list[TownEvent]) -> str:
        scandal_score = sum(event.impact for event in year_events if "scandal" in event.tags or event.event_type in {"gossip", "feud", "reveal"})
        tenderness_score = sum(event.impact for event in year_events if event.event_type in {"help", "care", "marriage"})
        disaster_score = sum(event.public_impact for event in year_town_events if "disaster" in event.tags or "epidemic" in event.tags)
        if disaster_score > 0.8:
            return "beleaguered"
        if scandal_score > tenderness_score + 0.4:
            return "caustic"
        if tenderness_score > scandal_score:
            return "tender"
        return "restless"


class EpitaphPoetAgent(NarrativeAgent):
    def generate(self, state: TownState, character: Character) -> Epitaph:
        memories = self.memory_store.retrieve(
            state,
            character,
            tags=["death", "love", "family", "secret", character.surname.lower()],
            participant_ids=character.relationships.keys(),
            limit=6,
        )
        if self.llm_available(state):
            try:
                draft, model_used = self._llm_draft(state, character, memories)
                return self._build_from_draft(state, character, draft, model_used)
            except Exception as exc:
                logger.warning(
                    "Epitaph poet LLM draft failed | character=%s | year=%s | error=%s",
                    character.full_name,
                    state.current_year,
                    exc,
                )
        return self._build_deterministic(state, character, memories)

    def _llm_draft(self, state: TownState, character: Character, memories: list[MemoryRecord]) -> tuple[EpitaphDraft, str]:
        prompt = self._epitaph_prompt(state, character, memories)
        system_prompt = (
            "You are the Epitaph Poet Agent for a literary small-town simulation. "
            "Write an original first-person epitaph in English only. "
            "Be lyrical, intimate, ironic, humane, and compressed. "
            "Ground every claim in the provided facts. Do not imitate copyrighted lines."
        )
        draft, result = self.client.complete_json(
            system_prompt=system_prompt,
            user_prompt=prompt,
            schema_model=EpitaphDraft,
            model=state.config.primary_model,
        )
        return draft, result.model_used

    def _build_from_draft(self, state: TownState, character: Character, draft: EpitaphDraft, model_used: str) -> Epitaph:
        name_to_id = {person.full_name: person.id for person in state.characters.values()}
        title_to_id = {event.title: event.id for event in state.life_events}
        return Epitaph(
            character_id=character.id,
            character_name=character.full_name,
            year_written=state.current_year,
            voice=character.poetic_voice,
            text=draft.text.strip(),
            referenced_character_ids=[name_to_id[name] for name in draft.referenced_character_names if name in name_to_id],
            referenced_event_ids=[title_to_id[title] for title in draft.referenced_event_titles if title in title_to_id],
            hidden_truths=draft.hidden_truths,
            public_contradictions=draft.public_contradictions,
            mood=draft.mood,
            actual_model=model_used,
        )

    def _build_deterministic(self, state: TownState, character: Character, memories: list[MemoryRecord]) -> Epitaph:
        motif_pool = OCCUPATION_MOTIFS.get(character.occupation.lower(), ["dust", "weather", "a kept promise"])
        motif = motif_pool[0]
        second_motif = motif_pool[-1]
        secret = character.primary_secret()
        witnesses = [state.characters[memory.participants[0]].full_name for memory in memories if memory.participants and memory.participants[0] in state.characters and memory.participants[0] != character.id]
        witness = witnesses[0] if witnesses else None
        admired = character.reputation.admired_for[0] if character.reputation.admired_for else "steadiness"
        suspected = character.reputation.suspected_for[0] if character.reputation.suspected_for else "nothing they could prove"
        contradiction = f"They praised my {admired}; they were really rewarding how well I concealed {suspected}."
        truth_line = f"The truth is this: {secret.truth}" if secret else "The truth arrived late and had to share a room with pride."
        memory_line = memories[0].summary if memories else f"I worked, loved, and carried my name through {state.town_name} like a borrowed lantern."
        witness_line = f"Ask {witness} what silence cost us." if witness else "No ledger in town learned the price of my silence."
        lines = [
            f"I am {character.full_name}, speaking now from under {motif} and weather.",
            f"They thought they knew me by the work I did as {_with_indefinite_article(character.occupation)}, but my real trade was keeping count of losses.",
            memory_line,
            contradiction,
            truth_line,
            witness_line,
            f"Bury me beside {second_motif}; let the town call that justice if it needs a pretty word.",
        ]
        referenced_characters = sorted({participant for memory in memories for participant in memory.participants if participant != character.id})[:4]
        referenced_events = [memory.source_event_id for memory in memories if memory.source_event_id][:4]
        contradictions = []
        if character.reputation.public_summary:
            contradictions.append(character.reputation.public_summary)
        return Epitaph(
            character_id=character.id,
            character_name=character.full_name,
            year_written=state.current_year,
            voice=character.poetic_voice,
            text="\n".join(lines),
            referenced_character_ids=referenced_characters,
            referenced_event_ids=referenced_events,
            hidden_truths=[secret.truth] if secret else [],
            public_contradictions=contradictions,
            mood="haunted" if secret else "wistful",
            actual_model=None,
        )

    def _epitaph_prompt(self, state: TownState, character: Character, memories: list[MemoryRecord]) -> str:
        secret = character.primary_secret()
        memory_lines = "\n".join(f"- {memory.summary}" for memory in memories) or "- No single memory dominates; the life was ordinary on the surface."
        return f"""
Town: {state.town_name}
Current year: {state.current_year}
Character: {character.full_name}
Occupation: {character.occupation}
Class: {character.class_status}
Private voice: {character.private_voice}
Public voice: {character.public_voice}
Poetic voice: {character.poetic_voice}
Virtues: {', '.join(character.virtues)}
Flaws: {', '.join(character.flaws)}
Desires: {', '.join(character.desires)}
Fears: {', '.join(character.fears)}
Public summary: {character.reputation.public_summary or 'No stable public story.'}
Hidden truth: {secret.truth if secret else 'None confessed.'}
Important memories:
{memory_lines}

Return JSON with these keys only:
- text
- mood
- hidden_truths
- public_contradictions
- referenced_character_names
- referenced_event_titles
""".strip()


class ConsistencyReviewerAgent(NarrativeAgent):
    def review(self, state: TownState, character: Character, epitaph: Epitaph) -> Epitaph:
        epitaph.referenced_character_ids = [
            character_id for character_id in epitaph.referenced_character_ids if character_id in state.characters and character_id != character.id
        ]
        epitaph.referenced_event_ids = [event_id for event_id in epitaph.referenced_event_ids if any(event.id == event_id for event in state.life_events)]
        if not epitaph.hidden_truths and character.primary_secret() is not None:
            epitaph.hidden_truths.append(character.primary_secret().truth)
        if not epitaph.public_contradictions and character.reputation.public_summary:
            epitaph.public_contradictions.append(character.reputation.public_summary)
        if character.full_name not in epitaph.text:
            epitaph.text = f"I am {character.full_name}.\n" + epitaph.text
        return epitaph


def _with_indefinite_article(noun_phrase: str) -> str:
    article = "an" if noun_phrase[:1].lower() in {"a", "e", "i", "o", "u"} else "a"
    return f"{article} {noun_phrase}"