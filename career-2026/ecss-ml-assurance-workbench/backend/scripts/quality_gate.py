"""Quality gate runner. Executes real checks and writes reports under release/.

Checks: backend ruff+mypy+pytest, frontend lint+tsc+content+vitest, production
build. Exit non-zero if any blocking check fails. Writes quality-gate-report.json
and .md plus final verdict (PASS / PASS_WITH_WARNINGS / FAIL / INCOMPLETE).
"""
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
RELEASE = ROOT / "release"
VERSION = "1.0.0-rc.1"
VENV = BACKEND / ".venv" / "bin"
PY = str(VENV / "python")


def run(name, cmd, cwd, blocking=True, timeout=1800):
    start = datetime.now(timezone.utc)
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        ok = proc.returncode == 0
        return {"check": name, "status": "PASS" if ok else "FAIL", "blocking": blocking,
                "exit_code": proc.returncode, "duration_s": round((datetime.now(timezone.utc) - start).total_seconds(), 1),
                "log_tail": (proc.stdout or "")[-800:] + (proc.stderr or "")[-400:]}
    except subprocess.TimeoutExpired:
        return {"check": name, "status": "FAIL", "blocking": blocking, "exit_code": -1,
                "duration_s": timeout, "log_tail": "timeout"}


def main() -> int:
    RELEASE.mkdir(parents=True, exist_ok=True)
    checks = [
        run("backend-ruff", [str(VENV / "ruff"), "check", "app", "tests"], BACKEND),
        run("backend-mypy", [str(VENV / "mypy"), "app"], BACKEND),
        run("backend-pytest", [PY, "-m", "pytest", "tests", "-q"], BACKEND, timeout=2400),
        run("frontend-lint", [shutil.which("npm") or "npm", "run", "lint"], FRONTEND),
        run("frontend-tsc", [shutil.which("npx") or "npx", "tsc", "--noEmit"], FRONTEND),
        run("content-validation", ["node", "scripts/validate-content.mjs"], FRONTEND),
        run("frontend-vitest", [shutil.which("npm") or "npm", "test"], FRONTEND),
        run("production-build", [shutil.which("npm") or "npm", "run", "build"], FRONTEND, timeout=1800),
    ]
    blocking_failures = [c for c in checks if c["status"] == "FAIL" and c["blocking"]]
    failures = [c for c in checks if c["status"] == "FAIL"]
    warnings = [c for c in checks if c["status"] != "PASS"]
    verdict = "FAIL" if blocking_failures else ("PASS_WITH_WARNINGS" if warnings else "PASS")
    report = {
        "release_version": VERSION,
        "commit": "local (not committed)",
        "execution_time": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
        "blocking_failures": [c["check"] for c in blocking_failures],
        "warnings": [c["check"] for c in warnings],
        "final_verdict": verdict,
    }
    (RELEASE / "quality-gate-report.json").write_text(json.dumps(report, indent=2, sort_keys=True))
    md = ["# Quality gate report", "", f"- Version: {VERSION}", f"- Verdict: {verdict}", "",
          "| Check | Status | Duration (s) |", "|---|---|---|"]
    for c in checks:
        md.append(f"| {c['check']} | {c['status']} | {c['duration_s']} |")
    (RELEASE / "quality-gate-report.md").write_text("\n".join(md) + "\n")
    print(json.dumps({"verdict": verdict, "blocking": [c["check"] for c in blocking_failures]}, indent=2))
    return 1 if blocking_failures else 0


if __name__ == "__main__":
    sys.exit(main())
