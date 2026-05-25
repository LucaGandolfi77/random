#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

# shellcheck source=./lib/log.sh
source "$script_dir/lib/log.sh"
# shellcheck source=./lib/tool_discovery.sh
source "$script_dir/lib/tool_discovery.sh"

usage() {
    cat <<'EOF'
Usage: ./scripts/verify-tools.sh [--require-mdb] [--require-xc32] [--quiet]

Detect the Linux command-line tools used by this repository.
EOF
}

require_mdb_flag=0
require_xc32_flag=0
quiet=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --require-mdb)
            require_mdb_flag=1
            shift
            ;;
        --require-xc32)
            require_xc32_flag=1
            shift
            ;;
        --quiet)
            quiet=1
            shift
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

[[ "$quiet" -eq 1 ]] || log_info "Checking required host tools"
command -v bash >/dev/null 2>&1 || die "bash not found"
command -v make >/dev/null 2>&1 || die "make not found"
command -v grep >/dev/null 2>&1 || die "grep not found"
command -v sed >/dev/null 2>&1 || die "sed not found"

if [[ "$quiet" -eq 0 ]]; then
    log_info "bash: $(command -v bash)"
    log_info "make: $(command -v make)"
fi

if mdb_path="$(discover_mdb_path 2>/dev/null)"; then
    [[ "$quiet" -eq 1 ]] || log_info "mdb.sh: $mdb_path"
elif [[ "$require_mdb_flag" -eq 1 ]]; then
    die "mdb.sh not found. Set MDB_PATH or MPLABX_DIR, or install MPLAB X."
else
    [[ "$quiet" -eq 1 ]] || log_warn "mdb.sh not found. Host tests still work; simulator/hardware flows will not."
fi

if xc32_dir="$(discover_xc32_dir 2>/dev/null)"; then
    [[ "$quiet" -eq 1 ]] || log_info "XC32: $xc32_dir"
elif [[ "$require_xc32_flag" -eq 1 ]]; then
    die "XC32 not found. Set XC32_DIR or add xc32-gcc to PATH."
else
    [[ "$quiet" -eq 1 ]] || log_warn "XC32 not found. Host tests still work; target builds will not."
fi

[[ "$quiet" -eq 1 ]] || log_info "Tool verification complete"