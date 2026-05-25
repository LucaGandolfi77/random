#!/usr/bin/env bash
set -euo pipefail

log_info() {
    printf '[INFO] %s\n' "$*"
}

log_warn() {
    printf '[WARN] %s\n' "$*" >&2
}

log_error() {
    printf '[ERROR] %s\n' "$*" >&2
}

die() {
    log_error "$*"
    exit 1
}

usage() {
    cat <<'EOF'
Usage: ./hermes-profile/install-profile.sh [options]

Install the Atlas Editorial House Hermes profile into a Hermes home directory.

Options:
  --hermes-home <path>   Override Hermes home. Default: $HERMES_HOME or ~/.hermes
  --profile-name <name>  Override the profile directory name. Default: atlas-editorial-house
  --target-dir <path>    Install directly into this profile directory.
  --force                Back up and replace an existing target profile.
  --dry-run              Print planned actions without modifying files.
  --help                 Show this help text.
EOF
}

run_cmd() {
    if [[ "$dry_run" -eq 1 ]]; then
        printf '[DRY-RUN]'
        printf ' %q' "$@"
        printf '\n'
        return 0
    fi

    "$@"
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source_profile_dir="$script_dir/atlas-editorial-house"

profile_name="atlas-editorial-house"
hermes_home="${HERMES_HOME:-$HOME/.hermes}"
target_dir=""
force=0
dry_run=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --hermes-home)
            [[ $# -ge 2 ]] || die "Missing value for --hermes-home"
            hermes_home="$2"
            shift 2
            ;;
        --profile-name)
            [[ $# -ge 2 ]] || die "Missing value for --profile-name"
            profile_name="$2"
            shift 2
            ;;
        --target-dir)
            [[ $# -ge 2 ]] || die "Missing value for --target-dir"
            target_dir="$2"
            shift 2
            ;;
        --force)
            force=1
            shift
            ;;
        --dry-run)
            dry_run=1
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

[[ -d "$source_profile_dir" ]] || die "Source profile directory not found: $source_profile_dir"
[[ -f "$source_profile_dir/config.yaml" ]] || die "Source profile is missing config.yaml"
[[ -f "$source_profile_dir/SOUL.md" ]] || die "Source profile is missing SOUL.md"
[[ -d "$source_profile_dir/skills" ]] || die "Source profile is missing skills/"

if [[ -z "$target_dir" ]]; then
    target_dir="$hermes_home/profiles/$profile_name"
fi

log_info "Source profile: $source_profile_dir"
log_info "Target profile: $target_dir"

if [[ -e "$target_dir" ]]; then
    if [[ "$force" -ne 1 ]]; then
        die "Target already exists: $target_dir. Re-run with --force to replace it safely."
    fi

    backup_dir="${target_dir}.backup.$(date -u +%Y%m%dT%H%M%SZ)"
    log_warn "Target exists; backing it up to $backup_dir"
    run_cmd mv "$target_dir" "$backup_dir"
fi

run_cmd mkdir -p "$target_dir"
run_cmd cp -a "$source_profile_dir/." "$target_dir/"

log_info "Profile installed successfully"
log_info "Next steps:"
log_info "  1. Start Hermes with the profile at $target_dir"
log_info "  2. Use /personality shakespeare, /personality austen, and the other named overlays"
log_info "  3. Keep SOUL.md active as the newsroom-level default persona"