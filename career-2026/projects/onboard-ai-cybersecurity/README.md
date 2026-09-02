# Onboard ML Threat Model and Security Lab (defensive)

Local defensive lab: integrity (SHA-256), manifest validation, allowlist/version pinning, secure
update gate with replay/staleness detection, rollback control, input range & filename sanitization,
path/symlink/archive defenses. Tests: 8/8 PASS on fixtures. Run: make test. Synthetic only; no
offensive tooling against external systems.
