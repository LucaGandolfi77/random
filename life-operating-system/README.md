# Life Operating System

Life Operating System is a local-first adaptive planning app for one user. It combines four lightweight agents to turn daily check-ins into a realistic plan that respects energy, sleep, context, workload drift, and habit continuity.

This version also adds:

- a dedicated weekly planning screen
- lightweight charts on the dashboard
- JSON export/import for local memory portability
- CSV bundle export for local memory portability
- a practical low-cost OpenRouter profile by default

## Why this MVP exists

Most productivity tools assume the same person shows up every day. This app assumes the opposite:

- low sleep changes the plan
- high stress changes sequencing
- repeated incompletion should shrink scope
- habits need minimum viable versions
- evening reflection should become tomorrow's memory
- unfinished work should carry over from the weekly plan instead of disappearing

The system uses a rules-first pipeline and calls an LLM only for narrow synthesis tasks.

## Agent architecture

### 1. `planner`
Creates the daily plan from check-in signals and local memory. It:
- ranks tasks by real execution value
- splits oversized tasks into realistic blocks
- protects 1 to 2 essential tasks on low-energy days
- chooses a plan mode: `recovery`, `conservative`, `balanced`, `ambitious`

### 2. `energy coach`
Interprets sleep, stress, and energy. It:
- advises on pacing and sequencing
- explains when to reduce deep work
- suggests recovery blocks and lower-friction next actions

### 3. `habit auditor`
Reviews weekly habit consistency and behavioral drift. It:
- measures completion rate
- flags friction and overload
- writes a short weekly synthesis

### 4. `reflection guide`
Supports a short evening review. It:
- gives high-value prompts
- extracts a practical signal for tomorrow
- stores the reflection as persistent memory

### 5. `weekly planner`
Creates a weekly operating brief from priorities, constraints, recent sleep, and carry-over patterns. It:
- narrows weekly scope before daily plans sprawl
- assigns focus blocks across weekdays
- highlights overload and recovery risk early

## Architecture summary

- **Backend:** FastAPI
- **Frontend:** Jinja templates + vanilla CSS/JS
- **Storage:** SQLite
- **LLM integration:** abstract provider with OpenRouter support
- **Fallback mode:** full rules-first behavior when no API key is set
- **Caching:** persistent prompt/response cache in SQLite
- **Portability:** one-click JSON export/import for memory state

## Project structure

- [app/main.py](app/main.py) — FastAPI app and routes
- [app/services/memory.py](app/services/memory.py) — persistence and dashboard queries
- [app/services/rules.py](app/services/rules.py) — adaptive planning logic and heuristics
- [app/services/llm.py](app/services/llm.py) — OpenRouter-compatible provider and cache
- [app/services/orchestrator.py](app/services/orchestrator.py) — agent coordination
- [app/agents/weekly_planner.py](app/agents/weekly_planner.py) — weekly planner agent
- [app/agents/planner.py](app/agents/planner.py) — planner agent
- [app/agents/energy_coach.py](app/agents/energy_coach.py) — energy coach agent
- [app/agents/habit_auditor.py](app/agents/habit_auditor.py) — habit auditor agent
- [app/agents/reflection_guide.py](app/agents/reflection_guide.py) — reflection guide agent
- [app/agents/prompts.py](app/agents/prompts.py) — internal prompts
- [tests/test_rules.py](tests/test_rules.py) — energy and plan adaptation tests
- [tests/test_memory.py](tests/test_memory.py) — check-in persistence test
- [tests/test_habits.py](tests/test_habits.py) — habit insight test
- [data/seed_example.json](data/seed_example.json) — example seed payloads

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

If you want LLM enrichment through OpenRouter, set:

- `OPENROUTER_API_KEY`
- optionally `OPENROUTER_MODEL`

The default profile is `low-cost`, which resolves to `google/gemini-2.0-flash-lite-001` unless you override the model explicitly.

Relevant environment variables:

- `OPENROUTER_PROFILE=low-cost`
- `OPENROUTER_MODEL=`
- `OPENROUTER_TEMPERATURE=0.3`
- `OPENROUTER_MAX_TOKENS=350`

If you leave the key empty, the app works in rules-first mode.

### 4. Run the app

```bash
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000

## How the daily flow works

### Morning
1. Fill the daily check-in
2. Add required tasks in this format:
   - `Task title | minutes | category`
3. Save the check-in
4. The planner creates an adaptive plan immediately
5. If the current week already has open carry-over tasks or a matching weekly focus block, they are injected into today's plan automatically
6. The matching weekly load for that weekday now changes the suggested task-minute budget, so light days shrink scope and heavy days allow more execution room

### Weekly reset
1. Open `/weekly`
2. Define the week start, priorities, constraints, focus areas, and non-negotiables
3. Save the weekly plan
4. Review focus blocks, risk note, and recovery note before filling the week with reactive work
5. Deep-work blocks are now assigned to the weekdays where your recent check-ins show the strongest energy pattern, instead of always favoring the same static days

### During the day
- mark tasks as `done`, `skipped`, `moved`, or `pending`
- log habits as done or missed

### Evening
1. answer the reflection prompts
2. save reflection
3. the reflection guide stores a short signal for tomorrow
4. the habit auditor refreshes the weekly insight

## Data model

The SQLite database stores:
- `user_profile`
- `energy_profile`
- `daily_checkins`
- `daily_plans`
- `tasks`
- `habits`
- `habit_logs`
- `reflection_entries`
- `weekly_insights`
- `weekly_plans`
- `weekly_focus_blocks`
- `llm_cache`

## Adaptive behavior examples

- **low sleep + low energy** → plan mode becomes `recovery`, deep work shrinks, recovery is explicit
- **high energy + good sleep** → plan mode can become `ambitious`, deep work moves first
- **too many unfinished tasks recently** → target minutes shrink even if today's energy is decent
- **habits frequently missed** → weekly insight recommends smaller minimum viable habits
- **negative evening tone repeats** → recovery signal warns about hidden overload

## Internal prompts included

You asked for at least three internal prompts. They are defined in [app/agents/prompts.py](app/agents/prompts.py):

- `PLANNER_SYSTEM_PROMPT`
- `ENERGY_COACH_SYSTEM_PROMPT`
- `REFLECTION_GUIDE_SYSTEM_PROMPT`
- plus `HABIT_AUDITOR_SYSTEM_PROMPT`

## Tests

Run:

```bash
pytest
```

Coverage in this MVP includes:
- energy score behavior
- plan adaptation behavior
- daily check-in persistence
- habit insight generation
- weekly planning generation
- export/import roundtrip

## Charts and memory portability

The dashboard now includes lightweight client-side charts for:

- energy and sleep trend
- today's task status mix
- habit streaks
- weekly completion mix by day
- weekly planned load distribution by weekday

Memory portability includes:

- `GET /memory/export` to download a JSON snapshot
- `GET /memory/export/csv` to download a ZIP bundle containing one CSV per table
- `POST /memory/import` to restore a JSON snapshot

## Notes on extensibility

This MVP intentionally excludes:
- authentication
- multi-user support
- calendar sync
- push notifications
- mobile app support
- vector databases

Good next steps would be:
- recurring task memory
- weekly planning view
- trend charts with richer visualizations
- export to markdown or JSON
- optional background summarization jobs
