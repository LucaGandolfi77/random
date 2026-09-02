# Architecture

## 1. Overview

Week 1 ships an executable monorepo with two services plus tooling:

```
┌────────────────────────────┐        ┌─────────────────────────────┐
│  frontend (React + Vite)   │  HTTP  │  backend (FastAPI)          │
│  nginx static + /api proxy │ ─────► │  REST /api  ·  analyzers    │
└────────────────────────────┘        │  score      ·  reports      │
                                      │  SQLAlchemy · SQLite        │
                                      └──────────────┬──────────────┘
                                     volume /data    │
                                     ┌───────────────▼─────────────┐
                                     │  SQLite DB + uploaded files │
                                     └─────────────────────────────┘
```

- The browser talks to a single origin (`:8080`); nginx proxies `/api` to the backend.
- SQLite file and uploaded dataset files live in the Docker volume `workbench-data` mounted at `/data`.

## 2. Backend layout (`backend/app`)

| Module | Responsibility |
|---|---|
| `api/routes` | Thin HTTP layer: parsing, auth-free structured errors, serialization. |
| `api/deps.py`, `api/errors.py`, `api/serializers.py` | Dependency injection, error contract, ORM→schema mapping. |
| `core` | Config from env, JSON logging, version constants. |
| `database` | Engine/session and table bootstrap. |
| `models` | SQLAlchemy ORM: `Project`, `AnalysisConfig`, `Dataset`, `AnalysisRun`, `Finding`, `ScoreResult`, `AuditEvent`, `Report`. |
| `schemas` | Pydantic request/response models and shared enums. |
| `repositories` | Small data-access helpers (queries by id/status). |
| `analyzers` | Deterministic, pure dataset checks + the score engine. |
| `services` | Orchestration: project lifecycle, secure file storage, dataset parsing, analysis runner, audit log. |
| `reports` | Versioned JSON report assembly (deterministic). |
| `scripts` | Deterministic sample-data generator. |

Layering rule: routes → services → (repositories + storage) → ORM; analyzers are pure functions over an
`AnalysisContext` and never touch the database or the API.

## 3. Analysis pipeline (synchronous in week 1)

1. `DataReadinessService.run()` loads the stored CSV, builds an `AnalysisContext` (DataFrame + per-column profiles + config).
2. The fixed registry (`analyzers/registry.py`) executes each check module in order.
3. Results are normalized to `CheckResult` and persisted as `Finding` rows.
4. `analyzers/score.py` computes the Data Readiness Score (see methodology doc).
5. Project status and audit events are updated.

The orchestration is isolated in one service so that week ≥2 can move step 2–4 to a worker without touching
routes or analyzers.

## 4. Storage rules

- Uploaded bytes are streamed to a temp file while enforcing the size limit; SHA-256 is computed in the same pass.
- Files are stored as `<uuid>.csv` under `storage/datasets` — original names are **display-only** and sanitized.
- Reports are written to `storage/reports` as `<report_id>.json` and mirrored in the DB for serving.

## 5. Frontend layout (`frontend/src`)

| Module | Responsibility |
|---|---|
| `api` | fetch client + typed endpoint map + error normalization. |
| `hooks` | TanStack Query hooks: aggregated per-project data, findings filters, mutations with toast + invalidation. |
| `components/ui` | Button, Card, Modal, Toast, chips, feedback (spinner/error/empty), tooltip term. |
| `components/features` | FindingsExplorer (filters/table/detail), ScorePanel (bars/table/disclaimer). |
| `layouts` | Project shell: top bar, responsive sidebar (drawer on mobile), disabled future modules. |
| `pages` | Projects, Overview, Project Information, Dataset, Data Readiness, Findings, Reports, Settings, Coming soon. |
| `types` | Mirrors of the backend Pydantic schemas. |
| `utils` | Formatting helpers, shared constants. |

Routes are declared in `App.tsx`; state is server-driven through React Query (no local duplicate store).

## 6. Future-proofing

The UI lists ODD, Model Verification, Robustness, OOD, FMEA, Safety Cage and Runtime Monitoring as disabled
modules. The sidebar, router and layout are ready for them; no fake implementations exist. The analysis
runner is intentionally isolated to allow an async job queue later.
