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
Usage: ./scripts/generate-mdb-script.sh --device <family-or-device> --mode <sim|hw> --elf <file> --output <file> [--tool <name>] [--run-seconds <n>]

Generate an MDB command file from the repository templates.
EOF
}

device=""
mode=""
elf_path=""
output_path=""
hwtool=""
run_seconds="${RUN_SECONDS:-5}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --device)
            [[ $# -ge 2 ]] || die "Missing value for --device"
            device="$2"
            shift 2
            ;;
        --mode)
            [[ $# -ge 2 ]] || die "Missing value for --mode"
            mode="$2"
            shift 2
            ;;
        --elf)
            [[ $# -ge 2 ]] || die "Missing value for --elf"
            elf_path="$2"
            shift 2
            ;;
        --output)
            [[ $# -ge 2 ]] || die "Missing value for --output"
            output_path="$2"
            shift 2
            ;;
        --tool)
            [[ $# -ge 2 ]] || die "Missing value for --tool"
            hwtool="$2"
            shift 2
            ;;
        --run-seconds)
            [[ $# -ge 2 ]] || die "Missing value for --run-seconds"
            run_seconds="$2"
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

[[ -n "$device" ]] || die "--device is required"
[[ -n "$mode" ]] || die "--mode is required"
[[ -n "$elf_path" ]] || die "--elf is required"
[[ -n "$output_path" ]] || die "--output is required"

assert_supported_mode "$mode"
[[ "$mode" != 'host' ]] || die "Host mode does not use MDB scripts"
[[ -f "$elf_path" ]] || die "ELF file not found: $elf_path"

device="$(canonicalize_device "$device")"
family="$(family_from_device "$device" 2>/dev/null || true)"
[[ -n "$family" ]] || die "Unable to infer family from device '$device'. Pass samrh707, samrh71, or an exact device name with the same prefix."

if [[ "$mode" == 'sim' ]]; then
    hwtool='sim'
else
    [[ -n "$hwtool" ]] || die "--tool is required for hardware mode"
fi

template_path="$(select_mdb_template "$repo_root" "$family" "$mode")"
render_mdb_template "$template_path" "$output_path" "$device" "$(absolute_path "$elf_path")" "$hwtool" "$run_seconds"

log_info "Generated MDB script at $(absolute_path "$output_path")"