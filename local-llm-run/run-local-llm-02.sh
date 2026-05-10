#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper to launch local-llm-02.py with a chosen model path.
# Usage:
#   ./run-local-llm-02.sh /path/to/model.gguf [path/to/llama-cli]
# If no model is provided, uses ./models/gemma4.gguf under the script directory.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_PATH="${1:-$HERE/models/gemma4.gguf}"
CLI_PATH="${2:-}"

export LOCAL_LLM02_MODEL_PATH="$MODEL_PATH"
if [[ -n "$CLI_PATH" ]]; then
  export LOCAL_LLM02_CLI_PATH="$CLI_PATH"
fi

echo "Launching local-llm-02.py"
echo "  model: $LOCAL_LLM02_MODEL_PATH"
if [[ -n "${LOCAL_LLM02_CLI_PATH:-}" ]]; then
  echo "  cli:   $LOCAL_LLM02_CLI_PATH"
fi

python "$HERE/local-llm-02.py"
