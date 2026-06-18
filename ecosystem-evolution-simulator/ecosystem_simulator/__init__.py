"""Ecosystem Evolution Simulator - Real-time species evolution with genetic lineage tracking."""

from .core.species import Species, Trait
from .core.ecosystem import Ecosystem
from .core.simulation import SimulationEngine
from .ui.population_chart import PopulationChart
from .ui.genetic_tree import GeneticLineageTree

__version__ = "1.0.0"
__all__ = [
    "Species",
    "Trait",
    "Ecosystem",
    "SimulationEngine",
    "PopulationChart",
    "GeneticLineageTree",
]