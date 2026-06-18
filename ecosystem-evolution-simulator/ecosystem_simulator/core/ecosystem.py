"""Ecosystem management for species interactions and resource dynamics."""

from typing import Dict, List, Optional
import random
from .species import Species


class Ecosystem:
    """Manages species interactions, resources, and environmental events."""

    def __init__(self):
        self.species: Dict[str, Species] = {}
        self.resources: Dict[str, float] = {
            "food": 1000.0,
            "water": 1000.0,
            "space": 1000.0,
        }
        self.climate_events: List[str] = ["drought", "flood", "temperature_shift"]
        self.time: float = 0.0
        self.event_log: List[Dict] = []

    def add_species(self, species: Species) -> None:
        """Add a species to the ecosystem."""
        self.species[species.id] = species

    def remove_species(self, species_id: str) -> None:
        """Remove a species from the ecosystem."""
        if species_id in self.species:
            del self.species[species_id]

    def step(self, dt: float = 1.0) -> None:
        """Advance ecosystem simulation by one time step."""
        self.time += dt

        # Update populations
        for species in self.species.values():
            species.update_population(dt)

        # Handle predator-prey interactions
        self._process_predation()

        # Random chance of reproduction
        self._process_reproduction()

        # Random climate events
        if random.random() < 0.01:
            self._trigger_climate_event()

    def _process_predation(self) -> None:
        """Process predator-prey population dynamics."""
        for predator in self.species.values():
            for prey_name in predator.prey:
                prey = next((s for s in self.species.values() if s.name == prey_name), None)
                if prey and prey.population > 0:
                    consumption = min(prey.population * 0.1, predator.population * 0.2)
                    prey.population = max(0, prey.population - int(consumption))
                    predator.population = min(
                        predator.carrying_capacity,
                        predator.population + int(consumption * 0.5)
                    )

    def _process_reproduction(self) -> None:
        """Process species reproduction and potential speciation."""
        for species in list(self.species.values()):
            if species.population >= species.carrying_capacity * 0.8:
                if random.random() < 0.1:
                    offspring = species.reproduce()
                    if offspring:
                        count = len([s for s in self.species.values()
                                     if s.name.startswith(species.name)]) + 1
                        offspring.name = f"{species.name} {count}"
                        self.add_species(offspring)
                        self.event_log.append({
                            "time": self.time,
                            "event": "speciation",
                            "species": offspring.name,
                            "parent": species.name,
                        })

    def _trigger_climate_event(self) -> None:
        """Trigger a random climate event affecting resources."""
        event = random.choice(self.climate_events)
        if event == "drought":
            self.resources["water"] *= 0.7
            self.resources["food"] *= 0.9
        elif event == "flood":
            self.resources["water"] *= 1.2
            self.resources["space"] *= 0.8
        elif event == "temperature_shift":
            for species in self.species.values():
                if "metabolism" in species.traits:
                    species.traits["metabolism"].mutate()

        self.event_log.append({"time": self.time, "event": event})

    def get_population_data(self) -> Dict[str, int]:
        """Get current population counts for all species."""
        return {species.name: species.population for species in self.species.values()}

    def get_genetic_tree(self) -> Dict:
        """Build genetic lineage tree structure."""
        nodes = []
        edges = []

        for species in self.species.values():
            nodes.append({
                "id": species.id,
                "label": species.name,
                "generation": species.generation,
                "population": species.population,
            })
            if species.parent_id:
                edges.append({
                    "source": species.parent_id,
                    "target": species.id,
                    "weight": 1.0,
                })

        return {"nodes": nodes, "edges": edges}