# Hermes Workspace Rules

This directory is a local Hermes multi-agent workspace.

## Agents

Core roster:

- `ricercatore`: web research, scraping, source comparison, structured findings.
- `sviluppatore`: code authoring, debugging, implementation planning, tests.
- `revisore`: quality gate, consistency checks, formatting and release readiness.

Specialist roster:

- `storico`: historical context, source criticism, timelines, precedents.
- `economista`: incentives, cost structures, scenario modeling, economic trade-offs.
- `giurista`: compliance framing, legal-risk memos, policy interpretation with caution.
- `statistico`: quantitative validation, inference checks, sampling and experiment design.
- `architetto`: system architecture, trade-off analysis, scalability and boundary decisions.
- `docente`: layered explanations, onboarding, curriculum structure and knowledge transfer.

## Source of truth

- Agent YAML files live in `config/agents/`.
- Prompt files live in `prompts/`.
- Shared memory lives in `runtime/memory/shared_memory.json`.
- Project-local skill definitions live in `skills/catalog.yaml`.

## Operating rules

- Reload config from disk at every command.
- Keep secrets out of tracked YAML files. Use `config/secrets.local.yaml` or environment variables.
- Treat shared memory as durable workspace state.
- When running live through Hermes, prefer concise structured answers with headings and explicit next steps.