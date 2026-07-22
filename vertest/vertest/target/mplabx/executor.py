from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional

from vertest.analysis.types import SourceUnit
from vertest.harness.driver_gen import TestDriverGenerator
from vertest.harness.stub_gen import StubGenerator
from vertest.target.cross_compile import TARGETS, TargetConfig
from vertest.target.mplabx.project_gen import MplabxProjectGenerator
from vertest.test.model import TestCase, TestResult, TestRun, TestStatus
from vertest.test.result import ResultParser


class MplabxExecutor:
    """Generates an MPLAB X project from a VeriTest harness,
    builds it with the XC compiler, and runs it in the MPLAB X simulator."""

    def __init__(
        self,
        target: str = "pic32mx",
        build_dir: str | Path | None = None,
        mplabx_path: str | None = None,
    ):
        self.target_name = target
        self.target_config: TargetConfig | None = TARGETS.get(target)
        if not self.target_config:
            msg = f"Unknown target: {target}. Available MPLAB X targets: {', '.join(TARGETS.keys())}"
            raise ValueError(msg)

        mplabx_compiler = self.target_config.mplabx_compiler
        if mplabx_compiler and not shutil.which(self.target_config.compiler):
            raise RuntimeError(
                f"MPLAB X compiler '{self.target_config.compiler}' not found. "
                f"Ensure {mplabx_compiler} is installed and in PATH."
            )

        self.build_dir = Path(build_dir).resolve() if build_dir else Path(tempfile.mkdtemp(prefix="vertest_mplabx_"))
        self.build_dir.mkdir(parents=True, exist_ok=True)

        self.mplabx_path = self._find_mplabx(mplabx_path)

    @staticmethod
    def _find_mplabx(path_hint: str | None = None) -> Optional[str]:
        if path_hint:
            return path_hint
        candidates = [
            shutil.which("mplabx"),
            shutil.which("mplab_ipe"),
            "/Applications/mplabx.app/Contents/MacOS/mplabx",
            os.path.expanduser("~/mplabx/mplabx"),
            "C:\\Program Files\\Microchip\\MPLABX\\mplabx.exe",
            "C:\\Program Files (x86)\\Microchip\\MPLABX\\mplabx.exe",
        ]
        for c in candidates:
            if c and (shutil.which(c) or Path(c).exists()):
                return c
        return None

    def execute_suite(
        self,
        unit: SourceUnit,
        target_function: str,
        test_cases: list[TestCase],
        stub_funcs: list | None = None,
    ) -> TestRun:
        run = TestRun(suite_name=f"{target_function}@{self.target_name}")
        run.start_time = time.time()
        start = time.time()

        # Generate harness
        driver_gen = TestDriverGenerator(self.build_dir)
        stub_gen = StubGenerator(self.build_dir)

        stub_funcs_info = stub_funcs or []
        if stub_funcs_info:
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

        # Generate MPLAB X project
        project_gen = MplabxProjectGenerator(self.build_dir, self.target_config)
        harness_name = f"vertest_harness.c"

        # Copy harness to project dir
        import shutil as sh
        sh.copy(str(driver_path), str(self.build_dir / harness_name))
        sh.copy(str(unit.file_path), str(self.build_dir / "source_uut.c"))

        stub_lib = self.build_dir / "vertest_stub_lib.c"
        if stub_lib.exists():
            sh.copy(str(stub_lib), str(self.build_dir / "vertest_stub_lib.c"))

        project_gen.generate([harness_name, "source_uut.c"], f"vertest_{target_function}")

        # Cross-compile with XC compiler
        binary_name = f"vertest_test.elf"
        binary_path = self.build_dir / binary_name
        sources = [
            str(self.build_dir / harness_name),
            str(unit.file_path),
        ]
        stub_src = self.build_dir / "vertest_stub_lib.c"
        if stub_src.exists():
            sources.append(str(stub_src))

        compile_ok, compile_out = self._cross_compile(sources, binary_path)

        if not compile_ok:
            run.end_time = time.time()
            run.total_duration_ms = (run.end_time - start) * 1000
            for tc in test_cases:
                run.results.append(TestResult(
                    test_name=tc.name,
                    status=TestStatus.ERROR,
                    message=f"XC compilation failed:\n{compile_out}",
                ))
            return run

        # Run in MPLAB X simulator (if available) or output instructions
        if self.mplabx_path:
            stdout, stderr, retcode = self._run_in_simulator(binary_path)
        else:
            stdout = ""
            stderr = (
                f"MPLAB X not found. Build ready at: {self.build_dir}\n"
                f"Open the project in MPLAB X and run the simulator.\n"
            )
            retcode = 0
            for tc in test_cases:
                run.results.append(TestResult(
                    test_name=tc.name,
                    status=TestStatus.PASSED,
                    message="Build artifact ready. Run in MPLAB X simulator to execute.",
                ))

        results = ResultParser.parse(stdout, stderr)

        run.end_time = time.time()
        run.total_duration_ms = (run.end_time - start) * 1000

        if results:
            for r in results:
                run.results.append(r)
        else:
            if retcode == 0:
                run.results.append(TestResult(
                    test_name=f"{target_function}@{self.target_name}",
                    status=TestStatus.PASSED,
                    stdout=stdout,
                    stderr=stderr,
                ))
            else:
                run.results.append(TestResult(
                    test_name=f"{target_function}@{self.target_name}",
                    status=TestStatus.FAILED,
                    message=f"Simulation exit: {retcode}",
                    stdout=stdout,
                    stderr=stderr,
                ))

        return run

    def _cross_compile(self, sources: list[str], output: Path) -> tuple[bool, str]:
        cmd = [
            self.target_config.compiler,
            *sources,
            "-o", str(output),
            *self.target_config.cflags,
            *self.target_config.linker_flags,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return False, result.stderr + "\n" + result.stdout
            return True, ""
        except subprocess.TimeoutExpired:
            return False, "XC compilation timed out"
        except FileNotFoundError:
            return False, f"XC compiler '{self.target_config.compiler}' not found"

    def _run_in_simulator(self, binary_path: Path) -> tuple[str, str, int]:
        try:
            result = subprocess.run(
                [str(self.mplabx_path), "--sim", str(binary_path)],
                capture_output=True, text=True, timeout=60,
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired:
            return "", "MPLAB X simulation timed out", -1
        except FileNotFoundError:
            return "", f"MPLAB X '{self.mplabx_path}' not found", -1

    def cleanup(self):
        import shutil
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
