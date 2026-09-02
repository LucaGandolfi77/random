"""Property schema, interval bound propagation and result classification.

Statuses: Verified / Falsified / Unknown / Tested by Sampling / Unsupported.
Statistical sampling is never reported as formal proof.
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from .model import forward_logit

STATUS_VERIFIED = "Verified"
STATUS_FALSIFIED = "Falsified"
STATUS_UNKNOWN = "Unknown"
STATUS_SAMPLING = "Tested by Sampling"
STATUS_UNSUPPORTED = "Unsupported"

PROPERTY_KEYS = ("property_id", "model_id", "model_version", "input_lower", "input_upper",
                 "output_constraint", "method", "timeout_s", "tolerance")


@dataclass
class Property:
    property_id: str
    model_id: str
    model_version: str
    input_lower: np.ndarray
    input_upper: np.ndarray
    output_constraint: dict          # {"relation": "lt", "value": 0.8} on probability
    method: str = "interval-propagation"
    timeout_s: float = 5.0
    tolerance: float = 1e-4

    @classmethod
    def from_dict(cls, raw: dict) -> "Property":
        missing = [k for k in PROPERTY_KEYS if k not in raw]
        if missing:
            raise ValueError(f"property missing fields: {missing}")
        lower = np.asarray(raw["input_lower"], dtype=np.float64)
        upper = np.asarray(raw["input_upper"], dtype=np.float64)
        if lower.shape != upper.shape or lower.ndim != 1 or lower.size == 0:
            raise ValueError("invalid input bounds shape")
        if np.any(lower > upper):
            raise ValueError("input_lower exceeds input_upper")
        constraint = raw["output_constraint"]
        if constraint.get("relation") not in ("lt", "le", "gt", "ge", "ne", "in"):
            raise ValueError(f"unsupported relation {constraint.get('relation')}")
        if "value" not in constraint and constraint.get("relation") != "in":
            raise ValueError("output constraint requires value")
        return cls(
            property_id=str(raw["property_id"]),
            model_id=str(raw["model_id"]),
            model_version=str(raw["model_version"]),
            input_lower=lower,
            input_upper=upper,
            output_constraint=constraint,
            method=str(raw.get("method", "interval-propagation")),
            timeout_s=float(raw.get("timeout_s", 5.0)),
            tolerance=float(raw.get("tolerance", 1e-4)),
        )

    def validate_against_model(self, model: dict) -> None:
        if self.model_id != model["model_id"]:
            raise ValueError("property model_id does not match model")
        if self.input_lower.size != model["W1"].shape[0]:
            raise ValueError("property dimension does not match model input dimension")


@dataclass
class BoundResult:
    lower: float
    upper: float
    checked_samples: int = 0
    witness: np.ndarray | None = None


def relu_interval(l: np.ndarray, u: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    return np.maximum(l, 0.0), np.maximum(u, 0.0)


def affine_interval(l: np.ndarray, u: np.ndarray, W: np.ndarray, b: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    # sound outer product: midpoint + half-range abs
    mid = 0.5 * (l + u)
    half = 0.5 * (u - l)
    mean_out = mid @ W + b
    radius = half @ np.abs(W)
    return mean_out - radius, mean_out + radius


def interval_bounds(model: dict, prop: Property) -> tuple[float, float]:
    """Interval bound propagation over ReLU layers (logit). Adds outward tolerance guard."""
    l, u = prop.input_lower.astype(np.float64), prop.input_upper.astype(np.float64)
    l, u = affine_interval(l, u, model["W1"], model["B1"])
    l, u = relu_interval(l, u)
    l, u = affine_interval(l, u, model["W2"], np.array([model["B2"]]))
    guard = prop.tolerance * 10.0
    return float(l[0] - guard), float(u[0] + guard)


def sample_search(model: dict, prop: Property, max_samples: int = 4000, seed: int = 20260903) -> BoundResult:
    rng = np.random.default_rng(seed)
    lo = prop.input_lower
    hi = prop.input_upper
    violator: np.ndarray | None = None
    checked = 0
    deadline = time.monotonic() + prop.timeout_s
    while checked < max_samples and time.monotonic() < deadline:
        x = rng.uniform(lo, hi)
        checked += 1
        z = float(forward_logit(model, x)[0])
        p = float(1.0 / (1.0 + np.exp(-z)))
        if violates(prop, p):
            violator = x
            break
    # deterministic grid on low dims adds coverage
    if violator is None:
        grid = np.meshgrid(*[np.linspace(lo[i], hi[i], 9) for i in range(lo.size)])
        for x in np.stack([g.ravel() for g in grid], axis=1):
            p = float(1.0 / (1.0 + np.exp(-float(forward_logit(model, x)[0]))))
            checked += 1
            if violates(prop, p):
                violator = x
                break
    z = interval_bounds(model, prop)
    result = BoundResult(lower=float(z[0]), upper=float(z[1]), checked_samples=checked, witness=violator)
    return result


def violates(prop: Property, probability: float) -> bool:
    rel = prop.output_constraint["relation"]
    value = prop.output_constraint.get("value")
    tol = prop.tolerance
    if rel == "lt":
        return probability >= value - tol
    if rel == "le":
        return probability > value + tol
    if rel == "gt":
        return probability <= value + tol
    if rel == "ge":
        return probability < value - tol
    if rel == "ne":
        return abs(probability - value) <= tol
    return False


def violates_interval(prop: Property, lower: float, upper: float) -> bool | None:
    """Check constraint using outer bounds: True=violated, False=safe, None=unknown."""
    rel = prop.output_constraint["relation"]
    value = prop.output_constraint.get("value")
    tol = prop.tolerance
    if rel == "lt":
        if upper < value - tol:
            return False
        if lower >= value - tol:
            return True
        return None
    if rel == "gt":
        if lower > value + tol:
            return False
        if upper <= value + tol:
            return True
        return None
    if rel == "le":
        if upper <= value + tol:
            return False
        if lower > value + tol:
            return True
        return None
    if rel == "ge":
        if lower >= value - tol:
            return False
        if upper < value - tol:
            return True
        return None
    return None


def logit_of(probability: float) -> float:
    p = float(np.clip(probability, 1e-6, 1.0 - 1e-6))
    return float(np.log(p / (1.0 - p)))


def verify_property(model: dict, prop: Property) -> dict:
    prop.validate_against_model(model)
    if model["activation"] != "relu":
        return classify(prop, STATUS_UNSUPPORTED, "unsupported activation", None)
    if prop.method not in ("interval-propagation", "sampling", "smt", "milp"):
        return classify(prop, STATUS_UNSUPPORTED, f"unsupported method {prop.method}", None)
    if prop.method in ("smt", "milp"):
        return classify(prop, STATUS_UNKNOWN, f"{prop.method} solver not available; interval bounds reported",
                        None)
    # map probability constraint to logit bound (order-equivalent)
    rel = prop.output_constraint["relation"]
    value = float(prop.output_constraint["value"])
    z_bound = logit_of(value)
    logit_prop = Property(property_id=prop.property_id, model_id=prop.model_id,
                          model_version=prop.model_version, input_lower=prop.input_lower,
                          input_upper=prop.input_upper,
                          output_constraint={"relation": rel, "value": z_bound},
                          method=prop.method, timeout_s=prop.timeout_s, tolerance=prop.tolerance)
    lower, upper = interval_bounds(model, prop)
    violation = violates_interval(logit_prop, lower, upper)
    if violation is False:
        return classify(prop, STATUS_VERIFIED, "interval bound proves constraint on logit (order-equivalent)",
                        {"logit_bounds": [lower, upper]})
    if violation is True:
        return classify(prop, STATUS_FALSIFIED, "interval bound shows constraint violated",
                        {"logit_bounds": [lower, upper]})
    # bounds overlap -> sample search for witness
    sampled = sample_search(model, prop)
    if sampled.witness is not None:
        p = float(1.0 / (1.0 + np.exp(-float(forward_logit(model, sampled.witness)[0]))))
        return classify(prop, STATUS_FALSIFIED, "counterexample found by sampling",
                        {"witness_input": sampled.witness.tolist(), "witness_output": round(p, 6),
                         "logit_bounds": [lower, upper], "checked_samples": sampled.checked_samples})
    return classify(prop, STATUS_UNKNOWN,
                    "bounds overlap and sampling found no violation (not a proof)",
                    {"logit_bounds": [lower, upper], "checked_samples": sampled.checked_samples})


def classify(prop: Property, status: str, message: str, details: dict | None) -> dict:
    return {
        "property_id": prop.property_id,
        "status": status,
        "message": message,
        "method": prop.method,
        "timeout_s": prop.timeout_s,
        "tolerance": prop.tolerance,
        "details": details or {},
        "evidence": None,
    }


def property_fingerprint(prop: Property) -> str:
    blob = json.dumps({
        "property_id": prop.property_id, "model_id": prop.model_id,
        "model_version": prop.model_version,
        "input_lower": prop.input_lower.tolist(), "input_upper": prop.input_upper.tolist(),
        "output_constraint": prop.output_constraint,
    }, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def run_and_record(model: dict, prop: Property, out_dir: Path, seed: int = 20260903) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    start = time.monotonic()
    result = verify_property(model, prop)
    result["elapsed_s"] = round(time.monotonic() - start, 4)
    result["reproducibility"] = {
        "model_hash": model["hash"], "seed": seed, "property_hash": property_fingerprint(prop),
        "repeatable": True,
    }
    stamp = hashlib.sha256((prop.property_id + model["hash"]).encode()).hexdigest()[:8]
    evidence = out_dir / f"evidence_{prop.property_id}_{stamp}.json"
    evidence.write_text(json.dumps(result, indent=2, sort_keys=True))
    result["evidence"] = str(evidence.relative_to(out_dir.parent.parent))
    return result
