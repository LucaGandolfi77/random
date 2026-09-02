# Assurance registry & evidence packages

## 1. Purpose

The Workbench tracks assurance information about **external ML projects** so they can be consulted,
compared and packaged. In the current workspace the four tracked projects are registered even though
they are **not present** in the repository:

| ID | Project | Repository presence |
|---|---|---|
| PRJ-TAD-001 | Telemetry Anomaly Detector | Not Available |
| PRJ-QNT-001 | Onboard Vision Quantization Lab | Not Available |
| PRJ-SEU-001 | SEU Fault Injector | Not Available |
| PRJ-LLS-001 | Lunar Landing Safety Cage | Not Available |

Presence was verified by recursive search of `/career-2026` (source, docs, config, metadata). These rows
are **registry entries with availability states**, not implementations and not results.

## 2. Honest-state principle

Absence of data is never transformed into a positive or negative result. The registry uses a fixed set of
states:

`Available`, `Not Available`, `Not Provided`, `Not Executed`, `Not Applicable`, `Pending Review`,
`Evidence Missing`, `Decision Pending`.

Consequences:

- zero registered tests are displayed as `0 passed / 0 failed / 0 not-executed` with an explicit note;
- missing evidence is a **gap**, never evidence of absence of risk;
- deployment remains `Decision Pending` until an explicit, motivated decision exists;
- no single aggregated score is computed (it would hide missing data and high residual risk).

## 3. Normalized domain model (`backend/app/assurance`)

| Entity | Table | Role |
|---|---|---|
| AssuranceProject | `assurance_projects` | Registry row: stable id (`PRJ-*`), summary, paths, statuses, artefact availability, related assets, limitations, open actions, import procedure |
| AssuranceRequirement | `assurance_requirements` | REQ rows with category, source, verification method, state, related tests/risks/evidence |
| AssuranceEvidence | `assurance_evidence` | EVID rows: type, source document/version, state, location |
| AssuranceTest | `assurance_tests` | TEST rows: level, method, outcome (`Passed/Failed/Not Executed/...`), actual result, links |
| AssuranceRisk | `assurance_risks` | RISK / FM rows (kind `risk` or `failure_mode`) with severity, detection, mitigation, residual risk |
| AssurancePackage | `assurance_packages` | Generated evidence packages |

Stable identifiers: `PRJ-TAD-001`, `PRJ-QNT-001`, `PRJ-SEU-001`, `PRJ-LLS-001` (never derived from the
display name). Requirement/test/evidence/risk IDs follow the ml-assurance template convention
(`REQ-*`, `TEST-*`, `EVID-*`, `RISK-*`, `FM-*`).

## 4. Mapping (project source → package)

```
Project source (repository paths)
  -> artefacts (docs, code, datasets, reports)   [real, referenced, never copied]
  -> normalized domain model (assurance_* tables) [imported states]
  -> Workbench views (registry list/detail/compare)
  -> Evidence package (ZIP: sections + manifest)
```

For projects that are absent, artefacts remain `Not Available` and the package documents that explicitly.
An importer endpoint is intentionally not implemented yet; the import procedure field describes the steps.

## 5. Evidence package

POST `/api/assurance/projects/{id}/evidence-packages` generates a ZIP stored under
`storage/evidence-packages/`. Content is deterministic except package id/time. Structure:

```
evidence-package-<PKG>.zip
├── 00_project_summary.{json,md}
├── 01_model_card.{json,md}
├── 02_data_quality_report.{json,md}
├── 03_operational_design_domain.{json,md}
├── 04_test_results.{json,md}
├── 05_fmea.{json,md}
├── 06_deployment_report.{json,md}
├── 07_monitoring_strategy.{json,md}
├── 08_evidence_index.{json,md}
├── 09_manifest.{json,md}
└── manifest.json          (package id, schema, sections, states summary, disclaimer)
```

Every package embeds the disclaimer: produced by an ECSS-informed, assurance-oriented support tool; it
does not certify, qualify or declare ECSS compliance.

## 6. API

| Method | Path | Description |
|---|---|---|
| GET | `/api/assurance/projects` | Registry rows |
| GET | `/api/assurance/projects/summary` | Comparison rows with counts |
| GET | `/api/assurance/projects/{id}` | Detail incl. requirements/tests/evidence/risks/packages |
| POST | `/api/assurance/projects/{id}/evidence-packages` | Generate package (201) |
| GET | `/api/assurance/projects/{id}/evidence-packages` | List packages |
| GET | `/api/assurance/evidence-packages/{id}/download` | Download ZIP |

## 7. UI

- `/assurance` — registry comparison table (states, artefact counts, tests P/F/NE, risks, evidence,
  package actions) reachable from "Assurance registry" in the workspace navigation.
- `/assurance/{projectId}` — project detail with summary, artefact availability matrix, requirement /
  test / evidence / risk sections, import procedure and package download.

## 8. Extension points

- **Importer**: add `POST /api/assurance/import` mapping repository paths to the normalized model,
  keeping original paths and never copying artefacts.
- **New tracked project**: insert an `AssuranceProject` row with a stable `PRJ-*` id and import its real
  artefacts; states update automatically once rows exist.
