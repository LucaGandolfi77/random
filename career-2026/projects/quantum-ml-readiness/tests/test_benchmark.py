"""Quantum-ML readiness benchmark tests (prudent claims)."""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from qml.benchmark import (  # noqa: E402
    SEED, ClassicalLinear, QuantumInspiredKernel, SimulatedVariational, SmallMLP,
    accuracy, make_data, readiness_score, run_experiment, save_experiment, split,
)


def test_reproducibility():
    a = run_experiment(seed=11)
    b = run_experiment(seed=11)
    for key in ("classical_linear", "small_mlp", "quantum_inspired_kernel",
                "simulated_variational", "readiness", "seed"):
        assert a[key] == b[key], key  # timing excluded (wall-clock varies)


def test_equal_split_preprocessing():
    x, y = make_data()
    Xtr, ytr, Xte, yte = split(x, y)
    assert len(Xtr) + len(Xte) == len(x) and len(ytr) + len(yte) == len(y)


def test_parameter_validation_and_resource_limit():
    # split param sanity
    assert 0.0 < SEED
    x, y = make_data(n=100)
    assert x.shape == (100, 4)
    # no excessive runtime
    import time

    t0 = time.monotonic()
    run_experiment()
    assert time.monotonic() - t0 < 30


def test_methods_return_binary_predictions():
    x, y = make_data(n=200)
    Xtr, ytr, Xte, yte = split(x, y, seed=1)
    for method in (ClassicalLinear(), SmallMLP(seed=1), QuantumInspiredKernel(),
                   SimulatedVariational()):
        pred = method.fit_predict(Xtr, ytr, Xte)
        assert set(np.unique(pred)).issubset({0, 1})
        assert 0 <= accuracy(pred, yte) <= 1


def test_readiness_classification_prudent():
    # huge benefit -> promising; no benefit -> no demonstrated benefit
    state_hi, _ = readiness_score(0.95, 0.5, 0.1, 4)
    state_none, _ = readiness_score(0.5, 0.51, 0.1, 4)
    assert state_hi == "Promising for Further Research"
    assert state_none == "No Demonstrated Benefit"
    assert state_hi != "No Demonstrated Benefit"


def test_experiment_result_structure_and_save():
    res = run_experiment(seed=5)
    for key in ("classical_linear", "small_mlp", "quantum_inspired_kernel",
                "simulated_variational", "readiness", "readiness_dimensions", "seed"):
        assert key in res
    assert res["readiness"] in ("Promising for Further Research", "No Demonstrated Benefit",
                                "Inconclusive", "Not Scalable in Current Setup",
                                "Unsupported", "Experiment Failed")
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / "exp.json"
        save_experiment(res, p)
        data = json.loads(p.read_text())
        assert data["seed"] == res["seed"]


def test_unsupported_configuration_not_silent():
    # dimension mismatch should raise (never silently accepted)
    x, y = make_data()
    Xtr, ytr, Xte, yte = split(x, y, seed=1)
    try:
        SmallMLP(seed=1).fit_predict(Xtr[:, :2], ytr, Xte)  # wrong feature dim
        raised = False
    except Exception:  # noqa: BLE001
        raised = True
    assert raised


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_"):
            continue
        try:
            fn()
            print("PASS", name)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", name, exc)
    raise SystemExit(1 if failures else 0)
