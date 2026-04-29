# Sims AI City

Sims AI City is a whimsical, persistent, generational life simulator built on top of the sibling agent-library-wrapper project. Residents carry long-term memories, form friendships and grudges, flirt, marry, have children, age, leave behind family legends, and generate a town history you can inspect from a local HTML dashboard.

## What it does

- Uses memory_agents as the character-mind backbone.
- Supports two mind backends:
	- OpenRouter models, when an API key is configured.
	- A local heuristic story client for offline runs and tests.
- Simulates daily interactions, relationship drift, marriages, births, yearly summaries, and family lineage persistence.
- Persists the town state, family trees, yearly chronicles, and long-term memory SQLite storage inside the runtime directory.
- Exposes a FastAPI inspector with a deliberately visual HTML/CSS/JS dashboard.

## Project layout

```text
sims_ai_city/
	config.py                # runtime config and env loading
	memory_bridge.py         # memory_agents integration
	heuristics.py            # local fallback character mind
	simulation/
		engine.py              # main daily simulation loop
		clock.py               # time progression and birthdays
		relationships.py       # relationship metrics and drift
		inheritance.py         # child trait blending
		chronicles.py          # yearly summaries and recaps
		persistence.py         # state + family tree persistence
	web/
		api.py                 # FastAPI inspector API
		static/                # HTML/CSS/JS dashboard
tests/
examples/
runtime/
```

## Requirements

- Python 3.11+
- The sibling repository at `../agent-library-wrapper`

Install dependencies from this project directory:

```bash
python -m pip install -r requirements.txt
```

## Environment

Copy `.env.example` to `.env` if you want to use OpenRouter-backed residents.

```bash
cp .env.example .env
```

Available variables:

- `OPENROUTER_API_KEY`
- `SIMS_AI_CITY_USE_OPENROUTER=true`
- `SIMS_AI_CITY_MODEL`
- `SIMS_AI_CITY_FALLBACK_MODEL`

If `SIMS_AI_CITY_USE_OPENROUTER` is false or no API key is present, the simulator uses the built-in local story client.

## Run from the CLI

Create a fresh town:

```bash
python -m sims_ai_city.cli new --seed 17
```

Advance the simulation:

```bash
python -m sims_ai_city.cli run --days 30
```

Print a compact summary:

```bash
python -m sims_ai_city.cli summary
python -m sims_ai_city.cli summary --json
```

Launch the inspector:

```bash
python -m sims_ai_city.cli serve --port 8123
```

Then open `http://localhost:8123` in your browser.

## Programmatic usage

```python
from sims_ai_city import SimulationConfig, boot_engine

engine = boot_engine(SimulationConfig(random_seed=17))
engine.simulate_days(14)
engine.save()

print(engine.world.current_date.label)
print(engine.world.events[-1].headline)
```

See `examples/run_city.py` for a complete tiny script.

## Persistence outputs

By default the simulator writes these files under `runtime/`:

- `world_state.json`
- `family_trees.json`
- `year_summaries.json`
- `character_memories.sqlite3`

## Test

```bash
pytest
```

The current suite covers engine persistence, relationship progression, newborn birthday indexing, and the inspector API.
