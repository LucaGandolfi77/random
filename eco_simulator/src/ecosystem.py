# /workspaces/random/eco_simulator/src/ecosystem.py
# Core SimPy model: Species, ResourcePool, and event processes.
import simpy
import random
from typing import List, Dict, Any

# ----------------------------------------------------------------------
# Species definition
# ----------------------------------------------------------------------
class Species:
    """
    A species in the ecosystem.
    Attributes:
        name:          Common name.
        diet:          "herbivore", "carnivore", etc.
        prey:          List of species names it can eat.
        traits:        Dict of special abilities (e.g., mutation_chance).
        population:    Current population count.
        growth_rate:   Base per‑step growth multiplier.
    """
    def __init__(self, env: simpy.Environment, name: str, diet: str,
                 prey: List[str], traits: Dict[str, Any]):
        self.env = env
        self.name = name
        self.diet = diet
        self.prey = prey
        self.traits = traits
        self.population = traits.get("initial_population", 1)
        self.growth_rate = traits.get("reproduction_rate", 0.1)
        self.carrying_capacity = traits.get("carrying_capacity", 100)
        self.mutation_chance = traits.get("mutation_chance", 0.05)

        # Store reference for later lookup
        EcoSystem._species_lookup[name] = self

    def __repr__(self):
        return f"<Species {self.name} pop={self.population}>"

# ----------------------------------------------------------------------
# Resource pool
# ----------------------------------------------------------------------
class ResourcePool:
    """
    Holds limited resources (food, water, space).
    Provides simple competition logic.
    """
    def __init__(self, env: simpy.Environment, limits: Dict[str, float]):
        self.env = env
        self.limits = limits.copy()
        self.stores = {key: 0.0 for key in limits.keys()}

    def add_resource(self, name: str, amount: float):
        self.stores[name] = min(self.stores[name] + amount, self.limits[name])

    def consume(self, name: str, amount: float):
        self.stores[name] = max(self.stores[name] - amount, 0.0)

    def available(self, name: str) -> float:
        return self.stores[name]

# ----------------------------------------------------------------------
# Ecosystem container
# ----------------------------------------------------------------------
class EcoSystem:
    """
    Central container that holds all SimPy processes:
    - population growth & mutation,
    - predator‑prey interactions,
    - competition for resources,
    - climate events.
    """
    _species_lookup: Dict[str, Species] = {}

    def __init__(self, env: simpy.Environment, config: Dict[str, Any]):
        self.env = env
        self.cfg = config

        # Create species instances
        self.species_list: List[Species] = []
        for sp in config["species"]:
            sp_obj = Species(
                env,
                name=sp["name"],
                diet=sp["diet"],
                prey=sp["prey"],
                traits=sp["traits"]
            )
            self.species_list.append(sp_obj)

        # Resource pool initialized with limits from config
        self.resources = ResourcePool(env, config["resources"])

        # Climate event handling
        self.climate_interval = config["climate"]["event_interval"]
        self.climate_events = config["climate"]["events"]

        # Mutation configuration
        self.mutation_prob = config["mutation"]["probability_per_step"]
        self.possible_traits = config["mutation"]["possible_traits"]

    # ------------------------------------------------------------------
    # Process: population growth & mutation
    # ------------------------------------------------------------------
    def population_process(self, species: Species):
        while True:
            yield self.env.timeout(species.growth_rate)
            # Reproduction
            growth = species.population * species.growth_rate
            # Apply carrying capacity limit
            new_pop = min(species.population + growth, species.carrying_capacity)
            species.population = new_pop

            # Mutation chance
            if random.random() < species.mutation_chance:
                new_traits = generate_mutation()
                species.traits.update(new_traits)

    # ------------------------------------------------------------------
    # Process: competition for resources
    # ------------------------------------------------------------------
    def competition_process(self):
        while True:
            yield self.env.timeout(1)  # check every step
            for sp in self.species_list:
                # Simple competition: each individual needs 1 unit of food/water/space
                needed = sp.population
                for res in ["food", "water", "space"]:
                    avail = self.resources.available(res)
                    if needed > avail:
                        # Reduce growth proportionally
                        reduction = needed / avail
                        sp.population = max(sp.population - reduction, 0)
                    else:
                        self.resources.consume(res, needed)

    # ------------------------------------------------------------------
    # Process: predator‑prey interactions
    # ------------------------------------------------------------------
    def predation_process(self):
        while True:
            yield self.env.timeout(1)
            for sp in self.species_list:
                if sp.diet == "carnivore":
                    for prey_name in sp.prey:
                        prey = EcoSystem._species_lookup.get(prey_name)
                        if prey and prey.population > 0:
                            # Predator consumes prey proportionally
                            consumption = min(prey.population, sp.population)
                            prey.population = max(prey.population - consumption, 0)
                            sp.population = min(sp.population + consumption, sp.carrying_capacity)

    # ------------------------------------------------------------------
    # Process: climate events
    # ------------------------------------------------------------------
    def climate_process(self):
        while True:
            yield self.env.timeout(self.climate_interval)
            event = random.choice(self.climate_events)
            if event == "drought":
                self.resources.consume("food", 0.3 * sum(self.resources.stores.values()))
                print("[Climate] Drought reduces food availability.")
            elif event == "flood":
                self.resources.consume("water", 0.3 * sum(self.resources.stores.values()))
                print("[Climate] Flood reduces water availability.")
            elif event == "temperature_shift":
                # Randomly adjust reproduction rates
                for sp in self.species_list:
                    factor = random.uniform(0.5, 1.5)
                    sp.growth_rate *= factor
                print("[Climate] Temperature shift modifies reproduction rates.")

    # ------------------------------------------------------------------
    # Public method to start all processes
    # ------------------------------------------------------------------
    def start_all(self):
        # Launch a process for each species
        for sp in self.species_list:
            self.env.process(self.population_process(sp))

        # Launch competition, predation, and climate processes
        self.env.process(self.competition_process())
        self.env.process(self.predation_process())
        self.env.process(self.climate_process())

        # Optional: start a process that updates dashboard data
        self.env.process(self._monitor_for_dashboard)

    # ------------------------------------------------------------------
    # Helper for dashboard updates (exposes current state)
    # ------------------------------------------------------------------
    async def _monitor_for_dashboard(self):
        while True:
            # Yield control back to SimPy
            yield self.env.timeout(0)
            # Store current metrics in a place the UI can read
            EcoSystem.last_metrics = {
                "populations": {sp.name: sp.population for sp in self.species_list},
                "resources": self.resources.stores.copy(),
                "climate_interval": self.climate_interval
            }