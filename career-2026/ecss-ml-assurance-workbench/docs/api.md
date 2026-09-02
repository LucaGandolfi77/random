# API reference (week 1)

Base URL: `/api` (proxied by nginx on `:8080`; direct backend on `:8000`).
Interactive docs: `http://localhost:8080/docs` (or `:8000/docs`).

All responses are JSON. Errors use a stable envelope:

```json
{ "code": "NOT_FOUND", "message": "Project not found.", "details": null }
```

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service status: version, environment, DB probe. |

## Projects

| Method | Path | Description |
|---|---|---|
| POST | `/projects` | Create project (UUID, version=1, status=Draft). |
| GET | `/projects` | List projects (latest first). |
| GET | `/projects/{id}` | Project detail incl. `has_dataset` and latest run. |
| PATCH | `/projects/{id}` | Update fields or status (bumps version). |
| DELETE | `/projects/{id}` | Delete project + dataset file + history. |

## Datasets

| Method | Path | Description |
|---|---|---|
| POST | `/projects/{id}/datasets` | Upload CSV (multipart `file`). 201 → dataset metadata incl. SHA-256. |
| GET | `/projects/{id}/dataset` | Current dataset metadata + column types. 404 `NO_DATASET` if none. |
| GET | `/projects/{id}/dataset/preview?limit=` | First N rows (max 500) as JSON-safe values. |
| DELETE | `/projects/{id}/dataset` | Delete current dataset file. |

Upload errors: `INVALID_EXTENSION`, `INVALID_CONTENT_TYPE`, `FILE_TOO_LARGE`, `EMPTY_DATASET`,
`INVALID_CSV`, `TOO_MANY_COLUMNS`.

## Analysis configuration

| Method | Path | Description |
|---|---|---|
| GET | `/projects/{id}/config` | Current thresholds + target/timestamp/ID columns. |
| PUT | `/projects/{id}/config` | Update any subset; validates column references. 400 `COLUMN_NOT_FOUND`. |

## Analysis

| Method | Path | Description |
|---|---|---|
| POST | `/projects/{id}/analysis` | Run analysis synchronously. 409 `NO_DATASET`; 400 `ANALYSIS_FAILED`. |
| GET | `/projects/{id}/analysis/latest` | Latest run summary (404 `NO_ANALYSIS` if none). |
| GET | `/analysis/{run_id}` | Run summary. |
| GET | `/analysis/{run_id}/findings` | Paginated findings with filters: `status`, `severity`, `category`, `column`, `q`, `sort` (`severity` default), `order`, `limit`, `offset`. |
| GET | `/analysis/{run_id}/score` | Data Readiness Score + per-category breakdown + coverage. |

## Reports

| Method | Path | Description |
|---|---|---|
| POST | `/analysis/{run_id}/report` | Generate versioned JSON report (409 unless run completed). |
| GET | `/projects/{id}/reports` | List reports. |
| GET | `/reports/{report_id}` | Report content. |
| GET | `/reports/{report_id}/download` | Same content with `Content-Disposition: attachment`. |

## Audit

| Method | Path | Description |
|---|---|---|
| GET | `/audit?project_id=&limit=` | Audit events (any project). |
| GET | `/projects/{id}/audit` | Audit events for one project. |

Event types: `PROJECT_CREATED/UPDATED/DELETED`, `DATASET_UPLOADED/DELETED`, `ANALYSIS_CONFIG_UPDATED`,
`ANALYSIS_STARTED/COMPLETED/FAILED`, `REPORT_EXPORTED`. Events never embed dataset rows.

## Assurance registry (evidence packages)

| Method | Path | Description |
|---|---|---|
| GET | `/api/assurance/projects` | Registry rows for tracked external projects |
| GET | `/api/assurance/projects/summary` | Comparison rows with test/evidence/artefact counts |
| GET | `/api/assurance/projects/{id}` | Project detail incl. requirements, tests, evidence, risks, packages |
| POST | `/api/assurance/projects/{id}/evidence-packages` | Generate evidence package ZIP (201) |
| GET | `/api/assurance/projects/{id}/evidence-packages` | List generated packages |
| GET | `/api/assurance/evidence-packages/{id}/download` | Download package ZIP |

See `docs/assurance-registry.md` for the state model and package structure.

## Portfolio (week 3, prefix `/api/portfolio`)

| Method | Path | Description |
|---|---|---|
| GET | `/portfolio/projects` | Project metadata rows |
| GET | `/portfolio/projects/summary` | Comparison rows (counts, decisions, completeness) |
| GET | `/portfolio/projects/{id}` | Full detail payload (all sections + packages) |
| GET | `/portfolio/projects/{id}/requirements` · `/traceability` · `/evidence` · `/tests` · `/fmea` · `/risks` · `/limitations` · `/deployment-decision` · `/monitoring` · `/odd` · `/completeness` | Section endpoints |
| POST | `/portfolio/projects/{id}/evidence-packages` | Generate immutable package version (201) |
| GET | `/portfolio/projects/{id}/evidence-packages` | Package history |
| GET | `/portfolio/evidence-packages/{id}/download` | Download ZIP |
| POST | `/portfolio/evidence-packages/{id}/verify` | Integrity verification (VALID/INVALID/…) |
