"""Relationship engine for Dynasty Sim.

Manages the evolution of relationships between characters:
- First meetings and familiarity growth
- Trust / affection / attraction dynamics
- Life-stage-aware romantic eligibility
- Rivalry detection
- Marriage and family bond formation
- Relationship decay from inactivity
"""

from __future__ import annotations

import random
from typing import TYPE_CHECKING

from dynasty_sim.memory import add_memory, summarise_feelings
from dynasty_sim.models import (
    Character,
    LifeStage,
    Relationship,
    RelationshipType,
    WorldState,
)

if TYPE_CHECKING:
    pass

# Thresholds for automatic relationship type upgrades
_FRIEND_AFFECTION_THRESHOLD = 0.35
_CLOSE_FRIEND_THRESHOLD = 0.65
_RIVAL_RESENTMENT_THRESHOLD = 0.55
_ROMANCE_ATTRACTION_THRESHOLD = 0.60
_MARRIAGE_AFFECTION_THRESHOLD = 0.72

# Compatibility computes a float in [0,1] – below this two people tend to clash
_COMPATIBILITY_CLASH_THRESHOLD = 0.30

# Familiarity gain per interaction
_FAMILIARITY_GAIN = 0.06

# Annual passive decay of attraction (absent contact)
_ATTRACTION_DECAY = 0.04

# Minimum age for romantic relationships
_MIN_ROMANCE_AGE = 16

# Maximum age gap for romance (soft rule, can be overridden)
_MAX_AGE_GAP = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _trait_compatibility(a: Character, b: Character) -> float:
    """Compute a trait-based compatibility score in [0, 1]."""
    a_traits = a.traits.learned
    b_traits = b.traits.learned

    # Similar temperament / empathy attracts; divergent ambition creates friction
    empathy_harmony = 1.0 - abs(a_traits.empathy - b_traits.empathy)
    humour_harmony = 1.0 - abs(a_traits.humour - b_traits.humour) * 0.5
    ambition_diff = abs(a_traits.ambition - b_traits.ambition)
    curiosity_harmony = 1.0 - abs(a_traits.curiosity - b_traits.curiosity) * 0.5
    temperament_diff = abs(
        a.traits.inherited.temperament_baseline - b.traits.inherited.temperament_baseline
    )

    # Opposites in temperament can attract (mild bonus) but extreme divergence costs
    temperament_score = 0.7 * (1.0 - temperament_diff) + 0.3 * (0.5 + temperament_diff * 0.3)

    raw = (empathy_harmony + humour_harmony + curiosity_harmony + temperament_score) / 4.0
    raw -= ambition_diff * 0.15  # overly mismatched ambition is friction

    return round(max(0.0, min(1.0, raw + random.gauss(0, 0.04))), 3)


def _get_or_create_relationship(character: Character, other_id: str) -> Relationship:
    if other_id not in character.relationships:
        character.relationships[other_id] = Relationship(other_id=other_id)
    return character.relationships[other_id]


def _update_rel_type(rel: Relationship, holder: Character, other: Character, world: WorldState) -> None:
    """Automatically upgrade/downgrade relationship type from numeric scores."""
    current = rel.rel_type

    # Kinship types are never overwritten by social logic
    kinship = {
        RelationshipType.PARENT,
        RelationshipType.CHILD,
        RelationshipType.SIBLING,
        RelationshipType.GRANDPARENT,
        RelationshipType.GRANDCHILD,
        RelationshipType.COUSIN,
    }
    if current in kinship:
        return

    # Marriage/spouse type is managed separately
    if current in {RelationshipType.SPOUSE, RelationshipType.EX_SPOUSE}:
        return

    # Rival/enemy from resentment
    if rel.resentment >= _RIVAL_RESENTMENT_THRESHOLD:
        rel.rel_type = RelationshipType.RIVAL if rel.resentment < 0.8 else RelationshipType.ENEMY
        return

    # Romantic progression
    h_age = holder.age(world.current_year)
    o_age = other.age(world.current_year)
    age_gap = abs(h_age - o_age)
    both_adult = (
        holder.life_stage not in {LifeStage.INFANT, LifeStage.CHILD, LifeStage.TEENAGER}
        and other.life_stage not in {LifeStage.INFANT, LifeStage.CHILD, LifeStage.TEENAGER}
        and h_age >= _MIN_ROMANCE_AGE
        and o_age >= _MIN_ROMANCE_AGE
    )
    related = other.id in (
        {holder.mother_id, holder.father_id}
        | set(holder.sibling_ids)
        | set(holder.child_ids)
    )

    if (
        not related
        and both_adult
        and age_gap <= _MAX_AGE_GAP
        and rel.attraction >= _ROMANCE_ATTRACTION_THRESHOLD
        and rel.affection >= 0.5
    ):
        rel.rel_type = RelationshipType.ROMANTIC_PARTNER
        return

    if rel.attraction > 0.4 and both_adult and not related:
        rel.rel_type = RelationshipType.CRUSH
        return

    # Friendship progression
    if rel.affection >= _CLOSE_FRIEND_THRESHOLD and rel.familiarity >= 0.5:
        rel.rel_type = RelationshipType.CLOSE_FRIEND
    elif rel.affection >= _FRIEND_AFFECTION_THRESHOLD and rel.familiarity >= 0.25:
        rel.rel_type = RelationshipType.FRIEND
    elif rel.familiarity >= 0.1:
        rel.rel_type = RelationshipType.ACQUAINTANCE


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def first_meeting(
    a: Character,
    b: Character,
    world: WorldState,
    context: str = "chance encounter",
) -> None:
    """Record the first meeting between two characters."""
    if b.id in a.relationships and a.relationships[b.id].familiarity > 0.0:
        # Already met
        return

    compatibility = _trait_compatibility(a, b)

    # Initial reaction influenced by compatibility and sociability
    initial_valence = (compatibility - 0.5) * 0.6 + random.gauss(0, 0.1)
    initial_valence = round(max(-0.5, min(0.5, initial_valence)), 3)

    for holder, other in [(a, b), (b, a)]:
        rel = _get_or_create_relationship(holder, other.id)
        rel.familiarity = round(min(1.0, rel.familiarity + _FAMILIARITY_GAIN), 3)
        rel.years_known = 0
        rel.last_interaction_year = world.current_year
        rel.affection = round(initial_valence + random.gauss(0, 0.05), 3)
        rel.trust = round(0.4 + compatibility * 0.2 + random.gauss(0, 0.05), 3)
        rel.rel_type = RelationshipType.ACQUAINTANCE

        desc = f"Met {other.full_name} during {context}."
        add_memory(
            holder,
            subject_id=other.id,
            event_type="first_meeting",
            description=desc,
            valence=initial_valence,
            year=world.current_year,
            importance=0.55,
            tags=["meeting"],
        )

    _update_rel_type(a.relationships[b.id], a, b, world)
    _update_rel_type(b.relationships[a.id], b, a, world)


def interact(
    a: Character,
    b: Character,
    world: WorldState,
    valence: float,
    description: str,
    event_type: str = "interaction",
    importance: float = 0.4,
    tags: list[str] | None = None,
) -> None:
    """Record a social interaction between two characters, updating their relationship."""
    for holder, other in [(a, b), (b, a)]:
        if other.id not in holder.relationships:
            first_meeting(holder, other, world)

        rel = holder.relationships[other.id]
        rel.last_interaction_year = world.current_year
        rel.years_known = world.current_year - rel.last_interaction_year + rel.years_known
        rel.familiarity = round(min(1.0, rel.familiarity + _FAMILIARITY_GAIN * 0.5), 3)

        # Affection / resentment update
        if valence >= 0:
            rel.affection = round(min(1.0, rel.affection + valence * 0.12), 3)
        else:
            rel.resentment = round(min(1.0, rel.resentment + abs(valence) * 0.15), 3)
            rel.trust = round(max(0.0, rel.trust + valence * 0.1), 3)

        # Attraction grows from repeated pleasant contact (if eligible)
        h_age = holder.age(world.current_year)
        o_age = other.age(world.current_year)
        if (
            valence > 0.2
            and h_age >= _MIN_ROMANCE_AGE
            and o_age >= _MIN_ROMANCE_AGE
            and other.id not in ({holder.mother_id, holder.father_id} | set(holder.sibling_ids))
        ):
            compat = _trait_compatibility(holder, other)
            rel.attraction = round(min(1.0, rel.attraction + valence * compat * 0.07), 3)

        add_memory(
            holder,
            subject_id=other.id,
            event_type=event_type,
            description=description,
            valence=valence,
            year=world.current_year,
            importance=importance,
            tags=tags or [],
        )
        _update_rel_type(rel, holder, other, world)


def form_marriage(a: Character, b: Character, world: WorldState) -> None:
    """Mark two characters as married, updating both relationship records."""
    for holder, other in [(a, b), (b, a)]:
        rel = _get_or_create_relationship(holder, other.id)
        rel.rel_type = RelationshipType.SPOUSE
        rel.affection = round(min(1.0, rel.affection + 0.2), 3)
        rel.trust = round(min(1.0, rel.trust + 0.15), 3)
        add_memory(
            holder,
            subject_id=other.id,
            event_type="marriage",
            description=f"Married {other.full_name}.",
            valence=0.9,
            year=world.current_year,
            importance=1.0,
            tags=["marriage", "family"],
        )


def dissolve_marriage(a: Character, b: Character, world: WorldState) -> None:
    """Mark two spouses as separated/divorced."""
    for holder, other in [(a, b), (b, a)]:
        rel = _get_or_create_relationship(holder, other.id)
        rel.rel_type = RelationshipType.EX_SPOUSE
        rel.resentment = round(min(1.0, rel.resentment + 0.35), 3)
        rel.trust = round(max(0.0, rel.trust - 0.3), 3)
        add_memory(
            holder,
            subject_id=other.id,
            event_type="divorce",
            description=f"Separated from {other.full_name}.",
            valence=-0.7,
            year=world.current_year,
            importance=0.9,
            tags=["divorce", "family"],
        )


def register_parent_child(
    parent: Character,
    child: Character,
    world: WorldState,
) -> None:
    """Register the parent-child bond in both characters' relationships."""
    p_rel = _get_or_create_relationship(parent, child.id)
    p_rel.rel_type = RelationshipType.PARENT
    p_rel.affection = 0.8
    p_rel.trust = 0.85

    c_rel = _get_or_create_relationship(child, parent.id)
    c_rel.rel_type = RelationshipType.CHILD
    c_rel.affection = 0.7
    c_rel.trust = 0.75

    add_memory(
        parent,
        subject_id=child.id,
        event_type="child_born",
        description=f"{child.full_name} was born.",
        valence=0.95,
        year=world.current_year,
        importance=1.0,
        tags=["Birth", "family"],
    )


def apply_relationship_decay(world: WorldState) -> None:
    """Apply annual decay to relationships without recent contact."""
    year = world.current_year
    for char in world.living_characters():
        for rel in char.relationships.values():
            years_since = year - rel.last_interaction_year
            if years_since >= 2:
                # Familiarity fades; attraction fades faster
                rel.familiarity = round(max(0.0, rel.familiarity - 0.02 * years_since), 3)
                rel.attraction = round(max(0.0, rel.attraction - _ATTRACTION_DECAY * years_since), 3)


def eligible_couples(world: WorldState) -> list[tuple[Character, Character]]:
    """Return pairs of characters who could plausibly pursue romance this year."""
    candidates = [
        c for c in world.living_characters()
        if c.life_stage in {LifeStage.YOUNG_ADULT, LifeStage.ADULT}
        and c.spouse_id is None
    ]
    pairs: list[tuple[Character, Character]] = []
    seen: set[frozenset[str]] = set()

    for c in candidates:
        for rel_id, rel in c.relationships.items():
            key = frozenset([c.id, rel_id])
            if key in seen:
                continue
            if rel_id not in world.characters:
                continue
            other = world.characters[rel_id]
            if not other.is_alive:
                continue
            if other.spouse_id is not None:
                continue
            if rel.rel_type in {RelationshipType.ROMANTIC_PARTNER, RelationshipType.CRUSH}:
                pairs.append((c, other))
                seen.add(key)

    return pairs
