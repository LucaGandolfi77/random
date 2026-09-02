"""Deterministic simulated lunar vertical descent (synthetic scenario).

State: x = [altitude (m), vertical velocity (m/s, + down), accel bias (m/s2)].
Process: altitude' = altitude + v*dt + 0.5*(a_cmd + bias + noise)*dt^2 ; v += ...
Measurements: altimeter range (Hz), IMU accel as control input, simulated ML
altitude estimate. All units SI; frame: body-aligned lunar vertical, origin at
initial altitude, positive downward toward the surface (documented in docs).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

DT = 0.1          # s, navigation/ML cadence
RANGE_HZ = 10     # altimeter updates per second
G_LUNAR = 1.62    # m/s^2


@dataclass
class TruthState:
    t: float = 0.0
    alt: float = 2000.0
    vel: float = 0.0
    bias: float = 0.0
    a_cmd: float = 0.0

    def state(self) -> np.ndarray:
        return np.array([self.alt, self.vel, self.bias])


@dataclass
class ScenarioFaults:
    """Fault injection timeline: sample index (10 Hz) -> behaviour."""
    imu_bias: float = 0.0            # added to IMU accel from start
    altimeter_bias: float = 0.0      # altimeter bias from start
    stuck_start: int = -1            # altimeter stuck value from sample
    missing_start: int = -1          # drop measurements from sample (single drop)
    stale_after: int = -1            # deliver stale (old) altimeter after sample
    outlier_at: int = -1             # single outlier at sample
    delay_samples: int = 0           # constant measurement delay
    ml_bias_from: int = -1           # ML estimate starts drifting (bias ramp)
    ml_stale_from: int = -1          # ML estimate goes stale (holds value)
    ml_nan_from: int = -1            # ML estimate NaN from sample
    ml_ood_from: int = -1            # ML 'OOD flag' raised from sample
    repeated_missing_from: int = -1  # drop all measurements from sample (covariance growth)
    seed: int = 20260902


@dataclass
class SimConfig:
    duration_s: float = 120.0
    initial_alt: float = 2000.0
    initial_vel: float = -0.0
    command_accel: float = 0.35      # constant braking command (m/s2 up => negative a)
    altimeter_sigma: float = 1.5     # m
    ml_sigma: float = 3.0            # m (ML error std)
    imu_accel_sigma: float = 0.05    # m/s2
    process_q: np.ndarray = field(default_factory=lambda: np.diag([0.05, 0.02, 1e-4]))


class DeterministicDynamics:
    """Simple closed-form reference (used for truth and checks)."""

    def __init__(self, cfg: SimConfig, seed: int = 20260902) -> None:
        self.cfg = cfg
        self.rng = np.random.default_rng(seed)

    def step(self, state: TruthState, dt: float = DT) -> TruthState:
        a_eff = self.cfg.command_accel + state.bias
        state.alt += state.vel * dt + 0.5 * a_eff * dt * dt
        state.vel += a_eff * dt
        state.t += dt
        state.a_cmd = self.cfg.command_accel
        return state


class SensorModel:
    """Simulated sensors with injectable faults (documented)."""

    def __init__(self, cfg: SimConfig, rng: np.random.Generator, faults: ScenarioFaults) -> None:
        self.cfg = cfg
        self.rng = rng
        self.f = faults
        self.last_true_alt = 0.0
        self.stuck_value = 0.0

    def measure(self, truth: TruthState, i: int) -> tuple[float | None, float]:
        """Return (altimeter range or None if missing, imu accel)."""
        # IMU accel with optional bias
        imu = self.cfg.command_accel + truth.bias + self.f.imu_bias + self.rng.normal(0, self.cfg.imu_accel_sigma)
        # altimeter
        if self.f.repeated_missing_from > -1 and i >= self.f.repeated_missing_from:
            return None, imu
        if i == self.f.outlier_at:
            return truth.alt + self.rng.normal(0, 5 * self.cfg.altimeter_sigma), imu
        if i == self.f.missing_start:
            return None, imu
        if i == self.f.stuck_start:
            self.stuck_value = truth.alt
            return self.stuck_value, imu
        if i > self.f.stuck_start > -1:
            return self.stuck_value, imu
        if i > self.f.stale_after > -1:
            # deliver stale measurement (value from 5 s ago)
            return self.last_true_alt, imu
        reading = truth.alt + self.f.altimeter_bias + self.rng.normal(0, self.cfg.altimeter_sigma)
        self.last_true_alt = reading
        return reading, imu
