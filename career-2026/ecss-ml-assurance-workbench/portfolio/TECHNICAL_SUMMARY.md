# Technical summary (one page)

Stack: FastAPI + SQLAlchemy/SQLite backend; React + TypeScript + Vite frontend; Docker Compose;
pytest/vitest/Playwright. Domain: normalized `portfolio_*` model (projects, requirements, evidence,
test cases/results, risks, FMEA, limitations, decisions, monitoring/ODD/model/data JSON documents),
idempotent importer from versioned synthetic data, assurance engine (deterministic gap rules,
bidirectional traceability issues, 15 separated dimensions, deployment gate, monitoring readiness),
Assurance Review Report (Markdown/JSON), Evidence Package ZIP generator with manifest + SHA-256 and
full validator, audit log. Security: storage root enforcement, zip-member validation, safe filenames.
Testing: 60+ backend tests (incl. engine/package/security), 17 frontend tests, 7 E2E flows.
