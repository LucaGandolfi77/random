# Changelog

## v0.7.0 (Continuous Assurance Prototype)

### Added
- CI result ingestion (JUnit XML, JSON summary) idempotent by checksum
- Immutable assurance snapshots; baseline comparison; deterministic regression rules
- Action Register (CSV export, issue drafts); reproducibility records
- Technical Review Pack generator; SBOM/local dependency inventory
- Project Adapter SDK + validate-project CLI; evidence provenance fields

### Changed
- Version metadata → 0.7.0

### Security
- Zip member validation reused; root enforcement maintained; no secrets added

### Documentation / Known limitations
- See docs/SUPPLY_CHAIN.md, WEEK_7_IMPLEMENTATION_REPORT.md, docs/releases/v0.7.0.md

## v0.6.0 (2026) — Portfolio-ready demonstration

### Added
- Public engineering portfolio (weeks 4): Home, Expertise, Projects case studies, Flagship
  (Lunar Landing Safety Cage), Publications (4 engineering notes), CV (print/ATS), Contact,
  Workbench landing, SEO metadata, robots/sitemap pipeline.
- Week-5 assurance engine: Gap Analyzer, Traceability Validator, 15 Assurance Dimensions,
  Deployment Readiness Gate, monitoring readiness, Assurance Review Report, full Evidence Package
  validator; UI page "Assurance analysis (week 5)".
- Week-6: guided demo tour (no new dependency), Workbench landing with capabilities, case-study
  "demonstrates / unverified / no-certification" sections, root-enforcement script + tests,
  demo-reset command, CHANGELOG, release notes, ADRs, deployment/performance/security reviews,
  portfolio materials, screenshot automation, CI workflow (proposal), Final Assurance Review.

### Changed
- Version metadata to 0.6.0 (backend `core/version.py`, frontend `package.json`).

### Fixed / Security / Documentation / Known Limitations
- See `docs/known-limitations.md`, `docs/SECURITY_REVIEW.md`, `docs/releases/v0.6.0.md`.
- No ECSS certification is claimed; all portfolio data is synthetic and labelled.
