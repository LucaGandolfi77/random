"""Hybrid AI FDIR assistant (detection -> isolation -> diagnosis -> prognosis ->
recovery recommendation). The AI supports the operator; irreversible recovery is
never commanded automatically.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class FailureMode:
    fid: str
    subsystem: str
    symptoms: list[str]
    possible_causes: list[str]
    affected_telemetry: list[str]
    detection_rule: str
    isolation_criteria: str
    severity: str
    recovery: str
    evidence: str
    residual_uncertainty: str
    irreversible: bool = False


@dataclass
class Incident:
    incident_id: str
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    state: str = "detected"
    detected_by: str = ""
    subsystem: str = ""
    candidate_modes: list[str] = field(default_factory=list)
    ranked_modes: list[dict] = field(default_factory=list)
    health_score: float = 1.0
    confidence: float = 0.0
    recommendation: str = ""
    operator_action: str = ""
    reason: str = ""
    unresolved: bool = False


class TelemetryProvider:
    """Simulated telemetry stream (local)."""

    def __init__(self, seed: int = 20260911) -> None:
        import numpy as np

        self.rng = np.random.default_rng(seed)

    def frame(self, fault: str = "nominal", t: float = 0.0) -> dict:
        import numpy as np

        if fault == "drift":
            return {"bus_v": 28.0 + 0.02 * t, "temp": 20 + 0.05 * t, "wheel": 1500.0,
                    "current": 3.0}
        if fault == "stuck":
            return {"bus_v": 28.0, "temp": 25.0, "wheel": 1500.0, "current": 2.2}
        if fault == "thermal":
            return {"bus_v": 28.0, "temp": 25.0 + 0.3 * t, "wheel": 1500.0, "current": 3.0}
        if fault == "power":
            return {"bus_v": 28.0 - 0.1 * t, "temp": 22.0, "wheel": 1500.0, "current": 4.5}
        return {"bus_v": 28.0 + self.rng.normal(0, 0.1), "temp": 22 + self.rng.normal(0, 0.5),
                "wheel": 1500.0 + self.rng.normal(0, 2.0), "current": 3.0 + self.rng.normal(0, 0.1)}


class FdirAssistant:
    LIMITS = {"bus_v": (27.0, 29.5), "temp": (5.0, 45.0), "wheel": (1100.0, 1900.0),
              "current": (1.0, 5.0)}
    RULES = {
        "drift": ("battery", "drift", "bus_v slope > 0.01 over window"),
        "thermal": ("battery", "thermal", "temp slope > 0.1"),
        "power": ("EPS", "power", "current > 4.0 or bus_v < 27.5"),
        "stuck": ("RWU", "stuck", "wheel var ~ 0 while mode changes"),
    }

    def __init__(self) -> None:
        self.catalog = {
            "FM-001": FailureMode("FM-001", "battery", ["bus drift"], ["sensor bias", "cell aging"],
                                  ["bus_v"], "drift", "slope sustained", "Medium",
                                  "Switch to redundant sensor; review cell", "ev-1", "bias plausible", irreversible=False),
            "FM-002": FailureMode("FM-002", "RWU", ["wheel stuck"], ["tachometer stuck", "wheel jam"],
                                  ["wheel"], "stuck", "zero variance", "High",
                                  "Degrade wheel mode; use thrusters (operator)", "ev-2", "high",
                                  irreversible=True),
            "FM-003": FailureMode("FM-003", "EPS", ["current high", "bus low"],
                                  ["cell imbalance", "load fault"], ["current", "bus_v"], "power",
                                  "current > limit", "High", "Load shed candidate (operator)", "ev-3", "medium"),
            "FM-004": FailureMode("FM-004", "battery", ["thermal rise"], ["charger fault", "thermistor"],
                                  ["temp"], "thermal", "temp slope", "Medium",
                                  "Derate charge; monitor", "ev-4", "medium"),
        }

    def analyze(self, history: list[dict]) -> Incident:
        inc = Incident(incident_id=f"INC-{len(history)}-{datetime.now(timezone.utc).strftime('%H%M%S')}")
        last = history[-1] if history else {}
        # deterministic-limit detection
        reasons = []
        for key, (lo, hi) in self.LIMITS.items():
            if key in last and not (lo <= last[key] <= hi):
                reasons.append(f"{key} out of limits")
        # rule/expert isolation using window aggregates (first vs last over history)
        if len(history) >= 3:
            first, last = history[0], history[-1]
            dt = (len(history) - 1) * 0.1
            bus_slope = _linreg([h["bus_v"] for h in history])
            temp_slope = _linreg([h["temp"] for h in history])
            wheel_var = _variance([h["wheel"] for h in history])
            bus_var = _variance([h["bus_v"] for h in history])
            if bus_slope > 0.012:
                inc.subsystem, inc.detected_by, _ = self.RULES["drift"]
                inc.candidate_modes = ["FM-001", "FM-004"]
            elif temp_slope > 0.1:
                inc.subsystem, inc.detected_by, _ = self.RULES["thermal"]
                inc.candidate_modes = ["FM-004"]
            elif last["current"] > 4.0 or bus_slope < -0.05:
                inc.subsystem, inc.detected_by, _ = self.RULES["power"]
                inc.candidate_modes = ["FM-003"]
            elif wheel_var < 1e-6 and bus_var < 1e-6:
                inc.subsystem, inc.detected_by, _ = self.RULES["stuck"]
                inc.candidate_modes = ["FM-002"]
        if reasons and not inc.candidate_modes:
            inc.candidate_modes = ["FM-001", "FM-002", "FM-003", "FM-004"]
        if not reasons and not inc.candidate_modes:
            inc.state = "nominal"
            inc.health_score = 1.0
            return inc
        # rank candidates (simple: catalog order + severity)
        ranked = []
        for cid in inc.candidate_modes:
            fm = self.catalog.get(cid)
            if fm:
                ranked.append({"failure_mode": cid, "severity": fm.severity, "score": 1.0})
        ranked.sort(key=lambda r: {"High": 0, "Medium": 1, "Low": 2}.get(r["severity"], 3))
        inc.ranked_modes = ranked
        inc.confidence = 0.55 if len(ranked) <= 1 else 0.4
        inc.health_score = max(0.0, 1.0 - 0.25 * len(ranked))
        top = self.catalog.get(inc.ranked_modes[0]["failure_mode"]) if inc.ranked_modes else None
        if top and not top.irreversible:
            inc.recommendation = f"Review {top.fid} ({top.recovery}); operator decision required."
        else:
            inc.recommendation = "Candidate involves irreversible recovery: operator decision required."
        inc.unresolved = True
        return inc

    def operator_resolve(self, inc: Incident, action: str, reason: str) -> Incident:
        inc.operator_action = action
        inc.reason = reason
        inc.state = "resolved" if action != "defer" else "deferred"
        inc.unresolved = action == "defer"
        return inc


def eval_scenarios(history_len: int = 30) -> dict:
    provider = TelemetryProvider()
    assistant = FdirAssistant()
    outcomes = {}
    for fault in ("nominal", "drift", "stuck", "thermal", "power"):
        history = [provider.frame(fault=fault, t=i * 0.1) for i in range(history_len)]
        inc = assistant.analyze(history)
        outcomes[fault] = {"state": inc.state, "subsystem": inc.subsystem,
                           "candidates": inc.candidate_modes, "ranked0": inc.ranked_modes[0]
                           if inc.ranked_modes else None,
                           "recommendation": inc.recommendation}
    return outcomes


def _variance(values) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    mean = sum(values) / n
    return sum((v - mean) ** 2 for v in values) / (n - 1)


def _linreg(values) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    xs = [i * 0.1 for i in range(n)]
    mx = sum(xs) / n
    my = sum(values) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, values))
    den = sum((x - mx) ** 2 for x in xs)
    return num / den if den else 0.0

