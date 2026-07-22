from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from vertest.test.model import TestRun, TestStatus


class RegressionManager:
    """Manages test baselines and regression detection.
    Compares current test results against stored baselines."""

    def __init__(self, baseline_dir: str | Path):
        self.baseline_dir = Path(baseline_dir)
        self.baseline_dir.mkdir(parents=True, exist_ok=True)

    def save_baseline(self, run: TestRun, name: str = "default"):
        path = self.baseline_dir / f"{name}.json"
        data = {
            "suite_name": run.suite_name,
            "results": [
                {
                    "test_name": r.test_name,
                    "status": r.status.value,
                    "message": r.message,
                }
                for r in run.results
            ],
        }
        path.write_text(json.dumps(data, indent=2))

    def load_baseline(self, name: str = "default") -> Optional[dict]:
        path = self.baseline_dir / f"{name}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text())

    def diff(self, current: TestRun, baseline_name: str = "default") -> list[dict]:
        baseline = self.load_baseline(baseline_name)
        if not baseline:
            return []

        changes = []
        baseline_map = {r["test_name"]: r for r in baseline["results"]}

        for result in current.results:
            baseline_entry = baseline_map.get(result.test_name)
            if not baseline_entry:
                changes.append({
                    "test_name": result.test_name,
                    "type": "new",
                    "status": result.status.value,
                })
            elif baseline_entry["status"] != result.status.value:
                changes.append({
                    "test_name": result.test_name,
                    "type": "regression" if result.status == TestStatus.FAILED else "fixed",
                    "from": baseline_entry["status"],
                    "to": result.status.value,
                })

        return changes
