# ADR-0006 — File-system security boundaries

All file access resolves under the configured storage root; zip member paths are validated; downloads
use server-generated names; `app/scripts/check_root.py` enforces the `/career-2026` root. Accepted.
