"""Digital Twin / HIL-oriented test bench (lunar descent scenario, deterministic).

Protocol version 1.0 — local shared-file IPC is NOT used; components communicate
through in-process interfaces with explicit simulation-time management. Levels:
MIL/SIL runnable here; PIL requires an embedded adapter (simulated); HIL requires
real hardware (Not Executed, explicitly marked).
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path

PROTOCOL_VERSION = "1.0"


@dataclass
class SimClock:
    sim_time: float = 0.0
    dt: float = 0.1
    wall_start: float = field(default_factory=time.monotonic)
    paused: bool = False
    speed: float = 1.0

    def tick(self) -> None:
        if not self.paused:
            self.sim_time += self.dt

    def wall_elapsed(self) -> float:
        return time.monotonic() - self.wall_start

    def sync(self, external_ts: float) -> bool:
        return abs(external_ts - self.sim_time) <= 1e-6


@dataclass
class TelemetrySample:
    ts: float
    alt: float
    vel: float
    mode: str
    cage_ok: bool
    actuator_cmd: float


class PhysicalPlant:
    """Simple deterministic lunar vertical descent plant (units SI)."""

    def __init__(self, seed: int = 20260905, initial_alt: float = 2000.0, g: float = 1.62) -> None:
        self.rng = __import__("numpy").random.default_rng(seed)
        self.alt = initial_alt
        self.vel = 0.0
        self.g = g

    def step(self, actuator_accel: float, noise: float = 0.0) -> None:
        a = actuator_accel + noise + self.rng.normal(0, 0.01)
        self.vel += a * 0.1
        self.alt += self.vel * 0.1
        self.alt = max(self.alt, 0.0)

    def sample(self, ts: float) -> TelemetrySample:
        return TelemetrySample(ts=ts, alt=self.alt, vel=self.vel, mode="SIL", cage_ok=True,
                               actuator_cmd=0.0)


class SafetyMonitor:
    def evaluate(self, alt: float, vel: float) -> tuple[bool, str]:
        if alt < 5.0 and vel > 2.0:
            return False, "SAFE_STATE_TOUCHDOWN_RISK"
        if alt < 0.0:
            return False, "BELOW_SURFACE"
        return True, "OK"


class TestBench:
    """MIL/SIL runner; PIL/HIL only via adapters (explicit)."""

    def __init__(self, seed: int = 20260905, dt: float = 0.1, level: str = "SIL") -> None:
        if level not in ("MIL", "SIL"):
            raise ValueError("PIL/HIL require an adapter and are not executed in this bench")
        self.level = level
        self.clock = SimClock(dt=dt)
        self.plant = PhysicalPlant(seed=seed)
        self.monitor = SafetyMonitor()
        self.telemetry: list[TelemetrySample] = []
        self.seed = seed
        self.protocol = PROTOCOL_VERSION

    def run(self, steps: int = 100) -> dict:
        start_wall = self.clock.wall_start
        for _ in range(steps):
            self.plant.step(0.35)
            self.clock.tick()
            sample = self.plant.sample(self.clock.sim_time)
            ok, reason = self.monitor.evaluate(sample.alt, sample.vel)
            sample.cage_ok = ok
            sample.mode = self.level
            self.telemetry.append(sample)
            if not ok:
                break
        return {"level": self.level, "steps": len(self.telemetry),
                "final_alt": self.plant.alt, "final_vel": self.plant.vel,
                "wall_s": round(time.monotonic() - start_wall, 4),
                "protocol": self.protocol, "seed": self.seed}


def export_evidence(bench: TestBench, out: Path) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    rows = [{"ts": s.ts, "alt": round(s.alt, 3), "vel": round(s.vel, 3), "mode": s.mode,
             "cage_ok": s.cage_ok, "actuator_cmd": s.actuator_cmd} for s in bench.telemetry]
    report = {"protocol_version": PROTOCOL_VERSION, "level": bench.level, "seed": bench.seed,
              "rows": rows, "steps": len(rows),
              "final": rows[-1] if rows else None}
    p = out / f"evidence_{bench.level}_{bench.seed}.json"
    p.write_text(json.dumps(report, indent=2, sort_keys=True))
    return p
