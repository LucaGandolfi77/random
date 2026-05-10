#!/usr/bin/env bash
set -euo pipefail

# run-local-llm.sh
# Simple helper to create/activate the `local-llm` conda env and run the GUI.

ENV_NAME="local-llm"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_YML="$HERE/environment.yml"
REQ_TXT="$HERE/requirements.txt"

# Default model choices (user can change or pass explicit --model-path)
MODEL1_PATH="$HERE/models/llm01.gguf"
MODEL2_PATH="$HERE/models/llm02.gguf"
USE_MODEL_PATH=""
MODEL_TYPE=""

CREATE_ENV=false
INSTALL_PIP=false
RUN_APP=false
DOWNLOAD_SAMPLE=false
SAMPLE_URL=""

usage() {
  cat <<EOF
Usage: $0 [--create] [--install-pip] [--run] [--use-model1|--use-model2|--model-path PATH]

  --use-model1   Use the default model 1 (MODEL1_PATH)
  --use-model2   Use the default model 2 (MODEL2_PATH)
  --model-path   Provide an explicit model path (file or directory)
  --model-type   Force model type: 'gguf' or 'mlx'
  --create       Create or update the conda environment from environment.yml
  --install-pip  Install pip requirements from requirements.txt inside the env
  --run          Launch the GUI (python local-llm.py) after activation
  -h, --help     Show this help
EOF
  exit 1
}

if [[ $# -eq 0 ]]; then
  # default: no-create, no-run (dry-run)
  :
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --create) CREATE_ENV=true; shift;;
    --install-pip) INSTALL_PIP=true; shift;;
    --run) RUN_APP=true; shift;;
    --use-model1) USE_MODEL_PATH="$MODEL1_PATH"; shift;;
    --use-model2) USE_MODEL_PATH="$MODEL2_PATH"; shift;;
    --model-path) USE_MODEL_PATH="$2"; shift 2;;
    --model-type) MODEL_TYPE="$2"; shift 2;;
    --download-sample) DOWNLOAD_SAMPLE=true; shift;;
    --sample-url) SAMPLE_URL="$2"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

# Find conda's conda.sh
CONDA_SH=""
if command -v conda >/dev/null 2>&1; then
  CONDA_BASE=$(conda info --base 2>/dev/null || true)
  if [[ -n "$CONDA_BASE" && -f "$CONDA_BASE/etc/profile.d/conda.sh" ]]; then
    CONDA_SH="$CONDA_BASE/etc/profile.d/conda.sh"
  fi
fi
if [[ -z "$CONDA_SH" ]]; then
  if [[ -f "$HOME/miniforge3/etc/profile.d/conda.sh" ]]; then
    CONDA_SH="$HOME/miniforge3/etc/profile.d/conda.sh"
  elif [[ -f "/opt/anaconda3/etc/profile.d/conda.sh" ]]; then
    CONDA_SH="/opt/anaconda3/etc/profile.d/conda.sh"
  fi
fi

if [[ -z "$CONDA_SH" ]]; then
  echo "ERROR: Could not locate conda. Install Miniforge/Anaconda or ensure 'conda' is on PATH." >&2
  exit 1
fi

# Source conda and work with envs
. "$CONDA_SH"

echo "Using conda from: $(conda info --base)"

ENV_EXISTS=false
if conda env list | awk '{print $1}' | grep -q "^${ENV_NAME}$"; then
  ENV_EXISTS=true
fi

if $CREATE_ENV || ! $ENV_EXISTS; then
  if [[ -f "$ENV_YML" ]]; then
    echo "Creating/updating conda env from $ENV_YML..."
    if $ENV_EXISTS; then
      conda env update -n "$ENV_NAME" -f "$ENV_YML" || conda env create -f "$ENV_YML"
    else
      conda env create -f "$ENV_YML"
    fi
  else
    echo "No environment.yml found at $ENV_YML; cannot create env." >&2
    exit 1
  fi
fi

echo "Activating conda env: $ENV_NAME"
conda activate "$ENV_NAME"

# If the caller requested a model selection, set environment variables for the GUI to auto-load
if [[ -n "${USE_MODEL_PATH:-}" ]]; then
  # Detect type if not forced
  if [[ -z "${MODEL_TYPE:-}" ]]; then
    if [[ -f "$USE_MODEL_PATH" ]]; then
      case "$USE_MODEL_PATH" in
        *.gguf) MODEL_TYPE="gguf" ;;
        *) MODEL_TYPE="gguf" ;;
      esac
    elif [[ -d "$USE_MODEL_PATH" ]]; then
      MODEL_TYPE="mlx"
    fi
  fi
  export LOCAL_LLM_MODEL_PATH="$USE_MODEL_PATH"
  export LOCAL_LLM_MODEL_TYPE="$MODEL_TYPE"
  echo "Using model: $LOCAL_LLM_MODEL_PATH (type: $LOCAL_LLM_MODEL_TYPE)"
fi

if $INSTALL_PIP; then
  if [[ -f "$REQ_TXT" ]]; then
    echo "Installing pip requirements from $REQ_TXT (may contain build paths)..."
    pip install -r "$REQ_TXT" || echo "pip install failed; check $REQ_TXT"
  else
    echo "No requirements.txt found at $REQ_TXT"
  fi
fi
if $DOWNLOAD_SAMPLE; then
  MODEL_DIR="$HERE/models"
  mkdir -p "$MODEL_DIR"
  # Prefer SAMPLE_URL if provided, else environment variable SAMPLE_MODEL_URL, else prompt
  if [[ -z "$SAMPLE_URL" ]]; then
    SAMPLE_URL="${SAMPLE_MODEL_URL:-}"
  fi
  if [[ -z "$SAMPLE_URL" ]]; then
    read -p "Enter sample model URL to download (or Ctrl-C to cancel): " SAMPLE_URL
  fi
  if [[ -n "$SAMPLE_URL" ]]; then
    echo "Downloading sample model from: $SAMPLE_URL"
    if command -v curl >/dev/null 2>&1; then
      curl -L --progress-bar -o "$MODEL_DIR/$(basename "$SAMPLE_URL")" "$SAMPLE_URL"
    elif command -v wget >/dev/null 2>&1; then
      wget -O "$MODEL_DIR/$(basename "$SAMPLE_URL")" "$SAMPLE_URL"
    else
      echo "Neither curl nor wget found; cannot download." >&2
    fi
    echo "Sample model saved to: $MODEL_DIR"
  else
    echo "No sample URL provided; skipping download."
  fi
fi

if $RUN_APP; then
  echo "Launching local-llm GUI..."
  exec python "$HERE/local-llm.py"
else
  echo "Setup complete. To run the GUI now: $0 --run"
fi
