#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_PORT="${AUTO_PORT:-4174}"
PORT="$DEFAULT_PORT"
AUTO_ARGS=()

while (($# > 0)); do
  case "$1" in
    --port)
      if (($# < 2)); then
        printf 'Missing value for --port.\n' >&2
        exit 1
      fi

      PORT="$2"
      AUTO_ARGS+=("$1" "$2")
      shift 2
      ;;
    *)
      AUTO_ARGS+=("$1")
      shift
      ;;
  esac
done

cd "$ROOT_DIR"

if [[ ! -f .env && -f env.example ]]; then
  cp env.example .env
  printf 'Created .env from env.example. Set OPENROUTER_API_KEY before generating chapters.\n'
fi

if ((${#AUTO_ARGS[@]} > 0)); then
  npm run auto -- "${AUTO_ARGS[@]}"
else
  npm run auto
fi

AUTO_URL="http://127.0.0.1:${PORT}"

if command -v open >/dev/null 2>&1; then
  open "$AUTO_URL" >/dev/null 2>&1 || true
fi

printf 'Auto mode is available at %s\n' "$AUTO_URL"