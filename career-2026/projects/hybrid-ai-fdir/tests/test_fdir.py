"""Hybrid FDIR tests."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fdir.assistant import FdirAssistant, TelemetryProvider, eval_scenarios


def _hist(fault, n=30):
    p = TelemetryProvider()
    return [p.frame(fault=fault, t=i * 0.1) for i in range(n)]


def test_nominal_is_clean():
    inc = FdirAssistant().analyze(_hist("nominal"))
    assert inc.state == "nominal" and inc.health_score == 1.0 and not inc.unresolved


def test_power_anomaly_isolated_to_eps():
    inc = FdirAssistant().analyze(_hist("power"))
    assert inc.subsystem == "EPS" and "FM-003" in inc.candidate_modes
    assert inc.ranked_modes and inc.ranked_modes[0]["severity"] == "High"


def test_irreversible_recovery_needs_operator():
    inc = FdirAssistant().analyze(_hist("stuck"))
    assert "operator decision required" in inc.recommendation


def test_thermal_isolated_and_recommendation_safe():
    inc = FdirAssistant().analyze(_hist("thermal"))
    assert "FM-004" in inc.candidate_modes
    assert inc.recommendation.startswith("Review FM-004")
    assert not any(c["severity"] == "High" for c in inc.ranked_modes)


def test_operator_resolve_and_defer():
    a = FdirAssistant()
    inc = a.analyze(_hist("power"))
    r = a.operator_resolve(inc, "accept", "approved by operator")
    assert r.state == "resolved" and not r.unresolved
    d = a.operator_resolve(inc, "defer", "need more data")
    assert d.state == "deferred" and d.unresolved is True


def test_catalog_has_required_fields():
    a = FdirAssistant()
    for fid, fm in a.catalog.items():
        for attr in ("fid", "subsystem", "symptoms", "possible_causes", "affected_telemetry",
                     "detection_rule", "isolation_criteria", "severity", "recovery", "evidence",
                     "residual_uncertainty", "irreversible"):
            assert hasattr(fm, attr)


def test_scenario_matrix():
    out = eval_scenarios()
    assert out["nominal"]["state"] == "nominal"
    assert out["drift"]["state"] != "nominal"
    assert out["power"]["subsystem"] == "EPS"
    assert any(out[f]["recommendation"] for f in ("drift", "power", "thermal", "stuck"))


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
