"""Tests for engine module."""

from __future__ import annotations

from pathlib import Path

from lingua_evolver.config import RuntimeSettings
from lingua_evolver.engine import SimulationEngine
from lingua_evolver.persistence import save_checkpoint


class TestEngineInit:
    def test_initialize_world(self) -> None:
        settings = RuntimeSettings(num_agents=5, llm_enabled=False)
        engine = SimulationEngine(settings)
        world = engine.initialize_world()

        assert len(world.agents) == 5
        assert world.generation == 0
        for agent in world.agents:
            assert len(agent.inventory) > 0

    def test_initialize_world_custom_size(self) -> None:
        settings = RuntimeSettings(num_agents=3, phonemes_per_agent=5, llm_enabled=False)
        engine = SimulationEngine(settings)
        world = engine.initialize_world()

        assert len(world.agents) == 3
        for agent in world.agents:
            assert len(agent.inventory) == 5


class TestEngineSimulation:
    def test_tick_generation_advances(self) -> None:
        settings = RuntimeSettings(
            num_agents=5,
            interactions_per_generation=10,
            llm_enabled=False,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.tick_generation(world)

        assert world.generation == 1

    def test_tick_generation_preserves_agents(self) -> None:
        settings = RuntimeSettings(
            num_agents=5,
            interactions_per_generation=10,
            llm_enabled=False,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.tick_generation(world)

        assert len(world.agents) > 0

    def test_run_simulation_completes(self) -> None:
        settings = RuntimeSettings(
            num_agents=4,
            generations=5,
            interactions_per_generation=10,
            llm_enabled=False,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.run_simulation(world)

        assert world.generation == 5

    def test_run_simulation_with_callback(self) -> None:
        tick_count = 0

        def on_tick(w):
            nonlocal tick_count
            tick_count += 1

        settings = RuntimeSettings(
            num_agents=4,
            generations=5,
            interactions_per_generation=10,
            llm_enabled=False,
        )
        engine = SimulationEngine(settings, on_tick=on_tick)
        world = engine.initialize_world()
        world = engine.run_simulation(world)

        assert tick_count > 0


class TestInputQueueIntegration:
    def test_input_queue_processes_words(self) -> None:
        settings = RuntimeSettings(
            num_agents=5,
            interactions_per_generation=10,
            llm_enabled=False,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()

        engine.input_queue.add("ka", "io", 0)
        engine.input_queue.add("mu", "vedere", 0)

        world = engine._process_input_queue(world)

        assert len(world.shared_lexicon) == 2
        meanings = [w.meaning for w in world.shared_lexicon]
        assert "io" in meanings
        assert "vedere" in meanings


class TestPersistence:
    def test_save_and_load(self, tmp_path: Path) -> None:
        settings = RuntimeSettings(
            num_agents=4,
            generations=3,
            interactions_per_generation=10,
            llm_enabled=False,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.tick_generation(world)

        saves_dir = tmp_path / "saves"
        path = save_checkpoint(world, saves_dir)
        assert path.exists()

        from lingua_evolver.persistence import load_checkpoint
        loaded = load_checkpoint(path)

        assert loaded.generation == world.generation
        assert len(loaded.agents) == len(world.agents)
