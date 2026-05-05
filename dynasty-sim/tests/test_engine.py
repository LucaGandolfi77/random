"""Tests for the world simulation engine."""

from __future__ import annotations

import pytest

from dynasty_sim.engine import tick_year
from dynasty_sim.models import SimulationConfig, WorldState
from dynasty_sim.seeds import build_seed_world


class TestTickYear:
    def test_tick_advances_year(self):
        world = build_seed_world()
        initial_year = world.current_year
        tick_year(world)
        assert world.current_year == initial_year + 1

    def test_tick_adds_year_summary(self):
        world = build_seed_world()
        tick_year(world)
        assert len(world.year_summaries) == 1
        assert world.year_summaries[0].year == world.current_year - 1

    def test_population_is_non_zero_after_ten_years(self):
        world = build_seed_world()
        for _ in range(10):
            tick_year(world)
        assert len(world.living_characters()) > 0

    def test_births_occur_over_time(self):
        """Over 20 years at least one birth should happen."""
        world = build_seed_world()
        total_births: list[str] = []
        for _ in range(20):
            tick_year(world)
            total_births.extend(world.year_summaries[-1].births)
        assert len(total_births) > 0, "Expected at least one birth in 20 years"

    def test_characters_age(self):
        """Characters should age by 1 each tick."""
        world = build_seed_world()
        char = next(iter(world.characters.values()))
        age_before = char.age(world.current_year)
        tick_year(world)
        age_after = char.age(world.current_year)
        assert age_after == age_before + 1


class TestRunSimulation:
    def test_short_simulation_stable(self):
        """A 5-year simulation should complete without errors."""
        from dynasty_sim.engine import run_simulation

        config = SimulationConfig(start_year=1000, max_years=5)
        world = build_seed_world(config)
        run_simulation(world)
        assert world.current_year == 1005

    def test_year_summaries_count_matches_years(self):
        from dynasty_sim.engine import run_simulation

        n_years = 8
        config = SimulationConfig(start_year=1000, max_years=n_years)
        world = build_seed_world(config)
        run_simulation(world)
        assert len(world.year_summaries) == n_years

    def test_events_accumulate(self):
        from dynasty_sim.engine import run_simulation

        config = SimulationConfig(start_year=1000, max_years=15)
        world = build_seed_world(config)
        run_simulation(world)
        assert len(world.events) > 0
