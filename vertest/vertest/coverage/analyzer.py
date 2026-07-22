from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional


class CoverageAnalyzer:
    """Measures code coverage by compiling with coverage flags
    and parsing gcov/lcov output."""

    def __init__(self, build_dir: str | Path | None = None):
        bd = Path(build_dir).resolve() if build_dir else Path(tempfile.mkdtemp(prefix="vertest_cov_"))
        self.build_dir = bd
        self.build_dir.mkdir(parents=True, exist_ok=True)

    def compile_with_coverage(
        self,
        source_files: list[str],
        output_binary: str = "test_harness_cov",
        compiler: str = "gcc",
        extra_flags: list[str] | None = None,
    ) -> tuple[bool, str]:
        flags = ["-g", "-O0", "--coverage", "-fprofile-arcs", "-ftest-coverage", "-lm"]
        if extra_flags:
            flags.extend(extra_flags)

        cmd = [compiler] + source_files + ["-o", str(self.build_dir / output_binary)] + flags
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                return False, result.stderr
            return True, ""
        except subprocess.TimeoutExpired:
            return False, "Compilation timed out"

    def run_and_capture_coverage(self, binary_name: str = "test_harness_cov") -> tuple[bool, str]:
        binary = self.build_dir / binary_name
        if not binary.exists():
            return False, "Binary not found"

        try:
            result = subprocess.run([str(binary)], capture_output=True, text=True, timeout=30)
            return True, result.stdout
        except Exception as e:
            return False, str(e)

    def parse_gcov(self, source_file: str | Path) -> Optional[dict]:
        """Run gcov on a source file and parse its output."""
        source_path = Path(source_file).resolve()
        source_stem = source_path.stem

        # Find matching .gcda file in build dir (it may have a binary-name prefix)
        gcda_files = list(self.build_dir.glob(f"*-{source_stem}.gcda"))
        if not gcda_files:
            gcda_files = list(self.build_dir.glob(f"{source_stem}.gcda"))

        if not gcda_files:
            return None

        try:
            result = subprocess.run(
                ["gcov", "-o", str(gcda_files[0]), str(source_path)],
                capture_output=True, text=True, timeout=30,
                cwd=self.build_dir,
            )
            if result.returncode != 0:
                return None
            return self._parse_gcov_output(result.stdout)
        except FileNotFoundError:
            return None

    def _parse_gcov_output(self, output: str) -> dict:
        lines = output.split("\n")
        stats = {
            "lines_executed": 0,
            "lines_total": 0,
            "branches_executed": 0,
            "branches_total": 0,
            "calls_executed": 0,
            "calls_total": 0,
        }

        for line in lines:
            if "Lines executed:" in line:
                parts = line.split(":")
                if len(parts) > 1:
                    pct = parts[1].split("%")[0].strip()
                    stats["lines_executed"] = float(pct)
            elif "Branches executed:" in line:
                parts = line.split(":")
                if len(parts) > 1:
                    pct = parts[1].split("%")[0].strip()
                    stats["branches_executed"] = float(pct)
            elif "Calls executed:" in line:
                parts = line.split(":")
                if len(parts) > 1:
                    pct = parts[1].split("%")[0].strip()
                    stats["calls_executed"] = float(pct)

        return stats

    def cleanup(self):
        import shutil
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
