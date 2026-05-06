# Graveyard Chorus

Graveyard Chorus is a production-minded agentic storytelling system that simulates a fictional town, tracks family memory across generations, and produces a linked cemetery anthology of first-person epitaphs.

The project is designed around OpenRouter free models as a first-class constraint, but it remains fully runnable offline through deterministic literary fallbacks. The social world, memory engine, chronology, and exported artifacts all work without network access. OpenRouter is layered on top for richer annual chronicles and epitaphs when credentials are available.

Every exported run includes a lightweight progressive web app explorer. Every normal CLI run also refreshes a root archive PWA so you can browse multiple runs from one landing page.

## What You Get

One simulation run produces:

- a persistent JSON town state
- a Markdown anthology of linked epitaphs
- biographies and family trees
- a town chronicle and event log
- a static HTML report
- a single-run PWA explorer for that exported bundle

If you keep running new simulations into the same output root, you also get:

- a multi-run PWA archive at the root output directory
- an index of all detected runs
- one-click navigation into each run's explorer, report, anthology, and chronicle

## Quickstart

### Fastest Offline Path

```bash
cd graveyard-chorus
python -m venv .venv
source .venv/bin/activate
pip install -e .
graveyard-chorus run --offline --years 16
graveyard-chorus serve runs --host 127.0.0.1 --port 8000
```

This gives you:

- a new run folder under `runs/`
- a root archive PWA at `runs/index.html`
- a local server that lets the PWA load JSON and service-worker assets correctly

### Fastest OpenRouter Path

```bash
cd graveyard-chorus
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
graveyard-chorus probe-models
graveyard-chorus run --years 16 --llm
graveyard-chorus serve runs --host 127.0.0.1 --port 8000
```

Before the OpenRouter run, add your API key to `.env`.

## Why This Architecture Fits Best

The best fit for this problem is a Python simulation backend with a CLI and a static report exporter.

Why this architecture works:

- The social simulation needs strong typed state, replayability, and persistence. Python plus Pydantic gives a reliable backbone for long-horizon world state.
- OpenRouter free models are useful for lyric compression and public-memory voicing, but they are too volatile to trust as the only source of world logic. The simulation therefore keeps causality deterministic and delegates only selected literary tasks to LLMs.
- A CLI plus static exports keeps the tool CI-friendly, reproducible, and easy to inspect without a heavy frontend build system.
- Separate narrative roles make the system agentic without making it opaque. The key decisions live in explicit modules with narrow responsibilities.

## How The Simulation Uses LLMs

The simulation does not hand the whole world model to the LLM.

Instead:

- births, marriages, deaths, seasonal progression, relationship drift, and town-event consequences are deterministic
- annual public chronicle entries can use OpenRouter when available
- posthumous epitaphs can use OpenRouter when available
- if structured LLM output is unusable, the system falls back to deterministic prose instead of crashing the run

That means you can trust the run to complete even when the free model layer is noisy, rate-limited, or returns malformed structured output.

## Agentic Narrative Design

The architecture is organized into three layers.

### 1. Simulation Core

- `models.py` defines typed state for characters, families, households, memories, secrets, life events, town events, chronicles, epitaphs, and the cemetery collection.
- `engine.py` advances the world through seasons and years, handles births, marriages, deaths, kinship refresh, event generation, and long-term consequences.
- `memory.py` retrieves private, family, and town memories using recency, emotional weight, participant overlap, and contradiction signals.

### 2. Agent Roles

- `CharacterLifeAgent` chooses a next social move for each living character based on desires, fears, secrets, and retrieved memories.
- `RelationshipCuratorAgent` turns those choices into events and updates relationship strength, rivalry, trust, intimacy, and reputation.
- `FamilyChronicleAgent` records inherited burdens, alliances, marriages, births, and deaths.
- `MemorySummarizerAgent` compresses older memory chapters to keep state manageable.
- `TownHistorianAgent` writes annual chronicle entries from public events and uses OpenRouter when available.
- `EpitaphPoetAgent` produces first-person poetic epitaphs grounded in lived history.
- `ConsistencyReviewerAgent` checks that the epitaph references valid people, valid events, and at least one grounded contradiction or hidden truth.

### 3. Literary Output Layer

- `exporters.py` emits Markdown, JSON, HTML, and the multi-run archive index.
- `pwa.py` emits both the single-run explorer and the root multi-run archive PWA.
- The output bundle includes biographies, family trees, town chronicle, event log, cemetery record, and a linked anthology.
- The CLI supports reproducible offline demos, normal simulation runs, state re-export, model probing, and local serving.

## Folder Tree

```text
graveyard-chorus/
├── .env.example
├── README.md
├── pyproject.toml
├── examples/
│   └── sample_run/
├── graveyard_chorus/
│   ├── __init__.py
│   ├── cli.py
│   ├── client.py
│   ├── config.py
│   ├── engine.py
│   ├── exporters.py
│   ├── memory.py
│   ├── models.py
│   ├── persistence.py
│   ├── pwa.py
│   ├── seeds.py
│   ├── agents/
│   │   ├── __init__.py
│   │   └── roles.py
│   └── data/
│       ├── family_networks.json
│       └── town_seed.json
└── tests/
```

## Requirements

- Python 3.11 or newer
- network access only if you want OpenRouter-backed chronicles or epitaphs
- a browser if you want to inspect the PWA or HTML report locally

## Installation

### Standard Install

```bash
cd graveyard-chorus
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

### Development Install

```bash
cd graveyard-chorus
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

The package exposes one CLI entry point:

```bash
graveyard-chorus
```

## Seed Town

The bundled seed town is `Morrowfield`, a river town with:

- four districts
- church, tavern, school, mill, clinic, town hall, cemetery
- annual festivals and seasonal rhythms
- a Vale-Harrow mill feud
- Bell respectability under pressure
- Quill control of inconvenient letters and overheard truths
- hidden paternity, civic ledgers, and cross-class courtship

The sample families are:

- Vale: civic power, mill wealth, compromised relief ledgers
- Harrow: working-class memory, careful rage, protective secrecy
- Quill: tavern wit, burial labor, hidden letters, unstable money
- Bell: pulpit authority, caregiving, respectability built on omissions

## Configuration

Create a local project config file:

```bash
cp .env.example .env
```

Then set at least your OpenRouter key if you want LLM-backed runs:

```dotenv
OPENROUTER_API_KEY=your_key_here
GRAVEYARD_PRIMARY_MODEL=openrouter/free
GRAVEYARD_FALLBACK_MODELS=inclusionai/ling-2.6-1t-20260423:free,liquid/lfm-2.5-1.2b-instruct-20260120:free
GRAVEYARD_LOG_LEVEL=INFO
GRAVEYARD_LOG_OPENROUTER_TRAFFIC=true
GRAVEYARD_LOG_DIR=logs
GRAVEYARD_LOG_FILE=graveyard-chorus.log
GRAVEYARD_TIMEOUT_SECONDS=45
GRAVEYARD_MAX_RETRIES=2
GRAVEYARD_OFFLINE_MODE=false
GRAVEYARD_SAVE_DIR=runs
GRAVEYARD_APP_NAME=graveyard-chorus
GRAVEYARD_APP_URL=https://example.com/graveyard-chorus
```

### Important Config Notes

- `.env` is loaded from the project root, so fresh shells will still pick up your local key.
- `GRAVEYARD_SAVE_DIR` is used by `graveyard-chorus run` when `--output-dir` is not provided.
- If `GRAVEYARD_LOG_DIR` is a relative path, it resolves relative to the directory where you run the CLI command.
- If you want stable output or log locations from any shell, use absolute paths.

### Configuration Reference

`OPENROUTER_API_KEY`
: Enables OpenRouter-backed chronicles and epitaphs.

`GRAVEYARD_PRIMARY_MODEL`
: Preferred model or router target. Default is `openrouter/free`.

`GRAVEYARD_FALLBACK_MODELS`
: Comma-separated exact `:free` model IDs used when the router path fails or produces unusable structured output.

`GRAVEYARD_LOG_OPENROUTER_TRAFFIC`
: When true, request payloads and raw responses are logged with the Authorization header redacted.

`GRAVEYARD_TIMEOUT_SECONDS`
: HTTP timeout for model calls.

`GRAVEYARD_MAX_RETRIES`
: Transport-level retry count inside each model request path.

`GRAVEYARD_OFFLINE_MODE`
: Forces deterministic behavior even if a key exists.

`GRAVEYARD_SAVE_DIR`
: Default root directory for normal `run` outputs.

## OpenRouter Design

The OpenRouter client supports:

- API key loading from the project-local `.env`
- `openrouter/free` as a router option
- exact `:free` model IDs as primary or fallback models
- retries and timeouts
- structured JSON output with `json_schema`
- local JSON extraction that tolerates reasoning-heavy wrappers, markdown fences, and partially truncated JSON through Pydantic Core recovery
- second-attempt exact-free retries when structured output is unusable
- logging of every outbound request and inbound response, with the Authorization header redacted
- logging of the actual model used for a successful call
- deterministic fallback when structured LLM output still cannot be recovered cleanly enough to validate

Recommended defaults:

- Primary: `openrouter/free`
- Fallbacks: `inclusionai/ling-2.6-1t-20260423:free`, `liquid/lfm-2.5-1.2b-instruct-20260120:free`

### What The CLI Summary Means

The final CLI summary can include:

- `Chronicle exact-free retries`: how many annual chronicle generations had to move from `openrouter/free` onto an exact `:free` fallback model

This counter is specific to annual chronicles. It does not represent total OpenRouter retries across every agent or every request type.

## Command Reference

### 1. Run a Normal Simulation

```bash
graveyard-chorus run --years 16 --llm
```

Useful options:

- `--years`: overrides simulated years
- `--seed-file`: uses a custom seed JSON
- `--output-dir`: changes the root export directory
- `--random-seed`: changes deterministic world evolution
- `--offline`: disables OpenRouter even if credentials exist
- `--llm`: requests the OpenRouter literary layer when credentials are present

Example with explicit output root:

```bash
graveyard-chorus run --years 12 --llm --output-dir exports/graveyard
```

### 2. Run Fully Offline

```bash
graveyard-chorus run --offline --years 16
```

This is the best path for:

- CI or deterministic local testing
- debugging exporter behavior
- checking state transitions without model variance

### 3. Generate the Bundled Demo

```bash
graveyard-chorus demo --years 12
```

This exports a reproducible sample bundle without requiring OpenRouter.

### 4. Re-export a Saved State

```bash
graveyard-chorus anthology runs/morrowfield-1917/town_state.json --output-dir exports/morrowfield
```

Use this when:

- you already have a `town_state.json`
- you want new Markdown and HTML artifacts without rerunning the simulation
- you want to copy a bundle elsewhere

### 5. Probe Models Directly

```bash
graveyard-chorus probe-models
```

Or probe a custom list:

```bash
graveyard-chorus probe-models --models openrouter/free,inclusionai/ling-2.6-1t-20260423:free
```

Use this when:

- OpenRouter changes free-model availability
- you suspect a model ID is stale
- the router path is rate-limited and you want to confirm exact fallback availability

### 6. Serve a Single Bundle PWA

```bash
graveyard-chorus serve examples/sample_run --host 127.0.0.1 --port 8000
```

### 7. Serve the Multi-Run Archive PWA

```bash
graveyard-chorus serve runs --host 127.0.0.1 --port 8000
```

This is the recommended mode once you have more than one exported run.

## Typical Workflows

### Workflow A: Build an Offline Cemetery Archive

```bash
graveyard-chorus run --offline --years 8
graveyard-chorus run --offline --years 16
graveyard-chorus serve runs
```

### Workflow B: Compare Multiple LLM Runs

```bash
graveyard-chorus run --years 12 --llm --random-seed 7
graveyard-chorus run --years 12 --llm --random-seed 11
graveyard-chorus run --years 12 --llm --random-seed 23
graveyard-chorus serve runs
```

### Workflow C: Develop Against a Fixed State

```bash
graveyard-chorus run --offline --years 10
graveyard-chorus anthology runs/morrowfield-1911/town_state.json --output-dir exports/morrowfield-1911
graveyard-chorus serve exports/morrowfield-1911
```

## Output Layout

### Single Run Bundle

Each run bundle exports:

- `town_state.json`: full persistent world state
- `index.html`: single-run PWA explorer entry point
- `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `icon-192.svg`, `icon-512.svg`: single-run PWA assets
- `anthology.md`: linked epitaph anthology
- `biographies.md`: character biographies
- `family_trees.md`: family structure summary
- `town_chronicle.md`: yearly chronicle view
- `event_log.json`: public event export
- `cemetery_record.json`: epitaph-focused export
- `report.html`: static HTML report

### Run Root Archive

At the root output directory used by `graveyard-chorus run`, the tool also maintains:

- `index.html`: multi-run archive landing page
- `graveyard-chorus-runs.json`: run index generated from discovered bundle folders
- `runs.js`, `runs.css`, `manifest.webmanifest`, `sw.js`, `icon-192.svg`, `icon-512.svg`: archive PWA assets

### Example Layout

After two runs with default settings, `runs/` looks conceptually like this:

```text
runs/
├── index.html
├── graveyard-chorus-runs.json
├── runs.js
├── runs.css
├── manifest.webmanifest
├── sw.js
├── icon-192.svg
├── icon-512.svg
├── morrowfield-1913/
│   ├── index.html
│   ├── town_state.json
│   ├── anthology.md
│   └── ...
└── morrowfield-1917/
	├── index.html
	├── town_state.json
	├── anthology.md
	└── ...
```

## PWA Explorer

The exported single-run explorer is a static, framework-free progressive web app designed to travel with the bundle itself.

It provides:

- a searchable character rail
- family filtering and living/dead filtering
- a cemetery chorus view driven by `cemetery_record.json`
- a timeline view driven by `event_log.json`
- a detail panel driven by `town_state.json`
- offline caching through a service worker once the bundle is served over HTTP

The single-run explorer reads the same files the exporter already writes, so there is no second data pipeline to maintain.

### Multi-Run Archive PWA

When you serve the run root rather than a single bundle, the archive PWA lets you:

- browse all exported runs
- filter runs by text query
- inspect headline results for each run from one page
- jump directly into any run's explorer, static report, anthology, or town chronicle

### Important PWA Note

If you open the exported folder directly with the `file:` protocol, browser restrictions can block JSON loading and service-worker behavior. Use `graveyard-chorus serve ...` whenever you want the PWA to behave correctly.

## Understanding the Output Naming

Run directories are named from the town and the final `current_year`.

For example:

- bundled seed start year: `1901`
- simulated years: `16`
- resulting output folder: `morrowfield-1917`

The folder name reflects the year after the simulated span has completed.

## Custom Seeds and Repeatable Runs

You can point the simulation at a custom seed file:

```bash
graveyard-chorus run --seed-file /absolute/path/to/my_seed.json --offline --years 10
```

Use `--random-seed` when you want repeatable deterministic variation:

```bash
graveyard-chorus run --offline --years 10 --random-seed 17
graveyard-chorus run --offline --years 10 --random-seed 17
```

Those two runs will produce the same deterministic world evolution, assuming the same code and seed data.

## Troubleshooting

### No OpenRouter Requests Appear

Check these first:

- `.env` contains a non-empty `OPENROUTER_API_KEY`
- you are not using `--offline`
- `GRAVEYARD_OFFLINE_MODE` is not set to `true`
- the run has actually reached chronicle or epitaph generation

OpenRouter is used for annual chronicle generation and epitaph generation, not for every seasonal event.

### `--llm` Was Requested But The Run Stayed Deterministic

The CLI now prints an explicit warning if `--llm` is requested without credentials.

Check:

- `.env` exists in the project root
- `OPENROUTER_API_KEY` is present there
- you did not override the run into offline mode

### OpenRouter Returns 200 But Structured Output Is Bad

The client now tries to recover JSON from:

- markdown code fences
- reasoning-heavy wrappers
- partially truncated structured output

If that still fails, it can retry onto exact `:free` fallback models. If all structured attempts fail, the system falls back to deterministic prose instead of crashing the run.

### The Root Archive Does Not Show My Run

The root archive is refreshed automatically by `graveyard-chorus run`.

If you only used:

- `graveyard-chorus demo`
- `graveyard-chorus anthology`

then you created a standalone bundle, not a refreshed multi-run archive root. Use `graveyard-chorus run` into a shared output root if you want the archive landing page to aggregate runs.

### The PWA Fails To Load JSON

Usually this means one of the following:

- you opened the folder directly instead of using `serve`
- the server root is wrong
- the bundle is incomplete

Correct examples:

```bash
graveyard-chorus serve runs
graveyard-chorus serve runs/morrowfield-1917
```

### Model Availability Changed

Run:

```bash
graveyard-chorus probe-models
```

Then update `.env` if you want to pin different fallback models.

### I Need To Inspect Raw Traffic

By default, logs are written to `logs/graveyard-chorus.log` relative to the current CLI working directory unless you configured an absolute log path.

When traffic logging is enabled, the log includes:

- the full request payload sent to `/chat/completions`
- sanitized request headers with the bearer token redacted
- the raw response body returned by OpenRouter
- success and failure summaries with requested model, actual model, attempt number, and status code where available

## Example Anthology Excerpt

An offline run produces epitaphs that remain grounded in simulation state. A typical linked excerpt looks like this:

```text
I am Silas Vale, speaking now from under river-wheel and weather.
They thought they knew me by my mill, but my real trade was keeping count of losses.
He signed his name in a relief ledger and called theft stewardship because the mill had to survive somebody's hunger.
They praised my industry; they were really rewarding how well I concealed greed.
The truth is this: I drew relief money into the mill and let gratitude stand in for wages because power was easier to keep than fairness.
Ask Jonah Harrow what silence cost us.
Bury me beside quiet hands; let the town call that justice if it needs a pretty word.
```

Because epitaphs are linked to real people and event identifiers, multiple dead voices can revisit the same letters, the same ledger, the same courtship, or the same winter epidemic from radically different moral positions.

## Development Notes

Important modules:

- `graveyard_chorus/cli.py`: command entry points
- `graveyard_chorus/engine.py`: yearly simulation loop
- `graveyard_chorus/client.py`: OpenRouter transport, retries, structured JSON recovery
- `graveyard_chorus/agents/roles.py`: narrative agents
- `graveyard_chorus/exporters.py`: bundle and archive emission
- `graveyard_chorus/pwa.py`: single-run and multi-run PWA assets

## Testing

Run the full suite:

```bash
pytest -q
```

Run focused slices:

```bash
pytest tests/test_client.py -q
pytest tests/test_exporters.py -q
pytest tests/test_cli.py -q
pytest tests/test_simulation.py -q
```

The tests cover:

- OpenRouter JSON extraction and actual-model reporting
- retry behavior for structured fallback models
- memory retrieval prioritization
- offline simulation runs that produce epitaphs and chronicles
- single-run export bundle generation
- multi-run archive generation
- CLI summary rendering

## Project Notes

- Everything in the project is in English: code, comments, data, tests, CLI text, and sample outputs.
- The literary tone is original and grounded in simulation history, not in copied phrasing.
- The simulation keeps both private memory and public reputation, allowing contradiction, revision, and unreliable remembrance.

## License

MIT