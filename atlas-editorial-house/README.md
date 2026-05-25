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

- 36 named personalities.
- 23 literary-inspired writer/editor roles.
- 7 operational newsroom roles.
- 6 additional global-contemporary literary roles.
- 6 profile-local skills.
- 14 ready launcher scenarios.
- 5 editorial imprints.
- a guarded wrapper and a root smoke suite.

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

- `config.yaml` with named personalities for the 36 Atlas personalities, including literary and operational roles.
- `SOUL.md` with the default newsroom-level conductor persona.
- `profile.yaml` with profile metadata.

Skill files:

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

- `./hermes-profile/show-commands.sh`: prints recommended Hermes commands for installing the profile, switching personalities, and using the six Atlas skills.
- `./hermes-profile/run-local-hermes.sh`: starts Hermes from a dedicated session directory under `local-output/runs/` and performs a post-run repository audit.
- `./hermes-profile/launch-example.sh`: prints ready-to-use Atlas prompts for predefined scenarios and can run them through the wrapper.
- `./smoke-test.sh`: validates roster counts, skill directories, launcher presets, README references, and wrapper/install dry-run behavior in one pass.

Atlas also supports a final translation step:

- add `--translate-it` to `./hermes-profile/launch-example.sh` when you want the main output in English plus a final faithful Italian translation in modern language.

## Skill Catalog

These six skills are the conceptual core of the Hermes-native profile:

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

## Agent Catalog

Atlas currently includes 36 named personalities. The list below gives a brief description of each agent and the kind of work each one is best suited for.

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