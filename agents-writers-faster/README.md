# OpenRouter Book Agents

A small Node.js starter for a multi-agent book-writing workflow using OpenRouter free models.

## What it does

- Runs a fast default pipeline: `merged planner -> fast character pass -> writer`
- Keeps a slimmer deep-review path behind `--deep-review`: `critic -> editor -> optional writer revision`
- Adds a `series_architect` agent that invents series patterns and next-book blueprints when you want the shelf to keep going automatically
- Lets agents talk through structured JSON handoffs
- Stores persistent memory for the book bible, timeline, style guide, and agent state
- Lets you change agent behavior live with commands and presets
- Adds agent private agendas and rivalries so the room feels less generic
- Includes a local control panel with sliders and generation forms
- Can auto-run multi-chapter generation loops
- Tracks chapter-to-chapter outline memory and arc targets
- Tracks per-arc success, momentum, and decay metrics
- Can add a second-pass critic/editor review when you opt into deep review
- Adds a dedicated translator agent that can render the current final chapter into Italian one chapter at a time
- Exports the manuscript as a Markdown bundle and EPUB file
- Stores multiple books in one series instead of only one global manuscript state
- Can boot into an `auto` mode with the standard default setup on port `4174`
- Saves chapter plans, drafts, reviews, and final text into `chapters/`

## Requirements

- Node.js 18+
- An OpenRouter API key

## Setup

1. Copy `env.example` to `.env`
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

Write or resume the active book in one run:

```bash
npm run write-book
```

That default path is optimized for speed: one merged planner pass replaces the old `architect + chapter planner` pair. Add deep review only when you explicitly want the slower critic/editor pass:

```bash
npm run write-book -- --deep-review
```

You can start a fresh book first and override the default chapter target:

```bash
npm run write-book -- --new-book --title "The Glass Mandate" --premise "A council of scribes taxes bottled grief." --count 12
```

If you omit the title and premise, the `series_architect` agent invents the next-book pattern and creates the book automatically:

```bash
npm run new-book
```

While the command runs, every OpenRouter request and response is appended in real time to `logs/openrouter/openrouter-live.jsonl`, so you can tail the file while the book is being planned.

Preview the automated next-book plan without creating it:

```bash
npm run plan-book -- --notes "Keep the shelf tragic but make book two feel more political."
```

Switch the active book:

```bash
npm run use-book -- --book-id book-01
```

Generate a chapter:

```bash
npm run generate -- --chapter 1 --idea "Open with a funeral where the dead woman appears alive in one mirrored surface."
```

Run the older heavier workflow only when you need it:

```bash
npm run generate -- --chapter 1 --idea "Open with a funeral where the dead woman appears alive in one mirrored surface." --deep-review
```

Generate several chapters automatically:

```bash
npm run generate-book -- --count 3 --idea "The orchard starts speaking through reflected weather."
```

If a run is interrupted after a chapter has already been persisted, the next `generate-book` or `write-book` run resumes from the following chapter unless you override it with `--start-chapter`. The `--count` value is treated as the total chapter target for the active book, not as “generate N more chapters from here”.

Translate one finished chapter into Italian:

```bash
npm run translate -- --chapter 1
```

This writes the translated chapter to `chapters/chapter_01_it.md` and stores the translator response metadata in `chapters/chapter_01_translation.json`.

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

Launch auto mode and open the UI in your browser:

```bash
./run-auto.sh
```

Or run the same launcher through npm:

```bash
npm run auto:open
```

On first run the launcher copies `env.example` to `.env` if needed, then opens the local UI at `http://127.0.0.1:4174` after startup.

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
- [prompts/series_architect.txt](prompts/series_architect.txt)
- [prompts/translator.txt](prompts/translator.txt)

## Notes

- This starter prefers free models, but free availability changes. Swap any model in `config/agents.json` if OpenRouter stops serving it.
- All agent messages are expected to be JSON. The parser tries to recover JSON if a model wraps it in prose.
- The default workflow uses one merged planner call plus the writer, and skips critic, continuity, editor, and voting so chapter generation stays materially faster.
- Deep review is opt-in with `--deep-review`; when enabled it runs critic plus editor and can trigger one writer revision round.
- Chapter agents receive compact `BOOK_BIBLE`, `TIMELINE`, and `STYLE_GUIDE` windows instead of the full memory payload, which cuts token cost and keeps recent context in focus.
- OpenRouter defaults are intentionally tighter here than the original project: 90s timeout and 2 attempts per model.
- The UI is zero-dependency and talks to the same workflow functions as the CLI.
- Regenerating a chapter invalidates any older Italian translation for that same chapter so the translated file cannot silently drift out of sync.
