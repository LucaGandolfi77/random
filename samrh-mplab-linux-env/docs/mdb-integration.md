# MDB Integration Guide

## Purpose

The repository uses MDB only for target-side execution. The runner does not assume that the simulator is authoritative for all subsystems.

## Command-File Strategy

The preferred workflow is:

1. Build an ELF with MPLAB X / XC32.
2. Generate an MDB command file from a repository template with `./scripts/generate-mdb-script.sh`.
3. Execute the file with `./scripts/run-tests.sh`.
4. Parse `unit_test_done` and `unit_test_failures` from the MDB log.

## Template Fields

Each `.mdb.in` template contains these substitutions:

1. `@DEVICE@`: exact device name passed to MDB.
2. `@HWTOOL@`: debugger name, or `sim` for simulator mode.
3. `@ELF@`: absolute path to the ELF artifact.
4. `@RUN_SECONDS@`: coarse execution window before the runner halts the target and reads result symbols.

## Example Generated Flow

Representative sequence for a simulator run:

1. `device SAMRH707F18A`
2. `hwtool sim`
3. `program "/abs/path/to/test.elf"`
4. `reset`
5. `run`
6. `wait 5`
7. `halt`
8. `print unit_test_done`
9. `print unit_test_failures`
10. `quit`

## Limitations

1. Some MDB versions differ in how they delay execution or expose symbols.
2. Symbol inspection can fail if the build strips debug information or optimizes globals away.
3. Peripheral-heavy firmware may run differently in simulator mode.

## Local Verification

Before relying on a template for project evidence:

1. Generate the command file.
2. Run it once manually or through `./scripts/run-tests.sh`.
3. Inspect the log file under `logs/runtime/`.
4. Confirm that the expected result symbols appear exactly as the parser expects.

## Fallback

If the local MDB behaviour differs from the repository template, create a site-verified command file and supply it with `--mdb-script`.