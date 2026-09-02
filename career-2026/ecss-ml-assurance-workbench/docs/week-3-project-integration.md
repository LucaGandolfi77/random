# Week 3 — project integration

## 1. Goal

Four demonstration projects are integrated into the Workbench as full portfolio projects (not static
cards): Telemetry Anomaly Detector (`PRJ-TAD-001`), Onboard Vision Quantization Lab (`PRJ-QNT-001`),
SEU Fault Injector (`PRJ-SEU-001`), Lunar Landing Safety Cage (`PRJ-LLS-001`).

Every project shares the same normalized model and exposes requirements, evidence, test cases with
verdicts, FMEA, residual risks, limitations, a motivated deployment decision, a monitoring strategy, an
ODD, a model card and a data-quality report — and produces a versioned, downloadable, verifiable
**Evidence Package**.

All portfolio content is **synthetic demonstration data**, clearly marked. Nothing claims ECSS
certification.

## 2. Architecture decision

The week-3 portfolio uses dedicated tables (`portfolio_*`) rather than reusing week-1 analysis tables or
the week-2 assurance registry. Reasons:

- no destructive migration of existing tables (SQLAlchemy `create_all` only adds new tables);
- week-1 (dataset analysis) and week-2 (import registry of absent projects) remain untouched and their
  test suites still pass;
- the portfolio payload is document-centric (JSON content blocks) and package-oriented.

## 3. Data model (backend `app/portfolio/models.py`)

| Table | Entity |
|---|---|
| `portfolio_projects` | project metadata, lifecycle/assurance statuses, versions |
| `portfolio_requirements` | REQ rows (category, priority, verification method, status, links) |
| `portfolio_evidence` | EVID rows (type, source, optional attachment + SHA-256) |
| `portfolio_test_cases` | TEST definitions |
| `portfolio_test_results` | RUN rows with verdict (PASS/FAIL/BLOCKED/NOT_EXECUTED/INCONCLUSIVE/NA) |
| `portfolio_risks` | residual risks (initial/residual S×L and risk levels, acceptance) |
| `portfolio_limitations` | LIM rows with status |
| `portfolio_fmea_items` | FMEA items (S/O/D, residual risk, links) |
| `portfolio_deployment_decisions` | decision history (GO/CONDITIONAL_GO/NO_GO/DEFERRED/REVIEW_REQUIRED) |
| `portfolio_packages` | generated evidence packages (immutable) |
| `portfolio_model_cards` / `portfolio_data_quality` / `portfolio_odd` / `portfolio_monitoring` | 1:1 JSON documents |

Stable ids: `PRJ-*` per project, `REQ-*`, `TEST-*`, `RUN-*`, `EVID-*`, `RISK-*`, `FM-*`, `LIM-*`,
`DEC-*`.

## 4. Seed

`backend/app/portfolio/datadefs/` contains the four projects as Python data. Import is idempotent:
stable project version stored vs. seed version decides whether children are replaced (inside one
transaction). Evidence attachments are written to `storage/portfolio/evidence/<slug>/` with SHA-256.
Commands: auto-run at startup + `make seed-week3` (container) or
`python -m app.scripts.seed_week3`.

## 5. Honest results principle

- A test is PASS only when an explicit Test Result row with verdict PASS exists.
- Every project has at least two non-PASS verdicts; SEU has a FAIL (`TEST-SEU-008`, silent data
  corruption) and a NOT_EXECUTED (target overhead).
- Zero registered tests would be displayed as zero, never as passed.
- Deployment decision is explicit and coherent with data (no GO with failed blocking tests or
  NOT_ACCEPTABLE risks — enforced by consistency tests).
- Risk acceptance and risk levels follow `docs/residual-risk-method.md`.

## 6. API

All endpoints under `/api/portfolio` (typed JSON, structured errors). See `docs/api.md`.

## 7. UI

- `/portfolio` — portfolio table with filters (decision, issues-only) and comparison columns.
- `/portfolio/{id}` — detail page with sections: Overview, Requirements (filters + coverage gaps),
  Evidence, Data Quality, ODD (coverage chips), Tests (verdict filter incl. Failed), FMEA, Residual
  Risk, Limitations, Deployment (decision card + non-binding reviewer checklist), Monitoring,
  Evidence Package (completeness, history, generate/download/verify).
- `/projects` top navigation links to the portfolio; `WorkspaceNav` hosts all workspace-level pages.
