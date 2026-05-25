# MPLAB X Project Guidance

## Goals

The MPLAB X project should own device selection, startup files, linker scripts, and debugger configuration, while the repository tree owns reusable source code and tests.

## Recommended Project Layout

1. Keep the `.X` project directory under `mplab/projects/`.
2. Add source-file references that point back to `firmware/` and `tests/` instead of copying files.
3. Keep Harmony or MCC generated files in a dedicated subfolder under the `.X` project or under `firmware/targets/<family>/generated/`.
4. Keep hand-written code in `firmware/common/`, `firmware/hal/`, and `tests/`.

## Required Source References

For both SAMRH707 and SAMRH71 test projects, reference these files:

1. `firmware/common/src/command_frame.c`
2. `firmware/hal/src/platform_test_hooks_stub.c`
3. `tests/shared/src/test_command_frame.c`
4. `tests/target/src/main.c`

## Required Include Paths

1. `firmware/common/include`
2. `firmware/hal/include`
3. `tests/shared/include`
4. `tests/target/include`

## Recommended Build Macros

Always define:

1. `UNIT_TEST`
2. `TARGET_SAMRH707` or `TARGET_SAMRH71`

Define only if needed:

1. `USE_HARMONY`
2. `ENABLE_TEST_BREAKPOINT`

## Harmony / MCC Use

Use Harmony or MCC only for low-level drivers, clocks, interrupts, and startup wiring. Do not place protocol parsing, command validation, state machines, or decision logic inside generated files.

## Separation Rules

1. Vendor-generated code may call into stable interfaces from `firmware/hal/` or `firmware/app/`.
2. Shared logic must not include Harmony headers directly.
3. Tests should target deterministic C APIs, not register writes.

## Linux Build Guidance

Once the project has been created in MPLAB X and committed, build it from Linux with:

`./scripts/build-target.sh --project mplab/projects/<project>.X --conf default`

If the local makefiles expect XC32 outside `PATH`, set `XC32_DIR` before invoking the script.