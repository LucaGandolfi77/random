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
    --provider <name>       Hermes provider override for this run
    --model <id>            Hermes model override for this run
    --quiet                 Run Hermes chat in quiet mode for programmatic output
    --allow-tools           Keep Hermes toolsets enabled even for OpenRouter text runs
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

has_provider_flag() {
    local arg

    for arg in "$@"; do
        if [[ "$arg" == "--provider" ]]; then
            return 0
        fi
    done

    return 1
}

has_model_flag() {
    local arg

    for arg in "$@"; do
        if [[ "$arg" == "-m" || "$arg" == "--model" ]]; then
            return 0
        fi
    done

    return 1
}

has_toolsets_flag() {
    local arg

    for arg in "$@"; do
        if [[ "$arg" == "-t" || "$arg" == "--toolsets" ]]; then
            return 0
        fi
    done

    return 1
}

has_chat_query_args() {
    local saw_chat=0
    local arg

    for arg in "$@"; do
        if [[ "$arg" == "chat" ]]; then
            saw_chat=1
            continue
        fi

        if [[ "$saw_chat" -eq 1 && ( "$arg" == "-q" || "$arg" == "--query" ) ]]; then
            return 0
        fi
    done

    return 1
}

read_hermes_model_config_value() {
    local key config_path

    key="$1"
    config_path="${HERMES_CONFIG_PATH:-${HERMES_HOME:-$HOME/.hermes}/config.yaml}"

    [[ -f "$config_path" ]] || return 1

    awk -v wanted="$key" '
        BEGIN { in_model = 0 }
        /^model:[[:space:]]*$/ { in_model = 1; next }
        in_model && /^[^[:space:]]/ { exit }
        in_model {
            if ($0 ~ "^[[:space:]]*" wanted ":[[:space:]]*") {
                value = $0
                sub("^[[:space:]]*" wanted ":[[:space:]]*", "", value)
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
                gsub(/^"|"$/, "", value)
                gsub(/^'"'"'|'"'"'$/, "", value)
                print value
                exit
            }
        }
    ' "$config_path"
}

normalize_openrouter_model_value() {
    local value base_model

    value="$1"
    base_model="$2"

    if [[ -z "$value" ]]; then
        return 0
    fi

    if [[ "$value" == :* ]]; then
        printf '%s%s\n' "${base_model%%:*}" "$value"
        return 0
    fi

    printf '%s\n' "$value"
}

build_text_only_hermes_home() {
    local real_home temp_home provider_override model_override fallback_models_csv

    real_home="${HERMES_HOME:-$HOME/.hermes}"
    provider_override="${1:-}"
    model_override="${2:-}"
    fallback_models_csv="${3:-}"
    temp_home="$(mktemp -d)"

    while IFS= read -r -d '' entry; do
        local basename

        basename="$(basename "$entry")"
        if [[ "$basename" == "config.yaml" ]]; then
            continue
        fi

        ln -s "$entry" "$temp_home/$basename"
    done < <(find "$real_home" -mindepth 1 -maxdepth 1 -print0)

    python3 - "$real_home/config.yaml" "$temp_home/config.yaml" "$provider_override" "$model_override" "$fallback_models_csv" <<'PY'
from __future__ import annotations

import sys
from pathlib import Path

import yaml


source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
provider_override = sys.argv[3].strip()
model_override = sys.argv[4].strip()
fallback_models_csv = sys.argv[5].strip()
fallback_models = [item.strip() for item in fallback_models_csv.split(",") if item.strip()]

config = {}
if source_path.exists():
    loaded = yaml.safe_load(source_path.read_text(encoding="utf-8"))
    if isinstance(loaded, dict):
        config = loaded

model_cfg = config.get("model")
if not isinstance(model_cfg, dict):
    model_cfg = {}
    config["model"] = model_cfg

if provider_override:
    model_cfg["provider"] = provider_override

if model_override:
    model_cfg["default"] = model_override


def append_fallback_entry(chain, seen, entry):
    provider = str(entry.get("provider") or "").strip()
    model = str(entry.get("model") or "").strip()
    if not provider or not model:
        return

    base_url = str(entry.get("base_url") or "").strip().rstrip("/")
    identity = (provider.lower(), model.lower(), base_url.lower())
    if identity in seen:
        return

    seen.add(identity)
    normalized = dict(entry)
    normalized["provider"] = provider
    normalized["model"] = model
    if base_url:
        normalized["base_url"] = base_url
    elif "base_url" in normalized:
        normalized.pop("base_url", None)

    chain.append(normalized)


fallback_chain = []
seen_fallbacks = set()

if provider_override == "openrouter":
    for fallback_model in fallback_models:
        if fallback_model == model_override:
            continue
        append_fallback_entry(
            fallback_chain,
            seen_fallbacks,
            {"provider": provider_override, "model": fallback_model},
        )

for raw_key in ("fallback_providers", "fallback_model"):
    raw_entries = config.get(raw_key)
    if isinstance(raw_entries, dict):
        raw_entries = [raw_entries]
    elif not isinstance(raw_entries, list):
        raw_entries = []

    for raw_entry in raw_entries:
        if isinstance(raw_entry, dict):
            append_fallback_entry(fallback_chain, seen_fallbacks, raw_entry)

config["fallback_providers"] = fallback_chain
config.pop("fallback_model", None)

agent_cfg = config.get("agent")
if not isinstance(agent_cfg, dict):
    agent_cfg = {}
    config["agent"] = agent_cfg

# Hermes does not treat "*" as a wildcard disabled toolset. Force the CLI
# platform toolset list to empty so OpenRouter text-only runs truly expose no
# callable tools such as clarify.
platform_toolsets = config.get("platform_toolsets")
if not isinstance(platform_toolsets, dict):
    platform_toolsets = {}
    config["platform_toolsets"] = platform_toolsets

platform_toolsets["cli"] = []

target_path.write_text(
    yaml.safe_dump(config, sort_keys=False),
    encoding="utf-8",
)
PY

    printf '%s\n' "$temp_home"
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
atlas_default_openrouter_model="openai/gpt-oss-120b:free"
atlas_default_openrouter_fallback_models="openai/gpt-oss-20b:free,liquid/lfm-2.5-1.2b-instruct:free"

: "${ATLAS_HERMES_PROVIDER:=openrouter}"
: "${ATLAS_OPENROUTER_MODEL:=$atlas_default_openrouter_model}"
: "${ATLAS_OPENROUTER_FALLBACK_MODELS:=$atlas_default_openrouter_fallback_models}"
: "${ATLAS_OPENROUTER_MODEL:=$(normalize_openrouter_model_value "$ATLAS_OPENROUTER_MODEL" "$atlas_default_openrouter_model")}"
: "${ATLAS_HERMES_MODEL:=${ATLAS_OPENROUTER_MODEL}}"

ATLAS_OPENROUTER_MODEL="$(normalize_openrouter_model_value "$ATLAS_OPENROUTER_MODEL" "$atlas_default_openrouter_model")"
ATLAS_HERMES_MODEL="$(normalize_openrouter_model_value "$ATLAS_HERMES_MODEL" "$ATLAS_OPENROUTER_MODEL")"

export ATLAS_HERMES_PROVIDER
export ATLAS_HERMES_MODEL
export ATLAS_OPENROUTER_MODEL
export ATLAS_OPENROUTER_FALLBACK_MODELS

provider_name="$ATLAS_HERMES_PROVIDER"
model_name="$ATLAS_HERMES_MODEL"
quiet_mode=0
allow_tools="${ATLAS_HERMES_ALLOW_TOOLS:-0}"
session_name="atlas-$(date -u +%Y%m%dT%H%M%SZ)"
session_dir=""
chat_query=""
dry_run=0
extra_args=()
capture_transcript=0
transcript_file=""

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
        --provider)
            [[ $# -ge 2 ]] || die "Missing value for --provider"
            provider_name="$2"
            shift 2
            ;;
        --model)
            [[ $# -ge 2 ]] || die "Missing value for --model"
            model_name="$2"
            shift 2
            ;;
        --quiet)
            quiet_mode=1
            shift
            ;;
        --allow-tools)
            allow_tools=1
            shift
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

if [[ -n "$chat_query" ]]; then
    capture_transcript=1
elif [[ ${#extra_args[@]} -gt 0 ]] && has_chat_query_args "${extra_args[@]}"; then
    capture_transcript=1
fi

if [[ "$capture_transcript" -eq 1 ]]; then
    transcript_file="$session_dir/hermes-chat-output.txt"
fi

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

if [[ -z "$provider_name" ]]; then
    provider_name="$(read_hermes_model_config_value provider || true)"
fi

if [[ -z "$model_name" ]]; then
    model_name="$(read_hermes_model_config_value default || true)"
fi

if [[ -z "$model_name" && "$provider_name" == "openrouter" ]]; then
    model_name="${ATLAS_OPENROUTER_MODEL:-nousresearch/hermes-4-70b}"
fi

if [[ "$provider_name" == "openrouter" && -n "$model_name" ]]; then
    model_name="$(normalize_openrouter_model_value "$model_name" "${ATLAS_OPENROUTER_MODEL:-$atlas_default_openrouter_model}")"
fi

text_only_mode=0
if [[ "$allow_tools" != "1" && "$provider_name" == "openrouter" ]]; then
    if [[ -n "$chat_query" ]]; then
        text_only_mode=1
    elif [[ ${#extra_args[@]} -gt 0 ]] && has_chat_query_args "${extra_args[@]}" && ! has_toolsets_flag "${extra_args[@]}"; then
        text_only_mode=1
    fi
fi

default_prefix=()
default_prefix+=( -p "$profile_name" )

if [[ -n "$provider_name" && "$provider_name" != "auto" ]]; then
    default_prefix+=( --provider "$provider_name" )
fi

if [[ -n "$model_name" ]]; then
    default_prefix+=( --model "$model_name" )
fi

if [[ -n "$chat_query" ]]; then
    hermes_args=( -p "$profile_name" chat )

    if [[ -n "$provider_name" && "$provider_name" != "auto" ]]; then
        hermes_args+=( --provider "$provider_name" )
    fi

    if [[ -n "$model_name" ]]; then
        hermes_args+=( --model "$model_name" )
    fi

    if [[ "$quiet_mode" -eq 1 ]]; then
        hermes_args+=( -Q )
    fi

    hermes_args+=( -q "$(build_query_with_policy)")
elif [[ ${#extra_args[@]} -gt 0 ]]; then
    if [[ "${extra_args[0]}" == "chat" ]]; then
        hermes_args=()

        if ! has_profile_flag "${extra_args[@]}"; then
            hermes_args+=( -p "$profile_name" )
        fi

        hermes_args+=( chat )

        if ! has_provider_flag "${extra_args[@]}" && [[ -n "$provider_name" && "$provider_name" != "auto" ]]; then
            hermes_args+=( --provider "$provider_name" )
        fi

        if ! has_model_flag "${extra_args[@]}" && [[ -n "$model_name" ]]; then
            hermes_args+=( --model "$model_name" )
        fi

        hermes_args+=( "${extra_args[@]:1}" )
    else
        extra_prefix=()

        if ! has_profile_flag "${extra_args[@]}"; then
            extra_prefix+=( -p "$profile_name" )
        fi

        if ! has_provider_flag "${extra_args[@]}" && [[ -n "$provider_name" && "$provider_name" != "auto" ]]; then
            extra_prefix+=( --provider "$provider_name" )
        fi

        if ! has_model_flag "${extra_args[@]}" && [[ -n "$model_name" ]]; then
            extra_prefix+=( --model "$model_name" )
        fi

        hermes_args=("${extra_prefix[@]}" "${extra_args[@]}")
    fi
else
    hermes_args=("${default_prefix[@]}")
fi

log_info "Atlas root: $atlas_root"
log_info "Approved output root: $allowed_output_root"
log_info "Session directory: $session_dir"

if [[ "$capture_transcript" -eq 1 ]]; then
    log_info "Transcript file: $transcript_file"
fi

if [[ -n "$provider_name" && "$provider_name" != "auto" ]]; then
    log_info "Hermes provider: $provider_name"
fi

if [[ -n "$model_name" ]]; then
    log_info "Hermes model: $model_name"
fi

if [[ "$text_only_mode" -eq 1 ]]; then
    log_info "Hermes mode: text-only OpenRouter compatibility"
fi

if [[ "$dry_run" -eq 1 ]]; then
    print_command
    exit 0
fi

command -v hermes >/dev/null 2>&1 || die "hermes command not found in PATH"

if [[ "$provider_name" == "openrouter" && -z "$model_name" ]]; then
    die "OpenRouter requires a model. Set model.default in ~/.hermes/config.yaml, pass --model, or export ATLAS_HERMES_MODEL."
fi

temp_hermes_home=""
if [[ "$text_only_mode" -eq 1 ]]; then
    command -v python3 >/dev/null 2>&1 || die "python3 is required for text-only OpenRouter compatibility mode"
    temp_hermes_home="$(build_text_only_hermes_home "$provider_name" "$model_name" "$ATLAS_OPENROUTER_FALLBACK_MODELS")"
fi

before_snapshot="$(mktemp)"
after_snapshot="$(mktemp)"
diff_snapshot="$(mktemp)"
cleanup() {
    rm -f "$before_snapshot" "$after_snapshot" "$diff_snapshot"
    if [[ -n "$temp_hermes_home" ]]; then
        rm -rf "$temp_hermes_home"
    fi
}
trap cleanup EXIT

snapshot_repo_state "$before_snapshot"

command_status=0
if [[ "$capture_transcript" -eq 1 ]]; then
    if (
        cd "$session_dir"
        if [[ -n "$temp_hermes_home" ]]; then
            export HERMES_HOME="$temp_hermes_home"
        fi
        set -o pipefail
        hermes "${hermes_args[@]}" 2>&1 | tee "$transcript_file"
    ); then
        command_status=0
    else
        command_status=$?
    fi
else
    if (
        cd "$session_dir"
        if [[ -n "$temp_hermes_home" ]]; then
            export HERMES_HOME="$temp_hermes_home"
        fi
        exec hermes "${hermes_args[@]}"
    ); then
        command_status=0
    else
        command_status=$?
    fi
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