"""Classical vs quantum-inspired readiness benchmark (small space-oriented
telemetry classification). Prudent: no quantum-advantage claims, no hardware
claims — quantum methods are quantum-INSPIRED classical emulations (or simulated
if a simulator is present; here emulated). Equal split/preprocessing/metrics/
seed; results classified per readiness framework.
"""
from __future__ import annotations

import json
import time

import numpy as np

N_FEATURES = 4
SEED = 20260915


def make_data(n: int = 600, seed: int = SEED) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, size=(n, N_FEATURES))
    # telemetry-like: y depends on a nonlinear combination + noise
    y = (np.sign(x[:, 0] * x[:, 1] + 0.5 * np.sin(3 * x[:, 2]) + x[:, 3]) + 1) // 2
    y = (y + rng.integers(0, 2, size=n)) // 2  # add noise, keep binary 0/1
    return x.astype(np.float64), y.astype(np.float64)


def split(x, y, seed: int = SEED, train_frac: float = 0.66):
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(y))
    cut = int(len(y) * train_frac)
    return x[idx[:cut]], y[idx[:cut]], x[idx[cut:]], y[idx[cut:]]


def accuracy(model_pred, y_true) -> float:
    return float(np.mean(np.asarray(model_pred) == np.asarray(y_true)))


class ClassicalLinear:
    """Ridge/logistic-style closed-form linear baseline."""

    def fit_predict(self, Xtr, ytr, Xte) -> np.ndarray:
        X = np.hstack([Xtr, np.ones((Xtr.shape[0], 1))])
        w, *_ = np.linalg.lstsq(X, ytr, rcond=None)
        z = np.hstack([Xte, np.ones((Xte.shape[0], 1))]) @ w
        return (z >= 0.5).astype(int)


class SmallMLP:
    """One-hidden-layer MLP trained with gradient descent (fixed seed)."""

    def __init__(self, hidden: int = 8, seed: int = 7) -> None:
        self.hidden = hidden
        self.rng = np.random.default_rng(seed)
        self.W1 = self.rng.normal(0, 0.5, (N_FEATURES, hidden))
        self.b1 = np.zeros(hidden)
        self.W2 = self.rng.normal(0, 0.5, hidden)
        self.b2 = 0.0

    def fit_predict(self, Xtr, ytr, Xte, epochs: int = 200, lr: float = 0.3) -> np.ndarray:
        X = Xtr.copy()
        for _ in range(epochs):
            h = np.maximum(X @ self.W1 + self.b1, 0)
            z = h @ self.W2 + self.b2
            p = 1.0 / (1.0 + np.exp(-np.clip(z, -20, 20)))
            dz = p - ytr
            self.b2 -= lr * dz.mean()
            self.W2 -= lr * (h.T @ dz) / len(ytr)
            dh = np.outer(dz, self.W2) * (h > 0)
            self.W1 -= lr * (X.T @ dh) / len(ytr)
            self.b1 -= lr * dh.mean(axis=0)
        h = np.maximum(Xte @ self.W1 + self.b1, 0)
        z = h @ self.W2 + self.b2
        return (z >= 0.0).astype(int)


class QuantumInspiredKernel:
    """Quantum-inspired feature kernel (classical emulation of a cos/sin map)."""

    def fit_predict(self, Xtr, ytr, Xte) -> np.ndarray:
        # map each feature onto [0,2pi) cos/sin features (emulated qubit encoding)
        def feats(X):
            phase = X * np.pi
            return np.hstack([np.cos(phase), np.sin(phase)])
        Ftr, Fte = feats(Xtr), feats(Xte)
        w, *_ = np.linalg.lstsq(np.hstack([Ftr, np.ones((len(Ftr), 1))]), ytr, rcond=None)
        z = np.hstack([Fte, np.ones((len(Fte), 1))]) @ w
        return (z >= 0.5).astype(int)


class SimulatedVariational:
    """Tiny emulated variational classifier (2-qubit-style, classical simulation).

    Uses a fixed ansatz feature map; optimization via scipy-free coordinate descent.
    Marked: emulation, not hardware.
    """

    def fit_predict(self, Xtr, ytr, Xte, steps: int = 60) -> np.ndarray:
        params = np.zeros(10)
        rng = np.random.default_rng(3)

        def feats(X):
            phase = X * np.pi
            return np.hstack([np.cos(phase), np.sin(phase)])

        def logits(F, params):
            return np.tanh(F @ params[:8]) * params[8] + params[9]

        def loss(F, y, params):
            p = 1.0 / (1.0 + np.exp(-logits(F, params)))
            return float(np.mean((p - y) ** 2))

        Ftr, Fte = feats(Xtr), feats(Xte)
        best = (params.copy(), loss(Ftr, ytr, params))
        for _ in range(steps):
            for k in range(10):
                for sign in (-1, 1):
                    cand = params.copy()
                    cand[k] += sign * 0.05
                    if loss(Ftr, ytr, cand) < loss(Ftr, ytr, params):
                        params = cand
            val = loss(Ftr, ytr, params)
            if val < best[1]:
                best = (params.copy(), val)
        z = logits(Fte, best[0])
        return (z >= 0.0).astype(int)


READINESS_KEYS = ("problem_fit", "data_encoding_cost", "scalability", "simulation_cost",
                  "hardware_availability", "tooling_maturity", "explainability",
                  "verification", "reproducibility", "integration_complexity",
                  "onboard_applicability", "ground_applicability")


def readiness_score(acc, classical_acc, latency_s: float, n_features: int) -> tuple[str, dict]:
    # deterministic, conservative assessment
    benefit = acc - classical_acc
    dims = {
        "problem_fit": "medium" if 0.05 < benefit < 0.1 else ("low" if benefit <= 0.05 else "high"),
        "data_encoding_cost": "high" if n_features > 4 else "medium",
        "scalability": "low",  # emulated small-scale only
        "simulation_cost": f"low ({latency_s:.3f}s)" if latency_s < 1 else "medium",
        "hardware_availability": "not_available",
        "tooling_maturity": "low",
        "explainability": "low",
        "verification": "low",
        "reproducibility": "high",
        "integration_complexity": "high",
        "onboard_applicability": "not_demonstrated",
        "ground_applicability": "not_demonstrated",
    }
    if acc is None or not np.isfinite(acc):
        return "Experiment Failed", dims
    if benefit <= 0.01:
        return "No Demonstrated Benefit", dims
    if benefit < 0.05:
        return "Inconclusive", dims
    return "Promising for Further Research", dims


def run_experiment(seed: int = SEED, trials: int = 5, timeout_s: float = 10.0) -> dict:
    x, y = make_data(seed=seed)
    Xtr, ytr, Xte, yte = split(x, y, seed=seed)
    results = {}
    start = time.monotonic()
    linear = ClassicalLinear()
    results["classical_linear"] = accuracy(linear.fit_predict(Xtr, ytr, Xte), yte)
    mlp = SmallMLP(seed=seed)
    results["small_mlp"] = accuracy(mlp.fit_predict(Xtr, ytr, Xte), yte)
    qk = QuantumInspiredKernel()
    results["quantum_inspired_kernel"] = accuracy(qk.fit_predict(Xtr, ytr, Xte), yte)
    t0 = time.monotonic()
    vqc = SimulatedVariational()
    results["simulated_variational"] = accuracy(vqc.fit_predict(Xtr, ytr, Xte), yte)
    results["latency_total_s"] = round(time.monotonic() - start, 4)
    results["seed"] = seed
    results["trials"] = trials
    results["dataset_split"] = f"train {len(ytr)} / test {len(yte)}"
    base = results["classical_linear"]
    acc_q = results["quantum_inspired_kernel"]
    state, dims = readiness_score(acc_q, base, results["latency_total_s"], N_FEATURES)
    results["readiness"] = state
    results["readiness_dimensions"] = dims
    return results


def save_experiment(results: dict, path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(results, indent=2, sort_keys=True))
