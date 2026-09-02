# Deployment guide (v0.6.0)

Build/start: `docker compose up --build` → UI http://localhost:8080, API health `/api/health`.
Env reference: `.env.example` (no secrets). Output directories: `backend/storage/`
(assurance-reports, portfolio/packages, portfolio/evidence) — always under `/career-2026` in dev;
container uses the project `workbench-data` volume. Persistence: SQLite + files in the volume.

Deployment checklist: build success · tests success · secret configuration · output directories ·
file permissions · health endpoint · monitoring (health/logs) · backup of volume · rollback (previous
image) · security review · accessibility review · package generation + validation. No automatic remote
deployment is configured; no credentials are included.
