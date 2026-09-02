# Evidence Package schema (week 3)

## Package identity and versions

- One immutable package per generation; previous versions are **never overwritten**.
- Filename: `{project-slug}_evidence-package_{project-version}_{YYYYMMDDTHHMMSSZ}[-N].zip`
  (a numeric suffix is added only when two generations share the same second).
- DB row (`portfolio_packages`) stores manifest, document/evidence lists, size and the last
  verification result; `package_version` increments monotonically per project.

## Zip layout

```text
evidence-package/
├── README.md
├── manifest.json
├── checksums.sha256
├── project-summary/{project-summary.md, project-summary.json}
├── model-card/{model-card.md, model-card.json}
├── data-quality/{data-quality-report.md, data-quality-report.json}
├── odd/{operational-design-domain.md, operational-design-domain.json}
├── requirements/{requirements.md, requirements.json, traceability-matrix.csv}
├── test-results/{test-summary.md, test-results.json, passed-tests.csv, failed-tests.csv}
├── fmea/{fmea.md, fmea.json, fmea.csv}
├── risks/{residual-risks.md, residual-risks.json}
├── deployment/{deployment-report.md, deployment-report.json}
├── monitoring/{monitoring-strategy.md, monitoring-strategy.json}
├── limitations/{known-limitations.md, known-limitations.json}
└── evidence/{evidence-attachment files + _index.json}
```

Markdown, JSON and CSV are always produced. PDF is not produced (no stable PDF generator in the
project; this is documented as a limitation, not simulated).

## manifest.json (schema 3.0.0)

```json
{
  "package_id": "PKG-...",
  "package_schema_version": "3.0.0",
  "package_version": 1,
  "generated_at": "2026-09-02T10:00:00Z",
  "generated_by": "workbench-week3",
  "workbench_version": "0.1.0",
  "project": {"id": "PRJ-SEU-001", "name": "SEU Fault Injector", "version": "1.0.0"},
  "model_version": "…",
  "dataset_version": "…",
  "deployment_decision": "NO_GO",
  "document_list": ["requirements/requirements.md", "…"],
  "evidence_list": ["evidence/EVID-SEU-002.txt", "…"],
  "files": [
    {"path": "requirements/requirements.md", "media_type": "text/markdown",
     "size_bytes": 1234, "sha256": "…"}
  ],
  "disclaimer": "This Workbench supports engineering assessment … does not provide ECSS certification …",
  "known_limitations": [],
  "snapshot_status": "FINAL",
  "hash_strategy": "manifest hashes all package files except manifest.json itself; "
                  "checksums.sha256 hashes all files including manifest.json but not itself."
}
```

## Integrity strategy

- Hashes are computed after document generation, before writing the zip.
- `manifest.json` contains the SHA-256 of every package file (except itself).
- `checksums.sha256` contains `"<sha256>  <relative path>"` for every file **including** manifest.json
  (excluding itself), allowing standard `sha256sum -c`.
- The **authoritative snapshot is stored in the database** at generation time. Verification compares
  recomputed hashes against the DB snapshot, so tampering that also rewrites the zip manifest is still
  detected.

## Verification statuses

`VALID` · `INVALID` · `MISSING_FILE` · `HASH_MISMATCH` · `UNSUPPORTED_SCHEMA` · `VERIFICATION_ERROR`

Endpoint: `POST /api/portfolio/evidence-packages/{package_id}/verify`. Verified status is persisted on
the package row; the completeness category `integrity_manifest` reflects it (MISSING → PARTIAL →
COMPLETE/INVALID).

## Determinism

Documents are deterministic for identical data; package id and generation timestamp are the only
non-deterministic fields. Attached evidence files are copied as-is (hash preserved).
