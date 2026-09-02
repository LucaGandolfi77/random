# Known limitations — week 1 MVP

This section is intentionally explicit. It documents limits of the MVP rather than claiming completeness.

## Product / assurance limits

- **Not a certification tool.** The platform is an engineering support/demo instrument. It does not claim
  ECSS compliance, does not emit certificates and must not be presented as such.
- **Scope limited to data readiness.** ODD, model verification, robustness, OOD, FMEA/FMECA, safety cage and
  runtime monitoring are shown as disabled “planned” modules with no implementation.
- **Type inference is heuristic.** Automatic types (integer/float/categorical/text/datetime) can be wrong for
  unusual encodings; they must be confirmed by engineering.
- **Outliers are statistical flags.** IQR-based outliers are possible anomalies and require engineering
  judgment; they are never treated as automatic errors.
- **Leakage checks are heuristics** (name/equality/correlation based). They can miss real leakage and can
  produce false candidates; results always require review.
- **The Data Readiness Score is a decision-support indicator**, not a measure of safety, quality certification
  or mission suitability.

## Functional limits

- CSV is the only supported format in week 1 (UTF-8/latin-1, comma separated, first row = header).
- Only the **latest dataset** per project is analysed; replaced files are deleted from storage (previous runs
  and reports remain readable through the DB).
- Analysis is **synchronous** — appropriate for small files; very large files should be moved to a job queue.
- Preview is capped at 500 rows; findings evidence stores aggregates only.
- Report generation requires a completed run and an available dataset record.
- Mobile layout is functional, but the preview table and report viewer are best on wider screens.

## Security limits (documented per §15 of the brief)

- No authentication/authorization: anyone who can reach the API can read or delete projects. Use it only in
  a trusted local network (documented for the MVP).
- Upload limits are enforced server-side (size, extension, MIME when available); deep content scanning is out
  of scope. Content is never executed.
- CORS is configurable via `CORS_ORIGINS`; the default Docker deployment uses same-origin proxying.
- Logs and audit events intentionally contain no dataset rows or raw content.
- Secrets: none are stored; `.env` files are excluded from git (see `.gitignore`).
- The backend runs as a non-root user; the frontend uses the unprivileged nginx image.
- SQLite is single-writer friendly (WAL); concurrent writes across processes are limited.

## Repository hygiene

- Big third-party client libs (e.g. Three.js in unrelated sibling projects) are not part of this workbench;
  this project vendors nothing and pins exact dependency versions (`requirements.txt`, `package-lock.json`).
- `docker compose up --build` builds from scratch; first build downloads base images and installs
  dependencies (a few minutes).

## Week-3 additions

- Portfolio projects are **synthetic demonstrations**; metrics, tests and decisions are demonstration
  values with clear provenance markers, not real mission results.
- Evidence packages do not include PDF renderings (Markdown/JSON/CSV mandatory, PDF optional and not yet
  supported by a stable generator).
- No authentication/authorization: anyone reaching the API can generate, download and verify packages
  (keep on a trusted network).
- Hardware/target claims are simulated; RUN-SEU-011 (overhead) is NOT_EXECUTED and RUN-TAD-008 (target
  latency) is BLOCKED by environment unavailability — shown as such, never as passed.
- Tamper detection anchors on the database snapshot; a package tampered before it was ever registered
  cannot be distinguished from an older legitimate version (out of scope).
