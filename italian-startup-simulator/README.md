# Italian Startup Simulator

Italian Startup Simulator is a local-first FastAPI app that simulates the birth, growth, pressure, pivots, and possible survival or failure of a startup operating in Italy.

It is not a business-plan generator. It is a persistent simulation system that mixes deterministic rules, Italy-aware operational constraints, and a small set of LLM-driven agent interpretations through OpenRouter :free models only.

## Architecture

The project uses a rules-first simulation core and a narrow agent layer.

- **State and memory:** SQLite persistence for startup profile, founder profile, simulation state, weekly and monthly snapshots, decisions, events, finance, market, team, memos, and reports
- **Simulation engine:** deterministic and weighted rules for cash, burn, traction, bureaucracy, founder stress, runway, market pressure, grants, and survival
- **Agent layer:** founder, market, finance, operations, strategy, and narrative agents
- **LLM layer:** OpenRouter-compatible provider restricted to `:free` models, with SQLite cache and rules-only fallback
- **UI:** FastAPI + Jinja templates + vanilla CSS/JS

## Key product behavior

The simulator models:
- taxation pressure
- bureaucracy and compliance drag
- slow enterprise sales cycles
- delayed payments from clients
- city and regional ecosystem differences in Italy
- founder psychology under pressure
- service-pivot temptation
- investor attractiveness vs reality
- grants and public incentives as slow, uncertain relief

## Required screens implemented

- startup creation screen
- main dashboard
- weekly or monthly simulation screen on the dashboard
- event log
- finance view
- strategy choices view
- narrative reports view
- export view

## Project structure

- [app/main.py](app/main.py) — FastAPI routes and app bootstrap
- [app/services/simulation.py](app/services/simulation.py) — deterministic startup evolution logic
- [app/services/memory.py](app/services/memory.py) — SQLite persistence and dashboard aggregation
- [app/services/orchestrator.py](app/services/orchestrator.py) — simulation coordination
- [app/services/llm.py](app/services/llm.py) — OpenRouter `:free` provider and fallback
- [app/agents](app/agents) — founder, market, finance, operations, strategy, and narrative agents
- [app/agents/prompts.py](app/agents/prompts.py) — internal prompts
- [tests/test_simulation.py](tests/test_simulation.py) — progression, finance, events, memory, and decision impact tests
- [data/seed_scenario.json](data/seed_scenario.json) — example startup scenario

## OpenRouter `:free` only

The app is designed to work with OpenRouter free models only.

Default configuration uses:
- `meta-llama/llama-3.3-8b-instruct:free`

If the configured model does not end with `:free`, the provider falls back to the default free model.

The LLM is used only for:
- founder interpretation
- strategy memo refinement
- operations commentary
- narrative report writing
- market and finance summaries

All calculations stay local.

## Setup

### 1. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -e .[dev]
```

### 3. Configure environment

```bash
cp .env.example .env
```

If `OPENROUTER_API_KEY` is empty, the simulator runs in rules-only mode.

### 4. Run the app

```bash
uvicorn app.main:app --reload --port 8010
```

Open http://127.0.0.1:8010

## Simulation workflow

1. Create a startup scenario
2. Inspect the initial dashboard
3. Advance the simulation by week or month
4. Pick a decision such as sales focus, grant application, hiring, cost cuts, or service pivot
5. Read the event log, finance view, strategy view, and narrative reports
6. Export the persistent history whenever needed

## Data model

Persistent entities include:
- `startup_profiles`
- `founder_profiles`
- `simulation_states`
- `finance_states`
- `market_states`
- `team_states`
- `weekly_snapshots`
- `monthly_snapshots`
- `event_logs`
- `decision_logs`
- `strategy_memos`
- `narrative_reports`
- `llm_cache`

## Internal prompts included

At least the required prompts are implemented in [app/agents/prompts.py](app/agents/prompts.py):
- `FOUNDER_AGENT_PROMPT`
- `STRATEGY_AGENT_PROMPT`
- `OPERATIONS_AGENT_PROMPT`
- `NARRATIVE_REPORTER_PROMPT`
- plus `MARKET_AGENT_PROMPT` and `FINANCE_AGENT_PROMPT`

## Tests

Run:

```bash
pytest
```

The test suite covers:
- startup state progression
- finance and runway logic
- event generation consistency
- memory persistence roundtrip
- decision impact on survival

## Notes

This MVP favors robust simulation quality over flashy complexity.

Possible next steps:
- branch comparison between alternative decisions
- richer investor and grants sub-agents
- sector-specific Italian policy rules
- multi-founder conflict dynamics
- more granular monthly accounting and invoicing states
