# Test plan (week 1)

## 1. Strategy

Three layers, all runnable with documented commands:

| Layer | Tool | Location |
|---|---|---|
| Backend unit/API | pytest (+ FastAPI TestClient) | `backend/tests` |
| Frontend unit | Vitest + React Testing Library | `frontend/src/**/__tests__` |
| End-to-end | Playwright (chromium) | `frontend/e2e` |

## 2. Backend coverage (29 tests)

- **Projects/datasets**: create; list/get/update/version bump; upload valid CSV + preview; reject bad
  extension/MIME; filename sanitization + no-overwrite; reject empty & corrupt CSV; size limit;
  dataset delete; **persistence across restart** (same DB file + storage dir).
- **Analyzers**: missing values; duplicates; constant column; IQR outliers; type-incompatible tokens;
  imbalanced categorical target; target quality not evaluated without target; irregular timestamps +
  suspicious gaps; leakage heuristics (identical column → FAIL, unique-id-like column); findings
  filtering by status/severity/column and text search.
- **Score & reports**: score deterministic across runs; explainable categories + coverage <100%;
  report JSON structure/schema/disclaimer; deterministic report modulo report_id and timestamp;
  audit log populated (no dataset rows in events); health + structured 404; analysis without dataset
  → 409; config validation rejects unknown column.
- **E2E flow**: create → upload degraded CSV → set target/timestamp → analyse → findings → report → audit.

Run: `cd backend && make test` (see repo Makefile) or directly `.venv/bin/python -m pytest tests -q`.

## 3. Frontend coverage (7 tests)

- Projects page renders and opens create modal.
- Project creation POSTs the correct payload.
- Data Readiness: empty state without dataset.
- Data Readiness: score + findings rendered for a completed run.
- API failure surfaces an error state.
- FindingsExplorer: empty state without a run.
- FindingsExplorer: rows render and severity filter narrows the table.

Run: `cd frontend && npm test` (or `make test-frontend`).

## 4. End-to-end (Playwright)

`frontend/e2e/main-flow.spec.ts` walks the acceptance path against the dockerized stack:

1. create project; 2. upload `sample-data/degraded_telemetry.csv`; 3. configure target column;
4. run analysis; 5. verify findings (Duplicate rows, missing bus_voltage); 6. export JSON report.

Prerequisites: `docker compose up --build -d`, then `cd frontend && npx playwright install chromium`.
Run: `make e2e` (or `npm run test:e2e`).

## 5. Quality gates

| Gate | Command |
|---|---|
| Backend lint | `ruff check app tests` |
| Backend types | `mypy app` |
| Frontend lint | `npm run lint` |
| Frontend types | `npm run typecheck` |
| Full gates | `make lint`, `make test` |
