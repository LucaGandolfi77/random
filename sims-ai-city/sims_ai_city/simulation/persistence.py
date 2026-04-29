"""Persistence helpers for saving and resuming simulation state."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sims_ai_city.config import SimulationConfig
from sims_ai_city.models import Character, Family, WorldState


class SimulationPersistence:
    """Save and load world state, family trees, and chronicles."""

    def __init__(self, config: SimulationConfig) -> None:
        self.config = config
        self.config.runtime_dir.mkdir(parents=True, exist_ok=True)

    def save(self, world: WorldState) -> None:
        """Persist the full simulation state and derived inspector assets."""

        self.config.state_path.write_text(
            json.dumps(world.model_dump(mode="json"), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        self.config.family_tree_path.write_text(
            json.dumps(self.build_family_trees(world), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        self.config.chronicle_path.write_text(
            json.dumps([summary.model_dump(mode="json") for summary in world.year_summaries], indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    def load(self) -> WorldState:
        """Load a previously saved simulation state."""

        return WorldState.model_validate_json(self.config.state_path.read_text(encoding="utf-8"))

    def exists(self) -> bool:
        """Return whether a saved simulation state exists."""

        return self.config.state_path.exists()

    def build_family_trees(self, world: WorldState) -> dict[str, Any]:
        """Build nested family tree data for the inspector layer."""

        trees: dict[str, Any] = {}
        for family in world.families.values():
            roots = family.founder_ids or family.member_ids[:2]
            trees[family.id] = {
                "surname": family.surname,
                "legendary_hook": family.legendary_hook,
                "members": [self._build_member_node(member_id, world) for member_id in roots if member_id in world.characters],
            }
        return trees

    def _build_member_node(self, character_id: str, world: WorldState) -> dict[str, Any]:
        character = world.characters[character_id]
        return {
            "id": character.id,
            "name": character.full_name,
            "age": character.age_years,
            "children": [self._build_member_node(child_id, world) for child_id in character.children_ids if child_id in world.characters],
        }
