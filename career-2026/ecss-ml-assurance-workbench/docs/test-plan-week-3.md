# Test plan — week 3

## Backend (pytest)

`backend/tests/test_portfolio_week3.py` + pre-existing suites. Coverage:

- idempotent import of the four projects (no duplicates on re-seed);
- requirement creation and requirement→test→evidence links;
- verdict counts (PASS only with explicit result rows);
- uncovered requirements detection (`reqs_no_test`/`reqs_no_evidence`, failed-test flags);
- completeness before/after package generation (integrity_manifest MISSING→COMPLETE);
- SEU profile: silent-data-corruption FAIL + NOT_ACCEPTABLE risk + NO_GO decision;
- decision/risk/test consistency for every project (no GO with failed tests or NOT_ACCEPTABLE risk);
- evidence attachment existence and SHA-256 match;
- package layout (manifest, checksums, CSVs, subfolders), manifest/zip parity;
- immutable package versions (two generations, history, no overwrite);
- integrity: VALID → tamper (member modified + manifest rewritten) → HASH_MISMATCH;
- audit events (PROJECT_IMPORTED, EVIDENCE_PACKAGE_GENERATED/VERIFIED/DOWNLOADED).

Run: `make test-backend` or `cd backend && .venv/bin/python -m pytest tests -q`.

## Frontend (vitest)

- portfolio list rendering with decisions and P/F/B/NE counts;
- project detail: requirements table, risk, deployment decision, failed-test filter.

Run: `make test-frontend` / `cd frontend && npm test`.

## End-to-end (Playwright, stack running)

`frontend/e2e/portfolio-flows.spec.ts` implements the three flows (TAD generate/verify/download,
SEU NO_GO/silent corruption, LLS ODD/FMEA/limitations). Run: `make e2e`.

## Quality gates

ruff, mypy, eslint, `tsc`, production build — see README commands.
