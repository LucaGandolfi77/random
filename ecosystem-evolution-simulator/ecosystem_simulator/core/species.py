"""Species and genetic trait definitions for ecosystem simulation."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
import random
import uuid


@dataclass
class Trait:
    """Genetic trait with inheritance and mutation capabilities."""
    name: str
    value: float
    min_value: float = 0.0
    max_value: float = 1.0
    mutation_rate: float = 0.05
    mutation_strength: float = 0.1

    def mutate(self) -> None:
        """Apply random mutation to trait value."""
        if random.random() < self.mutation_rate:
            delta = random.gauss(0, self.mutation_strength)
            self.value = max(self.min_value, min(self.max_value, self.value + delta))

    def copy(self) -> "Trait":
        """Create a copy of this trait."""
        return Trait(
            name=self.name,
            value=self.value,
            min_value=self.min_value,
            max_value=self.max_value,
            mutation_rate=self.mutation_rate,
            mutation_strength=self.mutation_strength,
        )


@dataclass
class Species:
    """A species with genetic traits and population dynamics."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Unnamed"
    population: int = 10
    traits: Dict[str, Trait] = field(default_factory=dict)
    prey: List[str] = field(default_factory=list)
    predators: List[str] = field(default_factory=list)
    birth_rate: float = 0.1
    death_rate: float = 0.05
    carrying_capacity: int = 1000
    generation: int = 0
    parent_id: Optional[str] = None

    def add_trait(self, trait: Trait) -> None:
        """Add a genetic trait to this species."""
        self.traits[trait.name] = trait

    def reproduce(self) -> Optional["Species"]:
        """Create offspring with potential mutations."""
        if self.population < 2:
            return None

        offspring = Species(
            name=self.name,
            population=1,
            traits={name: trait.copy() for name, trait in self.traits.items()},
            prey=self.prey.copy(),
            predators=self.predators.copy(),
            birth_rate=self.birth_rate,
            death_rate=self.death_rate,
            carrying_capacity=self.carrying_capacity,
            generation=self.generation + 1,
            parent_id=self.id,
        )

        # Apply mutations to offspring traits
        for trait in offspring.traits.values():
            trait.mutate()

        return offspring

    def update_population(self, dt: float = 1.0) -> None:
        """Update population based on birth/death rates and carrying capacity."""
        growth = self.population * (self.birth_rate - self.death_rate) * dt
        self.population = int(max(0, min(self.carrying_capacity, self.population + growth)))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize species to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "population": self.population,
            "traits": {name: {"value": t.value, "min": t.min_value, "max": t.max_value}
                      for name, t in self.traits.items()},
            "generation": self.generation,
            "parent_id": self.parent_id,
        }