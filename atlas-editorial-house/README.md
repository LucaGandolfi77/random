# The Atlas Editorial House

The Atlas Editorial House is a portable, English-only multi-agent editorial bundle designed for Hermes-style workflows and fallback YAML-driven orchestration. It combines literary-inspired personalities, operational non-author roles, publication controls, canon memory, and guarded local execution into one newsroom package.

The bundle is meant for serious production work rather than novelty prompting. It is built to support books, essays, reporting, technical documentation, code, hybrid narrative-plus-code artifacts, adversarial review, continuity management, and reusable editorial process.

This repository stays deliberately conservative on one point: every agent is inspired by high-level craft traits only. No agent is meant to reproduce recognizable passages, quotations, signature diction, or close stylistic imitation of any author.

## What Atlas Contains

Atlas is made of four layers that work together:

1. A portable fallback manifest layer for orchestration outside Hermes.
2. A Hermes-native profile export for direct installation under a Hermes home.
3. A guarded local runtime model that constrains output to repository-local folders.
4. An editorial operating system that includes writing, routing, review, publication trial, and canon memory.

At the current state of the bundle, Atlas includes:

- 37 named personalities (including the Director orchestrator).
- 23 literary-inspired writer/editor roles.
- 7 operational newsroom roles.
- 6 additional global-contemporary literary roles.
- 1 autonomous orchestration agent (Director).
- 7 profile-local skills.
- 14 ready launcher scenarios.
- 5 editorial imprints.
- a guarded wrapper, a single-command book launcher, and a root smoke suite.

## Repository Layout

The root files and directories are intentionally compact, but each one has a distinct role:

- `newsroom.yaml`: the master orchestration document. This is the highest-level fallback manifest for governance, role assignment, launch order, collaboration architecture, routing rules, canon protocol, and operational modes.
- `imprints.yaml`: the house imprint manifest. It defines Atlas Noir, Atlas Civic, Atlas Lab, Atlas Heresy, and Atlas Sunday Review, including tone, risks, and preferred staffing.
- `sample_instructions.yaml`: a curated set of regression-style briefs spanning books, articles, trials, canon audits, reporting, and technical work.
- `agents/`: one YAML definition per agent. These are the portable fallback agent manifests.
- `local-output/`: the only approved repository-local output tree for agent-created or agent-modified files.
- `hermes-profile/atlas-editorial-house/`: the Hermes-native export, including `config.yaml`, `SOUL.md`, `profile.yaml`, and the skill directories.
- `hermes-profile/install-profile.sh`: installs the Hermes profile into a Hermes home or a custom target directory.
- `hermes-profile/show-commands.sh`: prints recommended commands for switching personalities, invoking skills, and using launcher presets.
- `hermes-profile/launch-example.sh`: generates ready-to-run Atlas prompts for predefined scenarios and can delegate execution to the guarded wrapper.
- `hermes-profile/run-local-hermes.sh`: the preferred execution wrapper. It starts Hermes from an approved session directory and audits the repository for writes outside `local-output/`.
- `smoke-test.sh`: a one-command validation entrypoint for manifests, skill directories, documentation references, launcher presets, and wrapper/install dry-runs.
- `control-panel/`: a loopback-only web control surface with a private Python server, static HTML/CSS/JS dashboard, and an optional Telegram bridge.

## Design Principles

Atlas is opinionated. The bundle is organized around a few rules that should stay stable over time:

- All prompts, agent metadata, and profile content are in English.
- The bundle favors modern, professional prose and practical output over literary cosplay.
- Collaboration exists to sharpen judgment, not to hide responsibility.
- Every important deliverable should have explicit routing, explicit review ownership, and an explicit shipment threshold.
- Local repository discipline matters: generated files must stay inside the approved output tree.
- Tools and skills are designed to be composable, so the same roster can support fiction, journalism, research, code, or hybrid deliverables.

## Recommended Starting Point

If you want to understand Atlas quickly without reading every file, follow this order:

1. Read `newsroom.yaml` to understand the editorial system as a whole.
2. Read `imprints.yaml` to understand how publication posture changes routing.
3. Read `sample_instructions.yaml` to see the kinds of assignments Atlas expects.
4. Read the Hermes profile files under `hermes-profile/atlas-editorial-house/` if you plan to use Hermes directly.
5. Use `./hermes-profile/show-commands.sh` and `./hermes-profile/launch-example.sh` for practical entrypoints.

## Hermes CLI Mapping Notes

If Hermes CLI expects a different native schema, the fallback files can still be mapped conservatively:

- `display_name` -> agent display name.
- `system_prompt` -> agent system prompt.
- `primary_mission` -> role or goal.
- `preferred_task_types` -> skills, modes, or routing tags.
- `ideal_collaborators` -> collaboration metadata.
- `examples.feedback_example` and `examples.coding_task_example` -> persona examples.

This mapping lets the bundle remain useful even if the exact Hermes-native schema evolves.

## Hermes-Native Profile

Atlas includes a Hermes-style profile directory at:

- `hermes-profile/atlas-editorial-house/`
- `hermes-profile/install-profile.sh`
- `hermes-profile/show-commands.sh`
- `hermes-profile/launch-example.sh`
- `hermes-profile/run-local-hermes.sh`

The profile mirrors the layout Hermes expects under `~/.hermes/profiles/<name>/`.

Core profile files:

- `config.yaml` with named personalities for the 37 Atlas personalities, including the Director orchestrator plus literary and operational roles.
- `SOUL.md` with the default newsroom-level conductor persona.
- `profile.yaml` with profile metadata.

Skill files:

- `skills/creative/atlas-book-factory/SKILL.md`: autonomous book production pipeline from a single brief to a complete file-persisted manuscript, managed by the Director agent.
- `skills/creative/atlas-editorial-house/SKILL.md`: general routing, role selection, output discipline, and baseline editorial behavior.
- `skills/creative/atlas-canon-memory/SKILL.md`: canon ledger maintenance, continuity review, and cemetery management for cut material.
- `skills/creative/atlas-imprints/SKILL.md`: house-line selection before drafting, including tonal and deliverable defaults.
- `skills/creative/atlas-writers-room/SKILL.md`: explicit lead/reviewer/critic/finisher planning and multi-role orchestration.
- `skills/creative/atlas-trial-mode/SKILL.md`: adversarial pre-publication hearings with prosecutor, defense, judge, and legal scrutiny.
- `skills/creative/atlas-final-review/SKILL.md`: final QA, severity triage, and ship/no-ship review.

## Installation and First Run

Suggested install flow:

1. Review the target path with `./hermes-profile/install-profile.sh --dry-run`.
2. Install the profile with `./hermes-profile/install-profile.sh`.
3. Start Hermes with that profile.
4. Use `/personality shakespeare`, `/personality austen`, and the other overlays to switch operating voice.
5. Keep `SOUL.md` active as the default newsroom conductor persona when no overlay personality is selected.

The installer defaults to:

- `HERMES_HOME` if it is set.
- otherwise `~/.hermes/profiles/atlas-editorial-house/`.

Useful installer options:

- `--dry-run` to preview file operations.
- `--force` to back up and replace an existing target profile.
- `--target-dir <path>` to install somewhere other than the default Hermes profile path.

## Core Commands

The main operational commands are:

- `./write-book.sh`: single-command entrypoint for autonomous book production. Supply `--title` and `--theme`; the Director agent handles team selection, planning, chapter drafting, quality gates, manifest completion, and optional translation end-to-end. See the Write-Book section below for exact commands.
- `./hermes-profile/show-commands.sh`: prints recommended Hermes commands for installing the profile, switching personalities, and using the seven Atlas skills.
- `./hermes-profile/run-local-hermes.sh`: starts Hermes from a dedicated session directory under `local-output/runs/`, can inject provider and model overrides for the current run, and performs a post-run repository audit.
- `./hermes-profile/launch-example.sh`: prints ready-to-use Atlas prompts for predefined scenarios and can run them through the wrapper.
- `./smoke-test.sh`: validates roster counts, skill directories, launcher presets, README references, and wrapper/install dry-run behavior in one pass.
- `./smoke-test-openrouter.sh`: runs a live OpenRouter smoke test, first against the raw API and then through Hermes plus the Atlas profile when `OPENROUTER_API_KEY` is available.
- `python3 ./control-panel/server.py`: starts a private loopback-only control server that serves the dashboard and local APIs on `127.0.0.1:8765` by default.
- `python3 ./control-panel/telegram_control_bot.py`: starts a Telegram Bot API polling bridge that forwards Telegram commands to the private local control server.

Atlas also supports a final translation step:

- add `--translate-it` to `./hermes-profile/launch-example.sh` when you want the main output in English plus a final faithful Italian translation in modern language.

The runtime wrapper also supports explicit model selection when you need a provider-specific run without changing your global Hermes defaults:

- `--provider <name>` to override the Hermes provider for one run.
- `--model <id>` to override the model for one run.
- `--allow-tools` to keep Hermes toolsets enabled even for OpenRouter single-query runs.
- `ATLAS_HERMES_PROVIDER` overrides the Atlas wrapper provider default. If unset, Atlas now defaults to `openrouter`.
- `ATLAS_HERMES_MODEL` overrides the Atlas wrapper model default. If unset, Atlas now defaults to `ATLAS_OPENROUTER_MODEL`.
- `ATLAS_OPENROUTER_MODEL` overrides the preferred OpenRouter model for Atlas scripts and wrappers. If unset, Atlas now defaults to `openai/gpt-oss-120b:free`.
- `ATLAS_OPENROUTER_FALLBACK_MODELS` overrides the OpenRouter fallback chain used by Atlas text-only Hermes runs. It expects a comma-separated list of model ids.

Resolution order for the wrapper is:

1. explicit `--provider` and `--model` flags.
2. `ATLAS_HERMES_PROVIDER`, `ATLAS_HERMES_MODEL`, and `ATLAS_OPENROUTER_MODEL`.
3. Atlas project defaults: `ATLAS_HERMES_PROVIDER=openrouter`, `ATLAS_OPENROUTER_MODEL=openai/gpt-oss-120b:free`, `ATLAS_HERMES_MODEL=$ATLAS_OPENROUTER_MODEL`, and `ATLAS_OPENROUTER_FALLBACK_MODELS=openai/gpt-oss-20b:free,liquid/lfm-2.5-1.2b-instruct:free`.
4. Hermes global config under `${HERMES_HOME:-~/.hermes}/config.yaml` is consulted only if you explicitly override the Atlas defaults back to an empty or alternate state before invocation.

OpenRouter compatibility note:

- for non-interactive Atlas runs such as `--chat-query` or `chat -q ...`, the wrapper now defaults to a text-only compatibility mode when the provider resolves to `openrouter`.
- those non-interactive wrapper runs also persist the Hermes transcript under the session directory as `hermes-chat-output.txt`, even when the model responds only on stdout and does not create a deliverable file.
- that mode creates a temporary Hermes home for the run, forces `platform_toolsets.cli: []` so no interactive tool surface leaks into the request, and injects an OpenRouter fallback chain based on Atlas defaults or `ATLAS_OPENROUTER_FALLBACK_MODELS`.
- if you explicitly want tool calling on an OpenRouter run, pass `--allow-tools`.

## OpenRouter Compatibility and Live Smoke

Atlas is structurally compatible with Hermes running on OpenRouter-backed models because the public Hermes agent project exposes OpenRouter as a first-class provider and OpenRouter currently lists multiple Hermes-family models.

Practical implication:

- Atlas behavior is primarily driven by profile overlays, skill files, routing prompts, and wrapper discipline.
- if Hermes CLI is configured to use OpenRouter, Atlas can run on top of that provider without needing bundle-level schema changes.

Recommended models for Atlas-style workloads:

- `openai/gpt-oss-120b:free`
- `openai/gpt-oss-20b:free`
- `liquid/lfm-2.5-1.2b-instruct:free`


The default model for the live smoke script is `openai/gpt-oss-120b:free`, with Atlas text-only fallback routed next to `openai/gpt-oss-20b:free` and `liquid/lfm-2.5-1.2b-instruct:free`, because those were the free models that completed the latest OpenRouter raw smoke without failing.

The live test entrypoint is:

- `./smoke-test-openrouter.sh`
- `./try-openrouter-models.sh`

What it checks:

- a direct OpenRouter API call to the selected Hermes-family model.
- a Hermes CLI run through `./hermes-profile/run-local-hermes.sh` using the Atlas profile and the same OpenRouter model.
- prompt generation through one of the existing launcher scenarios.
- persistent logs under `local-output/reviews/`.

Typical usage:

- `./smoke-test-openrouter.sh --dry-run`
- `OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh`
- `OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh --model nousresearch/hermes-3-llama-3.1-405b:free --scenario trial-review`
- `OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh --raw-only`
- `OPENROUTER_API_KEY=... ./try-openrouter-models.sh --hermes-only`
- `OPENROUTER_API_KEY=... ./try-openrouter-models.sh --free-only --hermes-only`
- `OPENROUTER_API_KEY=... ./try-openrouter-models.sh --hermes-only --model nousresearch/hermes-3-llama-3.1-405b:free --model :free`
- `OPENROUTER_API_KEY=... ./try-openrouter-models.sh --hermes-only --model arcee-ai/trinity-large-thinking:free --model poolside/laguna-m.1:free --model openai/gpt-oss-120b:free`
- `OPENROUTER_API_KEY=... ./hermes-profile/run-local-hermes.sh --provider openrouter --model openai/gpt-oss-120b:free --chat-query "Reply with exactly OK"`
- `OPENROUTER_API_KEY=... ATLAS_OPENROUTER_FALLBACK_MODELS=openai/gpt-oss-20b:free,liquid/lfm-2.5-1.2b-instruct:free ./hermes-profile/run-local-hermes.sh --provider openrouter --model openai/gpt-oss-120b:free --chat-query "Reply with exactly OK"`
- `OPENROUTER_API_KEY=... ./hermes-profile/run-local-hermes.sh --provider openrouter --model nousresearch/hermes-3-llama-3.1-405b:free --allow-tools --chat-query "Use the atlas-editorial-house skill and produce a tool-enabled run"`

The model sweep helper is useful when you already have `OPENROUTER_API_KEY` in your current terminal and want a quick pass/fail matrix across a shortlist of candidate models without editing the smoke script itself.

Its default sweep now covers both the Atlas-focused Hermes shortlist and a larger free-friendly fallback set, including models such as `arcee-ai/trinity-large-thinking:free`, `poolside/laguna-m.1:free`, `openai/gpt-oss-120b:free`, `z-ai/glm-4.5-air:free`, `google/gemma-4-31b-it:free`, and other low-friction OpenRouter candidates.

Live prerequisites:

- `OPENROUTER_API_KEY` must be set.
- `hermes` must be installed and available on `PATH` for the Hermes integration half of the test.
- the Atlas profile must already be installed under `${HERMES_HOME:-~/.hermes}/profiles/atlas-editorial-house/` unless you run `--raw-only`.

Important note for the Atlas wrapper:

- Atlas now ships with project-local defaults for provider and model, so it no longer needs a matching global Hermes config just to choose OpenRouter and a Hermes-family model.
- if you want a different provider or model, prefer explicit wrapper flags or Atlas env vars for reproducible runs.

## Private Control Panel

Atlas now includes a minimal local control plane under `control-panel/`.

Files:

- `control-panel/server.py`: a loopback-only Python HTTP server that exposes local APIs for scenario preview, scenario execution, custom prompt execution, job inspection, and agent listing.
- `control-panel/index.html`: the dashboard UI shell.
- `control-panel/styles.css`: dashboard styling.
- `control-panel/app.js`: browser logic for loading scenarios, previewing prompts, starting jobs, and tailing logs.
- `control-panel/telegram_control_bot.py`: an optional Telegram bridge that polls the Telegram Bot API and forwards commands to the local server.

What the private server does:

- binds only to `127.0.0.1` or `localhost`.
- serves the HTML/CSS/JS dashboard.
- previews existing launcher scenarios using `./hermes-profile/launch-example.sh`.
- executes Atlas runs through `./hermes-profile/run-local-hermes.sh`.
- stores job artifacts under `local-output/reviews/control-panel/`.
- optionally requires an API token through `ATLAS_CONTROL_TOKEN` or `--api-token`.

Start the private server:

```bash
cd /workspaces/random/atlas-editorial-house
python3 ./control-panel/server.py
```

Optional flags:

- `--host 127.0.0.1`
- `--port 8765`
- `--profile atlas-editorial-house`
- `--api-token YOUR_LOCAL_SECRET`
- `--check` to validate configuration and exit

Once the server is running, open:

- `http://127.0.0.1:8765/`

The dashboard lets you:

- preview any of the 14 launcher scenarios.
- submit a scenario run through the guarded wrapper.
- submit a fully custom prompt.
- inspect the roster with descriptions loaded from `config.yaml`.
- monitor job status and stdout/stderr tails.

Important operational note:

- the dashboard does not bypass Atlas safeguards.
- every execution still flows through the existing wrapper and remains subject to the `local-output/` write policy.

## Telegram Control

Telegram control is intentionally implemented as a polling bridge, not as a public webhook. That means:

- no public HTTP endpoint is required.
- the local machine keeps polling the Telegram Bot API.
- each Telegram command is translated into a call to the private local control server.

Environment variables for Telegram control:

- `ATLAS_TELEGRAM_BOT_TOKEN`: required Telegram bot token.
- `ATLAS_TELEGRAM_CHAT_ID`: optional but strongly recommended; restricts the bridge to one Telegram chat id.
- `ATLAS_CONTROL_SERVER`: optional server URL, default `http://127.0.0.1:8765`.
- `ATLAS_CONTROL_TOKEN`: optional shared secret if the private control server requires a token.

Start the Telegram bridge:

```bash
cd /workspaces/random/atlas-editorial-house
export ATLAS_TELEGRAM_BOT_TOKEN=...your bot token...
export ATLAS_TELEGRAM_CHAT_ID=...your allowed chat id...
python3 ./control-panel/telegram_control_bot.py
```

Optional flags:

- `--server http://127.0.0.1:8765`
- `--bot-token TOKEN`
- `--allowed-chat-id CHAT_ID`
- `--control-token YOUR_LOCAL_SECRET`
- `--check` to validate configuration and exit

Telegram commands currently supported:

- `/start`
- `/help`
- `/scenarios`
- `/agents`
- `/preview <scenario>`
- `/run <scenario>`
- `/custom <prompt text>`
- `/status <job_id>`

Typical Telegram workflow:

1. Start the private local server.
2. Start the Telegram bridge on the same machine.
3. Open Telegram and message your bot.
4. Send `/scenarios` to list presets.
5. Send `/preview article` to inspect a scenario prompt.
6. Send `/run article` to launch a guarded Atlas job.
7. Send `/status JOB_ID` to read back the current status and log tail.

Security notes for Telegram control:

- set `ATLAS_TELEGRAM_CHAT_ID` so only one trusted chat can issue commands.
- if you expose the control server token, use a different secret from any model API key.
- the bridge is safer than a webhook because the server itself stays local-only.

Persistent user services via systemd:

- copy `./control-panel/telegram-control.env.example` to `./control-panel/telegram-control.env`.
- fill in `ATLAS_TELEGRAM_BOT_TOKEN` and preferably `ATLAS_TELEGRAM_CHAT_ID`.
- if you change `ATLAS_CONTROL_PORT`, update `ATLAS_CONTROL_SERVER` to the matching `http://127.0.0.1:<port>` value.
- install the user units with `./control-panel/install-systemd-user-services.sh install`.
- start the stack with `./control-panel/install-systemd-user-services.sh start`.

Useful follow-up commands:

- `./control-panel/install-systemd-user-services.sh check`
- `./control-panel/install-systemd-user-services.sh status`
- `./control-panel/install-systemd-user-services.sh logs bot`
- `./control-panel/install-systemd-user-services.sh restart`
- `./control-panel/install-systemd-user-services.sh stop`

The installer writes user units under `~/.config/systemd/user/` and keeps the secret-bearing env file in your repo-local ignored `*.env` path. On hosts that support persistent user services after logout, enable lingering once with `loginctl enable-linger "$USER"`.

## Skill Catalog

These seven skills are the conceptual core of the Hermes-native profile:

### `atlas-book-factory`

This is the autonomous book-production skill. Use it when the assignment is not a chapter sample or a plan, but a complete manuscript written to disk under `local-output/books/`.

Typical use cases:

- full novels from a single brief.
- long-form book production with chapter-level review and finishing gates.
- resumed book projects that need to continue from existing chapter files.
- translated book runs that should produce both the English manuscript and localized chapter files.

### `atlas-editorial-house`

This is the default newsroom skill. Use it when you want Atlas to route the task, recommend a lead and reviewer, and execute a serious English-language deliverable with proper output-discipline.

Typical use cases:

- features and essays.
- documentation and technical explanation.
- general editorial routing when the assignment is not yet highly specialized.

### `atlas-writers-room`

This is the explicit multi-role coordination skill. Use it when the work needs named ownership, handoff order, risk framing, and defined finishing responsibility.

Typical use cases:

- novels.
- hybrid projects.
- investigations.
- architecture-heavy technical work.

### `atlas-imprints`

This skill decides the editorial line before the draft. It chooses a house imprint and then routes the work according to that imprint's mission, tonal posture, and staffing defaults.

Typical use cases:

- you know the work needs a publication identity before it needs a draft.
- the task could go civic, contrarian, investigative, reflective, or speculative depending on editorial stance.

### `atlas-trial-mode`

This skill puts the work on trial before release. It uses adversarial review to decide whether a sensitive draft should publish, publish after fixes, or not publish.

Typical use cases:

- politically sensitive investigations.
- exposed essays or claim-heavy documentation.
- high-stakes release decisions.

### `atlas-canon-memory`

This skill manages continuity over time. It separates binding canon from discarded but still searchable material.

Typical use cases:

- serial fiction.
- recurring institutions or worlds.
- versioned documentation.
- systems where drift and contradiction matter.

### `atlas-final-review`

This is the final shipment gate. Use it when a draft already exists and the question is whether it should ship.

Typical use cases:

- final QA.
- severity triage.
- ship/no-ship review.

## Editorial Imprints

Atlas currently ships with five editorial imprints, each with a different stance:

- Atlas Noir: investigations, procedural dread, institutional darkness, and morally pressurized casework.
- Atlas Civic: public consequence, communal legibility, institutional accountability, and historical seriousness.
- Atlas Lab: speculative systems, prototypes, hybrid narrative-plus-code work, and governance design.
- Atlas Heresy: anti-consensus essays, revisionist arguments, contrarian editorial work, and accountable provocation.
- Atlas Sunday Review: elegant criticism, reflective long-form prose, review features, and serious weekend-publication tone.

Use `atlas-imprints` when choosing the publication line is part of the assignment, not an afterthought.

## Launcher Scenarios

The launcher exists so the bundle is usable immediately, even before you handcraft prompts. Atlas currently ships with 14 scenarios:

- `novel`: literary novel planning and first-pass routing. Recommended default: `tolstoy` with `atlas-writers-room`.
- `family-saga`: political family saga planning and routing. Recommended default: `allende` with `atlas-writers-room`.
- `psychological-novel`: moral-pressure and interior-conflict novel planning. Recommended default: `dostoevsky` with `atlas-writers-room`.
- `article`: feature-style or serious general-interest article drafting. Recommended default: `dickens` with `atlas-editorial-house`.
- `institutional-satire`: satire of bureaucracy, official process, and procedural absurdity. Recommended default: `bulgakov` with `atlas-writers-room`.
- `investigative-nonfiction`: investigative literary reporting with evidentiary structure. Recommended default: `bolano` with `atlas-writers-room`.
- `trial-review`: adversarial publication hearing before release. Recommended default: `fact_prosecutor` with `atlas-trial-mode`.
- `canon-audit`: canon ledger and cemetery update routing. Recommended default: `continuity_archivist` with `atlas-canon-memory`.
- `testimony-dossier`: polyphonic testimony and witness-structure routing. Recommended default: `alexievich` with `atlas-writers-room`.
- `migration-novel`: migration memory novel planning and routing. Recommended default: `gurnah` with `atlas-writers-room`.
- `essay`: philosophical or analytical essay drafting. Recommended default: `borges` with `atlas-editorial-house`.
- `docs`: technical documentation drafting. Recommended default: `hemingway` with `atlas-editorial-house`.
- `code`: software tool design and implementation. Recommended default: `shelley` with `atlas-writers-room`.
- `hybrid`: narrative-plus-code work where system design and story pressure interact. Recommended default: `shelley` with `atlas-writers-room`.

These scenarios are intentionally practical: they are not gimmick prompts, but reusable entrypoints into the editorial system.

## Sample Briefs

`sample_instructions.yaml` contains example briefs that serve two purposes at once:

- they act as ready prompts for experimentation.
- they act as regression probes for the bundle as it grows.

The sample set includes, among other things:

- long-form fiction prompts.
- article and reporting prompts.
- publication trial prompts.
- canon continuity audit prompts.
- global-contemporary reporting and migration-novel prompts.
- technical documentation and code prompts.

If Atlas changes significantly, updating `sample_instructions.yaml` is one of the cheapest ways to preserve behavioral coverage.

## Write-Book: Single-Command Autonomous Book Production

`write-book.sh` is the recommended entrypoint when you want to go from a brief to a complete, file-persisted manuscript without building a prompt manually. It activates the Director agent through the `atlas-book-factory` skill, which enforces an autonomous production pipeline from brief to final manifest.

Fastest full-book command:

```bash
./write-book.sh \
  --title "Red Inheritance" \
  --theme "Political power, family betrayal, institutional decline"
```

That one command is enough to trigger the full book pipeline: team assembly, planning documents, chapter drafting, reviewer and critic passes, finishing, file persistence, and final manifest generation under `local-output/books/<slug>/`.

Basic usage variants:

With translation to Italian and a custom chapter count:

```bash
./write-book.sh \
  --title "Red Inheritance" \
  --theme "Political power, family betrayal, institutional decline" \
  --chapters 20 \
  --min-words 3000 \
  --italian
```

Resuming an interrupted run:

```bash
./write-book.sh \
  --title "Red Inheritance" \
  --theme "Political power, family betrayal, institutional decline" \
  --resume
```

Preview the resolved prompt without running Hermes:

```bash
./write-book.sh \
  --title "Red Inheritance" \
  --theme "Political power, family betrayal, institutional decline" \
  --dry-run
```

All options:

- `--title <text>`: book title. Required.
- `--theme <text>`: core themes. Required.
- `--genre <text>`: literary style or genre. Default: literary novel.
- `--chapters <n>`: number of chapters. Default: 20.
- `--min-words <n>`: minimum words per chapter. Default: 3000.
- `--slug <text>`: output directory name under `local-output/books/`. Default: derived from title.
- `--italian`: translate the completed English manuscript into Italian.
- `--language <code>`: translate into a language other than Italian (e.g. `fr`, `de`, `es`).
- `--model <id>`: primary OpenRouter model. Default: `openrouter/free`.
- `--provider <name>`: Hermes provider. Default: openrouter.
- `--imprint <name>`: Atlas imprint. Options: `noir`, `civic`, `lab`, `heresy`, `sunday-review`.
- `--resume`: resume from the last completed chapter instead of restarting.
- `--dry-run`: print the resolved prompt and command without running Hermes.

Output always lands under `local-output/books/<slug>/` and follows the required file list defined in the `atlas-book-factory` skill:

- `00_work_order.md`: team, route, handoff sequence, definition of done.
- `01_outline.md`: chapter-by-chapter plan.
- `02_voice_guide.md`: narrative voice, POV, dialogue policy, style guardrails.
- `03_character_bible.md`: characters, arcs, and relationships.
- `04_revision_strategy.md`: structural, stylistic, critical, and final-polish pass rules.
- `chapter01.md` through `chapterNN.md`: manuscript chapters.
- `it/chapter01.it.md` (etc.): Italian translation chapters, if `--italian` was passed.
- `98_translation_notes.md`: translation decisions, if translation was requested.
- `99_manifest.md`: production record. Project is complete when this file shows all entries as `complete`.

Note: `write-book.sh` always passes `--allow-tools` to `run-local-hermes.sh` because autonomous file creation requires tool access. The primary default model is `openrouter/free`. If that run fails, Atlas retries the same book prompt with free-model fallbacks from `ATLAS_WRITE_BOOK_FALLBACK_MODELS`. The default free fallback chain is `openrouter/free`, `openai/gpt-oss-120b:free`, `openai/gpt-oss-20b:free`, and `liquid/lfm-2.5-1.2b-instruct:free`. You can override the primary model with `--model` or `ATLAS_WRITE_BOOK_MODEL`, and you can override the fallback chain with `ATLAS_WRITE_BOOK_FALLBACK_MODELS`.

## Agent Catalog

Atlas currently includes 37 named personalities. The list below gives a brief description of each agent and the kind of work each one is best suited for.

### Orchestration

- `director`: autonomous book production orchestrator. The Director does not write prose. It manages the full pipeline from a single brief to a finished file-persisted manuscript: team selection, planning documents, chapter production with quality gates, continuity checks, translation, and final manifest. Use it through `./write-book.sh` or by activating the `atlas-book-factory` skill.

### Foundational Literary and Editorial Core

- `shakespeare`: dramatic architect for conflict, scenes, dialogue, and ensemble dynamics. Best when the work needs scene pressure, character opposition, and differentiated voices.
- `austen`: precision editor for motive, tone, judgment, and social logic. Best when proportion, relational logic, and disciplined correction matter more than rhetorical heat.
- `dickens`: audience-facing long-form producer for momentum, breadth, and readability. Best for public-facing features, serialized work, and structurally generous prose.
- `dostoevsky`: psychological conflict and moral-pressure lead. Best for crisis logic, ideological collision, guilt, motive under stress, and high-stakes ethical systems.
- `shelley`: architecture and hybrid-systems lead. Best for speculative systems, technical design, failure-mode thinking, and ambitious hybrid narrative-plus-code work.
- `poe`: forensic editor for tension, diagnosis, breakdown, and debugging. Best for concentrated pressure, debugging, incident framing, and failure-path review.
- `tolstoy`: long-form operations chief for books, scope, continuity, and total design. Best when the work is large and local brilliance must remain subordinate to whole-project coherence.
- `woolf`: flow and interiority editor for reflective prose and humane documentation. Best for continuity of reader experience, reflective movement, and developer empathy.
- `kafka`: constraint and edge-case analyst for process, permissions, and ambiguity. Best for workflow scrutiny, compliance-heavy logic, invalid states, and hidden burdens.
- `borges`: conceptual architect for abstraction, taxonomy, research synthesis, and elegant framing. Best when the work depends on models, interfaces, naming systems, or conceptual economy.
- `hemingway`: finisher for clarity, compression, documentation, and ship-ready code. Best at removing drag, strengthening finish, and getting the output into shippable condition.
- `dante`: governance and orchestration lead for layered systems and escalation rules. Best for hierarchy, workflow ownership, and multi-level architecture.
- `cervantes`: resilience editor for reframing, revision rescue, and adaptive perspective. Best when a draft is stuck, rigid, or salvageable through better framing rather than complete replacement.

### Expanded Literary and Global-Memory Layer

- `bulgakov`: satirical systems critic for institutional absurdity, counterpower, and controlled surreal edge. Best for administrative satire and hypocrisy made operationally visible.
- `allende`: multigenerational narrative and civic-memory lead. Best for family sagas, social history, and emotionally lucid long-form projects.
- `garcia_marquez`: collective-memory and social-myth editor. Best for communal scale, inherited atmosphere, and long historical sweep without losing structural control.
- `cortazar`: experimental form and structural play lead. Best for modular reading, nonlinear design, and projects where structure itself carries meaning.
- `lispector`: interiority and existential precision editor. Best for intimate prose, reflective essays, and work that must surface what the draft knows before it fully states it.
- `bolano`: investigative network editor. Best for hidden systems, networked inquiry, documentary tension, and evidence spread across many nodes.
- `morrison`: moral-history and communal-authority editor. Best for inherited consequence, memory under pressure, and historically charged public consequence.
- `le_guin`: anthropological worldbuilding and humane-systems editor. Best for governance design, speculative societies, and social-system legibility.
- `achebe`: civic-realist editor for public consequence and institutional fracture. Best for moral clarity, communal legibility, and public-accountability framing.
- `oe`: ethical-aftermath editor for vulnerability, recovery, and long-tail consequence. Best for aftermath essays, humane failure thinking, and recovery under pressure.

### Operational Newsroom Roles

- `fact_prosecutor`: adversarial evidence prosecutor for pre-publication trials. Best when unsupported claims, weak sourcing, or hidden assumptions must be prosecuted hard.
- `defense_editor`: publication defender for the strongest honest salvage case. Best when the question is not whether a draft is perfect, but whether it is honestly repairable.
- `trial_judge`: verdict authority for publication trials and release thresholds. Best for explicit rulings, admissible remedies, and smallest-fix-set decisions.
- `copy_chief`: house style enforcer for line discipline, normalization, and polish. Best at final surface cleanup, terminology consistency, and line-level publication finish.
- `legal_reviewer`: exposure and compliance reviewer. Best for defamation boundaries, allegation control, claim narrowing, and release-risk reduction.
- `audience_editor`: reader-trust and usability editor. Best for accessibility, outside-reader legibility, onboarding clarity, and public-facing coherence.
- `continuity_archivist`: canon, timeline, and reference-integrity keeper. Best for recurring worlds, serial projects, versioned documentation, and contradiction detection.

### Global Contemporary Wave

- `alexievich`: documentary-polyphony editor for witness mosaics and ethically sequenced testimony. Best for oral-history structures, catastrophe aftermath, and many-voice reporting.
- `tokarczuk`: constellation-structure editor for border intelligence and humane nonlinear design. Best for modular synthesis, wandering structure, and distributed connection-making.
- `ferrante`: intimate-class-conflict editor for relational volatility and urban becoming. Best for rivalry, class pressure, intimacy under strain, and socially charged closeness.
- `roy`: public-private pressure editor for infrastructural politics and civic anger. Best when power, extraction, development, and public consequence must become structurally visible.
- `gurnah`: displacement and coastal-memory editor for migration ethics, exile, and quiet aftermath. Best for belonging, classification, memory after movement, and restrained moral force.
- `han_kang`: bodily-vulnerability editor for silence, political trauma, and fragile perception under pressure. Best for sparse but intense work where harm, rupture, and vulnerability must be handled without melodrama.

## How the Roster Is Meant to Be Used

The roster is not intended as a novelty menu where you pick an author at random. Atlas works better when you choose an agent for a precise function:

- choose by structural need, not by prestige.
- use a lead for the main draft logic.
- use a reviewer for quality against the brief.
- use critics, legal, or continuity roles only when the task justifies them.
- use `hemingway`, `copy_chief`, or `atlas-final-review` when a clean finish matters more than additional ideation.

## Operational Layers Beyond Writing

Atlas goes beyond literary personalities in three important ways.

### Operational Layer

Atlas includes non-author operational roles such as `fact_prosecutor`, `defense_editor`, `trial_judge`, `copy_chief`, `legal_reviewer`, `audience_editor`, and `continuity_archivist`.

These roles exist to make Atlas useful for:

- shipment decisions.
- adversarial review.
- public-facing quality control.
- continuity management.
- release hardening.

### Imprint Layer

The imprint system lets Atlas behave more like a house than a loose pile of agents. An Atlas Noir assignment should not be routed exactly like an Atlas Sunday Review assignment, even if both use some of the same people.

### Continuity Layer

`atlas-canon-memory` maintains a living canon ledger under `local-output/canon/` and a cemetery of discarded but reusable material under `local-output/cemetery/`.

Use it for:

- serial worlds.
- versioned documentation.
- recurring institutions.
- long-running hybrid systems.
- any project where removed material should stay searchable without remaining canonical.

## Local File Output Policy

Agent-created or agent-modified files must stay inside the repository-local output tree.

In this workspace, the approved root is:

- `/workspaces/random/atlas-editorial-house/local-output/`

Approved subdirectories:

- `local-output/books/`: book manuscripts, chapter plans, story bibles, and long-form narrative drafts.
- `local-output/articles/`: articles, features, op-eds, and newsroom-style public prose.
- `local-output/essays/`: essays, analytical drafts, reflective prose, and philosophical writing.
- `local-output/research/`: research notes, source syntheses, briefings, and evidence packs.
- `local-output/docs/`: technical documentation, manuals, runbooks, and developer guides.
- `local-output/code/`: code artifacts, scripts, prototypes, and implementation notes.
- `local-output/hybrid/`: mixed narrative-plus-code or multi-format deliverables.
- `local-output/reviews/`: QA reports, editorial gates, review notes, and ship/no-ship decisions.
- `local-output/canon/`: canon ledgers, continuity maps, stable-fact registries, and memory records for recurring projects.
- `local-output/cemetery/`: discarded scenes, cut pages, rejected fragments, and material archived for possible later reuse.
- `local-output/translations/`: Italian translations and other localized deliverables.
- `local-output/runs/`: dedicated session working directories created by the Hermes wrapper.

Agents must not write outside this tree. That means no writes to parent directories, sibling repositories, home directories, temp folders, or system paths. If a requested destination falls outside this approved tree, the agent should refuse and redirect the work to the matching folder under `local-output/`.

Preferred execution path:

- `./hermes-profile/run-local-hermes.sh` starts Hermes inside a dedicated directory under `local-output/runs/` and audits the Atlas bundle before and after execution.
- `./hermes-profile/launch-example.sh --run` delegates to that wrapper automatically.
- the wrapper is a strong repository-local operational guard, but it is not a kernel-level sandbox for the whole machine.

## Validation and Maintenance

Atlas now includes a root validation entrypoint:

- `./smoke-test.sh`

The smoke suite checks:

- YAML manifest parsing.
- roster counts across `config.yaml`, `agents/`, and `newsroom.yaml`.
- skill directory presence.
- README and Hermes-profile README references.
- shell syntax for the main scripts.
- dry-run behavior for installer and wrapper.
- launcher preset coherence across all supported scenarios.

This is the fastest way to confirm that Atlas documentation, routing, and profile structure still agree after changes.

## Bundle Status

- Language: English only.
- Schema mode: portable fallback plus Hermes-native export.
- Intended use: editorial production, technical writing, investigative planning, continuity management, and production-quality code collaboration.
- Runtime posture: repository-local output only, with wrapper-backed auditing for Hermes runs.