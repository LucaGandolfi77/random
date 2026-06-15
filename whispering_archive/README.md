# The Whispering Archive – Visual Novel Project

This repository contains a complete Ren'Py visual novel project that demonstrates
dynamic AI‑driven dialogue in a forbidden library setting.

## Project Structure
```
/game/
    script.rpy          # Main story script and character definitions
    screens.rpy         # Custom screens and transition effects
    images/             # Placeholder images (page backgrounds, characters)
    audio/              # Optional sound effects
    python/             # AI engine wrapper
renpy/                 # Optional default Ren'Py files
run.py                # Simple launcher script
README.md             # This file
```

## Setup Instructions
1. **Install Ren'Py** – Download from https://renpy.org and extract the folder.
2. **Create a Python virtual environment** (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
3. **Install required Python packages**:
   ```bash
   pip install -r requirements.txt
   ```
   `requirements.txt` contains:
   ```
   transformers
   torch
   llama-cpp-python   # optional, for GGML models
   ```
4. **Place your AI model files** in `game/models/`:
   - For Transformers, put the model directory there.
   - For GGML, place the `.bin` model file and adjust `python/ai_engine.py` path.
5. **Run the game**:
   ```bash
   python run.py
   ```
   This script launches the Ren'Py launcher for the current project.

## How It Works
- `script.rpy` defines characters and relationship meters (`librarian_friendship`,
  `archivist_friendship`, `spirit_friendship`).
- Player choices trigger `generate_dialogue(prompt)` (defined in
  `python/ai_engine.py`) to produce AI‑generated responses.
- `screens.rpy` provides `fade_transition` and `slide_transition` screens
  that are applied with `show`/`hide` for page‑turn animations.
- Relationship variables influence later dialogue branches.

## Customization
- Replace placeholder images in `images/` with your own artwork.
- Adjust prompt construction in `script.rpy` to better fit your story.
- Swap the model in `python/ai_engine.py` for a different lightweight model
  (e.g., `distilgpt2` or a quantized Llama GGML model).

Enjoy exploring the Whispering Archive!