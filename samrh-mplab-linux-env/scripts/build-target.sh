#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

# shellcheck source=./lib/log.sh
source "$script_dir/lib/log.sh"
# shellcheck source=./lib/tool_discovery.sh
source "$script_dir/lib/tool_discovery.sh"

usage() {
    cat <<'EOF'
Usage: ./scripts/build-target.sh --project <path/to/project.X> [--conf <name>] [--target <name>]

Build an existing MPLAB X project from Linux using its generated makefiles.
The script does not create nbproject metadata; create the project once in MPLAB X,
commit the auditable project files, and then use this script for repeatable CLI builds.
EOF
}

project_path=""
configuration="default"
make_target="all"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --project)
            [[ $# -ge 2 ]] || die "Missing value for --project"
            project_path="$2"
            shift 2
            ;;
        --conf)
            [[ $# -ge 2 ]] || die "Missing value for --conf"
            configuration="$2"
            shift 2
            ;;
        --target)
            [[ $# -ge 2 ]] || die "Missing value for --target"
            make_target="$2"
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

[[ -n "$project_path" ]] || die "--project is required"
project_path="$(absolute_path "$project_path")"

[[ -d "$project_path" ]] || die "Project directory not found: $project_path"
[[ -d "$project_path/nbproject" ]] || die "MPLAB X project does not contain nbproject/: $project_path"

prepend_xc32_to_path_if_available

if discover_xc32_gcc >/dev/null 2>&1; then
    log_info "Using XC32 from $(discover_xc32_dir)"
else
    log_warn "XC32 was not auto-detected. Ensure xc32-gcc is reachable through PATH or set XC32_DIR."
fi

log_info "Building MPLAB X project $project_path (CONF=$configuration, target=$make_target)"
(cd "$project_path" && make CONF="$configuration" "$make_target")

log_info "Target build completed"