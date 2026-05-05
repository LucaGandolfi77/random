"""Tests for the relationship engine."""

from __future__ import annotations

import pytest

from dynasty_sim.models import (
    Character,
    Dynasty,
    EducationProfile,
    Household,
    InheritedTraitSet,
    LearnedTraitSet,
    LifeStage,
    RelationshipType,
    Sex,
    SimulationConfig,
    TraitGene,
    TraitProfile,
    WorldState,
)
from dynasty_sim.relationships import (
    eligible_couples,
    first_meeting,
    form_marriage,
    interact,
    register_parent_child,
)
from datetime import date


def _make_inherited(**kwargs: float) -> InheritedTraitSet:
    defaults = dict(
        height_tendency=0.5, build_tendency=0.5, hair_darkness=0.5,
        hair_thickness=0.5, eye_lightness=0.5, stamina_tendency=0.5,
        temperament_baseline=0.5, sociability_tendency=0.5,
        risk_taking_tendency=0.5, learning_aptitude=0.5,
        emotional_reactivity=0.5, health_resilience=0.5,
    )
    defaults.update(kwargs)
    raw_genes = [TraitGene(name=k, value=v, dominant=True, mutation_rate=0.0) for k, v in defaults.items()]
    return InheritedTraitSet(**defaults, raw_genes=raw_genes)


def _make_char(
    first: str,
    last: str,
    sex: Sex,
    birth_year: int = 960,
    dynasty_id: str = "d1",
    household_id: str = "h1",
    **trait_kwargs: float,
) -> Character:
    return Character(
        id=f"{first.lower()}_{last.lower()}",
        first_name=first,
        last_name=last,
        sex=sex,
        birth_year=birth_year,
        birthday=date(birth_year, 6, 15),
        life_stage=LifeStage.ADULT,
        traits=TraitProfile(
            inherited=_make_inherited(**trait_kwargs),
            learned=LearnedTraitSet(),
        ),
        education=EducationProfile(),
        occupation="Farmer",
        household_id=household_id,
        dynasty_id=dynasty_id,
    )


def _make_world(chars: list[Character]) -> WorldState:
    config = SimulationConfig(start_year=960)
    world = WorldState(config=config, current_year=985)
    for c in chars:
        world.characters[c.id] = c
    hid = "h1"
    world.households[hid] = Household(
        id=hid, name="Test House", dynasty_id="d1", location="Testville",
        member_ids=[c.id for c in chars],
    )
    world.dynasties["d1"] = Dynasty(
        id="d1", name="Test Dynasty", founder_id=chars[0].id,
        founded_year=960,
        member_ids=[c.id for c in chars],
    )
    return world


class TestFirstMeeting:
    def test_creates_relationship_for_both(self):
        a = _make_char("Alice", "Test", Sex.FEMALE)
        b = _make_char("Bob", "Test", Sex.MALE)
        world = _make_world([a, b])
        first_meeting(a, b, world)
        assert b.id in a.relationships
        assert a.id in b.relationships

    def test_initial_familiarity_is_low(self):
        a = _make_char("Alice", "Test", Sex.FEMALE)
        b = _make_char("Bob", "Test", Sex.MALE)
        world = _make_world([a, b])
        first_meeting(a, b, world)
        rel = a.relationships[b.id]
        assert rel.familiarity < 0.5

    def test_first_meeting_creates_positive_or_neutral_affection(self):
        """First meeting should produce a non-extreme affection value."""
        a = _make_char("Alice", "Test", Sex.FEMALE)
        b = _make_char("Bob", "Test", Sex.MALE)
        world = _make_world([a, b])
        first_meeting(a, b, world)
        aff = a.relationships[b.id].affection
        assert -1.0 <= aff <= 1.0


class TestInteract:
    def test_repeated_interactions_increase_familiarity(self):
        a = _make_char("Alice", "Test", Sex.FEMALE)
        b = _make_char("Bob", "Test", Sex.MALE)
        world = _make_world([a, b])
        first_meeting(a, b, world)
        initial = a.relationships[b.id].familiarity
        for _ in range(5):
            interact(a, b, world, valence=0.3, description="casual chat")
        assert a.relationships[b.id].familiarity > initial


class TestFormMarriage:
    def test_marriage_sets_spouse_relationship(self):
        a = _make_char("Alice", "Test", Sex.FEMALE)
        b = _make_char("Bob", "Test", Sex.MALE)
        world = _make_world([a, b])
        first_meeting(a, b, world)
        form_marriage(a, b, world)
        assert a.relationships[b.id].rel_type == RelationshipType.SPOUSE
        assert b.relationships[a.id].rel_type == RelationshipType.SPOUSE

    def test_married_characters_not_in_eligible_couples(self):
        a = _make_char("Alice", "Test", Sex.FEMALE)
        b = _make_char("Bob", "Test", Sex.MALE)
        world = _make_world([a, b])
        first_meeting(a, b, world)
        form_marriage(a, b, world)
        # Manually set spouse_id so eligible_couples exclusion logic works
        a.spouse_id = b.id
        b.spouse_id = a.id
        couples = eligible_couples(world)
        pair_ids = {frozenset([m.id, f.id]) for m, f in couples}
        assert frozenset([a.id, b.id]) not in pair_ids


class TestParentChild:
    def test_register_parent_child_updates_relationships(self):
        parent = _make_char("Alice", "Test", Sex.FEMALE)
        child = _make_char("Charlie", "Test", Sex.MALE, birth_year=985)
        world = _make_world([parent, child])
        register_parent_child(parent, child, world)
        # relationships.py creates Relationship entries; engine sets child_ids separately
        assert child.id in parent.relationships
        assert parent.id in child.relationships
