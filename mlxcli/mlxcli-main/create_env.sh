#!/usr/bin/env bash
set -euo pipefail

# create_env.sh — create or update the conda environment for mlxcli
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_YML="$HERE/environment.yml"
ENV_NAME="mlxcli"

if ! command -v conda >/dev/null 2>&1; then
  echo "ERROR: 'conda' not found. Install Miniforge/Anaconda and ensure 'conda' is on PATH." >&2
  exit 1
fi

if [[ ! -f "$ENV_YML" ]]; then
  echo "ERROR: environment.yml not found at $ENV_YML" >&2
  exit 1
fi

echo "Creating/updating conda env '$ENV_NAME' from $ENV_YML..."
conda env update -n "$ENV_NAME" -f "$ENV_YML" || conda env create -n "$ENV_NAME" -f "$ENV_YML"

echo "Done. To activate the env run:" 
echo "  source \$(conda info --base)/etc/profile.d/conda.sh && conda activate $ENV_NAME"
echo "Then run the app:"
echo "  python3 main.py"
