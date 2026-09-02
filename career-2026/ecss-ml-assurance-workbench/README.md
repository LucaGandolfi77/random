# ECSS ML Assurance Workbench — Week 1

An engineering support platform for the verification, traceability and assurance of **datasets and ML
components** intended for embedded and aerospace applications.

> ⚠️ **Disclaimer**: this is a **decision-support / engineering demonstration tool**. It does **not**
> certify ECSS compliance, does not emit certifications and must not be presented as an official
> classification. It is inspired by ML verification, data assurance, traceability and risk-based testing
> principles.

Week 1 delivers a fully executable MVP with one complete module: the **Data Readiness Inspector**.

![Screenshot placeholder — replace with an actual capture of the Overview dashboard]
*Screenshot placeholder (not a real capture): project Overview dashboard.*

![Screenshot placeholder — replace with an actual capture of the Data Readiness view]
*Screenshot placeholder (not a real capture): Data Readiness score + findings.*

## 1. What you can do (week 1)

Create an assurance project → upload a CSV dataset → automatic quality checks → dashboard with
explainable Data Readiness Score → filterable findings → versioned JSON report → everything persists.

End-to-end path: **Create project → upload CSV → analysis → dashboard → JSON report.**

Checks cover: structure, completeness, duplicates, numeric/categorical statistics, optional target
(balance/outliers), optional timestamp (ordering/intervals/gaps/coverage) and **explicitly heuristic**
leakage indicators. Each result has status, severity, evidence, risk and recommendation.

## 2. Repository layout

```
ecss-ml-assurance-workbench/
├── backend/            FastAPI app (app/, tests/, Dockerfile, requirements)
├── frontend/           React + TS + Vite app (src/, tests, e2e, Dockerfile)
├── sample-data/        3 synthetic deterministic CSV datasets
├── storage/            local runtime storage placeholder (git-ignored content)
├── docs/               architecture, methodology, API, test plan, limitations
├── docker-compose.yml
├── Makefile
├── .env.example
├── .gitignore
└── README.md
```

More details: [docs/architecture.md](docs/architecture.md).

## 3. Prerequisites

- Docker ≥ 24 with Docker Compose v2
- Make (optional, all commands work with plain docker compose)
- A browser (desktop or mobile)

## 4. Quick start

```bash
cp .env.example .env          # optional — defaults are fine
docker compose up --build     # or: make up (detached)
```

Then open:

- UI: **http://localhost:8080**
- API docs (OpenAPI): http://localhost:8080/docs

Try it immediately with the degraded sample:

```bash
make seed                     # regenerates sample-data/*.csv (deterministic)
# then upload sample-data/degraded_telemetry.csv in the UI
```

## 5. Makefile commands

| Command | Description |
|---|---|
| `make up` | Build & start both services (detached) |
| `make down` | Stop services (keeps data volume) |
| `make build` | Build images |
| `make logs` / `make ps` | Logs / status |
| `make seed` | Regenerate sample datasets |
| `make test` | Backend + frontend unit tests (dockerized) |
| `make test-backend` | pytest suite |
| `make test-frontend` | vitest suite |
| `make lint` | ruff + mypy + eslint + tsc |
| `make e2e` | Playwright E2E (stack must be up) |
| `make clean` | Stop, remove volumes and local artifacts |

## 6. Running tests

Backend (pytest, isolated tmp DB + storage per test):

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest tests -q
```

Frontend (vitest):

```bash
cd frontend
npm ci
npm test
npm run lint && npm run typecheck && npm run build
```

E2E (needs the stack running):

```bash
docker compose up --build -d
cd frontend && npx playwright install chromium
npm run test:e2e            # or make e2e
```

## 7. Main APIs

| Area | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Projects | `POST/GET/PATCH/DELETE /api/projects…` |
| Dataset | `POST /api/projects/{id}/datasets`, `GET …/dataset`, `GET …/preview`, `DELETE …/dataset` |
| Config | `GET/PUT /api/projects/{id}/config` |
| Analysis | `POST /api/projects/{id}/analysis`, `GET …/analysis/latest`, `GET /api/analysis/{run}/findings`, `GET …/score` |
| Reports | `POST /api/analysis/{run}/report`, `GET /api/projects/{id}/reports`, `GET /api/reports/{id}[/download]` |
| Audit | `GET /api/audit`, `GET /api/projects/{id}/audit` |

Full reference: [docs/api.md](docs/api.md).

## 8. The Data Readiness Score

- Range 0–100, deterministic and reproducible for identical inputs.
- Eight categories: Structure, Completeness, Consistency, Duplicates, Statistical Quality, Target Quality,
  Time Quality, Traceability (each weighted; un-evaluated categories never receive points).
- The UI shows the overall score, per-category scores, weights, PASS/WARNING/FAIL counts and **score
  coverage**.
- Every view displays: *“The Data Readiness Score is a decision-support indicator. It does not replace
  engineering review, mission-specific validation, safety analysis or formal certification.”*

Methodology and penalties: [docs/data-readiness-methodology.md](docs/data-readiness-methodology.md).

## 9. Sample datasets (`sample-data/`)

All synthetic, generated with fixed seeds (regenerate with `make seed`):

| File | Content |
|---|---|
| `nominal_telemetry.csv` | Clean telemetry (3000 rows, 8 cols) — mostly PASS. |
| `degraded_telemetry.csv` | Missing values, duplicates, outliers, type-error tokens, irregular timestamps, constant column, imbalanced target (1200+ rows). |
| `leakage_example.csv` | Feature identical to the target, name-similar column and unique row IDs — heuristic leakage indicators. |

## 10. Roadmap

| Iteration | Focus |
|---|---|
| Week 1 | Data Readiness Inspector + project/data/report persistence (this MVP) |
| Week 2 | Operational Design Domain and scenario coverage |
| Week 3 | Model registry, metrics and model verification |
| Week 4 | Robustness, noise injection, OOD testing |
| Week 5 | FMEA/FMECA and failure propagation |
| Week 6 | Safety cage and runtime monitoring |

Future modules appear in the UI as disabled “planned” entries; there are no fake implementations.

## 11. Security (MVP scope)

- Server-side size/extension/MIME validation; sanitized display names; server-generated storage names;
  no path traversal surface; content never executed.
- No authentication — keep the stack on a trusted network (see known limitations).
- CORS configurable (`CORS_ORIGINS`); containers run non-root where possible; pinned dependencies;
  logs/audit never contain dataset rows.

Full list: [docs/known-limitations.md](docs/known-limitations.md).

## 12. Week 2 proposal

1. **ODD editor** bound to datasets (operational context, environmental ranges, scenario variables).
2. Scenario coverage vs. ODD with per-condition PASS/WARNING.
3. Move analysis execution behind a background task (small job table) to support large datasets.
4. Persistent report storage review (checksum + retention) and CSV exports of findings.
5. Extend the score model with an ODD/scenario category and per-condition evidence.

## License

MIT — see [LICENSE](LICENSE). This is an engineering support tool; it carries no certification claim.

## Documentation templates

The repository workspace also ships a reusable set of ECSS-informed (not ECSS-certified) Markdown templates
for documenting ML projects: Project Charter, ODD, Data Readiness Review, Model Card, Test Plan, FMEA and
Assurance Case.

See [`../templates/ml-assurance/`](../templates/ml-assurance/README.md) — including a non-destructive
initialization script (`scripts/init_project.py`).

## Assurance registry & evidence packages

The Workbench tracks external ML projects (Telemetry Anomaly Detector, Onboard Vision Quantization Lab,
SEU Fault Injector, Lunar Landing Safety Cage) in an assurance registry with honest availability states
(`Not Available`, `Not Executed`, `Decision Pending`, …). UI at `/assurance`. Each project can export a
ZIP **evidence package** (summary, model card, data quality report, ODD, test results, FMEA, deployment
report, monitoring strategy, evidence index, manifest).

The four projects are currently **not present** in this repository — the registry represents gaps
explicitly and never invents metrics, tests or decisions. See
[`docs/assurance-registry.md`](docs/assurance-registry.md).

## Week 3 — Integrated demo portfolio

Four synthetic demonstration projects (UI `/portfolio`): Telemetry Anomaly Detector, Onboard Vision
Quantization Lab, SEU Fault Injector, Lunar Landing Safety Cage. Each exposes requirements, evidence,
test results (PASS/FAIL/BLOCKED/NOT_EXECUTED), FMEA, residual risks, limitations, deployment decision,
monitoring strategy, ODD, model card and data quality — and can generate versioned **Evidence Package
ZIPs** with manifest + SHA-256 checksums and integrity verification. Idempotent import:
`make seed-week3`. Docs: `docs/week-3-project-integration.md`, `docs/evidence-package-schema.md`,
`docs/traceability-model.md`, `docs/deployment-decision-method.md`, `docs/residual-risk-method.md`,
`docs/security-evidence-package.md`, `docs/test-plan-week-3.md`.

## Week 4 — Professional launch

The repository also contains a public engineering portfolio (UI `/`, `/expertise`, `/site-projects`,
`/flagship`, `/publications`, `/cv`, `/workbench`, `/contact`) presenting the owner as **Embedded AI &
ML Verification Engineer for Space Systems**, linking the Workbench (weeks 1–3) and the evidence
packages. Centralized profile `frontend/src/content/profile.json`; editorial system
`frontend/src/content/publications/*.json`; content validation `npm run validate:content`; SEO
metadata with configurable `VITE_SITE_URL`; robots + optional sitemap generated at build; print-friendly
CV. Docs: `docs/week-4-professional-launch.md`, `docs/portfolio-content-architecture.md`,
`docs/cv-maintenance.md`, `docs/publication-workflow.md`, `docs/deployment-guide.md`,
`docs/seo-and-metadata.md`, `docs/accessibility-review.md`, `docs/security-review.md`,
`docs/release-checklist.md`, `docs/test-plan-week-4.md`.


## Week 5 — Assurance engine

Adds the Assurance Gap Analyzer, Traceability Validator, 15 separated Assurance Dimensions, an explicit
Deployment Readiness Gate (recommendation distinct from the official human decision; inconsistencies
reported, never auto-fixed), monitoring readiness normalizer, Assurance Review Report generation and a
full Evidence Package validator.

```bash
# API examples
curl http://localhost:8080/api/assurance-engine/projects/PRJ-SEU-001/gaps
curl http://localhost:8080/api/assurance-engine/projects/PRJ-SEU-001/deployment-gate
curl -X POST http://localhost:8080/api/assurance-engine/projects/PRJ-TAD-001/assurance-report
curl -X POST http://localhost:8080/api/assurance-engine/evidence-packages/<pkg-id>/validate
```

UI: open a project in `/portfolio/{id}` → “Assurance analysis (week 5)”. Rules are documented in
`docs/ASSURANCE_RULES.md`; gate, monitoring, package validation and implementation notes in
`docs/DEPLOYMENT_GATE.md`, `docs/MONITORING_GUIDE.md`, `docs/PACKAGE_VALIDATION.md`,
`docs/WEEK_5_IMPLEMENTATION_REPORT.md`. Reports are written to the storage directory
(`storage/assurance-reports/`, always inside `/career-2026`).

## Week 6 — Portfolio-ready demonstration (v0.6.0)

Workbench landing (`/workbench`) with capabilities and **Start Guided Demo** (no new dependency),
case-study sections per project ("what this demonstrates / remains unverified / not a certification
claim"), root-enforcement script, demo-reset command, CHANGELOG + release notes (v0.6.0), ADRs,
deployment/performance/security reviews, portfolio materials (`portfolio/`), screenshot automation
(`npm run screenshots` → `portfolio/screenshots/`), CI proposal (`.github/workflows/ci.yml`) and the
Final Assurance Review (`assurance-reports/workbench-final-assurance-review.md`).

```bash
python3 -m app.scripts.check_root          # root enforcement (inside backend dir or repo root)
python3 -m app.scripts.reset_demo --reset-portfolio   # safe reset of synthetic demo data (backend dir)
cd frontend && npm run screenshots         # capture portfolio screenshots (stack running)
```

Documentation index: `docs/PORTFOLIO_READINESS.md`, `docs/ARCHITECTURE_WEEK6.md`, `docs/adr/`,
`docs/DEPLOYMENT_GUIDE.md`, `docs/PERFORMANCE.md`, `docs/SECURITY_REVIEW.md`,
`docs/releases/v0.6.0.md`, `CHANGELOG.md`.

## Week 7 — Continuous Assurance prototype (v0.7.0)

Backend: CI result ingestion (JUnit XML / JSON summary; idempotent by SHA-256, `Already Imported`,
size/test limits, no external-entity parsing), immutable assurance snapshots, baseline comparison,
deterministic regression rules (`Threshold Not Defined` handling), Action Register (CSV export, issue
drafts), reproducibility records, Technical Review Pack ZIP, SBOM-style inventory, Project Adapter SDK
(schema + synthetic example), `validate-project` CLI, evidence provenance fields.

```bash
# backend dir examples
curl -F "source_type=junit-xml" -F "file=@results.xml" \
  http://localhost:8080/api/continuous/projects/PRJ-TAD-001/ingest
curl -X POST http://localhost:8080/api/continuous/projects/PRJ-TAD-001/snapshots -H 'Content-Type: application/json' -d '{"reason":"baseline"}'
curl -X POST http://localhost:8080/api/continuous/snapshots/compare -H 'Content-Type: application/json' -d '{"baseline_a":"...","baseline_b":"..."}'
curl -X POST http://localhost:8080/api/continuous/projects/PRJ-SEU-001/review-pack
python3 -m app.scripts.validate_project ../sdk/project-adapter/example/manifest.json
```

Docs: docs/WEEK_7_IMPLEMENTATION_REPORT.md, docs/SUPPLY_CHAIN.md, docs/releases/v0.7.0.md, security/sbom.json.
