#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$WORKSPACE_ROOT/.venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "$WORKSPACE_ROOT/.venv/bin/activate"
fi

cd "$SCRIPT_DIR"
python -m hermes_workspace.cli "$@"