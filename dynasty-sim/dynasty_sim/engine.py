"""World simulation engine — the main yearly tick loop.

Responsibilities:
- Advance simulation time year by year
- Trigger social encounters between characters
- Handle births, marriages, deaths
- Apply upbringing and aging
- Generate yearly summaries
- Delegate LLM narrative generation to the reporter module

Design notes:
- All random events use the world's seeded random state so runs are
  reproducible given the same config seed.
- LLM calls are optional (``config.use_llm_for_events``).  When disabled the
  engine still runs a full simulation — it just uses template strings.
"""

from __future__ import annotations

import random
from typing import TYPE_CHECKING

from dynasty_sim.generator import apply_upbringing, generate_child, generate_character
from dynasty_sim.memory import add_memory
from dynasty_sim.models import (
    Dynasty,
    EventType,
    FamilyTreeNode,
    Household,
    LifeStage,
    SimulationEvent,
    WorldState,
    YearSummary,
    Sex,
)
from dynasty_sim.relationships import (
    apply_relationship_decay,
    eligible_couples,
    first_meeting,
    form_marriage,
    interact,
    register_parent_child,
)

if TYPE_CHECKING:
    from dynasty_sim.client import OpenRouterClient


# ---------------------------------------------------------------------------
# Probability constants
# ---------------------------------------------------------------------------

_ENCOUNTER_CHANCE = 0.55       # prob any two living characters meet in a year
_POSITIVE_INTERACTION_BIAS = 0.55  # prob that a random interaction is positive
_MARRIAGE_CHANCE = 0.40        # prob that a romantic pair marries this year
_PREGNANCY_CHANCE = 0.30       # prob a married couple conceives this year
_DEATH_BASE_RATE = 0.015       # base annual mortality
_DEATH_ELDER_MULT = 5.0        # multiplier for elders
_MAX_CHILDREN_PER_COUPLE = 8
_SCANDAL_CHANCE = 0.05


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _add_event(world: WorldState, summary: YearSummary, event: SimulationEvent) -> None:
    world.events.append(event)
    summary.events.append(event)


def _death_probability(char_age: int, health_resilience: float) -> float:
    base = _DEATH_BASE_RATE
    if char_age >= 60:
        base *= _DEATH_ELDER_MULT * (1 + (char_age - 60) / 20)
    elif char_age >= 50:
        base *= 1.5
    # Good health resilience reduces mortality
    return base * (1.5 - health_resilience)


def _kill_character(char_id: str, world: WorldState, summary: YearSummary, year: int) -> None:
    char = world.characters[char_id]
    char.is_alive = False
    char.death_year = year
    char.life_stage = LifeStage.DECEASED
    summary.deaths.append(char_id)

    # Notify spouse
    if char.spouse_id and char.spouse_id in world.characters:
        spouse = world.characters[char.spouse_id]
        spouse.spouse_id = None
        add_memory(
            spouse,
            subject_id=char_id,
            event_type="death_of_spouse",
            description=f"Lost my beloved {char.full_name}.",
            valence=-0.95,
            year=year,
            importance=1.0,
            tags=["death", "grief"],
        )


def _random_interaction_valence() -> float:
    if random.random() < _POSITIVE_INTERACTION_BIAS:
        return round(random.uniform(0.15, 0.9), 2)
    return round(random.uniform(-0.7, -0.1), 2)


def _interaction_description(a_name: str, b_name: str, valence: float) -> str:
    if valence > 0.5:
        templates = [
            f"{a_name} and {b_name} had a delightful conversation.",
            f"{a_name} helped {b_name} with a difficult problem.",
            f"{b_name} made {a_name} laugh until they cried.",
            f"{a_name} and {b_name} shared a memorable evening.",
        ]
    elif valence > 0.0:
        templates = [
            f"{a_name} and {b_name} exchanged pleasantries.",
            f"{a_name} nodded politely at {b_name} across the market.",
            f"{b_name} offered {a_name} some advice.",
        ]
    elif valence > -0.4:
        templates = [
            f"{a_name} and {b_name} disagreed about something trivial.",
            f"{b_name} borrowed something from {a_name} and forgot to return it.",
            f"{a_name} made an unfortunate remark in front of {b_name}.",
        ]
    else:
        templates = [
            f"{a_name} and {b_name} had a bitter argument.",
            f"{b_name} publicly embarrassed {a_name}.",
            f"{a_name} accused {b_name} of outright dishonesty.",
        ]
    return random.choice(templates)


# ---------------------------------------------------------------------------
# Yearly processing phases
# ---------------------------------------------------------------------------


def _phase_aging(world: WorldState) -> None:
    for char in world.living_characters():
        char.update_life_stage(world.current_year)


def _phase_deaths(world: WorldState, summary: YearSummary) -> None:
    for char in list(world.living_characters()):
        age = char.age(world.current_year)
        prob = _death_probability(age, char.traits.inherited.health_resilience)
        if random.random() < prob:
            _kill_character(char.id, world, summary, world.current_year)
            event = SimulationEvent(
                event_type=EventType.DEATH,
                year=world.current_year,
                character_ids=[char.id],
                description=f"{char.full_name} died at age {age}.",
            )
            _add_event(world, summary, event)


def _phase_upbringing(world: WorldState) -> None:
    for char in world.living_characters():
        apply_upbringing(char, world)


def _phase_encounters(world: WorldState, summary: YearSummary) -> None:
    living = world.living_characters()
    if len(living) < 2:
        return

    # Limit encounters per year to avoid O(n²) cost with large populations
    max_encounters = min(len(living) * 3, 80)
    for _ in range(max_encounters):
        if len(living) < 2:
            break
        a, b = random.sample(living, 2)
        if a.id == b.id:
            continue

        # First meeting?
        if b.id not in a.relationships or a.relationships[b.id].familiarity == 0.0:
            first_meeting(a, b, world, context="community gathering")
            event = SimulationEvent(
                event_type=EventType.MEETING,
                year=world.current_year,
                character_ids=[a.id, b.id],
                description=f"{a.full_name} and {b.full_name} met for the first time.",
            )
            _add_event(world, summary, event)
        else:
            valence = _random_interaction_valence()
            desc = _interaction_description(a.full_name, b.full_name, valence)
            interact(a, b, world, valence=valence, description=desc)


def _phase_romance_and_marriage(world: WorldState, summary: YearSummary) -> None:
    for a, b in eligible_couples(world):
        if not a.is_alive or not b.is_alive:
            continue
        if random.random() < _MARRIAGE_CHANCE:
            # Marriage
            a.spouse_id = b.id
            b.spouse_id = a.id
            # Merge into same household (use whichever exists or create new)
            _merge_households(a, b, world)
            form_marriage(a, b, world)
            summary.marriages.extend([a.id, b.id])
            event = SimulationEvent(
                event_type=EventType.MARRIAGE,
                year=world.current_year,
                character_ids=[a.id, b.id],
                description=f"{a.full_name} and {b.full_name} were married.",
            )
            _add_event(world, summary, event)


def _merge_households(a: Character, b: Character, world: WorldState) -> None:
    hh_id = a.household_id or b.household_id
    if hh_id is None:
        # Create a new household
        hh = Household(
            name=f"{a.last_name} household",
            location="village",
            founded_year=world.current_year,
            member_ids=[a.id, b.id],
            head_id=a.id,
        )
        world.households[hh.id] = hh
        a.household_id = hh.id
        b.household_id = hh.id
    else:
        hh = world.households[hh_id]
        if a.id not in hh.member_ids:
            hh.member_ids.append(a.id)
            a.household_id = hh_id
        if b.id not in hh.member_ids:
            hh.member_ids.append(b.id)
            b.household_id = hh_id


def _phase_births(world: WorldState, summary: YearSummary) -> None:
    for char in list(world.living_characters()):
        if char.spouse_id is None:
            continue
        spouse = world.characters.get(char.spouse_id)
        if spouse is None or not spouse.is_alive:
            continue

        # Avoid double-processing both sides of the couple
        if char.sex != Sex.FEMALE:
            continue

        # Check child count limit
        existing_children = len(char.child_ids)
        if existing_children >= _MAX_CHILDREN_PER_COUPLE:
            continue

        # Age-based pregnancy eligibility
        age = char.age(world.current_year)
        if age < 18 or age > 42:
            continue

        if random.random() < _PREGNANCY_CHANCE:
            mother = char
            father = spouse if spouse.sex == Sex.MALE else char
            mother_char = mother
            father_char = father

            child = generate_child(mother_char, father_char, world)
            world.characters[child.id] = child

            # Update family records
            mother.child_ids.append(child.id)
            father_char.child_ids.append(child.id)
            child.sibling_ids = [
                c for c in mother.child_ids if c != child.id
            ]
            # Update older siblings
            for sib_id in child.sibling_ids:
                if sib_id in world.characters:
                    sib = world.characters[sib_id]
                    if child.id not in sib.sibling_ids:
                        sib.sibling_ids.append(child.id)

            register_parent_child(mother, child, world)
            register_parent_child(father_char, child, world)

            # Family tree
            node = FamilyTreeNode(
                character_id=child.id,
                parent_ids=[mother.id, father_char.id],
                dynasty_id=child.dynasty_id,
                generation=_child_generation(mother, father_char, world),
            )
            world.family_tree[child.id] = node
            _update_parent_tree_node(mother.id, child.id, world)
            _update_parent_tree_node(father_char.id, child.id, world)

            summary.births.append(child.id)
            event = SimulationEvent(
                event_type=EventType.BIRTH,
                year=world.current_year,
                character_ids=[child.id, mother.id, father_char.id],
                description=(
                    f"{child.full_name} was born to {mother.full_name} "
                    f"and {father_char.full_name}."
                ),
            )
            _add_event(world, summary, event)


def _child_generation(mother: Character, father: Character, world: WorldState) -> int:
    for p_id in [mother.id, father.id]:
        if p_id in world.family_tree:
            return world.family_tree[p_id].generation + 1
    return 1


def _update_parent_tree_node(parent_id: str, child_id: str, world: WorldState) -> None:
    if parent_id not in world.family_tree:
        world.family_tree[parent_id] = FamilyTreeNode(character_id=parent_id)
    node = world.family_tree[parent_id]
    if child_id not in node.child_ids:
        node.child_ids.append(child_id)


def _phase_scandals(world: WorldState, summary: YearSummary) -> None:
    living = world.living_characters()
    if not living:
        return
    if random.random() > _SCANDAL_CHANCE:
        return

    subject = random.choice(living)
    scandal_templates = [
        f"{subject.full_name} was caught writing extremely bad poetry in public.",
        f"{subject.full_name} accidently set fire to the wrong barn.",
        f"{subject.full_name} bet the household donkey on a game of dice and lost.",
        f"{subject.full_name} claimed to be a distant relative of royalty. Nobody believed them.",
        f"{subject.full_name} insulted the wrong merchant and now owes a significant favour.",
        f"{subject.full_name} started an argument at the solstice feast that lasted three days.",
        f"{subject.full_name} invented a new word that inexplicably became popular.",
        f"{subject.full_name} was seen talking to themselves in the moonlit garden.",
    ]
    description = random.choice(scandal_templates)
    event = SimulationEvent(
        event_type=EventType.SCANDAL,
        year=world.current_year,
        character_ids=[subject.id],
        description=description,
    )
    _add_event(world, summary, event)
    subject.biography_notes.append(f"Year {world.current_year}: {description}")


def _phase_relationship_decay(world: WorldState) -> None:
    apply_relationship_decay(world)


# ---------------------------------------------------------------------------
# Dynasty tracking
# ---------------------------------------------------------------------------


def _ensure_dynasty(char: Character, world: WorldState) -> Dynasty:
    if char.dynasty_id and char.dynasty_id in world.dynasties:
        dynasty = world.dynasties[char.dynasty_id]
    else:
        dynasty = Dynasty(
            name=f"House {char.last_name}",
            founder_id=char.id,
            founded_year=world.current_year,
            member_ids=[char.id],
            motto=f"By deeds and stubbornness.",
        )
        world.dynasties[dynasty.id] = dynasty
        char.dynasty_id = dynasty.id
    if char.id not in dynasty.member_ids:
        dynasty.member_ids.append(char.id)
    return dynasty


# ---------------------------------------------------------------------------
# Public engine API
# ---------------------------------------------------------------------------


def tick_year(
    world: WorldState,
    llm_client: "OpenRouterClient | None" = None,
) -> YearSummary:
    """Advance the simulation by one year and return a ``YearSummary``."""
    year = world.current_year
    summary = YearSummary(year=year, population=len(world.living_characters()))

    # Enforce population cap — no new births if too crowded
    if len(world.living_characters()) < world.config.max_population:
        _phase_births(world, summary)

    _phase_aging(world)
    _phase_upbringing(world)
    _phase_encounters(world, summary)
    _phase_romance_and_marriage(world, summary)
    _phase_deaths(world, summary)
    _phase_scandals(world, summary)
    _phase_relationship_decay(world)

    summary.population = len(world.living_characters())

    # Dynasty maintenance
    for char in world.living_characters():
        if char.dynasty_id is None and char.last_name:
            _ensure_dynasty(char, world)

    world.year_summaries.append(summary)
    world.current_year += 1

    return summary


def run_simulation(
    world: WorldState,
    years: int | None = None,
    llm_client: "OpenRouterClient | None" = None,
    on_year_end: "Any | None" = None,
) -> list[YearSummary]:
    """Run the simulation for the given number of years.

    Parameters
    ----------
    world:
        The current world state (mutated in-place).
    years:
        How many years to simulate. Defaults to ``world.config.max_years``.
    llm_client:
        Optional LLM client for narrative generation.
    on_year_end:
        Optional callback ``fn(world, summary)`` called after each year.
    """
    years = years or world.config.max_years
    summaries: list[YearSummary] = []

    for _ in range(years):
        summary = tick_year(world, llm_client=llm_client)
        summaries.append(summary)
        if on_year_end:
            on_year_end(world, summary)

    return summaries
