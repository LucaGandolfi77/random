"""Main simulation engine for the generational social sandbox."""

from __future__ import annotations

import random
from typing import Iterable

from sims_ai_city.config import SimulationConfig, load_simulation_environment
from sims_ai_city.memory_bridge import MindDecision, TownMindService
from sims_ai_city.models import AgeStage, Character, Family, LifeEvent, LifeEventType, RelationshipStatus, WorldState
from sims_ai_city.simulation.chronicles import build_year_summary, compose_recent_recap
from sims_ai_city.simulation.clock import SimulationClock, day_of_year
from sims_ai_city.simulation.events import create_family_event, create_social_event
from sims_ai_city.simulation.generator import build_seed_world
from sims_ai_city.simulation.inheritance import create_child_traits
from sims_ai_city.simulation.persistence import SimulationPersistence
from sims_ai_city.simulation.relationships import apply_action_to_relationship, compatibility, daily_relationship_drift, ensure_relationship
from sims_ai_city.simulation.world import choose_daily_location, load_seeded_world, maybe_daily_incident


class SimulationEngine:
    """Orchestrates the city simulation over days, seasons, and years."""

    def __init__(self, config: SimulationConfig, world: WorldState | None = None) -> None:
        env = load_simulation_environment()
        self.config = config.model_copy(update={
            "use_openrouter": config.use_openrouter or str(env.get("SIMS_AI_CITY_USE_OPENROUTER", "false")).lower() == "true",
            "model": str(env.get("SIMS_AI_CITY_MODEL") or config.model),
            "fallback_model": str(env.get("SIMS_AI_CITY_FALLBACK_MODEL") or config.fallback_model),
        })
        self.rng = random.Random(self.config.random_seed)
        self.seed_world = load_seeded_world()
        self.world = world or build_seed_world(self.config)
        self.clock = SimulationClock(self.config)
        self.persistence = SimulationPersistence(self.config)
        self.minds = TownMindService(self.config, self.rng)
        self.minds.ensure_minds(self.world)

    @classmethod
    def create_or_load(cls, config: SimulationConfig) -> "SimulationEngine":
        """Load an existing simulation or create a fresh seeded town."""

        persistence = SimulationPersistence(config)
        if persistence.exists():
            return cls(config=config, world=persistence.load())
        engine = cls(config=config)
        engine.save()
        return engine

    def save(self) -> None:
        """Persist the simulation state and inspector assets."""

        self.persistence.save(self.world)

    def simulate_days(self, days: int) -> list[LifeEvent]:
        """Advance the simulation for a number of days."""

        collected: list[LifeEvent] = []
        for _ in range(days):
            collected.extend(self.step_day())
        return collected

    def step_day(self) -> list[LifeEvent]:
        """Simulate one full day of social chaos."""

        self.minds.ensure_minds(self.world)
        day_events: list[LifeEvent] = []
        location_ids = list(self.world.locations.keys())
        incident = maybe_daily_incident(self.seed_world, self.rng, self.config.daily_major_incident_chance)

        if self.world.current_date.day == 1:
            festival = self._seasonal_festival()
            day_events.append(
                create_family_event(
                    day_index=self.world.day_index,
                    season=self.world.current_date.season,
                    year=self.world.current_date.year,
                    event_type=LifeEventType.FESTIVAL,
                    headline=f"{festival} begins with overconfident sincerity",
                    description=f"The town gathers for {festival}, prepared for joy, drama, and at least one wildly unnecessary hat.",
                    actor_ids=[],
                    family_ids=list(self.world.families.keys()),
                    location_id=choose_daily_location(location_ids, self.world.current_date.season, self.rng),
                )
            )

        for character in self._living_characters():
            if character.fertility_cooldown > 0:
                character.fertility_cooldown -= 1

        interactions = min(self.config.daily_interactions, max(1, len(self._living_characters())))
        for _ in range(interactions):
            actor = self._pick_actor()
            if actor is None:
                break
            target = self._pick_target(actor)
            if target is None:
                continue

            location_id = choose_daily_location(location_ids, self.world.current_date.season, self.rng)
            location = self.world.locations[location_id]
            relationship = ensure_relationship(self.world, actor, target)
            possible_actions = self._possible_actions(actor, target, relationship)
            decision = self.minds.plan_interaction(
                actor=actor,
                target=target,
                relationship=relationship,
                location=location.model_dump(mode="json"),
                possible_actions=possible_actions,
                incident=incident,
                world=self.world,
            )
            deltas = apply_action_to_relationship(
                relationship,
                action=decision.action,
                compatibility_score=compatibility(actor, target),
                location_romance_bonus=location.romance_bonus,
                location_gossip_bonus=location.gossip_bonus,
                location_drama_bonus=location.drama_bonus,
                rng=self.rng,
            )
            relationship.last_interaction_day = self.world.day_index

            event = create_social_event(
                day_index=self.world.day_index,
                season=self.world.current_date.season,
                year=self.world.current_date.year,
                action=decision.action,
                actor=actor,
                target=target,
                location_id=location_id,
                relationship=relationship,
                initiator_line=decision.text,
                target_reaction=decision.reaction_hint,
            )
            event.relationship_changes = {relationship.key: deltas}
            day_events.append(event)
            self.minds.remember_social_event(world=self.world, event=event, actor=actor, target=target, decision=decision)

        day_events.extend(self._resolve_relationship_milestones())
        day_events.extend(self._resolve_births())
        day_events.extend(self._resolve_departures())

        self.world.events.extend(day_events)
        daily_relationship_drift(self.world, self.rng)

        previous_year = self.world.current_date.year
        birthday_events, rolled_year = self.clock.advance(self.world)
        self.world.events.extend(birthday_events)
        day_events.extend(birthday_events)
        if rolled_year:
            summary = build_year_summary(self.world, previous_year)
            self.world.year_summaries.append(summary)
            self.world.last_yearly_recap = compose_recent_recap(self.world.events[-12:])

        if self.world.day_index % self.config.autosave_every_days == 0:
            self.save()
        return day_events

    def inspector_snapshot(self) -> dict[str, object]:
        """Return a compact snapshot for the web inspector."""

        return {
            "town_name": self.world.town_name,
            "town_motto": self.world.town_motto,
            "date": self.world.current_date.label,
            "day_index": self.world.day_index,
            "population": len([character for character in self.world.characters.values() if character.alive]),
            "families": len(self.world.families),
            "recent_events": [event.model_dump(mode="json") for event in self.world.events[-20:]],
            "year_summaries": [summary.model_dump(mode="json") for summary in self.world.year_summaries[-6:]],
            "characters": [
                {
                    **character.model_dump(mode="json"),
                    "full_name": character.full_name,
                }
                for character in sorted(self.world.characters.values(), key=lambda resident: resident.full_name)
            ],
            "relationships": [relationship.model_dump(mode="json") for relationship in self.world.relationships.values()],
            "families_detail": [family.model_dump(mode="json") for family in self.world.families.values()],
            "locations": [location.model_dump(mode="json") for location in self.world.locations.values()],
            "memory_records": [record.model_dump(mode="json") for record in self.world.memory_records[-60:]],
            "last_yearly_recap": self.world.last_yearly_recap,
        }

    def _living_characters(self) -> list[Character]:
        return [character for character in self.world.characters.values() if character.alive]

    def _pick_actor(self) -> Character | None:
        residents = self._living_characters()
        if not residents:
            return None
        weights = [0.8 + character.social_needs + self.rng.random() * 0.4 for character in residents]
        return self.rng.choices(residents, weights=weights, k=1)[0]

    def _pick_target(self, actor: Character) -> Character | None:
        residents = [candidate for candidate in self._living_characters() if candidate.id != actor.id]
        if not residents:
            return None
        weights: list[float] = []
        for candidate in residents:
            relationship = ensure_relationship(self.world, actor, candidate)
            weight = 0.3 + relationship.familiarity + max(relationship.friendship, 0.0) + relationship.spark + relationship.resentment * 0.5
            if actor.spouse_id == candidate.id:
                weight += 0.9
            if actor.family_id and actor.family_id == candidate.family_id:
                weight += 0.35
            weights.append(max(weight, 0.05))
        return self.rng.choices(residents, weights=weights, k=1)[0]

    def _possible_actions(self, actor: Character, target: Character, relationship) -> list[str]:
        actions = ["chat", "gossip", "gift"]

        if actor.age_stage in {AgeStage.ADULT, AgeStage.TEEN} and target.age_stage in {AgeStage.ADULT, AgeStage.TEEN} and actor.family_id != target.family_id:
            actions.extend(["flirt", "confess"])

        if relationship.resentment > 0.22:
            actions.extend(["argue", "soup_feud", "reconcile"])

        if actor.family_id and actor.family_id == target.family_id:
            actions.append("awkward_family_meeting")

        if relationship.status == RelationshipStatus.COURTING and relationship.romance > self.config.marriage_romance_threshold:
            actions.append("proposal")

        if actor.spouse_id == target.id:
            actions.extend(["gift", "gossip", "reconcile"])

        deduped: list[str] = []
        for action in actions:
            if action not in deduped:
                deduped.append(action)
        return deduped

    def _resolve_relationship_milestones(self) -> list[LifeEvent]:
        events: list[LifeEvent] = []
        for relationship in list(self.world.relationships.values()):
            if relationship.status == RelationshipStatus.SPOUSES:
                continue
            actor = self.world.characters.get(relationship.character_a_id)
            target = self.world.characters.get(relationship.character_b_id)
            if not actor or not target or not actor.alive or not target.alive:
                continue
            if actor.age_stage != AgeStage.ADULT or target.age_stage != AgeStage.ADULT:
                continue

            if (
                relationship.romance >= self.config.marriage_romance_threshold
                and relationship.friendship >= self.config.marriage_friendship_threshold
                and relationship.trust >= self.config.child_trust_threshold
                and actor.spouse_id is None
                and target.spouse_id is None
                and self.rng.random() < 0.07
            ):
                actor.spouse_id = target.id
                target.spouse_id = actor.id
                relationship.status = RelationshipStatus.SPOUSES
                family = self._merge_or_create_family(actor, target)
                event = create_family_event(
                    day_index=self.world.day_index,
                    season=self.world.current_date.season,
                    year=self.world.current_date.year,
                    event_type=LifeEventType.MARRIAGE,
                    headline=f"{actor.first_name} and {target.first_name} marry under enormous emotional weather",
                    description=f"{actor.full_name} and {target.full_name} promise lifelong devotion, mutual dramatic support, and sensible soup governance.",
                    actor_ids=[actor.id, target.id],
                    family_ids=[family.id],
                    location_id="garden",
                )
                events.append(event)
                self.minds.remember_major_event(
                    world=self.world,
                    event=event,
                    summary_by_character={
                        actor.id: f"I married {target.full_name} in an atmosphere of suspiciously perfect romance.",
                        target.id: f"I married {actor.full_name} and the whole town nearly applauded itself apart.",
                    },
                    category="marriage",
                    tags=["marriage", actor.first_name.lower(), target.first_name.lower()],
                    intensity=0.95,
                )

            elif relationship.status in {RelationshipStatus.COURTING, RelationshipStatus.SPOUSES} and relationship.resentment > 0.7 and relationship.trust < 0.15:
                relationship.status = RelationshipStatus.EXES
                actor.spouse_id = None if actor.spouse_id == target.id else actor.spouse_id
                target.spouse_id = None if target.spouse_id == actor.id else target.spouse_id
                event = create_family_event(
                    day_index=self.world.day_index,
                    season=self.world.current_date.season,
                    year=self.world.current_date.year,
                    event_type=LifeEventType.BREAKUP,
                    headline=f"{actor.first_name} and {target.first_name} split with theatrical finality",
                    description=f"{actor.full_name} and {target.full_name} separate after accumulating one scandal too many and approximately seven sharp glances.",
                    actor_ids=[actor.id, target.id],
                    family_ids=[value for value in [actor.family_id, target.family_id] if value],
                )
                events.append(event)
        return events

    def _resolve_births(self) -> list[LifeEvent]:
        events: list[LifeEvent] = []
        handled_pairs: set[str] = set()
        for character in self._living_characters():
            spouse_id = character.spouse_id
            if spouse_id is None or character.age_stage != AgeStage.ADULT:
                continue
            pair_key = "::".join(sorted([character.id, spouse_id]))
            if pair_key in handled_pairs:
                continue
            partner = self.world.characters.get(spouse_id)
            if partner is None or not partner.alive or partner.age_stage != AgeStage.ADULT:
                continue
            handled_pairs.add(pair_key)

            relationship = ensure_relationship(self.world, character, partner)
            if (
                relationship.romance < self.config.child_romance_threshold
                or relationship.trust < self.config.child_trust_threshold
                or character.fertility_cooldown > 0
                or partner.fertility_cooldown > 0
                or self.rng.random() > 0.045
            ):
                continue

            child = self._create_child(character, partner)
            self.world.characters[child.id] = child
            family = self.world.families.get(character.family_id or partner.family_id or "")
            if family is None:
                family = self._merge_or_create_family(character, partner)
            family.member_ids.append(child.id)
            child.family_id = family.id
            character.children_ids.append(child.id)
            partner.children_ids.append(child.id)
            character.fertility_cooldown = self.config.childbearing_cooldown_days
            partner.fertility_cooldown = self.config.childbearing_cooldown_days
            self.minds.ensure_minds(self.world)

            event = create_family_event(
                day_index=self.world.day_index,
                season=self.world.current_date.season,
                year=self.world.current_date.year,
                event_type=LifeEventType.BIRTH,
                headline=f"A new child joins the town: {child.full_name}",
                description=f"{character.full_name} and {partner.full_name} welcome {child.full_name}, who already looks capable of starting unusual rumors by age three.",
                actor_ids=[character.id, partner.id, child.id],
                family_ids=[family.id],
                location_id=character.home_location_id,
            )
            events.append(event)
            self.minds.remember_major_event(
                world=self.world,
                event=event,
                summary_by_character={
                    character.id: f"{child.full_name} was born into my gloriously complicated life.",
                    partner.id: f"{child.full_name} arrived with inherited charm and immediate myth potential.",
                },
                category="family",
                tags=["birth", child.first_name.lower()],
                intensity=0.92,
            )

        return events

    def _resolve_departures(self) -> list[LifeEvent]:
        events: list[LifeEvent] = []
        for character in self._living_characters():
            if character.age_stage != AgeStage.ELDER or character.age_years < self.config.elder_departure_age:
                continue
            departure_chance = 0.01 + (character.age_years - self.config.elder_departure_age) * 0.012
            if self.rng.random() > departure_chance:
                continue
            character.alive = False
            if character.spouse_id and character.spouse_id in self.world.characters:
                spouse = self.world.characters[character.spouse_id]
                spouse.spouse_id = None
            event = create_family_event(
                day_index=self.world.day_index,
                season=self.world.current_date.season,
                year=self.world.current_date.year,
                event_type=LifeEventType.PASSING,
                headline=f"{character.full_name} joins the cosmic tea garden",
                description=f"{character.full_name} departs in elder glory, leaving stories, recipes, and at least one unresolved family theory behind.",
                actor_ids=[character.id],
                family_ids=[value for value in [character.family_id] if value],
                location_id=character.home_location_id,
            )
            events.append(event)
        return events

    def _create_child(self, parent_a: Character, parent_b: Character) -> Character:
        family = self.world.families.get(parent_a.family_id or parent_b.family_id or "")
        surname = family.surname if family else self.rng.choice([parent_a.last_name, parent_b.last_name])
        first_name = self.rng.choice([
            "Aster",
            "Nettle",
            "Pip",
            "Sorrel",
            "Merry",
            "Quill",
            "Wren",
            "Tansy",
        ])
        traits = create_child_traits(parent_a, parent_b, self.rng)
        child = Character(
            first_name=first_name,
            last_name=surname,
            age_years=0,
            age_stage=AgeStage.CHILD,
            birthday_day_of_year=day_of_year(self.world.current_date, self.config),
            traits=traits,
            appearance_descriptors=traits.visual_descriptors,
            hobbies=[self.rng.choice(["blanket kicking", "ceiling staring", "ominous giggling"])],
            social_needs=round(self.rng.uniform(0.45, 0.95), 2),
            romance_preferences=[],
            friendship_tendency=round(self.rng.uniform(0.4, 0.95), 2),
            ambition_level=traits.ambition,
            weird_habits=traits.weird_habits,
            family_background=f"Child of {parent_a.full_name} and {parent_b.full_name}; already steeped in local drama.",
            home_location_id=parent_a.home_location_id,
            favorite_location_id=parent_a.favorite_location_id or parent_a.home_location_id,
            family_id=family.id if family else None,
            parent_ids=[parent_a.id, parent_b.id],
            mood="brand new and suspiciously observant",
            reputation="newborn local mystery",
            birth_year=self.world.current_date.year,
        )
        return child

    def _merge_or_create_family(self, actor: Character, target: Character) -> Family:
        actor_family = self.world.families.get(actor.family_id or "")
        target_family = self.world.families.get(target.family_id or "")

        if actor_family and target_family and actor_family.id == target_family.id:
            return actor_family
        if actor_family and not target_family:
            actor_family.member_ids.append(target.id)
            target.family_id = actor_family.id
            return actor_family
        if target_family and not actor_family:
            target_family.member_ids.append(actor.id)
            actor.family_id = target_family.id
            return target_family

        if actor_family and target_family and actor_family.id != target_family.id:
            chosen = actor_family if len(actor_family.member_ids) >= len(target_family.member_ids) else target_family
            merged = target_family if chosen is actor_family else actor_family
            for member_id in merged.member_ids:
                if member_id not in chosen.member_ids:
                    chosen.member_ids.append(member_id)
                self.world.characters[member_id].family_id = chosen.id
            chosen.scandals.append(f"merged with the {merged.surname} line after a wedding so emotional the pigeons got involved")
            self.world.families.pop(merged.id, None)
            actor.family_id = chosen.id
            target.family_id = chosen.id
            return chosen

        surname = self.rng.choice([actor.last_name, target.last_name])
        family = Family(
            surname=surname,
            member_ids=[actor.id, target.id],
            founder_ids=[actor.id, target.id],
            traditions=[self.rng.choice(self.seed_world.get("traditions", ["accidental candle rituals"]))],
            legendary_hook=f"The {surname} line begins with romance, nerves, and a suspicious amount of public applause.",
            home_location_id=actor.home_location_id,
        )
        self.world.families[family.id] = family
        actor.family_id = family.id
        target.family_id = family.id
        return family

    def _seasonal_festival(self) -> str:
        mapping = {
            "spring": "The Spring Umbrella Parade",
            "summer": "The Festival of Convenient Coincidences",
            "autumn": "The Great Soup Verdict",
            "winter": "Moonlight Apology Week",
        }
        return mapping[self.world.current_date.season.value]


def boot_engine(config: SimulationConfig | None = None) -> SimulationEngine:
    """Convenience factory for the CLI and web layers."""

    return SimulationEngine.create_or_load(config or SimulationConfig())
