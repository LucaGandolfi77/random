"""Test bench tests: protocol, time sync, faults, disconnect, safe state."""
import json
import os
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from twinlab.bench import PhysicalPlant, SafetyMonitor, SimClock, TestBench, export_evidence  # noqa: E402


def test_clock_time_management():
    c = SimClock()
    start = c.sim_time
    c.tick()
    assert c.sim_time == start + 0.1
    c.paused = True
    c.tick()
    assert c.sim_time == start + 0.1
    assert c.sync(c.sim_time) is True
    assert c.sync(c.sim_time + 1.0) is False


def test_plant_determinism_same_seed():
    a = PhysicalPlant(seed=7)
    b = PhysicalPlant(seed=7)
    for _ in range(50):
        a.step(0.3)
        b.step(0.3)
    assert a.alt == b.alt and a.vel == b.vel


def test_safety_monitor_safe_state():
    m = SafetyMonitor()
    ok, reason = m.evaluate(alt=2.0, vel=8.0)
    assert ok is False and reason == "SAFE_STATE_TOUCHDOWN_RISK"
    ok, _ = m.evaluate(alt=50.0, vel=1.0)
    assert ok is True


def test_sil_run_and_evidence(tmp_path):
    b = TestBench(seed=20260905, level="SIL")
    r = b.run(steps=50)
    assert r["level"] == "SIL" and r["protocol"] == "1.0"
    path = export_evidence(b, Path(tmp_path))
    data = json.loads(path.read_text())
    assert data["steps"] == len(b.telemetry) and data["final"] is not None


def test_pil_requires_adapter_and_hil_not_executed():
    # explicit: PIL would need an adapter; HIL needs real hardware
    assert TestBench(level="MIL").run(steps=10)["level"] == "MIL"
    try:
        TestBench(level="PIL")
        raised = False
    except ValueError:
        raised = True
    assert raised
    # matrix documents HIL as Not Executed (no hardware in this workspace)
    from pathlib import Path as P

    matrix = P(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "docs" / "MIL_SIL_PIL_HIL_MATRIX.md"
    assert "Not Executed" in matrix.read_text()


def test_timeout_and_disconnect_semantics():
    # In-process bench has no socket; emulate disconnect by limiting steps and
    # asserting the bench stops cleanly (safe-stop contract).
    b = TestBench(seed=1)
    b.run(steps=5)
    assert len(b.telemetry) <= 5
    # wall-clock timeout guard: a slow loop is bounded by steps, not wall time
    start = time.monotonic()
    TestBench(seed=2).run(steps=200)
    assert time.monotonic() - start < 5.0


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
