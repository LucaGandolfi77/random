# Eco‑Simulator: The Garden of Species
A lightweight ecosystem‑simulation game built with **SimPy**, **Pygame**, and **Matplotlib/Plotly**.

## Features
- Drag‑and‑drop species onto a 2‑D island map.
- Predator‑prey relationships, resource competition, and genetic mutation.
- Real‑time climate events (drought, flood, temperature shift).
- Live dashboard showing population, resource levels, and climate state.

## Installation
```bash
# 1️⃣ Clone the repo
git clone https://github.com/yourname/eco_simulator.git
cd eco_simulator

# 2️⃣ Create a virtual environment
python -m venv venv
source venv/bin/activate

# 3️⃣ Install dependencies
pip install -r requirements.txt
```

## Running the Game
```bash
python src/main.py
```
A Pygame window will open. Follow the on‑screen instructions to:
1. Add species from the sidebar.
2. Drag them onto the island grid.
3. Watch the ecosystem evolve, mutate, and react to climate events.

## Configuration
Edit `config/default_config.json` to:
- Add new species with custom traits.
- Adjust resource limits (food, water, space).
- Change mutation probability or climate event frequency.

## Extensibility
- Plug in AI‑controlled species.
- Expand climate models or add save/load functionality.
- Replace Matplotlib with Plotly for richer visualizations.

Enjoy managing the **Garden of Species**! 🌿🦎🦜