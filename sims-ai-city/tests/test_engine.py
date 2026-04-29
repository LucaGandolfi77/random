"""Focused tests for the simulation engine and social mechanics."""

from __future__ import annotations

import random

from sims_ai_city.config import SimulationConfig
from sims_ai_city.models import Relationship, RelationshipStatus
from sims_ai_city.simulation.clock import day_of_year
from sims_ai_city.simulation.engine import SimulationEngine
from sims_ai_city.simulation.relationships import apply_action_to_relationship


def test_engine_simulates_and_persists_runtime_files(tmp_path) -> None:
    config = SimulationConfig(
        runtime_dir=tmp_path / "runtime",
        autosave_every_days=1,
        daily_interactions=5,
        random_seed=21,
    )

    engine = SimulationEngine(config)
    events = engine.simulate_days(5)
    engine.save()

    assert events
    assert engine.world.day_index == 5
    assert engine.world.memory_records
    assert config.state_path.exists()
    assert config.family_tree_path.exists()
    assert config.chronicle_path.exists()
    assert config.memory_database_path.exists()

    reloaded = SimulationEngine.create_or_load(config)
    assert reloaded.world.day_index == engine.world.day_index
    assert reloaded.world.events[-1].headline == engine.world.events[-1].headline


def test_confession_can_push_relationship_into_courting() -> None:
    relationship = Relationship(
        key="a::b",
        character_a_id="a",
        character_b_id="b",
        friendship=0.38,
        romance=0.64,
        trust=0.44,
        spark=0.30,
    )

    apply_action_to_relationship(
        relationship,
        action="confess",
        compatibility_score=0.92,
        location_romance_bonus=0.4,
        location_gossip_bonus=0.0,
        location_drama_bonus=0.0,
        rng=random.Random(7),
    )

    assert relationship.romance > 0.7
    assert relationship.status == RelationshipStatus.COURTING


def test_newborn_birthday_uses_day_of_year_index(tmp_path) -> None:
    config = SimulationConfig(runtime_dir=tmp_path / "runtime", random_seed=5)
    engine = SimulationEngine(config)
    adults = [character for character in engine.world.characters.values() if character.age_stage.value == "adult"]

    child = engine._create_child(adults[0], adults[1])

    assert child.birthday_day_of_year == day_of_year(engine.world.current_date, config)
