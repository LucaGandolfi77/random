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
Usage: ./try-openrouter-models.sh [options]

Run the Atlas OpenRouter smoke across multiple candidate models and report which
ones connect successfully through Hermes.

Options:
  --model <id>          Add one model to test. Repeat to build a custom list.
  --scenario <name>     Atlas launcher scenario used to build the smoke prompt.
                        Default: article
  --profile <name>      Hermes profile name. Default: atlas-editorial-house
    --free-only           Test only the free-model shortlist bundled with Atlas.
  --raw-only            Run only the direct OpenRouter API check for each model.
  --hermes-only         Run only the Hermes-through-OpenRouter check for each model.
  --dry-run             Print the commands that would be executed.
  --help                Show this help text.

Environment:
  OPENROUTER_API_KEY       Required for live execution.
  ATLAS_OPENROUTER_MODEL   Used only when smoke-test-openrouter.sh defaults a model.

Defaults:
  If no --model flags are supplied, the helper tests a practical shortlist:
        - nousresearch/hermes-3-llama-3.1-405b:free
        - arcee-ai/trinity-large-thinking:free
        - poolside/laguna-m.1:free
        - openai/gpt-oss-120b:free
        - z-ai/glm-4.5-air:free
        - deepseek/deepseek-v4-flash:free
        - minimax/minimax-m2.5:free
        - poolside/laguna-xs.2:free
        - google/gemma-4-31b-it:free
        - nvidia/nemotron-3-super-120b-a12b:free
        - deepseek/deepseek-chat-v3-0324:free
        - liquid/lfm-2.5-1.2b-instruct:free
        - openrouter/free
        - openai/gpt-oss-20b:free
        - google/gemini-2.0-flash-exp:free
        - meta-llama/llama-3.3-70b-instruct:free
        - nvidia/nemotron-3-nano-30b-a3b:free

Examples:
  ./try-openrouter-models.sh --dry-run
    ./try-openrouter-models.sh --free-only --dry-run
  OPENROUTER_API_KEY=... ./try-openrouter-models.sh --hermes-only
    OPENROUTER_API_KEY=... ./try-openrouter-models.sh --free-only --hermes-only
  OPENROUTER_API_KEY=... ./try-openrouter-models.sh --hermes-only --model nousresearch/hermes-3-llama-3.1-405b:free 
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
smoke_script="$script_dir/smoke-test-openrouter.sh"

[[ -x "$smoke_script" ]] || die "Smoke script not found or not executable: $smoke_script"

scenario="article"
profile_name="atlas-editorial-house"
raw_only=0
hermes_only=0
free_only=0
dry_run=0
models=()

free_models=(
    "arcee-ai/trinity-large-thinking:free"
    "poolside/laguna-m.1:free"
    "openai/gpt-oss-120b:free"
    "z-ai/glm-4.5-air:free"
    "deepseek/deepseek-v4-flash:free"
    "minimax/minimax-m2.5:free"
    "poolside/laguna-xs.2:free"
    "google/gemma-4-31b-it:free"
    "nvidia/nemotron-3-super-120b-a12b:free"
    "nousresearch/hermes-3-llama-3.1-405b:free"
    "deepseek/deepseek-chat-v3-0324:free"
    "liquid/lfm-2.5-1.2b-instruct:free"
    "openrouter/free"
    "openai/gpt-oss-20b:free"
    "google/gemini-2.0-flash-exp:free"
    "meta-llama/llama-3.3-70b-instruct:free"
    "nvidia/nemotron-3-nano-30b-a3b:free"
)

default_models=(
    "nousresearch/hermes-3-llama-3.1-405b:free"
    "arcee-ai/trinity-large-thinking:free"
    "poolside/laguna-m.1:free"
    "openai/gpt-oss-120b:free"
    "z-ai/glm-4.5-air:free"
    "deepseek/deepseek-v4-flash:free"
    "minimax/minimax-m2.5:free"
    "poolside/laguna-xs.2:free"
    "google/gemma-4-31b-it:free"
    "nvidia/nemotron-3-super-120b-a12b:free"
    "deepseek/deepseek-chat-v3-0324:free"
    "liquid/lfm-2.5-1.2b-instruct:free"
    "openrouter/free"
    "openai/gpt-oss-20b:free"
    "google/gemini-2.0-flash-exp:free"
    "meta-llama/llama-3.3-70b-instruct:free"
    "nvidia/nemotron-3-nano-30b-a3b:free"
)

while [[ $# -gt 0 ]]; do
    case "$1" in
        --model)
            [[ $# -ge 2 ]] || die "Missing value for --model"
            models+=("$2")
            shift 2
            ;;
        --scenario)
            [[ $# -ge 2 ]] || die "Missing value for --scenario"
            scenario="$2"
            shift 2
            ;;
        --profile)
            [[ $# -ge 2 ]] || die "Missing value for --profile"
            profile_name="$2"
            shift 2
            ;;
        --free-only)
            free_only=1
            shift
            ;;
        --raw-only)
            raw_only=1
            shift
            ;;
        --hermes-only)
            hermes_only=1
            shift
            ;;
        --dry-run)
            dry_run=1
            shift
            ;;
        --help|-h|help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1"
            ;;
    esac
done

if [[ "$raw_only" -eq 1 && "$hermes_only" -eq 1 ]]; then
    die "--raw-only and --hermes-only cannot be used together"
fi

if [[ "$free_only" -eq 1 && ${#models[@]} -gt 0 ]]; then
    die "--free-only cannot be combined with explicit --model flags"
fi

if [[ ${#models[@]} -eq 0 ]]; then
    if [[ "$free_only" -eq 1 ]]; then
        models=("${free_models[@]}")
    else
        models=("${default_models[@]}")
    fi
fi

if [[ "$dry_run" -ne 1 && -z "${OPENROUTER_API_KEY:-}" ]]; then
    die "OPENROUTER_API_KEY is required for live execution. Run this helper in the same terminal where your OpenRouter key is already exported."
fi

pass_count=0
fail_count=0

for model in "${models[@]}"; do
    cmd=(
        "$smoke_script"
        --model "$model"
        --scenario "$scenario"
        --profile "$profile_name"
    )

    if [[ "$raw_only" -eq 1 ]]; then
        cmd+=(--raw-only)
    fi

    if [[ "$hermes_only" -eq 1 ]]; then
        cmd+=(--hermes-only)
    fi

    printf '=== MODEL %s ===\n' "$model"

    if [[ "$dry_run" -eq 1 ]]; then
        printf 'Command:'
        printf ' %q' "${cmd[@]}"
        printf '\n\n'
        continue
    fi

    output_file="$(mktemp)"

    if "${cmd[@]}" >"$output_file" 2>&1; then
        pass_count=$((pass_count + 1))
        printf 'RESULT PASS %s\n' "$model"
        tail -n 8 "$output_file"
    else
        status=$?
        fail_count=$((fail_count + 1))
        printf 'RESULT FAIL %s EXIT_%s\n' "$model" "$status"
        sed -n '1,80p' "$output_file"
    fi

    rm -f "$output_file"
    printf '\n'
done

if [[ "$dry_run" -eq 1 ]]; then
    exit 0
fi

log_info "Model sweep complete: $pass_count passed, $fail_count failed"

if [[ "$pass_count" -eq 0 ]]; then
    exit 1
fi

exit 0