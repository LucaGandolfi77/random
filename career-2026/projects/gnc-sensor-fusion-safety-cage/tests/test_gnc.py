"""GNC sensor-fusion safety cage tests (reproducible seeds)."""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gnc_safety_cage.ekf_cage import run_simulation  # noqa: E402
from gnc_safety_cage.metrics import compute_metrics  # noqa: E402
from gnc_safety_cage.model import ScenarioFaults, SimConfig  # noqa: E402


def faults(**kw):
    f = ScenarioFaults(seed=20260902)
    for k, v in kw.items():
        setattr(f, k, v)
    return f


def test_nominal_mostly_accepts_ml():
    rec = run_simulation(faults=faults())
    m = compute_metrics(rec)
    assert m["ml_accepted_ratio"] > 0.98
    assert m["unnecessary_intervention_rate"] == 0.0
    assert m["ekf_rmse_m"] < 2.0
    assert m["missed_unsafe_estimates"] == 0


def test_reproducible_seed():
    a = compute_metrics(run_simulation(faults=faults()))
    b = compute_metrics(run_simulation(faults=faults()))
    assert a["innovation_mean"] == b["innovation_mean"]


def test_altimeter_bias_fault_detected():
    rec = run_simulation(faults=faults(altimeter_bias=25.0))
    iv = rec.interventions
    assert any("ML_REF_DISAGREE" in x.reason_code for x in iv)


def test_stuck_sensor_rejected():
    rec = run_simulation(faults=faults(stuck_start=200))
    assert rec.altimeter_updates > 0
    m = compute_metrics(rec)
    assert m["reason_codes"].get("ML_REF_DISAGREE", 0) > 0


def test_ml_bias_triggers_fallback():
    rec = run_simulation(faults=faults(ml_bias_from=300))
    assert rec.mode.count("ACTIVE") > 100
    last = rec.interventions[-1]
    assert last.linked_test == "TEST-CAGE-DISAGREE"


def test_ml_missing_nan_detected():
    rec = run_simulation(faults=faults(ml_nan_from=100))
    assert any("ML_INVALID_OR_MISSING" in x.reason_code for x in rec.interventions)


def test_ml_stale_rejected():
    rec = run_simulation(faults=faults(ml_stale_from=300))
    assert rec.mode.count("ACTIVE") > 0


def test_ood_flag_triggers_intervention():
    rec = run_simulation(faults=faults(ml_ood_from=300))
    assert any("ML_OOD_FLAG" in x.reason_code for x in rec.interventions)


def test_missing_sample_handled_without_crash():
    rec = run_simulation(faults=faults(missing_start=400))
    assert rec.altimeter_drops >= 1


def test_covariance_growth_detected():
    cfg = SimConfig(process_q=np.diag([5.0, 1.0, 1e-3]))
    rec = run_simulation(cfg, faults=faults(repeated_missing_from=500))
    assert any("COVARIANCE_GROWTH" in x.reason_code or "FILTER_DIVERGENCE" in x.reason_code
               for x in rec.interventions)


def test_fallback_recorder_fields():
    rec = run_simulation(faults=faults(ml_stale_from=300))
    iv = next(x for x in rec.interventions if x.fallback_status == "ACTIVE")
    for attr in ("i", "timestamp", "reason_code", "alt_truth", "ml_est", "ekf_alt",
                 "covariance", "residual", "selected_source", "fallback_status",
                 "linked_risk", "linked_test"):
        assert hasattr(iv, attr)


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failures = 0
    for fn in fns:
        try:
            fn()
            print("PASS", fn.__name__)
        except AssertionError as exc:
            failures += 1
            print("FAIL", fn.__name__, exc)
    raise SystemExit(1 if failures else 0)
