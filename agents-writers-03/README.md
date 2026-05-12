# OpenRouter Book Factory Framework v3

Single-file book production framework built around OpenRouter free models, persistent memory, A/B chapter generation, scoring, export, and a tiny dashboard.

## What It Does

- creates a new book job from a premise
- invents a default premise, job id, and template choice before the run starts
- generates a 10-chapter outline
- writes two chapter variants for each chapter
- edits and scores both variants, then keeps the stronger one
- extracts memory back into the job state after each chapter
- translates the finished outline and chapters into Italian
- exports the finished run to EPUB and PDF in both English and Italian
- stores job state in SQLite so unfinished jobs can resume later
- starts a simple dashboard on `http://localhost:8080`

## Requirements

- Python 3.11+
- an OpenRouter API key in `.env`
- packages:

```bash
pip install httpx aiosqlite pyyaml ebooklib reportlab
```

## Setup

Create `.env` in the same folder as the framework file:

```dotenv
OPENROUTER_API_KEY=your_key_here
```

The framework writes all generated state under `book_factory_data/`:

- `book_factory_data/state.db`: SQLite job store
- `book_factory_data/books/`: outlines, chapter markdown, EPUB, PDF, dashboard HTML
- `book_factory_data/templates/`: YAML prompt templates

On first run it creates a default `fantasy.yaml` template automatically.

Built-in templates now available in `book_factory_data/templates/`:

- `fantasy.yaml`
- `cozy_fantasy.yaml`
- `cyberpunk_noir.yaml`
- `dark_fantasy.yaml`
- `gothic_horror.yaml`
- `historical_intrigue.yaml`
- `literary_family_saga.yaml`
- `mystery_detective.yaml`
- `mythic_quest.yaml`
- `post_apocalypse.yaml`
- `romantic_drama.yaml`
- `space_opera.yaml`
- `sword_and_sorcery.yaml`
- `techno_thriller.yaml`

Each template is intentionally descriptive instead of minimal, so the planner and writer receive stronger guidance about tone, setting, story engine, chapter shape, and styles to avoid.

## How To Run

From `agents-writers-03/`:

Recommended quick start (creates a virtual environment, installs deps, sets API key):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# or, if no requirements file is present:
pip install httpx aiosqlite pyyaml ebooklib reportlab
```

Create a minimal `.env` with your OpenRouter key:

```bash
cat > .env <<'ENV'
OPENROUTER_API_KEY=your_key_here
ENV
```

Run the framework (interactive):

```bash
python openrouter_book_factory_framework.py
```

If you already use the workspace virtualenv, you can run it directly with:

```bash
/workspaces/random/.venv/bin/python openrouter_book_factory_framework.py
```

The script asks for a mode:

- `new`: create a fresh job from a premise
- anything else: resume unfinished jobs through the scheduler

### New Job Flow

When you choose `new`, the script first asks for an optional idea seed.

An inventor agent then proposes default values for:

- premise
- job id
- template name

The script shows those defaults back to you so you can accept them or override them manually.

Then it:

1. saves the job to SQLite
2. generates or reuses the outline
3. produces chapter variants A and B
4. edits and scores both
5. keeps the winner
6. summarizes memory and updates retrieval state
7. repeats until 10 chapters are complete
8. translates the outline and chapters into Italian
9. exports EPUB and PDF in English and Italian

### Example Interactive Session

Example run from the terminal:

```text
$ python openrouter_book_factory_framework.py
Dashboard: http://localhost:8080
new: new
Idea seed [auto]: letters that can rewrite yesterday
Premise [A courier discovers letters that rewrite yesterday whenever they are opened.]:
Job id [courier_letters]:
Template [fantasy.yaml]:
```

What happens next:

1. `courier_letters` is saved into `book_factory_data/state.db`.
2. The framework generates `book_factory_data/books/courier_letters_outline.md`.
3. It writes chapter files like `book_factory_data/books/courier_letters_chapter_1.md` through chapter 10.
4. It writes Italian files like `book_factory_data/books/courier_letters_chapter_1_it.md` and `book_factory_data/books/courier_letters_outline_it.md`.
5. It exports `book_factory_data/books/courier_letters.epub`, `book_factory_data/books/courier_letters.pdf`, `book_factory_data/books/courier_letters_it.epub`, and `book_factory_data/books/courier_letters_it.pdf`.
6. The dashboard shows the job status, latest chapter, and current score.

If you interrupt the run partway through, launch the script again and enter anything other than `new` at the first prompt to resume unfinished jobs from SQLite.

### Resume Flow

If you choose anything other than `new`, the scheduler loads all jobs whose status is not `done` and resumes them in order.

## Architecture

The framework is intentionally compact and keeps everything in one file.

### Core Components

- `RateLimiter`: enforces per-minute and per-day request budgets.
- `OpenRouterClient`: handles chat calls, retries on transient failures, and model fallback.
- `Storage`: persists `BookJob` objects in SQLite.
- `Factory`: owns the invention step, generation pipeline, memory merge, translation, export, and template loading.
- `Scheduler`: resumes unfinished jobs from the database.
- dashboard helpers: generate a simple HTML table and serve it over `HTTPServer`.

### Generation Pipeline

For each chapter the framework does:

1. `invent_book_job`: generate default premise, job id, and template choice for new runs
2. `plan`: generate a 10-chapter outline if missing
3. `chapter_variants`: ask the writer for Version A and Version B
4. `edit`: clean both drafts
5. `score`: assign numeric scores
6. choose the stronger draft
7. `summarize_memory`: extract events, characters, and open threads
8. `check_characters`: run a consistency pass against accumulated profiles
9. save chapter text and persist updated job state
10. `translate_book_to_italian`: produce Italian markdown plus Italian EPUB and PDF

### Memory Model

`job.memory` stores four important buckets:

- `events`
- `open_threads`
- `characters`
- retrieval helpers like `scene_vectors` and `style_samples`

The framework now merges memory cumulatively instead of overwriting prior chapter summaries. It also normalizes inconsistent LLM output shapes, for example when `characters` comes back as a list instead of a dictionary.

### Retrieval Strategy

Retrieval is lightweight and local:

- each saved chapter contributes a hashed embedding vector
- `retrieve_relevant` pulls the top matching scene snippets for the current chapter prompt
- `style_fingerprint` extracts a concise style signature from the latest samples

This is simple but cheap and easy to keep inside one file.

## Model Fallbacks

Each role uses a primary model plus a larger free fallback chain.

Current fallback pool includes:

- `openrouter/free`
- `openai/gpt-oss-20b:free`
- `google/gemini-2.0-flash-exp:free`
- `deepseek/deepseek-chat-v3-0324:free`
- `meta-llama/llama-3.3-70b-instruct:free`
- `liquid/lfm-2.5-1.2b-instruct:free`

The client retries each candidate up to 3 times on transient provider failures like 429 or 5xx responses before moving to the next model.

If you want to change model behavior, edit `MODELS` and `FREE_FALLBACK_MODELS` near the top of the Python file.

## Files Produced Per Job

For a job id like `my_book`, expect files such as:

- `book_factory_data/books/my_book_outline.md`
- `book_factory_data/books/my_book_chapter_1.md`
- `book_factory_data/books/my_book.epub`
- `book_factory_data/books/my_book.pdf`
- `book_factory_data/books/my_book_outline_it.md`
- `book_factory_data/books/my_book_chapter_1_it.md`
- `book_factory_data/books/my_book_it.epub`
- `book_factory_data/books/my_book_it.pdf`

## Dashboard

The script starts a basic dashboard server automatically:

- URL: `http://localhost:8080`
- source: the SQLite job database
- output file: `book_factory_data/books/dashboard.html`

It is intentionally minimal: a status table for quick inspection, not a full control plane.

## Limitations

- the default run target is fixed at 10 chapters
- the pipeline is sequential, not parallelized across chapters
- memory extraction still depends on LLM JSON quality
- long fallback chains improve resilience but can increase latency

## Suggested Next Improvements

- make chapter count configurable
- add structured logging for each OpenRouter attempt
- store raw model responses for debugging
- move configuration into YAML instead of hardcoding everything in the file