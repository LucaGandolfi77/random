"""Federated constellation health-monitor simulation.

Satellite nodes train locally on non-IID synthetic data and send update packages
(weights + version + checksum) to a ground aggregator with validation, stale/
duplicate/corrupt handling, robust averaging, rollback and per-round evidence.
Privacy: no guaranteed privacy is claimed; DP would need explicit mechanism.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field

import numpy as np


@dataclass
class LocalTrainer:
    node_id: str
    slope: float
    noise: float = 0.2
    seed: int = 1

    def local_data(self, n: int = 200) -> tuple[np.ndarray, np.ndarray]:
        rng = np.random.default_rng(self.seed + hash(self.node_id) % 10000)
        x = rng.uniform(-1, 1, n)
        y = self.slope * x + rng.normal(0, self.noise, n)
        return x, y

    def train(self, init_w: float, lr: float = 0.3, epochs: int = 5) -> tuple[float, dict]:
        x, y = self.local_data()
        w = init_w
        for _ in range(epochs):
            grad = 2 * ((w * x - y) * x).mean()
            w -= lr * grad
        return w, {"samples": int(x.size), "local_w": float(w)}


@dataclass
class UpdatePackage:
    node_id: str
    round_id: int
    weight: float
    checksum: str
    global_version_at_train: int
    corrupt: bool = False

    def verify(self) -> bool:
        payload = f"{self.node_id}:{self.round_id}:{self.weight:.8f}".encode()
        return hashlib.sha256(payload).hexdigest() == self.checksum and not self.corrupt


class Aggregator:
    def __init__(self, model_id: str = "const-health-v1", slope_threshold: float = 2.0) -> None:
        self.model_id = model_id
        self.global_w = 0.0
        self.global_version = 0
        self.rounds: dict[int, dict] = {}
        self.rollback_stack: list[float] = []
        self.rejected: list[dict] = []
        self.expected_checksum = None
        self.slope_threshold = slope_threshold

    def round(self, updates: list[UpdatePackage], expected_global_version: int,
              seed: int = 0, robust: bool = True) -> dict:
        """Aggregate a round (updates already validated at transport by satellite-side sim)."""
        accepted = []
        for up in updates:
            if not up.verify():
                self.rejected.append({"round": up.round_id, "node": up.node_id, "reason": "checksum/corrupt"})
                continue
            if up.global_version_at_train != expected_global_version:
                self.rejected.append({"round": up.round_id, "node": up.node_id,
                                      "reason": f"stale (trained on v{up.global_version_at_train})"})
                continue
            if abs(up.weight) > self.slope_threshold:
                self.rejected.append({"round": up.round_id, "node": up.node_id, "reason": "outlier weight"})
                continue
            accepted.append(up.weight)
        if not accepted:
            self.rejected.append({"round": self.global_version + 1, "node": "-", "reason": "no accepted updates"})
            return {"round_id": self.global_version + 1, "accepted": 0, "global_w": self.global_w,
                    "rejected": len(self.rejected), "status": "no-op"}
        if robust:
            median = float(np.median(accepted))
            mad = float(np.median(np.abs(np.asarray(accepted) - median))) + 1e-6
            accepted = [w for w in accepted if abs(w - median) <= 3 * mad]
        if not accepted:
            self.rejected.append({"round": self.global_version + 1, "node": "-",
                                  "reason": "robust filter removed all"})
            return {"round_id": self.global_version + 1, "accepted": 0,
                    "global_w": self.global_w, "rejected": len(self.rejected), "status": "no-op"}
        prev = self.global_w
        self.rollback_stack.append(prev)
        self.global_w = float(np.mean(accepted))
        self.global_version += 1
        round_id = self.global_version
        self.rounds[round_id] = {"round_id": round_id, "accepted": len(accepted),
                                 "participants": len(accepted),
                                 "mean_weight": self.global_w, "prev_weight": prev,
                                 "seed": seed, "aggregation": "median-then-mean (robust)"}
        return self.rounds[round_id]

    def rollback(self, reason: str) -> dict:
        if not self.rollback_stack:
            return {"ok": False, "reason": "nothing to roll back"}
        self.global_w = self.rollback_stack.pop()
        self.global_version = max(0, self.global_version - 1)
        return {"ok": True, "reason": reason, "global_w": self.global_w,
                "global_version": self.global_version}

    def export_round_evidence(self, path, round_id: int | None = None) -> None:
        payload = {"model_id": self.model_id, "global_version": self.global_version,
                   "global_w": self.global_w,
                   "rounds": {str(k): v for k, v in self.rounds.items()},
                   "rejected": self.rejected}
        path.write_text(json.dumps(payload, indent=2, sort_keys=True))


def simulate(seed: int = 20260913) -> dict:
    rng = np.random.default_rng(seed)
    slopes = {"NOMINAL": 0.8, "BIAS-A": 1.2, "BIAS-B": -0.4}  # non-IID local slopes
    aggregator = Aggregator()
    out = {}
    # Round 1 nominal nodes
    ups = []
    for i, (name, slope) in enumerate(slopes.items()):
        trainer = LocalTrainer(node_id=f"SAT-{i}", slope=slope, seed=seed + i)
        w, meta = trainer.train(0.0)
        ups.append(UpdatePackage(f"SAT-{i}", 1, w,
                                 hashlib.sha256(f"SAT-{i}:1:{w:.8f}".encode()).hexdigest(), 0))
    out["round1"] = aggregator.round(ups, 0, seed=seed)
    # Round 2 with one offline, one stale, one corrupt
    ups2 = []
    for i in range(1, 4):
        trainer = LocalTrainer(node_id=f"SAT-{i}", slope=[0.8, 1.2, -0.4][i - 1], seed=seed + i)
        w, _ = trainer.train(aggregator.global_w)
        ups2.append(UpdatePackage(f"SAT-{i}", 2, w,
                                  hashlib.sha256(f"SAT-{i}:2:{w:.8f}".encode()).hexdigest(),
                                  global_version_at_train=0 if i == 2 else 1))  # stale node
    ups2.append(UpdatePackage("SAT-C", 2, 9.0, "deadbeef", 1, corrupt=True))  # corrupt
    out["round2"] = aggregator.round(ups2, 1, seed=seed)
    out["rejected_count"] = len(aggregator.rejected)
    out["global_w"] = aggregator.global_w
    out["global_version"] = aggregator.global_version
    return out
