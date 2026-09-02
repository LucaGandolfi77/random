"""Shielded RL for safe autonomy (simulated lunar descent, 1-D).

Compares deterministic controller, unprotected RL policy, RL + runtime shield,
RL with action constraints, deterministic fallback. The shield is deterministic;
no second RL policy is used as protection.
"""
from __future__ import annotations

import numpy as np


class DescentEnv:
    """1-D lunar descent. state=(alt, vel); action = acceleration (m/s2)."""

    def __init__(self, g: float = 1.62, dt: float = 0.1, max_alt: float = 2000.0,
                 min_alt: float = 0.0, fuel: float = 100.0) -> None:
        self.g = g
        self.dt = dt
        self.max_alt = max_alt
        self.min_alt = min_alt
        self.fuel = fuel
        self.steps = 0
        self.reset()

    def reset(self, alt: float | None = None, vel: float | None = None) -> np.ndarray:
        self.alt = float(alt) if alt is not None else 1500.0
        self.vel = float(vel) if vel is not None else 0.0
        self.fuel = 100.0
        self.steps = 0
        self.done = False
        return self._obs()

    def _obs(self) -> np.ndarray:
        return np.array([self.alt, self.vel, self.fuel])

    def step(self, a: float) -> tuple[np.ndarray, float, bool, dict]:
        if self.done:
            return self._obs(), 0.0, True, {}
        a = float(a)
        self.steps += 1
        # actuator saturation
        a = np.clip(a, -3.0, 3.0)
        self.alt += self.vel * self.dt + 0.5 * (a + self.g) * self.dt * self.dt
        self.vel += (a + self.g) * self.dt
        fuel_use = abs(a) * self.dt
        self.fuel = max(0.0, self.fuel - fuel_use)
        info = {}
        reward = 0.0
        if self.alt <= 0.0:  # touchdown
            self.done = True
            if abs(self.vel) <= 2.0:
                reward = 100.0 - self.steps * 0.1
                info["outcome"] = "success"
            else:
                reward = -50.0
                info["outcome"] = "crash"
                info["safety_violation"] = "high_touchdown_velocity"
        elif self.alt > self.max_alt:
            self.done = True
            reward = -50.0
            info["outcome"] = "escaped"
        elif self.steps >= 500:
            self.done = True
            reward = -10.0
            info["outcome"] = "timeout"
        elif self.fuel <= 0 and self.alt > 5.0:
            info["low_fuel"] = True
        return self._obs(), reward, self.done, info


def deterministic_controller(obs: np.ndarray) -> float:
    alt, vel, fuel = obs
    # simple gravity-compensating bang-bang guidance
    a = -(self_g := 1.62)
    if vel < -1.0:  # falling fast: brake
        a = -3.0
    elif vel > 1.0:
        a = -1.0
    if fuel <= 0:
        a = 0.0
    return float(np.clip(a, -3.0, 3.0))


def rl_policy(obs: np.ndarray, w: float = 0.6, bias: float = 0.0) -> float:
    """Stand-in learned policy (linear): brake proportional to velocity."""
    alt, vel, fuel = obs
    return float(np.clip(bias + w * vel, -3.0, 3.0))


def shield_action(obs: np.ndarray, proposed: float, dt: float = 0.1,
                  g: float = 1.62) -> tuple[float, bool, str]:
    """Deterministic runtime shield: block unsafe action, replace, record reason."""
    alt, vel, fuel = obs
    vel_next = vel + (proposed + g) * dt
    if alt + vel_next * dt < 5.0 and vel_next < -2.0:
        safe = float(np.clip(-3.0, -3.0, 3.0))
        return safe, True, "unsafe_touchdown_velocity_replaced"
    if proposed < -3.0 or proposed > 3.0:
        return float(np.clip(proposed, -3.0, 3.0)), True, "action_out_of_range_clipped"
    return float(proposed), False, ""


def run_episode(env: DescentEnv, policy, shield: bool, obs_noise: float = 0.0,
                max_steps: int = 500, shield_on_every_step: bool = True,
                seed: int = 1, initial: tuple[float, float] | None = None) -> dict:
    rng = np.random.default_rng(seed)
    obs = env.reset(*initial) if initial else env.reset()
    interventions = 0
    steps = 0
    outcome = "timeout"
    while not env.done and steps < max_steps:
        noisy = obs + rng.normal(0, obs_noise, size=obs.shape) if obs_noise else obs
        proposed = policy(noisy)
        action = proposed
        reason = ""
        if shield:
            action, intervened, reason = shield_action(obs, proposed)
            if intervened:
                interventions += 1
        obs, reward, env.done, info = env.step(action)
        steps += 1
        if env.done:
            outcome = info.get("outcome", "timeout")
    return {"outcome": outcome, "steps": steps, "interventions": interventions,
            "alt": env.alt, "vel": env.vel, "fuel": env.fuel,
            "shield_reason_last": reason}


def compare_policies(n_episodes: int = 40, seed: int = 20260914, obs_noise: float = 0.02) -> dict:
    rows = {
        "deterministic": {"policy": lambda o: deterministic_controller(o), "shield": False},
        "rl_unshielded": {"policy": lambda o: rl_policy(o, w=1.4), "shield": False},
        "rl_shielded": {"policy": lambda o: rl_policy(o, w=1.4), "shield": True},
        "rl_constrained": {"policy": lambda o: np.clip(rl_policy(o, w=1.4), -2.0, 2.0), "shield": False},
        "fallback": {"policy": lambda o: 0.0, "shield": False},
    }
    out = {}
    for name, cfg in rows.items():
        env = DescentEnv()
        stats = {"success": 0, "crash": 0, "interventions": []}
        for ep in range(n_episodes):
            res = run_episode(env, cfg["policy"], cfg["shield"], obs_noise=obs_noise, seed=seed + ep)
            stats["success"] += res["outcome"] == "success"
            stats["crash"] += res["outcome"] == "crash"
            stats["interventions"].append(res["interventions"])
        out[name] = {"success_rate": stats["success"] / n_episodes,
                     "crash_rate": stats["crash"] / n_episodes,
                     "mean_interventions": float(np.mean(stats["interventions"]))}
    return out
