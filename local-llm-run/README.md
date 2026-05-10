# local-llm — Local LLM GUI (MLX / llama-cpp)

A small Tkinter GUI to run local language models using either:
- GGUF models through `llama-cpp-python` (select a `.gguf` file), or
- MLX model folders (safetensors) via `mlx-lm` (select the model folder).

Prerequisites
- macOS (Apple Silicon / Intel supported), Miniforge/Conda recommended.
- Conda with access to the `conda-forge` channel.
- Enough disk space for model files (varies by model).

Reproducible setup (recommended)
1. Change into this folder:

```bash
cd local-llm-run
```

2. Create the environment from the provided `environment.yml`:

```bash
conda env create -f environment.yml
conda activate local-llm
```

The `environment.yml` includes the main conda packages and a small `pip` section.
If you prefer a manual install, you can also create a Conda env and install packages from `conda-forge`, then `pip install mlx-lm`.

Run the GUI

From this folder (with the environment active):

```bash
python local-llm.py
```

Or from repo root:

```bash
python local-llm-run/local-llm.py
```

How to use
- Click "Carica GGUF (Llama-CPP)" to load a `.gguf` model file.
- Click "Carica Cartella MLX (Safetensors)" to load an MLX model directory.
- Type a prompt in the input box and press Enter or click `Invia`.

Troubleshooting
- "numpy.dtype size changed" or similar ABI errors: recreate the environment using `environment.yml` (do not mix system/base conda and pip-built binary packages).
- If `tkinter` is missing, ensure `tk` is installed in the conda env (the `environment.yml` includes it).
- If `mlx-lm` or `llama-cpp-python` aren't found, install them inside the active env:

```bash
conda install -c conda-forge llama-cpp-python
pip install mlx-lm
```

Files included for reproducibility
- `environment.yml` — full Conda environment exported from the working env.
- `requirements.txt` — pip freeze output for additional pip packages.

If you want, I can produce a minimal `environment.yml` (from history) or remove build paths from `requirements.txt`.

Enjoy — tell me if you want the README in Italian or more details about model preparation.

**macOS Notes**
- If you run into build or binary issues, prefer Miniforge/Miniconda and the `conda-forge` channel as shown above.
- Ensure Command Line Tools are installed: `xcode-select --install`.
- If you see Tkinter / tcl/tk GUI issues, install `tk` in the conda env (`conda install -c conda-forge tk`).
- For Apple Silicon, prefer `conda-forge` builds (Miniforge) and activate the env before installing pip-only packages.

**Automatic sample download**
The helper script `run-local-llm.sh` supports `--download-sample` to download a model or test file into the `models/` folder. Provide a URL with `--sample-url <URL>` or set the `SAMPLE_MODEL_URL` environment variable. Example:

```bash
# create/update env, install pip extras, download sample, and run GUI
./local-llm-run/run-local-llm.sh --create --install-pip --download-sample --sample-url "https://example.com/path/to/model.safetensors" --run
```

Note: The script does not validate model formats. Download models only from trusted sources and ensure you have sufficient disk space.
