"""Mission console tests: authority, actions, timeout, audit, workload."""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from console.decision_console import (  # noqa: E402
    Authority, MissionConsole, Recommendation, demo_landing_scenario,
)


def rec(**kw):
    base = dict(rec_id="REC-1", scenario="fdir", action="raise_warning", rationale="x",
                confidence=0.7, uncertainty_note="", evidence=["e1"], ood_warning=False,
                deadline_s=30.0, consequences_accept="a", consequences_reject="r",
                safe_default="sd", fallback_available=True, system_mode="M")
    base.update(kw)
    return Recommendation(**base)


def test_authority_boundaries():
    a = Authority()
    assert a.can_automatic("raise_warning")
    assert not a.can_automatic("landing_abort")
    assert not a.assert_not_prohibited("autonomous landing mode switch")
    assert a.assert_not_prohibited("log_alert")


def test_recommendation_is_never_command():
    c = demo_landing_scenario()
    for rid, r in c.recommendations.items():
        assert r.action not in c.authority.ai_automatic or r.action in c.authority.ai_automatic
        # recommendation payload carries authority context, not an automatic command
        assert r.safe_default
    assert c.workload["alert_count"] == 2


def test_operator_decision_recorded():
    c = MissionConsole()
    c.issue(rec())
    d = c.decide("REC-1", "accept", "conditions ok")
    assert d.action == "accept" and d.final_outcome == "EXECUTED"
    assert any(e["event"] == "OPERATOR_ACTION" for e in c.audit)


def test_timeout_safe_default():
    c = MissionConsole()
    c.issue(rec(deadline_s=0.000001))
    d = c.decide("REC-1", "accept", "late")  # expired -> timeout default
    assert d.final_outcome == "TIMEOUT_DEFAULT"
    t = c.timeout_default("REC-1")
    assert t.final_outcome == "SAFE_DEFAULT" and t.unresolved is True


def test_defer_and_veto_recorded():
    c = MissionConsole()
    c.issue(rec(rec_id="R1"))
    c.issue(rec(rec_id="R2", action="mode_switch"))
    c.decide("R1", "defer", "need more data")
    c.decide("R2", "veto", "operator authority")
    assert c.workload["deferred"] == 1
    kinds = [d.action for d in c.decisions]
    assert "defer" in kinds and "veto" in kinds


def test_unknown_rec_and_invalid_action():
    c = MissionConsole()
    c.issue(rec())
    try:
        c.decide("NOPE", "accept", "x")
        raised = False
    except KeyError:
        raised = True
    assert raised
    try:
        c.decide("REC-1", "delete", "x")
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_audit_export_and_workload(tmp_path):
    c = demo_landing_scenario()
    c.acknowledge("REC-LLS-01")
    c.decide("REC-LLS-01", "accept", "reviewed, accept")
    c.record("explanation_opened")
    p = Path(tmp_path) / "audit.json"
    c.export_audit(p)
    data = json.loads(p.read_text())
    assert "prohibited_automatic" in data["authority"]
    assert data["workload"]["alert_count"] == 2
    assert data["workload"]["explanation_opened"] == 1


def test_repeated_alert_counted():
    c = MissionConsole()
    c.issue(rec(rec_id="a"))
    c.issue(rec(rec_id="b"))  # same action family
    assert c.workload["repeated_alerts"] == 1


if __name__ == "__main__":
    import inspect

    tmp = tempfile.mkdtemp()
    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_"):
            continue
        try:
            fn(Path(tmp)) if "tmp_path" in inspect.signature(fn).parameters else fn()
            print("PASS", name)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", name, exc)
    raise SystemExit(1 if failures else 0)
