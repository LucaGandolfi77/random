"""Configuration for Sims AI City."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field


class SimulationConfig(BaseModel):
    """Top-level configuration for the city simulation."""

    model_config = ConfigDict(extra="forbid")

    town_name: str = "Mosswhistle"
    random_seed: int = 17
    start_year: int = 1
    days_per_season: int = 18
    initial_population: int = 10
    daily_interactions: int = 8
    autosave_every_days: int = 10
    runtime_dir: Path = Field(default_factory=lambda: Path("runtime"))
    state_file_name: str = "world_state.json"
    family_tree_file_name: str = "family_trees.json"
    chronicle_file_name: str = "year_summaries.json"
    memory_database_name: str = "character_memories.sqlite3"
    use_openrouter: bool = False
    model: str = "openrouter/free"
    fallback_model: str = "google/gemini-2.0-flash-exp:free"
    marriage_romance_threshold: float = 0.73
    marriage_friendship_threshold: float = 0.57
    child_romance_threshold: float = 0.68
    child_trust_threshold: float = 0.55
    childbearing_cooldown_days: int = 24
    elder_departure_age: int = 81
    daily_major_incident_chance: float = 0.26
    drama_bias: float = 0.19

    @property
    def state_path(self) -> Path:
        return self.runtime_dir / self.state_file_name

    @property
    def family_tree_path(self) -> Path:
        return self.runtime_dir / self.family_tree_file_name

    @property
    def chronicle_path(self) -> Path:
        return self.runtime_dir / self.chronicle_file_name

    @property
    def memory_database_path(self) -> Path:
        return self.runtime_dir / self.memory_database_name


def load_simulation_environment(env_file: str | Path | None = None) -> dict[str, str | None]:
    """Load .env values used by the simulation."""

    load_dotenv(dotenv_path=env_file)
    return {
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
        "SIMS_AI_CITY_USE_OPENROUTER": os.getenv("SIMS_AI_CITY_USE_OPENROUTER", "false"),
        "SIMS_AI_CITY_MODEL": os.getenv("SIMS_AI_CITY_MODEL", "openrouter/free"),
        "SIMS_AI_CITY_FALLBACK_MODEL": os.getenv(
            "SIMS_AI_CITY_FALLBACK_MODEL",
            "google/gemini-2.0-flash-exp:free",
        ),
    }
