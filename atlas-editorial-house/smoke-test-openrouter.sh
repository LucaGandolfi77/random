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
Usage: ./smoke-test-openrouter.sh [options]

Run a live OpenRouter smoke check for Atlas.

By default the script performs two checks:
  1. A direct OpenRouter API call against the selected Hermes model.
  2. A Hermes CLI run through Atlas' guarded wrapper using the same model.

Options:
  --model <id>          OpenRouter model id. Default: nousresearch/hermes-4-70b
  --scenario <name>     Atlas launcher scenario used to build the smoke prompt.
                        Default: article
  --profile <name>      Hermes profile name. Default: atlas-editorial-house
  --session-name <name> Session name for the guarded Hermes wrapper.
  --log-dir <path>      Output directory under local-output/reviews/
  --raw-only            Run only the direct OpenRouter API smoke.
  --hermes-only         Run only the Hermes-through-OpenRouter smoke.
  --dry-run             Print the planned checks and commands without calling APIs.
  --help                Show this help text.

Environment:
  OPENROUTER_API_KEY       Required for live execution.
  ATLAS_OPENROUTER_MODEL   Optional default model override.

Examples:
  ./smoke-test-openrouter.sh --dry-run
  OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh
  OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh --model nousresearch/hermes-4-405b --scenario trial-review
  OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh --raw-only
EOF
}

sanitize_name() {
    local value

    value="$1"
    value="$(printf '%s' "$value" | tr -cs 'A-Za-z0-9._-' '-')"
    value="${value#-}"
    value="${value%-}"

    if [[ -z "$value" ]]; then
        value="atlas-openrouter-smoke"
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

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
atlas_root="$script_dir"
launcher_path="$atlas_root/hermes-profile/launch-example.sh"
wrapper_path="$atlas_root/hermes-profile/run-local-hermes.sh"
reviews_root="$atlas_root/local-output/reviews"

model_name="${ATLAS_OPENROUTER_MODEL:-nousresearch/hermes-4-70b}"
scenario="article"
profile_name="atlas-editorial-house"
session_name="atlas-openrouter-$(date -u +%Y%m%dT%H%M%SZ)"
log_dir=""
raw_only=0
hermes_only=0
dry_run=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --model)
            [[ $# -ge 2 ]] || die "Missing value for --model"
            model_name="$2"
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
        --session-name)
            [[ $# -ge 2 ]] || die "Missing value for --session-name"
            session_name="$(sanitize_name "$2")"
            shift 2
            ;;
        --log-dir)
            [[ $# -ge 2 ]] || die "Missing value for --log-dir"
            log_dir="$2"
            shift 2
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

[[ -x "$launcher_path" ]] || die "Launcher not found or not executable: $launcher_path"
[[ -x "$wrapper_path" ]] || die "Wrapper not found or not executable: $wrapper_path"

mkdir -p "$reviews_root"

if [[ -z "$log_dir" ]]; then
    log_dir="$reviews_root/$session_name"
fi

log_dir="$(ensure_under_root "$reviews_root" "$log_dir" "Log directory")"

raw_token="ATLAS_OPENROUTER_RAW_OK"
hermes_token="ATLAS_HERMES_OPENROUTER_OK"
base_prompt="$($launcher_path "$scenario" --prompt-only)"

raw_prompt="$base_prompt

For this OpenRouter live smoke test, do not perform the full assignment. Reply with exactly: $raw_token"

hermes_prompt="$base_prompt

For this Hermes plus OpenRouter live smoke test, do not perform the full assignment. Reply with exactly: $hermes_token"

hermes_command=(
    "$wrapper_path"
    --profile "$profile_name"
    --session-name "$session_name"
    --
    --provider openrouter
    --model "$model_name"
    chat -q "$hermes_prompt"
)

if [[ "$dry_run" -eq 1 ]]; then
    log_info "Atlas root: $atlas_root"
    log_info "Scenario: $scenario"
    log_info "Model: $model_name"
    log_info "Profile: $profile_name"
    log_info "Log directory: $log_dir"
    log_info "Raw API smoke: $(if [[ "$hermes_only" -eq 1 ]]; then printf 'skipped'; else printf 'enabled'; fi)"
    log_info "Hermes smoke: $(if [[ "$raw_only" -eq 1 ]]; then printf 'skipped'; else printf 'enabled'; fi)"
    printf 'Hermes command:'
    printf ' %q' "${hermes_command[@]}"
    printf '\n'
    exit 0
fi

[[ -n "${OPENROUTER_API_KEY:-}" ]] || die "OPENROUTER_API_KEY is required for live execution"
command -v python3 >/dev/null 2>&1 || die "python3 is required"

mkdir -p "$log_dir"

printf '%s\n' "$base_prompt" > "$log_dir/base-prompt.txt"
printf '%s\n' "$raw_prompt" > "$log_dir/raw-smoke-prompt.txt"
printf '%s\n' "$hermes_prompt" > "$log_dir/hermes-smoke-prompt.txt"

if [[ "$hermes_only" -ne 1 ]]; then
    log_info "Running direct OpenRouter API smoke against $model_name"

    ATLAS_OPENROUTER_SMOKE_PROMPT="$raw_prompt" \
    OPENROUTER_SMOKE_LOG_PATH="$log_dir/openrouter-raw-response.json" \
    python3 - "$model_name" "$raw_token" > "$log_dir/openrouter-raw-output.txt" <<'PY'
import json
import os
import sys
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError

model_name, expected_token = sys.argv[1:3]
api_key = os.environ["OPENROUTER_API_KEY"]
prompt = os.environ["ATLAS_OPENROUTER_SMOKE_PROMPT"]
log_path = Path(os.environ["OPENROUTER_SMOKE_LOG_PATH"])

payload = {
    "model": model_name,
    "messages": [
        {
            "role": "system",
            "content": "Return the requested verification token when asked. Do not perform the full assignment.",
        },
        {"role": "user", "content": prompt},
    ],
    "temperature": 0,
    "max_tokens": 64,
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/LucaGandolfi77/random",
    "X-Title": "Atlas OpenRouter Live Smoke",
}

request = urllib.request.Request(
    "https://openrouter.ai/api/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers=headers,
    method="POST",
)

try:
    with urllib.request.urlopen(request, timeout=90) as response:
        raw = response.read().decode("utf-8", errors="replace")
except HTTPError as exc:
    body = exc.read().decode("utf-8", errors="replace")
    raise SystemExit(f"OpenRouter HTTP error {exc.code}: {body}")
except URLError as exc:
    raise SystemExit(f"OpenRouter connection failed: {exc}")

data = json.loads(raw)
log_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

if isinstance(content, list):
    parts = []
    for item in content:
        if isinstance(item, dict):
            parts.append(str(item.get("text", "")))
        else:
            parts.append(str(item))
    content = "".join(parts)
else:
    content = str(content)

if expected_token not in content:
    raise SystemExit(
        "OpenRouter raw smoke did not return the expected token. "
        f"Expected {expected_token!r}, got: {content!r}"
    )

print(content.strip())
PY
fi

if [[ "$raw_only" -ne 1 ]]; then
    command -v hermes >/dev/null 2>&1 || die "hermes command not found in PATH. Re-run with --raw-only to test only direct OpenRouter connectivity."

    hermes_home="${HERMES_HOME:-$HOME/.hermes}"
    installed_profile_dir="$hermes_home/profiles/$profile_name"

    [[ -f "$installed_profile_dir/config.yaml" ]] || die "Installed Hermes profile not found at $installed_profile_dir. Run ./hermes-profile/install-profile.sh first."

    log_info "Running Hermes-through-OpenRouter smoke against $model_name"

    if ! "${hermes_command[@]}" > "$log_dir/hermes-openrouter-output.txt" 2>&1; then
        sed -n '1,120p' "$log_dir/hermes-openrouter-output.txt" >&2 || true
        die "Hermes OpenRouter smoke failed"
    fi

    grep -Fq "$hermes_token" "$log_dir/hermes-openrouter-output.txt" || {
        sed -n '1,120p' "$log_dir/hermes-openrouter-output.txt" >&2 || true
        die "Hermes OpenRouter smoke did not emit the expected token: $hermes_token"
    }
fi

cat > "$log_dir/summary.md" <<EOF
# Atlas OpenRouter Live Smoke

- Status: passed
- Scenario: $scenario
- Model: $model_name
- Profile: $profile_name
- Raw OpenRouter check: $(if [[ "$hermes_only" -eq 1 ]]; then printf 'skipped'; else printf 'passed'; fi)
- Hermes OpenRouter check: $(if [[ "$raw_only" -eq 1 ]]; then printf 'skipped'; else printf 'passed'; fi)
- Log directory: $log_dir
EOF

log_info "Atlas OpenRouter live smoke passed"
log_info "Artifacts written to $log_dir"