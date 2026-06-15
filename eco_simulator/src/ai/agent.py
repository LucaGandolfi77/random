# src/ai/agent.py
"""
Artificial Intelligence agents that can control species behavior
in the Eco‑Simulator ecosystem. This module demonstrates a simple
reinforcement‑learning (PPO) agent that learns to place new individuals
on the island map to maximize population growth while respecting
resource limits.
"""

import numpy as np
import simpy
from stable_baselines3 import PPO
from collections import deque
from typing import Dict, Any, List


class AIController:
    """
    Wrapper around a Stable‑Baselines3 PPO model that decides
    when and where to spawn a species based on the current
    ecosystem state.
    """

    def __init__(self, env: simpy.Environment, species_name: str,
                 config: Dict[str, Any]):
        """
        Parameters
        ----------
        env: simpy.Environment
            The shared simulation environment.
        species_name: str
            Name of the species this agent controls (must exist in config).
        config: dict
            Full configuration dictionary (used to fetch mutation params,
            resource limits, etc.).
        """
        self.env = env
        self.species_name = species_name
        self.config = config

        # Observation: [population_of_target_species,
        #                available_food, available_water, available_space]
        self.observation_space = 4
        # Action space: 0 = do nothing, 1 = spawn one individual,
        #               2 = spawn multiple (if resources allow)
        self.action_space = 3

        # Load or train a PPO model.
        # If a pre‑trained model exists, load it; otherwise, create a dummy model.
        model_path = f"ai_models/{species_name}_ppo.zip"
        try:
            self.policy = PPO.load(model_path)
        except Exception:
            # Dummy policy – always choose to do nothing
            self.policy = PPO(
                "MlpPolicy",
                env=simpy.Env(),
                verbose=0,
                tensorboard_log="ai_logs/",
            )
            # Save a placeholder model so that future runs can load it
            self.policy.save(model_path)

    def _get_observation(self) -> np.ndarray:
        """
        Build the current observation vector.
        """
        # Find the species we control
        target_sp = next(
            (sp for sp in self.config["species"] if sp["name"] == self.species_name),
            None,
        )
        if not target_sp:
            return np.zeros(self.observation_space)

        # Gather global resource levels
        res = self.env._ecosystem.resources.stores
        food = res["food"] / (res["food"] + res["water"] + res["space"] + 1e-6)
        water = res["water"] / (res["food"] + res["water"] + res["space"] + 1e-6)
        space = res["space"] / (res["food"] + res["water"] + res["space"] + 1e-6)

        # Population of the target species
        pop = target_sp.population

        return np.array([pop, food, water, space], dtype=np.float32)

    def act(self, observation: np.ndarray) -> int:
        """
        Given an observation, return the action (0‑2) that the agent should take.
        """
        # Reshape for PPO model (batch size = 1, 1 step)
        obs = observation.reshape(1, -1)
        action, _ = self.policy.predict(obs, deterministic=True)
        return int(action[0])


# ----------------------------------------------------------------------
# Helper to register AI controllers with the EcoSystem
# ----------------------------------------------------------------------
def register_ai_controllers(ecosystem, cfg) -> Dict[str, AIController]:
    """
    Create AIController instances for each species marked as AI‑controlled
    in the configuration and store them in a dict.

    The config must contain a top‑level key ``"ai_species"`` that lists
    species names to be controlled by AI.
    """
    ai_controllers = {}
    if "ai_species" not in cfg:
        return ai_controllers

    for species_name in cfg["ai_species"]:
        controller = AIController(env=ecosystem.env,
                                  species_name=species_name,
                                  config=cfg)
        ai_controllers[species_name] = controller
    return ai_controllers