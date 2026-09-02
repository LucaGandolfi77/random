"""Week-6 demo and root-enforcement tests."""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]


def test_root_enforcement_script_passes():
    result = subprocess.run(
        [sys.executable, str(REPO / "backend/app/scripts/check_root.py")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "passed" in result.stdout


def test_root_enforcement_violation_detection(tmp_path):
    import importlib

    mod = importlib.import_module("app.scripts.check_root")
    # an external absolute link in a doc under the root must be flagged
    docs = mod.ROOT / "docs"
    docs.mkdir(exist_ok=True)
    marker = docs / "_root_check_probe.md"
    try:
        marker.write_text("external: [x](/Users/outside)\n", encoding="utf-8")
        problems = mod._violations(mod.ROOT)
        assert any("external local link" in p or "absolute local link" in p for p in problems)
    finally:
        marker.unlink(missing_ok=True)


def test_demo_reset_dry_run_is_safe(client):
    import importlib

    importlib.import_module("app.scripts.reset_demo")
    # data must still be present after importing (no side effects)
    projects = client.get("/api/portfolio/projects")
    assert projects.status_code == 200
    assert len(projects.json()) == 4
