# SAMRH MPLAB Linux Test Environment

This repository provides a conservative, Linux-only development and test environment for Microchip SAMRH707 and SAMRH71 firmware using MPLAB X / XC32 tooling.

The intent is to support a professional engineering workflow where host-based tests, MPLAB X target builds, and MDB-driven execution can coexist without mixing application logic with vendor-specific code.

## Scope

Supported goals:

1. Build firmware test targets for SAMRH707 and SAMRH71 with MPLAB X / XC32.
2. Run deterministic host-based unit tests with GCC or Clang on Linux.
3. Run target-side tests through MDB in simulator mode when practical.
4. Run target-side tests through MDB with real hardware when simulator coverage is incomplete.

Deliberate non-goals:

1. This repository does not claim full simulator coverage for peripherals.
2. This repository does not invent MPLAB X `nbproject/` metadata, because the generated files are version- and pack-dependent.
3. This repository does not hide tool-discovery failures; missing tools are reported explicitly.

## Repository Layout

```text
samrh-mplab-linux-env/
├── .editorconfig
├── .gitattributes
├── .gitignore
├── Makefile
├── README.md
├── docs/
│   ├── architecture.md
│   ├── assumptions.md
│   ├── mdb-integration.md
│   ├── mplab-project-guidance.md
│   ├── simulator-hardware-strategy.md
│   └── troubleshooting.md
├── firmware/
│   ├── app/
│   │   └── README.md
│   ├── common/
│   │   ├── include/
│   │   │   └── command_frame.h
│   │   └── src/
│   │       └── command_frame.c
│   ├── hal/
│   │   ├── include/
│   │   │   └── platform_test_hooks.h
│   │   └── src/
│   │       └── platform_test_hooks_stub.c
│   └── targets/
│       ├── samrh707/
│       │   └── README.md
│       └── samrh71/
│           └── README.md
├── logs/
│   └── .gitignore
├── make/
│   └── host-flags.mk
├── mplab/
│   ├── README.md
│   ├── projects/
│   │   └── README.md
│   └── templates/
│       ├── samrh707-project-manifest.md
│       └── samrh71-project-manifest.md
├── scripts/
│   ├── build-host-tests.sh
│   ├── build-target.sh
│   ├── generate-mdb-script.sh
│   ├── run-tests.sh
│   ├── verify-tools.sh
│   └── lib/
│       ├── log.sh
│       ├── mdb_helpers.sh
│       └── tool_discovery.sh
└── tests/
    ├── host/
    │   ├── Makefile
    │   └── src/
    │       └── main.c
    ├── shared/
    │   ├── include/
    │   │   └── test_command_frame.h
    │   └── src/
    │       └── test_command_frame.c
    └── target/
        ├── include/
        │   └── target_test_status.h
        ├── mdb/
        │   ├── README.md
        │   └── templates/
        │       ├── samrh707-hw.mdb.in
        │       ├── samrh707-sim.mdb.in
        │       ├── samrh71-hw.mdb.in
        │       └── samrh71-sim.mdb.in
        └── src/
            └── main.c
```

## Prerequisites

Mandatory for host tests:

1. Linux with Bash, `make`, `grep`, and `sed`
2. GCC or Clang

Mandatory for target builds:

1. MPLAB X project created and committed under `mplab/projects/`
2. XC32 toolchain available either in `PATH` or through `XC32_DIR`

Mandatory for simulator or hardware execution:

1. `mdb.sh` available either in `PATH` or through `MDB_PATH` / `MPLABX_DIR`
2. A debug build of the ELF with symbols preserved

## Environment Variables

The scripts accept explicit overrides to avoid fragile path assumptions:

1. `MPLABX_DIR`: MPLAB X installation root, for example `/opt/microchip/mplabx/v6.25`
2. `MDB_PATH`: absolute path to `mdb.sh`
3. `XC32_DIR`: XC32 installation root, for example `/opt/microchip/xc32/v4.50`
4. `SAMRH707_DEFAULT_DEVICE`: optional override for the default SAMRH707 device alias
5. `SAMRH71_DEFAULT_DEVICE`: optional override for the default SAMRH71 device alias
6. `MDB_TIMEOUT_SECONDS`: optional timeout used by the test runner for MDB execution

## Quick Start

### 1. Verify Host Tooling

```bash
./scripts/verify-tools.sh
```

### 2. Run Host-Based Unit Tests

```bash
./scripts/run-tests.sh --mode host
```

Alternative commands:

```bash
make host-test
make host-test-clang
```

### 3. Build a Target ELF from an Existing MPLAB X Project

```bash
./scripts/build-target.sh --project mplab/projects/samrh707_unit_test.X --conf default
```

or

```bash
./scripts/build-target.sh --project mplab/projects/samrh71_unit_test.X --conf default
```

### 4. Generate an MDB Script

Simulator example:

```bash
./scripts/generate-mdb-script.sh \
  --device samrh707 \
  --mode sim \
  --elf mplab/projects/samrh707_unit_test.X/dist/default/production/samrh707_unit_test.X.production.elf \
  --output logs/runtime/samrh707-sim.mdb
```

Hardware example:

```bash
./scripts/generate-mdb-script.sh \
  --device samrh71 \
  --mode hw \
  --tool SNAP \
  --elf mplab/projects/samrh71_unit_test.X/dist/default/production/samrh71_unit_test.X.production.elf \
  --output logs/runtime/samrh71-hw.mdb
```

### 5. Run Target Tests Through the Standard Runner

Simulator example:

```bash
./scripts/run-tests.sh \
  --mode sim \
  --device samrh707 \
  --elf mplab/projects/samrh707_unit_test.X/dist/default/production/samrh707_unit_test.X.production.elf
```

Hardware example:

```bash
./scripts/run-tests.sh \
  --mode hw \
  --device samrh71 \
  --tool SNAP \
  --elf mplab/projects/samrh71_unit_test.X/dist/default/production/samrh71_unit_test.X.production.elf
```

If the local MDB syntax differs from the repository templates, use a locally validated command file:

```bash
./scripts/run-tests.sh \
  --mode hw \
  --mdb-script /absolute/path/to/local-verified.mdb \
  --elf mplab/projects/samrh71_unit_test.X/dist/default/production/samrh71_unit_test.X.production.elf
```

## Example Test Design

The example test target is intentionally small but realistic:

1. `firmware/common/src/command_frame.c` implements a command-frame parser with CRC checking.
2. `tests/shared/src/test_command_frame.c` contains reusable test cases that run in host and target contexts.
3. `tests/host/src/main.c` provides a Linux-native test harness.
4. `tests/target/src/main.c` provides an embedded test runner with exported result symbols:
   - `unit_test_done`
   - `unit_test_failures`
   - `unit_test_signature`

The target runner calls the same shared test logic used by the host harness, then enters an idle loop so the debugger can inspect the result variables.

## MPLAB X Project Guidance

Create one MPLAB X standalone project per device family and keep the generated metadata under `mplab/projects/`.

Recommended configuration:

1. Create a standalone project for the exact device.
2. Use XC32 and produce an ELF artifact.
3. Add references to repository files rather than copying them.
4. Define these macros:
   - `UNIT_TEST`
   - `TARGET_SAMRH707` or `TARGET_SAMRH71`
   - optional: `USE_HARMONY`
   - optional: `ENABLE_TEST_BREAKPOINT`
5. Keep Harmony/MCC output isolated from hand-written logic.

Detailed guidance is in `docs/mplab-project-guidance.md` and the manifests under `mplab/templates/`.

## Simulator and Hardware Strategy

Use the simulator only for CPU-bound, peripheral-light scenarios. Keep parsers, CRC routines, state machines, and boundary conditions primarily as host tests.

Use real hardware for anything that depends on:

1. Peripheral registers
2. Interrupt timing
3. Clocking behaviour
4. Device-specific debug interactions
5. Board wiring or external interfaces

When simulator support is partial or absent, the fallback order is:

1. Host-based unit test for pure logic
2. Hardware-backed debug/program/run flow for integration coverage

This repository intentionally does not claim that all SAMRH707 or SAMRH71 peripherals are accurately modeled by the simulator.

## Explicit Assumptions

Whenever installation details may vary locally, this repository follows four rules:

1. State the assumption explicitly.
2. Provide a conservative default.
3. Provide a verification step.
4. Provide a fallback.

See `docs/assumptions.md` for the full list.

## Troubleshooting

Common issues are documented in `docs/troubleshooting.md`.

Typical checks:

```bash
./scripts/verify-tools.sh --require-mdb --require-xc32
bash -n scripts/*.sh scripts/lib/*.sh
make host-test
```

## Acceptance Criteria

The environment is considered operational when all of the following are true:

1. Host tests pass on Linux using `./scripts/run-tests.sh --mode host`.
2. `./scripts/verify-tools.sh` reports missing tools accurately and returns non-zero when `--require-mdb` or `--require-xc32` is used and the tool is absent.
3. A committed MPLAB X project for SAMRH707 builds successfully through `./scripts/build-target.sh`.
4. A committed MPLAB X project for SAMRH71 builds successfully through `./scripts/build-target.sh`.
5. `./scripts/run-tests.sh --mode sim` works for any simulator-suitable ELF that the local MPLAB X installation actually supports.
6. `./scripts/run-tests.sh --mode hw` works for a locally supported debugger and target board.
7. The MDB runner returns non-zero on command-file errors, missing tools, missing artifacts, or non-zero test failures.
8. Documentation clearly explains which tests belong on host, simulator, or real hardware.

## Extension Points

For future work:

1. Add more pure logic modules under `firmware/common/`.
2. Add more shared test suites under `tests/shared/`.
3. Add hardware-specific harness code under `firmware/targets/<family>/`.
4. Replace the stub hooks in `firmware/hal/` with board-aware implementations.
5. Add CI jobs for host-only verification and offline script validation.