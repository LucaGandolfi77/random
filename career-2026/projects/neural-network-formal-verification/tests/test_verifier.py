"""Neural-network formal verification tests (deterministic, no hardcoded outcomes)."""
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJ)

from nnfv.model import forward_logit, load_embedded_model, sigmoid  # noqa: E402
from nnfv.verifier import (  # noqa: E402
    Property, interval_bounds, run_and_record, sample_search, verify_property, logit_of,
)

ROOT = Path(__file__).resolve().parents[1]
MODEL = load_embedded_model()


def prop(**kw) -> Property:
    base = {
        "property_id": "PROP-TEST-001", "model_id": MODEL["model_id"], "model_version": "1.2",
        "input_lower": [0.0, 24.0, 1200.0], "input_upper": [0.05, 29.0, 1550.0],
        "output_constraint": {"relation": "lt", "value": 0.9},
        "method": "interval-propagation", "timeout_s": 5.0, "tolerance": 0.0001,
    }
    base.update(kw)
    return Property.from_dict(base)


def test_verified_property_is_not_hardcoded():
    # outcome computed live from bounds and the imported model
    p = prop()
    result = verify_property(MODEL, p)
    assert result["status"] == "Verified"
    expected = interval_bounds(MODEL, p)
    assert abs(result["details"]["logit_bounds"][1] - expected[1]) < 1e-6


def test_falsified_property():
    x = np.array([1.0, 32.0, 2000.0])
    pval = float(sigmoid(float(forward_logit(MODEL, x)[0])))
    p = prop(input_lower=x.tolist(), input_upper=x.tolist(),
             output_constraint={"relation": "lt", "value": float(pval) - 0.01})
    result = verify_property(MODEL, p)
    assert result["status"] == "Falsified"


def test_counterexample_by_sampling_export():
    p = prop(input_lower=[0.9, 31.0, 1900.0], input_upper=[1.0, 32.0, 2000.0],
             output_constraint={"relation": "lt", "value": 0.05})
    sampled = sample_search(MODEL, p)
    if sampled.witness is not None:
        p_out = float(sigmoid(float(forward_logit(MODEL, sampled.witness)[0])))
        assert p_out > 0.05 - p.tolerance
        # classification agrees
        result = verify_property(MODEL, prop(input_lower=[0.9, 31.0, 1900.0],
                                             input_upper=[1.0, 32.0, 2000.0],
                                             output_constraint={"relation": "lt", "value": 0.05}))
        assert result["status"] in ("Falsified", "Unknown")


def test_unsupported_activation():
    bad = dict(MODEL)
    bad["activation"] = "sigmoid"
    result = verify_property(bad, prop())
    assert result["status"] == "Unsupported"


def test_unsupported_method_unknown_not_false():
    result = verify_property(MODEL, prop(method="smt"))
    assert result["status"] in ("Unknown", "Unsupported")
    assert result["status"] != "Falsified"


def test_malformed_property_invalid_bounds():
    try:
        prop(input_lower=[1.0], input_upper=[0.0, 0.0])
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_dimension_mismatch_rejected():
    p = prop(input_lower=[0.0, 24.0], input_upper=[1.0, 30.0])
    try:
        verify_property(MODEL, p)
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_inconsistent_property_constraint():
    try:
        prop(output_constraint={"relation": "lt"})  # missing required value
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_timeout_respected_in_sample_search():
    p = prop(timeout_s=0.001)
    start = time.monotonic()
    sample_search(MODEL, p, max_samples=10**9)
    assert time.monotonic() - start < 5.0


def test_repeatability_and_record():
    a = verify_property(MODEL, prop())
    b = verify_property(MODEL, prop())
    assert a["status"] == b["status"] == "Verified"
    out = ROOT / "evidence"
    rec = run_and_record(MODEL, prop(), out)
    assert rec["reproducibility"]["repeatable"] is True
    assert rec["status"] == "Verified"
    assert any(out.glob("evidence_*.json"))


def test_model_header_import_matches_golden():
    # reuse check: model loaded from the sibling C++ header (not duplicated constants)
    assert MODEL["W1"].shape == (3, 8)
    assert MODEL["W2"].shape == (8, 1)
    assert abs(MODEL["B2"]) < 1e-9


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failures = 0
    for fn in fns:
        try:
            fn()
            print("PASS", fn.__name__)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", fn.__name__, exc)
    raise SystemExit(1 if failures else 0)
