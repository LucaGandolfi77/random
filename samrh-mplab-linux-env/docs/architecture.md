# Architecture Overview

This repository separates concerns into four layers:

1. `firmware/common/` contains deterministic, vendor-neutral logic that is testable on Linux and on the target.
2. `firmware/hal/` contains small adaptation points that isolate debugger stops, board bring-up hooks, or Harmony integration.
3. `firmware/targets/` is reserved for device-family-specific startup files, linker scripts, and BSP code.
4. `tests/` contains both host and target test entry points that exercise the same shared logic.

Automation is intentionally split the same way:

1. `scripts/build-host-tests.sh` and `tests/host/Makefile` cover deterministic host-based unit testing.
2. `scripts/build-target.sh` invokes committed MPLAB X project makefiles for XC32 builds.
3. `scripts/run-tests.sh` selects host, simulator, or hardware execution and enforces explicit failure handling.
4. `tests/target/mdb/templates/` contains version-reviewable MDB templates that can be replaced if a local installation requires different syntax.