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

7. Print or run ready-to-use example prompts:

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

8. To execute directly through Hermes when available:

   ```bash
   ./hermes-profile/launch-example.sh novel --run
   ```

9. To start Hermes through the repository-local wrapper:

   ```bash
   ./hermes-profile/run-local-hermes.sh
   ./hermes-profile/run-local-hermes.sh --chat-query "Use the atlas-editorial-house skill and draft a release note."
   ```

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
- it audits the Atlas bundle before and after execution and reports writes outside `local-output/`
- it strengthens local repository discipline, but it is not a full operating-system sandbox

The launcher supports both safe preview and direct execution:

- by default it prints the selected example prompt and the corresponding `./hermes-profile/run-local-hermes.sh --chat-query ...` command
- with `--run` it executes through `run-local-hermes.sh` if `hermes` is installed
- with `--translate-it` it appends a final Italian translation step that asks for a faithful, modern rendering by translation/interpreting standards
- it currently includes ready prompts for `novel`, `family-saga`, `psychological-novel`, `article`, `institutional-satire`, `investigative-nonfiction`, `trial-review`, `canon-audit`, `testimony-dossier`, `migration-novel`, `essay`, `docs`, `code`, and `hybrid`

This export follows those conventions conservatively.