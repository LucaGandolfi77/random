# Hermes Profile Export

This directory contains a Hermes-style profile export based on the public `nousresearch/hermes-agent` repository conventions.

## Layout

- `install-profile.sh`
- `show-commands.sh`
- `launch-example.sh`
- `run-local-hermes.sh`
- `atlas-editorial-house/config.yaml`
- `atlas-editorial-house/SOUL.md`
- `atlas-editorial-house/profile.yaml`
- `atlas-editorial-house/skills/creative/atlas-editorial-house/SKILL.md`
- `atlas-editorial-house/skills/creative/atlas-canon-memory/SKILL.md`
- `atlas-editorial-house/skills/creative/atlas-imprints/SKILL.md`
- `atlas-editorial-house/skills/creative/atlas-writers-room/SKILL.md`
- `atlas-editorial-house/skills/creative/atlas-trial-mode/SKILL.md`
- `atlas-editorial-house/skills/creative/atlas-final-review/SKILL.md`

## Intended Destination

The installer copies `atlas-editorial-house/` into:

- `${HERMES_HOME:-~/.hermes}/profiles/atlas-editorial-house/`

## Usage

Recommended flow:

1. Preview the install:

   ```bash
   ./hermes-profile/install-profile.sh --dry-run
   ```

2. Install into the default Hermes location:

   ```bash
   ./hermes-profile/install-profile.sh
   ```

3. Or install into a custom target directory:

   ```bash
   ./hermes-profile/install-profile.sh --target-dir /tmp/atlas-editorial-house-profile
   ```

4. Use `--force` if the target already exists and you want the installer to create a timestamped backup first.
5. Print recommended Hermes commands at any time:

   ```bash
   ./hermes-profile/show-commands.sh
   ```

6. Run the Atlas smoke suite when you want one command to validate manifests, skills, launcher presets, and dry-run behavior:

   ```bash
   ./smoke-test.sh
   ```

7. Run the OpenRouter live smoke when you want to verify a real Hermes-family model on OpenRouter against Atlas:

   ```bash
   ./smoke-test-openrouter.sh --dry-run
   OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh
   OPENROUTER_API_KEY=... ./smoke-test-openrouter.sh --model nousresearch/hermes-4-70b --scenario trial-review
   ```

8. Start the private local control server when you want a web UI for scenarios, custom prompts, job logs, and a Telegram bridge target:

   ```bash
   python3 ./control-panel/server.py
   ```

9. Start the Telegram bridge when you want to control the local Atlas server from Telegram without exposing a public webhook:

   ```bash
   export ATLAS_TELEGRAM_BOT_TOKEN=...your bot token...
   export ATLAS_TELEGRAM_CHAT_ID=...your chat id...
   python3 ./control-panel/telegram_control_bot.py
   ```

10. Print or run ready-to-use example prompts:

   ```bash
   ./hermes-profile/launch-example.sh novel
   ./hermes-profile/launch-example.sh family-saga
   ./hermes-profile/launch-example.sh psychological-novel
   ./hermes-profile/launch-example.sh article
   ./hermes-profile/launch-example.sh institutional-satire
   ./hermes-profile/launch-example.sh investigative-nonfiction
   ./hermes-profile/launch-example.sh trial-review
   ./hermes-profile/launch-example.sh canon-audit
   ./hermes-profile/launch-example.sh testimony-dossier
   ./hermes-profile/launch-example.sh migration-novel
   ./hermes-profile/launch-example.sh essay
   ./hermes-profile/launch-example.sh docs
   ./hermes-profile/launch-example.sh code
   ./hermes-profile/launch-example.sh hybrid
   ./hermes-profile/launch-example.sh novel --translate-it
   ```

11. To execute directly through Hermes when available:

   ```bash
   ./hermes-profile/launch-example.sh novel --run
   ```

12. To start Hermes through the repository-local wrapper:

   ```bash
   ./hermes-profile/run-local-hermes.sh
   ./hermes-profile/run-local-hermes.sh --chat-query "Use the atlas-editorial-house skill and draft a release note."
   ./hermes-profile/run-local-hermes.sh --provider openrouter --model nousresearch/hermes-4-70b --chat-query "Reply with exactly OK"
   ```

Wrapper override knobs:

- `--provider <name>` overrides the Hermes provider for one Atlas run.
- `--model <id>` overrides the model for one Atlas run.
- `--allow-tools` keeps Hermes toolsets enabled even for OpenRouter single-query runs.
- `ATLAS_HERMES_PROVIDER` overrides the Atlas wrapper provider default. If unset, Atlas defaults to `openrouter`.
- `ATLAS_HERMES_MODEL` overrides the Atlas wrapper model default. If unset, Atlas defaults to `ATLAS_OPENROUTER_MODEL`.
- `ATLAS_OPENROUTER_MODEL` overrides the preferred OpenRouter model for Atlas wrapper runs and the OpenRouter smoke script. If unset, Atlas defaults to `nousresearch/hermes-4-70b`.

Wrapper resolution order:

1. explicit `--provider` and `--model` flags.
2. `ATLAS_HERMES_PROVIDER`, `ATLAS_HERMES_MODEL`, and `ATLAS_OPENROUTER_MODEL`.
3. Atlas project defaults: `ATLAS_HERMES_PROVIDER=openrouter`, `ATLAS_OPENROUTER_MODEL=nousresearch/hermes-4-70b`, and `ATLAS_HERMES_MODEL=$ATLAS_OPENROUTER_MODEL`.
4. Hermes global config in `${HERMES_HOME:-~/.hermes}/config.yaml` is only a secondary fallback when you intentionally override Atlas defaults.

OpenRouter single-query compatibility:

- when Atlas resolves to `provider=openrouter` for `--chat-query` or `chat -q ...`, the wrapper defaults to a text-only mode.
- that mode creates a temporary `HERMES_HOME`, reuses the installed profiles and secrets, and writes a temporary config with `agent.disabled_toolsets: ["*"]`.
- the goal is to avoid OpenRouter 404 failures on models or routed providers that do not support tool use.
- if you know your selected OpenRouter provider supports tools and you want normal tool calling, pass `--allow-tools`.

After installing the profile:

1. Start Hermes using that profile.
2. Use the default `SOUL.md` to keep the newsroom identity active.
3. Switch individual literary agents with commands like:
   - `/personality shakespeare`
   - `/personality austen`
   - `/personality dostoevsky`
   - `/personality allende`
   - `/personality shelley`
   - `/personality borges`
4. Invoke the newsroom skill for general routing and output behavior.
5. Invoke the writers' room skill when you want explicit lead, reviewer, finisher, handoff, and arbitration planning before drafting.
6. Invoke the final review skill when you want a dedicated shipment gate with severity triage and an explicit ship/no-ship decision.

The expanded roster now includes additional Russian, modern/contemporary, and South American voices such as Dostoevsky, Bulgakov, Allende, Garcia Marquez, Cortazar, Lispector, and Bolano.
It now also includes non-South-American contemporary and late-modern voices such as Toni Morrison, Ursula K. Le Guin, Chinua Achebe, and Kenzaburo Oe.
It also includes operational non-author roles such as Fact Prosecutor, Defense Editor, Trial Judge, Copy Chief, Legal Reviewer, Audience Editor, and Continuity Archivist.
The global contemporary wave now also adds Svetlana Alexievich, Olga Tokarczuk, Elena Ferrante, Arundhati Roy, Abdulrazak Gurnah, and Han Kang.

## Notes

- Hermes appears to support named personalities in `config.yaml` under `agent.personalities`.
- Hermes appears to support a profile-local `SOUL.md` for the default persona overlay.
- Hermes appears to support profile-local `skills/` directories.

The installer is conservative:

- it fails if the source bundle is missing
- it refuses to overwrite an existing target unless `--force` is supplied
- with `--force`, it creates a timestamped backup before replacing the profile

The command helper is informative only:

- it prints suggested Hermes commands and example prompts
- it does not modify files
- it can print either the full cheat sheet or a filtered section

The profile now includes an imprint-routing skill:

- `atlas-imprints` chooses between house imprints such as Atlas Noir, Atlas Civic, Atlas Lab, Atlas Heresy, and Atlas Sunday Review
- each imprint has its own default tone, routing defaults, and suitable deliverables
- use it when you want publication posture and editorial line decided before drafting

The profile now also includes a trial skill:

- `atlas-trial-mode` runs an adversarial publication review with prosecution, defense, legal scrutiny, and a judge's verdict
- use it when the draft is politically sensitive, legally exposed, or too important for a single-pass final review

The profile now also includes a canon skill:

- `atlas-canon-memory` maintains a living canon ledger and a cemetery of cut material for recurring projects
- use it when a world, institution, or versioned system must remember what is stable and what was deliberately removed

The runtime wrapper is the preferred execution path for local work:

- it starts Hermes from a dedicated session directory under `local-output/runs/`
- it exports the approved local-output paths to the process environment
- it can inject provider and model defaults so Atlas runs do not depend on an implicit global shell state
- it can switch OpenRouter single-query runs into a text-only compatibility mode when tool use is unavailable
- for non-interactive `chat -q` style runs, it persists the Hermes transcript under the session directory as `hermes-chat-output.txt` even when the model does not write a deliverable file on its own
- it audits the Atlas bundle before and after execution and reports writes outside `local-output/`
- it strengthens local repository discipline, but it is not a full operating-system sandbox

The OpenRouter smoke script is the preferred live provider check:

- it verifies direct OpenRouter reachability first
- it then verifies Hermes plus the installed Atlas profile against the same model
- it stores prompts, raw API output, Hermes output, and a summary under `local-output/reviews/`

The control panel is the preferred local GUI:

- it stays on loopback only
- it previews launcher scenarios using the existing Atlas scripts
- it executes runs only through `run-local-hermes.sh`
- it writes job artifacts under `local-output/reviews/control-panel/`

The Telegram bridge is the preferred remote control path:

- it polls Telegram instead of exposing a webhook
- it can be restricted to one chat id
- it forwards commands to the private local control server rather than calling Hermes directly

The launcher supports both safe preview and direct execution:

- by default it prints the selected example prompt and the corresponding `./hermes-profile/run-local-hermes.sh --chat-query ...` command
- with `--run` it executes through `run-local-hermes.sh` if `hermes` is installed
- with `--translate-it` it appends a final Italian translation step that asks for a faithful, modern rendering by translation/interpreting standards
- it currently includes ready prompts for `novel`, `family-saga`, `psychological-novel`, `article`, `institutional-satire`, `investigative-nonfiction`, `trial-review`, `canon-audit`, `testimony-dossier`, `migration-novel`, `essay`, `docs`, `code`, and `hybrid`

This export follows those conventions conservatively.