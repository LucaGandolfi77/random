# Security review (week 4 frontend)

- No secrets or tokens in the frontend; profile file holds only public/empty contact fields.
- External links (`/docs`) use `target="_blank" rel="noopener noreferrer"`.
- Internal links are declarative router links; article content is rendered from local JSON only
  (no raw HTML/Markdown injection surface).
- Evidence-package downloads go through the backend endpoints (path traversal guards, server names).
- Errors surface friendly messages; stack traces are not rendered.
- Local paths/usernames are not exposed by the site. Search performed for committed secrets
  (see `docs/known-limitations.md` — none found in the frontend content; repository-wide scan listed in
  release checklist as an ongoing manual item).
- CORS remains configurable via `.env` for the API.
