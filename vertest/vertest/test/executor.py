from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Optional

from vertest.analysis.parser import SourceParser
from vertest.analysis.types import SourceUnit
from vertest.harness.driver_gen import TestDriverGenerator
from vertest.harness.stub_gen import StubGenerator
from vertest.test.model import TestCase, TestResult, TestRun, TestStatus
from vertest.test.result import ResultParser
from vertest.util.compiler import detect_compiler


class TestExecutor:
    """Compiles and executes test harnesses, returning structured results."""

    def __init__(
        self,
        build_dir: str | Path | None = None,
        compiler: str | None = None,
        compiler_flags: list[str] | None = None,
    ):
        self.build_dir = Path(build_dir).resolve() if build_dir else Path(tempfile.mkdtemp(prefix="vertest_"))
        self.build_dir.mkdir(parents=True, exist_ok=True)
        self.compiler = compiler or detect_compiler()
        self.compiler_flags = compiler_flags or ["-g", "-O0", "-lm"]

    def execute_suite(
        self,
        unit: SourceUnit,
        target_function: str,
        test_cases: list[TestCase],
        stub_funcs: list | None = None,
    ) -> TestRun:
        run = TestRun(suite_name=target_function)
        run.start_time = time.time()
        start = time.time()

        # Generate harness
        driver_gen = TestDriverGenerator(self.build_dir)
        stub_gen = StubGenerator(self.build_dir)

        stub_funcs_info = []
        if stub_funcs:
            stub_funcs_info = stub_funcs
            stub_gen.generate(stub_funcs_info)

        tc_dicts = []
        for tc in test_cases:
            tc_dicts.append({
                "name": tc.name,
                "args": tc.args,
                "expected": tc.expected,
                "stubs": {k: v if isinstance(v, list) else [v] for k, v in tc.stubs.items()},
            })

        driver_path = driver_gen.generate(unit, target_function, tc_dicts, stub_funcs_info)

        # Compile: driver + original source + stub lib
        binary_path = self.build_dir / f"run_{target_function}"
        sources = [str(driver_path), unit.file_path]
        stub_lib = self.build_dir / "vertest_stub_lib.c"
        if stub_lib.exists():
            sources.append(str(stub_lib))
        compile_ok, compile_out = self._compile(sources, binary_path)

        if not compile_ok:
            run.end_time = time.time()
            run.total_duration_ms = (run.end_time - start) * 1000
            for tc in test_cases:
                run.results.append(TestResult(
                    test_name=tc.name,
                    status=TestStatus.ERROR,
                    message=f"Compilation failed:\n{compile_out}",
                ))
            return run

        # Run
        stdout, stderr, retcode = self._run_binary(binary_path, cwd=self.build_dir)
        results = ResultParser.parse(stdout, stderr)

        run.end_time = time.time()
        run.total_duration_ms = (run.end_time - start) * 1000
        for r in results:
            run.results.append(r)

        if not results:
            if retcode == 0:
                run.results.append(TestResult(
                    test_name=target_function,
                    status=TestStatus.PASSED,
                    stdout=stdout,
                    stderr=stderr,
                ))
            else:
                run.results.append(TestResult(
                    test_name=target_function,
                    status=TestStatus.FAILED,
                    message=f"Exit code: {retcode}",
                    stdout=stdout,
                    stderr=stderr,
                ))

        return run

    def _compile(self, source_paths: list[str], binary_path: Path) -> tuple[bool, str]:
        cmd = [
            self.compiler,
            *source_paths,
            "-o", str(binary_path),
        ] + self.compiler_flags

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=60
            )
            if result.returncode != 0:
                return False, result.stderr + "\n" + result.stdout
            return True, ""
        except subprocess.TimeoutExpired:
            return False, "Compilation timed out"
        except FileNotFoundError:
            return False, f"Compiler '{self.compiler}' not found"

    @staticmethod
    def _run_binary(binary_path: Path, cwd: Path | None = None) -> tuple[str, str, int]:
        try:
            result = subprocess.run(
                [str(binary_path)], capture_output=True, text=True, timeout=30,
                cwd=str(cwd) if cwd else None,
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired:
            return "", "Test execution timed out", -1
        except Exception as e:
            return "", f"Execution error: {e}", -1

    def cleanup(self):
        import shutil
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
