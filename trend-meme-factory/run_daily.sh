#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$WORKSPACE_ROOT/.venv/bin/activate" ]]; then
  # Workspace-local environment.
  # shellcheck disable=SC1091
  source "$WORKSPACE_ROOT/.venv/bin/activate"
fi

cd "$SCRIPT_DIR"
python -m trend_meme_factory.cli "$@"