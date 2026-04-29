# OpenRouter Book Agents

A small Node.js starter for a multi-agent book-writing workflow using OpenRouter free models.

## What it does

- Runs a writer-room style pipeline: `architect -> character master -> chapter planner -> writer -> critic -> continuity keeper -> editor`
- Lets agents talk through structured JSON handoffs
- Stores persistent memory for the book bible, timeline, style guide, and agent state
- Lets you change agent behavior live with commands and presets
- Adds agent private agendas and rivalries so the room feels less generic
- Includes a local control panel with sliders and generation forms
- Can auto-run multi-chapter generation loops
- Tracks chapter-to-chapter outline memory and arc targets
- Tracks per-arc success, momentum, and decay metrics
- Runs an agent vote before a chapter is accepted into canon
- Exports the manuscript as a Markdown bundle and EPUB file
- Stores multiple books in one series instead of only one global manuscript state
- Can boot into an `auto` mode with the standard default setup on port `4174`
- Saves chapter plans, drafts, reviews, and final text into `chapters/`

## Requirements

- Node.js 18+
- An OpenRouter API key

## Setup

1. Copy `.env.example` to `.env`
2. Set `OPENROUTER_API_KEY`
3. Adjust free model names in `config/agents.json` if any model becomes unavailable

## Commands

Initialize the book:

```bash
npm run init-book -- --title "The Glass Orchard" --genre "dark fantasy" --theme grief --theme ambition --premise "A daughter inherits a memory orchard that burns lies into glass."
```

Create another book in the same series shelf:

```bash
npm run new-book -- --title "The Mirror Orchard"
```

Switch the active book:

```bash
npm run use-book -- --book-id book-01
```

Generate a chapter:

```bash
npm run generate -- --chapter 1 --idea "Open with a funeral where the dead woman appears alive in one mirrored surface."
```

Generate several chapters automatically:

```bash
npm run generate-book -- --count 3 --idea "The orchard starts speaking through reflected weather."
```

Change one behavior value:

```bash
npm run set -- writer verbosity 0.45
npm run set -- critic harshness 0.95
```

Apply a preset:

```bash
npm run preset -- "Netflix Producer"
```

Inspect the current effective setup:

```bash
npm run status
```

Export the current manuscript:

```bash
npm run export -- --format all
```

Launch the local control UI:

```bash
npm run serve-ui -- --port 4173
```

Inside the UI there is also a manual OpenRouter API key box that saves `OPENROUTER_API_KEY` into the local `.env` file.

Start the project in auto mode with the standard default configuration:

```bash
npm run auto
```

This reuses port `4174` if the UI is already running there, otherwise it starts the UI server and returns the current active-book status snapshot.

## Project layout

- [config/agents.json](config/agents.json)
- [config/presets.json](config/presets.json)
- [config/routing.json](config/routing.json)
- [memory/book_bible.json](memory/book_bible.json)
- [memory/timeline.json](memory/timeline.json)
- [memory/style_guide.json](memory/style_guide.json)
- [memory/agent_state.json](memory/agent_state.json)
- [memory/outline_memory.json](memory/outline_memory.json)
- [memory/series_state.json](memory/series_state.json)
- [memory/books](memory/books)
- [src/index.js](src/index.js)
- [src/lib/exporter.js](src/lib/exporter.js)
- [src/lib/openrouter.js](src/lib/openrouter.js)
- [src/lib/series-memory.js](src/lib/series-memory.js)
- [src/lib/workflow.js](src/lib/workflow.js)
- [src/lib/server.js](src/lib/server.js)
- [public/index.html](public/index.html)

## Notes

- This starter prefers free models, but free availability changes. Swap any model in `config/agents.json` if OpenRouter stops serving it.
- All agent messages are expected to be JSON. The parser tries to recover JSON if a model wraps it in prose.
- The workflow currently does a small revision loop when the critic rejects a chapter or continuity fails.
- Approval now includes a multi-agent vote with configurable thresholds in [config/routing.json](config/routing.json).
- The UI is zero-dependency and talks to the same workflow functions as the CLI.
