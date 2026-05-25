#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

# shellcheck source=./lib/log.sh
source "$script_dir/lib/log.sh"

usage() {
    cat <<'EOF'
Usage: ./scripts/build-host-tests.sh [--build-only] [--compiler <gcc|clang>]

Build or build-and-run the host-side unit tests.
EOF
}

compiler="${CC:-gcc}"
make_target="test"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --build-only)
            make_target="all"
            shift
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

log_info "Running host test target '$make_target' with compiler '$compiler'"
CC="$compiler" make -C "$repo_root/tests/host" "$make_target"