# Command line interface to run LLMs locally on a Mac using MLX

## Requirements:
- Apple silicon (M series chip) machine with at least 8GB memory
- Python >= 3.8
- macOS >= 13.5

## Setup and Run
## Setup and Run

Recommended: use a Conda (Miniforge/Miniconda) environment to ensure native dependencies (tk, Metal/for Apple Silicon) are consistent.

1. Create and activate a conda environment (macOS/Linux):

```bash
conda create -n mlxcli python=3.11 -c conda-forge -y
conda activate mlxcli
```

2. Install runtime packages (tk for the GUI) and tools:

```bash
conda install -c conda-forge tk -y
python -m pip install --upgrade pip setuptools wheel
python -m pip install --upgrade mlx-lm pynput
# Optionally install other deps from a requirements file if present
# python -m pip install -r requirements.txt
```

3. (Optional) If you plan to use `llama-cli` (used by the `local-llm-02` GUI) build or install `llama.cpp`:

```bash
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
make
# the binary will be ./main (or llama-cli on some builds)
```

On macOS Apple Silicon prefer `conda-forge` packages and avoid mixing system pip wheels for native libs.

4. Run the app:

```bash
# from this folder
python3 main.py
```

5. Keys:

- Press `Cmd+Enter` to send a prompt (Mac) or `Ctrl+Enter` on other platforms.
- `Cmd+Q` (Mac) quits the app.

## Notes:
- Supports multi-line inputs i.e., you can type multiple lines or paste contents from elsewhere
- The code uses Gemma2-2b-it 4bit (quantized) model by default, but you can change the MLX model in the code to switch (if needed and if your machine can support). See `main.py` for instructions.
- From my experience and LMSYS ratings, Gemma2-2b is a really solid model for edge AI, on consumer-grade hardware. More details: https://developers.googleblog.com/en/smaller-safer-more-transparent-advancing-responsible-ai-with-gemma/
- I have had amazing results with MLX for Gemma2-2b-IT 4 bit -- getting ~40 tokens/sec in generation on a Mac Air M2 8GB, without losing much quality (even with quantization). More details about MLX: https://github.com/ml-explore/mlx
- Experimental, not for prodution use. Feel free to modify it for personal use, but check Gemma's licensing if you modify and distribute further.

## Planned improvements (if/when time permits):
- [ ] Support for streaming responses
- [ ] Options to customize temperature etc. Currently it's hardcoded in code.
- [ ] Check context length/tokens etc. based on model. Gemma2-2b has a context length of 8k.
- [ ] Multi-turn responses. Currently it doesn't take into account previous response i.e., each prompt is new.
- [ ] Test/support structured JSON outputs adhering to a schema