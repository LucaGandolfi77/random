# Security — evidence packages (week 3)

## Controls implemented

- Server-generated ZIP names + UUID package ids; DB is the only source of truth for access.
- Canonical storage paths; `_package_path` resolves and verifies the path stays under the packages
  directory (path-traversal protection).
- Zip extraction never happens on upload/verify of user input: verification reads members by exact
  names derived from the stored manifest and refuses members outside the single root folder.
- Evidence attachments are stored under server-generated names (`EVID-<id>.txt`); only the basename is
  used when packaging.
- Downloads are streamed through the endpoint (no internal paths exposed; `Content-Disposition` uses the
  safe filename).
- No secrets are placed in packages; manifests contain no absolute paths.
- Errors never return stack traces (structured `ApiException` envelope).
- `project_id`/`package_id` are validated before use (404 otherwise).
- Verification errors are reported with a status enum, never with internal details.

## Residual limits (documented)

- No authentication/authorization in the MVP — anyone who can reach the API can generate/download
  packages; keep the stack on a trusted network.
- Zip-bomb style archives are not generated (contents are internally produced); verification reads
  bounded, known members only.
- Evidence content itself is not scanned for malware; uploaded evidence files are never executed.

See `docs/known-limitations.md` for the full list.
