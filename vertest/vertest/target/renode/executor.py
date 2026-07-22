from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional

from vertest.analysis.types import SourceUnit
from vertest.harness.stub_gen import StubGenerator
from vertest.target.cross_compile import TargetConfig, detect_cross_compiler, TARGETS
from vertest.target.renode.script_gen import RenodeScriptGenerator
from vertest.target.renode.harness_baremetal import BareMetalDriverGenerator
from vertest.test.model import TestCase, TestResult, TestRun, TestStatus
from vertest.test.result import ResultParser


class RenodeExecutor:
    """Cross-compiles the test harness for a target architecture and
    executes it inside a Renode simulation, capturing results via UART."""

    def __init__(
        self,
        target: str = "cortex-m3",
        build_dir: str | Path | None = None,
        renode_path: str | None = None,
    ):
        self.target_name = target
        self.target_config = TARGETS.get(target)
        if not self.target_config:
            msg = f"Unknown target: {target}. Available: {', '.join(TARGETS.keys())}"
            raise ValueError(msg)

        if not shutil.which(self.target_config.compiler):
            raise RuntimeError(f"Cross-compiler '{self.target_config.compiler}' not found for target '{target}'")

        self.build_dir = Path(build_dir).resolve() if build_dir else Path(tempfile.mkdtemp(prefix="vertest_renode_"))
        self.build_dir.mkdir(parents=True, exist_ok=True)

        self.renode_path = self._find_renode(renode_path)

    @staticmethod
    def _find_renode(path_hint: str | None = None) -> Optional[str]:
        if path_hint:
            return path_hint
        candidates = [
            shutil.which("renode"),
            shutil.which("renode-run"),
            "/opt/renode/test.sh",
            "/Applications/Renode.app/Contents/MacOS/renode",
            os.path.expanduser("~/Renode/renode"),
            os.path.expanduser("~/renode/build/bin/Release/macos-x64/Renode.exe"),
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
        timeout_s: int = 30,
    ) -> TestRun:
        run = TestRun(suite_name=f"{target_function}@{self.target_name}")
        run.start_time = time.time()
        start = time.time()

        # Generate bare-metal harness (no stdio dependency)
        driver_gen = BareMetalDriverGenerator(self.build_dir)
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

        # Write linker script for Cortex-M
        linker_script = self.build_dir / "vertest.ld"
        linker_script.write_text(self._linker_script())

        # Cross-compile: driver + UUT source + stubs + startup
        binary_name = f"run_{target_function}.elf"
        binary_path = self.build_dir / binary_name
        sources = [
            str(driver_path),
            str(self.build_dir / "vertest_startup.c"),
            str(unit.file_path),
        ]
        stub_lib = self.build_dir / "vertest_stub_lib.c"
        if stub_lib.exists():
            sources.append(str(stub_lib))

        compile_ok, compile_out = self._cross_compile(sources, binary_path)

        if not compile_ok:
            run.end_time = time.time()
            run.total_duration_ms = (run.end_time - start) * 1000
            for tc in test_cases:
                run.results.append(TestResult(
                    test_name=tc.name,
                    status=TestStatus.ERROR,
                    message=f"Cross-compilation failed:\n{compile_out}",
                ))
            return run

        # Run in Renode
        stdout, stderr, retcode = self._run_in_renode(binary_path, timeout_s)
        results = ResultParser.parse(stdout, stderr)

        run.end_time = time.time()
        run.total_duration_ms = (run.end_time - start) * 1000
        for r in results:
            run.results.append(r)

        if not results:
            summary = ResultParser.parse_summary(stdout)
            if summary.get("failed", 0) == 0 and retcode == 0:
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
                    message=f"Renode exit: {retcode}",
                    stdout=stdout,
                    stderr=stderr,
                ))

        return run

    def _cross_compile(self, sources: list[str], output: Path) -> tuple[bool, str]:
        linker_script = self.build_dir / "vertest.ld"
        ld_flags = self.target_config.linker_flags + [f"-T{linker_script}"]
        cmd = [
            self.target_config.compiler,
            *sources,
            "-o", str(output),
            *self.target_config.cflags,
            *ld_flags,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return False, result.stderr + "\n" + result.stdout
            return True, ""
        except subprocess.TimeoutExpired:
            return False, "Cross-compilation timed out"
        except FileNotFoundError:
            return False, f"Cross-compiler '{self.target_config.compiler}' not found"

    def _run_in_renode(self, elf_path: Path, timeout_s: int = 30) -> tuple[str, str, int]:
        if not self.renode_path:
            return "", "Renode not found. Install from https://renode.io", -1

        # Generate Renode script
        script_gen = RenodeScriptGenerator()
        resc_path = script_gen.generate_resc(elf_path, self.target_config, self.build_dir, timeout_s)

        try:
            result = subprocess.run(
                [self.renode_path, "-e", f'include @"{resc_path}"', "--console"],
                capture_output=True, text=True, timeout=timeout_s + 10,
                cwd=str(self.build_dir),
                env={**os.environ, "RENODE_DISABLE_X11": "1"},
            )
            stdout = result.stdout or ""
            stderr = result.stderr or ""

            # Renode outputs UART data to log; extract PASS/FAIL markers
            captured = self._extract_test_output(stdout + stderr)
            return captured, stderr, result.returncode

        except subprocess.TimeoutExpired:
            return "", "Renode simulation timed out", -1
        except FileNotFoundError:
            return "", f"Renode executable '{self.renode_path}' not found", -1

    @staticmethod
    def _extract_test_output(log: str) -> str:
        lines = []
        for line in log.split("\n"):
            if any(marker in line for marker in ["PASS", "FAIL", "Results:", "VeriTest", "===================="]):
                lines.append(line.strip())
        return "\n".join(lines)

    @staticmethod
    def _linker_script() -> str:
        return """/* VeriTest linker script for ARM Cortex-M */
MEMORY
{
    FLASH (rx)  : ORIGIN = 0x00000000, LENGTH = 512K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
    .isr_vector : {
        . = ALIGN(4);
        KEEP(*(.isr_vector))
        . = ALIGN(4);
    } > FLASH

    .text : {
        . = ALIGN(4);
        *(.text .text.*)
        *(.glue_7)
        *(.glue_7t)
        *(.gnu.linkonce.t.*)
        . = ALIGN(4);
        _etext = .;
    } > FLASH

    .rodata : {
        . = ALIGN(4);
        *(.rodata .rodata.*)
        . = ALIGN(4);
    } > FLASH

    .preinit_array : {
        . = ALIGN(4);
        PROVIDE_HIDDEN(__preinit_array_start = .);
        KEEP(*(.preinit_array))
        PROVIDE_HIDDEN(__preinit_array_end = .);
    } > FLASH

    .init_array : {
        . = ALIGN(4);
        PROVIDE_HIDDEN(__init_array_start = .);
        KEEP(*(SORT(.init_array.*)))
        KEEP(*(.init_array))
        PROVIDE_HIDDEN(__init_array_end = .);
    } > FLASH

    _sidata = LOADADDR(.data);

    .data : {
        . = ALIGN(4);
        _sdata = .;
        *(.data .data.*)
        . = ALIGN(4);
        _edata = .;
    } > RAM AT > FLASH

    .bss : {
        . = ALIGN(4);
        _sbss = .;
        *(.bss .bss.*)
        *(COMMON)
        . = ALIGN(4);
        _ebss = .;
    } > RAM

    .stack : {
        . = ALIGN(8);
        _estack = .;
        . = . + 0x1000;
        _sstack = .;
    } > RAM

    /DISCARD/ : {
        *(.ARM.exidx*)
        *(.ARM.attributes*)
        *(.comment)
    }
}
"""

    def cleanup(self):
        import shutil
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
