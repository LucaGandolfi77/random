# Architecture documentation (week 6)

Text-based diagrams (versioned, no binary images). See also docs/architecture.md.

## System context
[Visitor browser] -> [nginx: static SPA + /api proxy] -> [FastAPI backend] -> [SQLite + storage volume]

## Component overview
- Frontend: React/TS/Vite pages (site, portfolio, assurance) + engine API consumer.
- Backend: portfolio registry (normalized model), assurance engine (gaps/dimensions/gate/trace),
  report + package generators, package validator, demo seed/reset, audit log.
- Assurance data flow: imported records -> coverage/trace -> gaps/dimensions -> gate recommendation
  -> report/package -> validation.
- Decision flow: automatic recommendation is always separate from the human official decision.
- Security boundaries: storage root enforcement, zip member validation, safe filenames.
