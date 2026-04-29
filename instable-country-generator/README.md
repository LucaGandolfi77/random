# Unstable Imaginary Countries Generator

HTML-first geopolitical simulation that generates fictional fragile countries and models their instability through a five-agent system, with persisted sessions, resumable dashboards, and exportable reports.

## What it does

The app simulates the political evolution of an imaginary country turn by turn. Five competing agents act every round:

- Government
- Opposition
- Lobby groups
- Citizens
- Foreign media

Each turn updates a shared country state with stability, protests, propaganda, coup risk, corruption, inflation, treasury pressure, international pressure, public trust, military loyalty, and regime legitimacy.

The UI renders everything inside a single control-room dashboard:

- Country overview with flag, capital, system, resources, and tensions
- Stylized SVG map with regional unrest, repression, foreign pressure, and separatist strain
- Stability, protest, propaganda, and coup-risk meters
- Secondary pressure indicators
- Live timeline of events
- Agent action cards with rationale and source mode
- Faction currents panel with internal coalitions, cohesion, split risk, and active dissident blocs
- Foreign pressure panel
- Narrative summary of why the state changed

## Modes

### Mock mode

Works without any API key. The five agents are simulated locally with deterministic heuristics plus faction-specific ideological voice so the demo is always runnable offline.

### OpenRouter mode

Uses OpenRouter through a server-side proxy only. The browser never sees the API key.

Requirements:

- Use only models whose ids end with :free
- Select a default free model via environment variables or let the server discover current free models from OpenRouter
- If model output is invalid JSON or a request fails temporarily, the server retries and then falls back to the local mock agent for that turn
- Agent prompts now include seed-specific faction ideology variants, constituency, red lines, historical narratives, fear profiles, campaign instinct, and a longer strategic memory so actions read more like political blocs than score optimizers
- Each faction also carries internal subcurrents that can gain influence, lose cohesion, and split into dissident blocs during the simulation

## Persistence, resume, and export

- Sessions are stored in SQLite under storage/sessions.sqlite
- Legacy JSON sessions under storage/sessions are imported automatically on boot if present
- Sessions survive server restarts and can be reopened from the Resume Sessions screen
- The resume screen supports free-text search plus active/ended filtering backed by SQLite queries
- You can export any session as raw JSON or as a standalone HTML report
- The dashboard exposes Export JSON and Export HTML report buttons
- Server routes also expose on-demand exports:
	- GET /api/sessions/:sessionId/export.json
	- GET /api/sessions/:sessionId/report.html
	- POST /api/sessions/:sessionId/export

## Setup

```bash
cd /workspaces/random/instable-coutry-generator
npm install
cp .env.example .env
npm start
```

Open the app at http://localhost:3000

When you generate, resume, or advance a scenario, the current session is written to SQLite automatically.

## Environment

Available variables in [.env.example](.env.example):

- OPENROUTER_API_KEY: optional, enables live AI agents and summarizer
- OPENROUTER_DEFAULT_MODEL: optional, must end with :free
- OPENROUTER_FREE_MODELS: optional comma-separated fallback list of :free model ids
- OPENROUTER_SITE_URL: sent to OpenRouter as referer metadata
- OPENROUTER_SITE_NAME: sent to OpenRouter as title metadata
- PORT: local server port

Example:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_DEFAULT_MODEL=deepseek/deepseek-chat-v3-0324:free
OPENROUTER_FREE_MODELS=deepseek/deepseek-chat-v3-0324:free,google/gemini-2.0-flash-exp:free
```

If the configured or discovered live model is unavailable, the UI still works in mock mode.

## Scripts

```bash
npm start
npm run dev
```

## Architecture

```text
public/
	index.html        HTML dashboard
	styles.css        visual system and responsive layout
	app.js            client-side rendering and API calls
src/
	config.js         runtime config and :free model validation
	data/worldSeeds.js
										seed countries, map layout, and seed-specific faction variants
	services/exporter.js
										JSON and standalone HTML report generation
	simulation/
		agentProfiles.js
										faction ideology, constituency, red lines, and long-game profiles
		catalog.js      agent definitions and action effects
		factionDynamics.js
										dynamic subcurrents, cohesion, and split mechanics
		prompts.js      OpenRouter prompts for agents and summarizer
		strategyMemory.js
										longer-horizon strategic memory for each faction
		validators.js   strict JSON parsing and sanitization
		mockAgents.js   offline agent heuristics and local summary
		resolver.js     turn resolution, events, outcomes
		engine.js       session assembly and live/mock orchestration
	services/openrouter.js
										model discovery and chat completions with retries
	state/sessionStore.js
										SQLite-backed session state
server.js           static server and API routes
```

## API

- GET /api/health
- GET /api/bootstrap
- GET /api/sessions
- POST /api/sessions
- GET /api/sessions/:sessionId
- GET /api/sessions/:sessionId/export.json
- GET /api/sessions/:sessionId/report.html
- POST /api/sessions/:sessionId/export
- POST /api/sessions/:sessionId/turn

## Sample seeds

Included scenario seeds:

- Republic of Veloria
- Solariq Federation
- Union of Dravara

You can also generate a random synthesized country from the UI.

## Simulation outcomes

The simulation can converge toward:

- Stabilized State
- Democratic Transition
- Authoritarian Consolidation
- Military Coup
- State Collapse

## Notes

- State is stored in SQLite under storage/sessions.sqlite for the MVP
- The OpenRouter key is never exposed to the browser
- Invalid or partial model output is sanitized or replaced by fallback mock actions
- The UI is designed to remain fully functional even when no API key is set