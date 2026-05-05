"""Seed world builder — three founding families to kick-start a simulation."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from dynasty_sim.models import (
    Character,
    Dynasty,
    EducationProfile,
    FamilyTreeNode,
    Household,
    InheritedTraitSet,
    LearnedTraitSet,
    LifeStage,
    Sex,
    SimulationConfig,
    TraitGene,
    TraitProfile,
    WorldState,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _gene(value: float, dominant: bool = True) -> TraitGene:
    return TraitGene(name="", value=value, dominant=dominant, mutation_rate=0.02)


def _make_inherited(**kwargs: float) -> InheritedTraitSet:
    # Fields: height_tendency, build_tendency, hair_darkness, hair_thickness,
    # eye_lightness, stamina_tendency, temperament_baseline,
    # sociability_tendency, risk_taking_tendency, learning_aptitude,
    # emotional_reactivity, health_resilience
    defaults = dict(
        height_tendency=0.5, build_tendency=0.5, hair_darkness=0.5,
        hair_thickness=0.5, eye_lightness=0.5, stamina_tendency=0.5,
        temperament_baseline=0.5, sociability_tendency=0.5,
        risk_taking_tendency=0.5, learning_aptitude=0.5,
        emotional_reactivity=0.5, health_resilience=0.5,
    )
    defaults.update(kwargs)
    raw_genes: list[Any] = [_gene(v) for v in defaults.values()]
    return InheritedTraitSet(**defaults, raw_genes=raw_genes)


def _make_learned(**kwargs: float) -> LearnedTraitSet:
    # Fields: confidence, empathy, ambition, creativity, stubbornness,
    # loyalty, humour, work_ethic, romanticism, curiosity, resilience,
    # rebelliousness
    defaults = dict(
        confidence=0.5, empathy=0.5, ambition=0.5, creativity=0.5,
        stubbornness=0.5, loyalty=0.5, humour=0.5, work_ethic=0.5,
        romanticism=0.5, curiosity=0.5, resilience=0.5, rebelliousness=0.5,
    )
    defaults.update(kwargs)
    return LearnedTraitSet(**defaults)


def _founder(
    first_name: str,
    last_name: str,
    sex: Sex,
    birth_year: int,
    occupation: str,
    household_id: str,
    dynasty_id: str,
    inherited: InheritedTraitSet,
    learned: LearnedTraitSet,
    life_values: list[str],
) -> Character:
    cid = str(uuid.uuid4())
    return Character(
        id=cid,
        first_name=first_name,
        last_name=last_name,
        sex=sex,
        birth_year=birth_year,
        birthday=date(birth_year, 6, 15),
        life_stage=LifeStage.ADULT,
        traits=TraitProfile(inherited=inherited, learned=learned),
        education=EducationProfile(),
        occupation=occupation,
        household_id=household_id,
        dynasty_id=dynasty_id,
        life_values=life_values,
    )


# ---------------------------------------------------------------------------
# Family definitions
# ---------------------------------------------------------------------------

def _build_ashford(start_year: int) -> tuple[list[Character], Household, Dynasty]:
    """Ashford — noble lineage, wealthy, charismatic diplomats."""
    did = str(uuid.uuid4())
    hid = str(uuid.uuid4())

    father = _founder(
        "Edmund", "Ashford", Sex.MALE, start_year - 38,
        "Nobleman",
        hid, did,
        _make_inherited(learning_aptitude=0.78, sociability_tendency=0.82, health_resilience=0.70, stamina_tendency=0.72),
        _make_learned(ambition=0.80, confidence=0.85, loyalty=0.78, resilience=0.60),
        ["prestige", "family", "order"],
    )
    mother = _founder(
        "Eleanor", "Ashford", Sex.FEMALE, start_year - 35,
        "Noblewoman",
        hid, did,
        _make_inherited(learning_aptitude=0.74, sociability_tendency=0.80, emotional_reactivity=0.78, health_resilience=0.68),
        _make_learned(empathy=0.82, confidence=0.72, resilience=0.74, romanticism=0.55),
        ["family", "knowledge", "beauty"],
    )
    father.spouse_id = mother.id
    mother.spouse_id = father.id

    household = Household(
        id=hid,
        name="Ashford Manor",
        dynasty_id=did,
        location="Ashford Keep",
        wealth=0.80,
        stability=0.85,
        member_ids=[father.id, mother.id],
    )
    dynasty = Dynasty(
        id=did,
        name="House Ashford",
        founder_id=father.id,
        founded_year=start_year,
        member_ids=[father.id, mother.id],
        known_traits=["diplomacy", "charisma", "wealth"],
    )
    return [father, mother], household, dynasty


def _build_blackwood(start_year: int) -> tuple[list[Character], Household, Dynasty]:
    """Blackwood — artisan craftspeople, stubborn, known for distinctive red hair."""
    did = str(uuid.uuid4())
    hid = str(uuid.uuid4())

    father = _founder(
        "Magnus", "Blackwood", Sex.MALE, start_year - 42,
        "Master Blacksmith",
        hid, did,
        _make_inherited(build_tendency=0.82, health_resilience=0.80, temperament_baseline=0.65, stamina_tendency=0.78),
        _make_learned(work_ethic=0.90, loyalty=0.82, resilience=0.74, stubbornness=0.72),
        ["craft", "family", "honour"],
    )
    mother = _founder(
        "Ingrid", "Blackwood", Sex.FEMALE, start_year - 40,
        "Herbalist",
        hid, did,
        _make_inherited(emotional_reactivity=0.80, health_resilience=0.78, learning_aptitude=0.70, stamina_tendency=0.72),
        _make_learned(empathy=0.84, resilience=0.80, curiosity=0.68, rebelliousness=0.15),
        ["health", "community", "nature"],
    )
    father.spouse_id = mother.id
    mother.spouse_id = father.id

    household = Household(
        id=hid,
        name="Blackwood Forge",
        dynasty_id=did,
        location="Iron Hollow",
        wealth=0.40,
        stability=0.78,
        member_ids=[father.id, mother.id],
    )
    dynasty = Dynasty(
        id=did,
        name="Clan Blackwood",
        founder_id=father.id,
        founded_year=start_year,
        member_ids=[father.id, mother.id],
        known_traits=["craftsmanship", "stubbornness", "loyalty"],
    )
    return [father, mother], household, dynasty


def _build_drake(start_year: int) -> tuple[list[Character], Household, Dynasty]:
    """Drake — merchant adventurers, risk-takers, silver-tongued."""
    did = str(uuid.uuid4())
    hid = str(uuid.uuid4())

    father = _founder(
        "Silas", "Drake", Sex.MALE, start_year - 30,
        "Merchant",
        hid, did,
        _make_inherited(learning_aptitude=0.75, sociability_tendency=0.76, risk_taking_tendency=0.82, health_resilience=0.68),
        _make_learned(ambition=0.86, confidence=0.78, curiosity=0.72, stubbornness=0.42),
        ["wealth", "adventure", "freedom"],
    )
    mother = _founder(
        "Vivienne", "Drake", Sex.FEMALE, start_year - 28,
        "Trader",
        hid, did,
        _make_inherited(learning_aptitude=0.78, sociability_tendency=0.74, risk_taking_tendency=0.72, health_resilience=0.70),
        _make_learned(ambition=0.80, confidence=0.72, resilience=0.62, romanticism=0.70),
        ["wealth", "status", "pleasure"],
    )
    father.spouse_id = mother.id
    mother.spouse_id = father.id

    household = Household(
        id=hid,
        name="Drake Trading Post",
        dynasty_id=did,
        location="Port Crossing",
        wealth=0.55,
        stability=0.58,
        member_ids=[father.id, mother.id],
    )
    dynasty = Dynasty(
        id=did,
        name="House Drake",
        founder_id=father.id,
        founded_year=start_year,
        member_ids=[father.id, mother.id],
        known_traits=["commerce", "risk-taking", "charm"],
    )
    return [father, mother], household, dynasty


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_seed_world(config: SimulationConfig | None = None) -> WorldState:
    """Build a WorldState pre-populated with three founding families.

    Args:
        config: Optional simulation configuration.  Defaults are used if
                *config* is ``None``.

    Returns:
        A ``WorldState`` ready to be passed to ``run_simulation()``.
    """
    if config is None:
        config = SimulationConfig()

    start = config.start_year
    world = WorldState(config=config)
    world.current_year = start

    for builder in (_build_ashford, _build_blackwood, _build_drake):
        chars, household, dynasty = builder(start)

        # Register family tree nodes for founders
        for char in chars:
            node = FamilyTreeNode(
                character_id=char.id,
                generation=0,
            )
            world.family_tree[char.id] = node

        # Add to world
        for char in chars:
            world.characters[char.id] = char
        world.households[household.id] = household
        world.dynasties[dynasty.id] = dynasty

    return world
