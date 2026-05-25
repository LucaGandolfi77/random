#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

# shellcheck source=./lib/log.sh
source "$script_dir/lib/log.sh"
# shellcheck source=./lib/tool_discovery.sh
source "$script_dir/lib/tool_discovery.sh"
# shellcheck source=./lib/mdb_helpers.sh
source "$script_dir/lib/mdb_helpers.sh"

usage() {
    cat <<'EOF'
Usage: ./scripts/run-tests.sh --mode <host|sim|hw> [options]

Options:
  --mode <host|sim|hw>      Select host tests, simulator-based tests, or hardware-based tests.
  --device <name>          Device family or exact device. Examples: samrh707, samrh71, SAMRH707F18A.
  --elf <path>             ELF artifact for simulator or hardware mode.
  --tool <name>            Hardware debugger name as accepted by MDB, for example SNAP.
  --mdb-script <path>      Use an existing MDB script instead of generating one.
  --run-seconds <n>        Wait budget encoded in the generated MDB script. Default: 5.
  --log-dir <path>         Directory for generated MDB scripts and logs. Default: logs/runtime.
  --compiler <gcc|clang>   Compiler to use for host mode. Default: CC or gcc.
  --help                   Show this help text.
EOF
}

mode=""
device=""
elf_path=""
hwtool=""
mdb_script=""
run_seconds="${RUN_SECONDS:-5}"
log_dir="$repo_root/logs/runtime"
compiler="${CC:-gcc}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode)
            [[ $# -ge 2 ]] || die "Missing value for --mode"
            mode="$2"
            shift 2
            ;;
        --device)
            [[ $# -ge 2 ]] || die "Missing value for --device"
            device="$2"
            shift 2
            ;;
        --elf)
            [[ $# -ge 2 ]] || die "Missing value for --elf"
            elf_path="$2"
            shift 2
            ;;
        --tool)
            [[ $# -ge 2 ]] || die "Missing value for --tool"
            hwtool="$2"
            shift 2
            ;;
        --mdb-script)
            [[ $# -ge 2 ]] || die "Missing value for --mdb-script"
            mdb_script="$2"
            shift 2
            ;;
        --run-seconds)
            [[ $# -ge 2 ]] || die "Missing value for --run-seconds"
            run_seconds="$2"
            shift 2
            ;;
        --log-dir)
            [[ $# -ge 2 ]] || die "Missing value for --log-dir"
            log_dir="$2"
            shift 2
            ;;
        --compiler)
            [[ $# -ge 2 ]] || die "Missing value for --compiler"
            compiler="$2"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1"
            ;;
    esac
done

[[ -n "$mode" ]] || die "--mode is required"
assert_supported_mode "$mode"

mkdir -p "$log_dir"

if [[ "$mode" == 'host' ]]; then
    if [[ -n "$device" ]] || [[ -n "$elf_path" ]] || [[ -n "$hwtool" ]] || [[ -n "$mdb_script" ]]; then
        log_warn "Ignoring target-specific options because mode=host"
    fi
    CC="$compiler" "$repo_root/scripts/build-host-tests.sh"
    exit 0
fi

[[ -n "$elf_path" ]] || die "--elf is required for sim and hw modes"
[[ -f "$elf_path" ]] || die "ELF file not found: $elf_path"

if [[ -z "$mdb_script" ]]; then
    [[ -n "$device" ]] || die "--device is required when generating an MDB script"
    device="$(canonicalize_device "$device")"
    family="$(family_from_device "$device" 2>/dev/null || true)"
    [[ -n "$family" ]] || die "Unable to infer family from device '$device'."

    if [[ "$mode" == 'hw' ]] && [[ -z "$hwtool" ]]; then
        die "--tool is required for hardware mode unless --mdb-script is supplied"
    fi

    timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
    mdb_script="$log_dir/${family}-${mode}-${timestamp}.mdb"
    generate_args=(
        --device "$device"
        --mode "$mode"
        --elf "$elf_path"
        --output "$mdb_script"
        --run-seconds "$run_seconds"
    )

    if [[ -n "$hwtool" ]]; then
        generate_args+=(--tool "$hwtool")
    fi

    "$repo_root/scripts/generate-mdb-script.sh" "${generate_args[@]}"
else
    [[ -f "$mdb_script" ]] || die "MDB script not found: $mdb_script"
fi

mdb_path="$(require_mdb)"
log_file="$log_dir/$(basename "$mdb_script" .mdb).log"
timeout_seconds="${MDB_TIMEOUT_SECONDS:-120}"
run_status=0

log_info "Running MDB script $(absolute_path "$mdb_script")"
log_info "MDB executable: $mdb_path"

if command -v timeout >/dev/null 2>&1; then
    if ! timeout --preserve-status "${timeout_seconds}s" "$mdb_path" "$mdb_script" >"$log_file" 2>&1; then
        run_status=$?
    fi
else
    log_warn "timeout command not found; MDB execution will not be time-bounded"
    if ! "$mdb_path" "$mdb_script" >"$log_file" 2>&1; then
        run_status=$?
    fi
fi

if [[ "$run_status" -ne 0 ]]; then
    die "MDB execution failed with status $run_status. See $log_file"
fi

unit_test_done="$(extract_symbol_value "$log_file" 'unit_test_done' || true)"
unit_test_failures="$(extract_symbol_value "$log_file" 'unit_test_failures' || true)"

if [[ -z "$unit_test_done" ]] || [[ -z "$unit_test_failures" ]]; then
    die "Could not extract unit_test_done and unit_test_failures from $log_file. Verify MDB command syntax for the local MPLAB X version or supply --mdb-script."
fi

if [[ "$unit_test_done" != '1' ]]; then
    die "Target test did not report completion (unit_test_done=$unit_test_done). See $log_file"
fi

if [[ "$unit_test_failures" != '0' ]]; then
    die "Target test reported $unit_test_failures failures. See $log_file"
fi

log_info "Target tests completed successfully"