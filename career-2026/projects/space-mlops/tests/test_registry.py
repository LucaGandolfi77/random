"""Registry/safe-deployment tests."""
import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mlops.registry import (  # noqa: E402
    IntegrityCheck, ModelRecord, Registry, ShadowComparator, demo_flow,
)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def make_registry():
    reg = Registry(trusted_rollback_versions={"m1": ["1.0.0"]})
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), evidence_links=["ev1"],
                        target="simulation", stage="Active"))
    return reg


def test_registration_and_duplicate():
    reg = make_registry()
    try:
        reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), target="simulation"))
        raised = False
    except ValueError:
        raised = True
    assert raised
    try:
        reg.add(ModelRecord("m1", "PRJ-LLS-001", "bad", sha(b"x")))
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_promotion_rejected_without_evidence():
    reg = Registry()
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), stage="Candidate"))
    try:
        reg.promote("m1", "1.0.0", "Active")
        raised = False
    except ValueError:
        raised = True
    assert raised


def test_active_requires_approval_flow():
    reg = Registry()
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), evidence_links=["ev1"],
                        stage="Candidate"))
    try:
        reg.promote("m1", "1.0.0", "Active")
        raised = False
    except ValueError:
        raised = True
    assert raised
    reg.approve("m1", "1.0.0", "reviewer")
    reg.promote("m1", "1.0.0", "Active")
    assert reg._get("m1", "1.0.0").stage == "Active"


def test_shadow_disagreement_detected():
    cmp = ShadowComparator()
    assert cmp.disagree(0.2, 0.9, 0.1)
    assert not cmp.disagree(0.2, 0.25, 0.1)


def test_canary_failure_rolls_back():
    reg = Registry()
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), stage="Active"))
    rec = reg.canary_fail("m1", "1.0.0", "error rate above threshold")
    assert rec.stage == "Rolled Back"
    assert any(e["event"] == "CANARY_FAILED" for e in reg.audit)


def test_rollback_gate_and_dry_run():
    reg = Registry(trusted_rollback_versions={"m1": ["1.0.0", "1.1.0"]})
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), stage="Active"))
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.1.0", sha(b"v2"), stage="Approved for Demonstration"))
    integrity = IntegrityCheck({"m1@1.0.0": sha(b"v1"), "m1@1.1.0": sha(b"v2")})
    res = reg.rollback("m1", "1.0.0", "1.1.0", "bad metrics", integrity, dry_run=True)
    assert res["ok"] and res["dry_run"]
    # target not in allowlist -> denied
    denied = reg.rollback("m1", "1.0.0", "1.2.0", "x", integrity)
    assert not denied["ok"] and "allowlist" in denied["reason"]


def test_integrity_error():
    reg = Registry()
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"tampered"), stage="Active"))
    integrity = IntegrityCheck({"m1@1.0.0": sha(b"original")})
    assert integrity.checksum_ok(reg._get("m1", "1.0.0")) is False


def test_incompatible_target():
    reg = Registry()
    reg.add(ModelRecord("m1", "PRJ-LLS-001", "1.0.0", sha(b"v1"), target="simulation"))
    assert reg.compatibility("m1", "1.0.0", "hardware") is False


def test_demo_flow_candidate_to_active():
    out = demo_flow()
    assert out["stage"] == "Active" and out["registry_size"] >= 2 and out["audit_events"] >= 3


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
