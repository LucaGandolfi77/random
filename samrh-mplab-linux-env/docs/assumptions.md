# Assumptions and Verification

## Device Naming

Assumption:
The family aliases `samrh707` and `samrh71` map to `SAMRH707F18A` and `SAMRH71F20C` respectively.

Conservative default:
The scripts use those two exact names unless the caller passes a full device name or overrides `SAMRH707_DEFAULT_DEVICE` or `SAMRH71_DEFAULT_DEVICE`.

Verification step:
Open MPLAB X device selection or run a local dry test with the exact device name visible in the installed pack.

Fallback:
Pass `--device <exact-device-name>` to the scripts and update the environment override in CI.

## MPLAB X Path Layout

Assumption:
Linux installs place `mdb.sh` under a directory such as `/opt/microchip/mplabx/<version>/mplab_platform/bin/mdb.sh`.

Conservative default:
The scripts search only a short list of common Linux install roots and otherwise require `MDB_PATH` or `MPLABX_DIR`.

Verification step:
Run `./scripts/verify-tools.sh --require-mdb`.

Fallback:
Export `MDB_PATH` directly.

## MDB Command Syntax

Assumption:
The local MDB build accepts `device`, `hwtool`, `program`, `reset`, `run`, `wait`, `halt`, `print`, and `quit` inside command files.

Conservative default:
The repository templates use only those baseline commands and mark the syntax as locally verifiable.

Verification step:
Run `./scripts/run-tests.sh --mode sim --device samrh707 --elf <path>` on a disposable ELF and inspect the generated log.

Fallback:
Use `--mdb-script` with a locally validated command file and keep the standard runner for log capture and return-code handling.

## Simulator Coverage

Assumption:
Simulator support for SAMRH707 and SAMRH71 may be partial, especially for peripheral-heavy tests.

Conservative default:
Only CPU-bound logic and symbol inspection are treated as simulator candidates.

Verification step:
Run one dry simulator test before enabling the simulator flow in CI.

Fallback:
Keep the logic test host-based or move the scenario to a hardware-backed test.