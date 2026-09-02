# Release notes — v1.0.0-rc.1 (release candidate)

Engineering release candidate of the ML Assurance Workbench portfolio. Not certified; demo data is
synthetic. Added (weeks 1–8): workbench modules, portfolio site, assurance engine, continuous
assurance ingestion/snapshots/regressions/actions, guided demo & interview tooling, production
readiness evidence pipeline (quality gate PASS), health/live/ready/version endpoints, backup +
verified restore test, portability export, SBOM inventory, release manifest & checksums.
Known limitations: no authentication (public read-only enforced by backend route guard config only in
docs), npm audit / axe / full-monorepo secret scan not executed, offline mode excluded by design.
Rollback: previous image `docker compose down && docker compose up --build` restores code; data
volume restores from `release/backup-*.zip`.
