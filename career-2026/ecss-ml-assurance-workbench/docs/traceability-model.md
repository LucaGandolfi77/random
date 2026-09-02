# Traceability model (week 3)

## Chain

```
Requirement (REQ-*) -> Test Case (TEST-*) -> Test Result (RUN-*, verdict)
                      -> Evidence (EVID-*)
Risk (RISK-*) / FMEA item (FM-*) <-> requirements, tests, evidence
Deployment decision (DEC-*)  -> blocking findings, accepted risks, package snapshot
```

Links are stored as JSON id lists on both sides (requirement→tests/evidence/risks computed from the
other entities' `related_*` lists in `app/portfolio/service.py::coverage_sets`).

## Exposed views

- `GET /api/portfolio/projects/{id}/traceability` returns one row per
  (requirement, linked test case) with verdict, run id, evidence ids and risk ids; requirements with no
  linked test appear with an explicit `note: No test linked`.
- Requirements list adds a `coverage` and `gaps` object: `no_test`, `no_evidence`,
  `has_failed_test`, `not_verified` — used to highlight uncovered/risky requirements in the UI.
- The zip contains `requirements/traceability-matrix.csv`.

## Rules enforced by consistency tests

- A VERIFIED requirement must have a verification method and (by construction of this dataset) either a
  linked test with PASS or explicit analysis evidence — week-3 checks fail on VERIFIED without evidence.
- A PASS test requires an explicit result row.
- A test result must reference an existing test case.
- Evidence references existing requirements/tests.
- A GO decision cannot coexist with failed blocking tests or `NOT_ACCEPTABLE` risks.
- A NO_GO decision must be justified by failed tests or non-accepted risks.
