"""Simulation engine using SimPy for discrete-event ecosystem modeling."""

import simpy
from typing import Callable, Optional
from .ecosystem import Ecosystem


class SimulationEngine:
    """Manages the SimPy-based ecosystem simulation."""

    def __init__(self, ecosystem: Ecosystem, speed: float = 1.0):
        self.env = simpy.Environment()
        self.ecosystem = ecosystem
        self.speed = speed
        self.running = False
        self._process: Optional[simpy.Process] = None

    def start(self) -> None:
        """Start the simulation process."""
        if not self.running:
            self.running = True
            self._process = self.env.process(self._run_simulation())

    def stop(self) -> None:
        """Stop the simulation."""
        self.running = False

    def step(self, dt: float = 1.0) -> None:
        """Advance simulation by one step."""
        if self.running:
            self.ecosystem.step(dt * self.speed)
            self.env.step()

    def _run_simulation(self):
        """Internal SimPy process for continuous simulation."""
        while True:
            self.ecosystem.step(self.speed)
            yield self.env.timeout(1.0)

    def get_time(self) -> float:
        """Get current simulation time."""
        return self.ecosystem.time