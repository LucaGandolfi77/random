# src/utils/save_load.py
"""
Utility functions for saving and loading the EcoSystem game state.
The state includes species populations, resource levels, climate settings,
and mutation configuration.
"""

import json
from pathlib import Path
from typing import Any


def save_state(ecosystem) -> None:
    """
    Serialize the current state of the EcoSystem to a JSON file.
    """
    state = {
        "species": [
            {"name": sp.name, "population": sp.population}
            for sp in ecosystem.species_list
        ],
        "resources": {
            "food": ecosystem.resources.stores["food"],
            "water": ecosystem.resources.stores["water"],
            "space": ecosystem.resources.stores["space"]
        },
        "climate": {
            "event_interval": ecosystem.climate_interval,
            "events": ecosystem.climate_events
        },
        "mutation": {
            "probability_per_step": ecosystem.mutation_prob,
            "possible_traits": ecosystem.possible_traits
        }
    }
    Path("saved_state.json").write_text(json.dumps(state, indent=2))
    print("Game state saved to saved_state.json")


def load_state(filepath: str, ecosystem) -> None:
    """
    Load a previously saved game state from a JSON file and apply it
    to the provided EcoSystem instance.
    """
    state_str = Path(filepath).read_text()
    state = json.loads(state_str)

    # Restore species populations
    for sp_data in state["species"]:
        sp_name = sp_data["name"]
        pop = sp_data["population"]
        for sp in ecosystem.species_list:
            if sp.name == sp_name:
                sp.population = pop
                break

    # Restore resource levels
    res = state["resources"]
    ecosystem.resources.stores["food"] = res.get("food", 0.0)
    ecosystem.resources.stores["water"] = res.get("water", 0.0)
    ecosystem.resources.stores["space"] = res.get("space", 0.0)

    # Restore climate configuration
    climate = state["climate"]
    ecosystem.climate_interval = climate.get(
        "event_interval", ecosystem.climate_interval
    )
    ecosystem.climate_events = climate.get("events", ecosystem.climate_events)

    # Restore mutation configuration
    mutation = state["mutation"]
    ecosystem.mutation_prob = mutation.get(
        "probability_per_step", ecosystem.mutation_prob
    )
    ecosystem.possible_traits = mutation.get(
        "possible_traits", ecosystem.possible_traits
    )

    print("Game state loaded from", filepath)