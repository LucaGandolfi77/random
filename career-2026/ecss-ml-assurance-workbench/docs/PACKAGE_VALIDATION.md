# Evidence package validation (week 5)

`POST /api/assurance-engine/evidence-packages/{id}/validate` performs full structural validation:
readable ZIP, required files (README/manifest/checksums), JSON validity, schema version, project/version
consistency, declared file list vs zip contents, path safety, duplicates, sensitive names, size limits,
and SHA-256 checksum verification against the authoritative DB snapshot.

States: Valid · Valid with Warnings · Incomplete · Invalid · Validation Failed. Incomplete packages
that correctly declare gaps are not treated as Invalid. Output is machine-readable with error/warning/
information counts and remediation text; the legacy verify endpoint remains available for integrity
checks.
