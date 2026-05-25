#!/usr/bin/env bash
set -euo pipefail

log_info() {
    printf '[INFO] %s\n' "$*"
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
Usage: ./hermes-profile/run-local-hermes.sh [options] [-- <hermes args>]

Options:
  --profile <name>        Hermes profile name. Default: atlas-editorial-house
  --session-name <name>   Session directory name under local-output/runs/
  --session-dir <path>    Custom session directory under local-output/runs/
  --chat-query <text>     Run hermes chat -q with an Atlas filesystem preamble
  --dry-run               Print the resolved session directory and Hermes command
  --help                  Show this help text

Notes:
  - The wrapper starts Hermes from a dedicated working directory under local-output/runs/.
  - It audits the Atlas bundle before and after execution and reports writes outside local-output/.
  - With no query or trailing args, it starts: hermes -p <profile>
EOF
}

sanitize_name() {
    local value

    value="$1"
    value="$(printf '%s' "$value" | tr -cs 'A-Za-z0-9._-' '-')"
    value="${value#-}"
    value="${value%-}"

    if [[ -z "$value" ]]; then
        value="atlas-session"
    fi

    printf '%s\n' "$value"
}

resolve_path() {
    realpath -m "$1"
}

ensure_under_root() {
    local root target label

    root="$(resolve_path "$1")"
    target="$(resolve_path "$2")"
    label="$3"

    case "$target" in
        "$root"|"$root"/*)
            printf '%s\n' "$target"
            ;;
        *)
            die "$label must stay under $root: $target"
            ;;
    esac
}

has_profile_flag() {
    local arg

    for arg in "$@"; do
        if [[ "$arg" == "-p" || "$arg" == "--profile" ]]; then
            return 0
        fi
    done

    return 1
}

snapshot_repo_state() {
    local output_file

    output_file="$1"

    (
        cd "$atlas_root"
        find . \
            -path './local-output' -prune -o \
            -type f -print0 |
        sort -z |
        xargs -0 -r sha256sum
    ) > "$output_file"
}

build_query_with_policy() {
    cat <<EOF
Filesystem constraint for this run:
- Working directory: $session_dir
- Approved output root: $allowed_output_root
- Create or modify files only under $allowed_output_root.
- Use local-output/runs only as a session workspace.
- Place final deliverables in local-output/books, articles, essays, research, docs, code, hybrid, reviews, canon, cemetery, or translations as appropriate.

$chat_query
EOF
}

print_command() {
    printf 'Command:'
    printf ' %q' hermes "${hermes_args[@]}"
    printf '\n'
}

profile_name="atlas-editorial-house"
session_name="atlas-$(date -u +%Y%m%dT%H%M%SZ)"
session_dir=""
chat_query=""
dry_run=0
extra_args=()

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
atlas_root="$(cd "$script_dir/.." && pwd)"
allowed_output_root="$atlas_root/local-output"
runs_root="$allowed_output_root/runs"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)
            [[ $# -ge 2 ]] || die "Missing value for --profile"
            profile_name="$2"
            shift 2
            ;;
        --session-name)
            [[ $# -ge 2 ]] || die "Missing value for --session-name"
            session_name="$(sanitize_name "$2")"
            shift 2
            ;;
        --session-dir)
            [[ $# -ge 2 ]] || die "Missing value for --session-dir"
            session_dir="$2"
            shift 2
            ;;
        --chat-query)
            [[ $# -ge 2 ]] || die "Missing value for --chat-query"
            chat_query="$2"
            shift 2
            ;;
        --dry-run)
            dry_run=1
            shift
            ;;
        --help|-h|help)
            usage
            exit 0
            ;;
        --)
            shift
            extra_args=("$@")
            break
            ;;
        *)
            die "Unknown argument: $1"
            ;;
    esac
done

[[ -d "$allowed_output_root" ]] || die "Approved output root not found: $allowed_output_root"
mkdir -p "$runs_root"

if [[ -n "$chat_query" && ${#extra_args[@]} -gt 0 ]]; then
    die "--chat-query cannot be combined with explicit trailing Hermes arguments"
fi

if [[ -z "$session_dir" ]]; then
    session_dir="$runs_root/$session_name"
fi

session_dir="$(ensure_under_root "$runs_root" "$session_dir" "Session directory")"
mkdir -p "$session_dir"

export ATLAS_BUNDLE_ROOT="$atlas_root"
export ATLAS_ALLOWED_OUTPUT_ROOT="$allowed_output_root"
export ATLAS_RUNS_ROOT="$runs_root"
export ATLAS_SESSION_OUTPUT_DIR="$session_dir"
export ATLAS_OUTPUT_BOOKS_DIR="$allowed_output_root/books"
export ATLAS_OUTPUT_ARTICLES_DIR="$allowed_output_root/articles"
export ATLAS_OUTPUT_ESSAYS_DIR="$allowed_output_root/essays"
export ATLAS_OUTPUT_RESEARCH_DIR="$allowed_output_root/research"
export ATLAS_OUTPUT_DOCS_DIR="$allowed_output_root/docs"
export ATLAS_OUTPUT_CODE_DIR="$allowed_output_root/code"
export ATLAS_OUTPUT_HYBRID_DIR="$allowed_output_root/hybrid"
export ATLAS_OUTPUT_REVIEWS_DIR="$allowed_output_root/reviews"
export ATLAS_OUTPUT_CANON_DIR="$allowed_output_root/canon"
export ATLAS_OUTPUT_CEMETERY_DIR="$allowed_output_root/cemetery"
export ATLAS_OUTPUT_TRANSLATIONS_DIR="$allowed_output_root/translations"

if [[ -n "$chat_query" ]]; then
    hermes_args=(-p "$profile_name" chat -q "$(build_query_with_policy)")
elif [[ ${#extra_args[@]} -gt 0 ]]; then
    if has_profile_flag "${extra_args[@]}"; then
        hermes_args=("${extra_args[@]}")
    else
        hermes_args=(-p "$profile_name" "${extra_args[@]}")
    fi
else
    hermes_args=(-p "$profile_name")
fi

log_info "Atlas root: $atlas_root"
log_info "Approved output root: $allowed_output_root"
log_info "Session directory: $session_dir"

if [[ "$dry_run" -eq 1 ]]; then
    print_command
    exit 0
fi

command -v hermes >/dev/null 2>&1 || die "hermes command not found in PATH"

before_snapshot="$(mktemp)"
after_snapshot="$(mktemp)"
diff_snapshot="$(mktemp)"
trap 'rm -f "$before_snapshot" "$after_snapshot" "$diff_snapshot"' EXIT

snapshot_repo_state "$before_snapshot"

command_status=0
if ! (
    cd "$session_dir"
    exec hermes "${hermes_args[@]}"
); then
    command_status=$?
fi

snapshot_repo_state "$after_snapshot"

if ! cmp -s "$before_snapshot" "$after_snapshot"; then
    diff -u "$before_snapshot" "$after_snapshot" > "$diff_snapshot" || true
    log_error "Detected writes outside the approved local-output tree within $atlas_root"
    sed -n '1,120p' "$diff_snapshot" >&2 || true

    if [[ "$command_status" -eq 0 ]]; then
        command_status=120
    fi
fi

exit "$command_status"