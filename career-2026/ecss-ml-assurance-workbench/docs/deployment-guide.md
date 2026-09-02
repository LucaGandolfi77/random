# Deployment guide

- Build: `docker compose up --build` (nginx serves the SPA and proxies `/api` to FastAPI; database and
  evidence packages persist in the `workbench-data` volume).
- Domain/API configuration: `.env.example` documents `CORS_ORIGINS`, `MAX_UPLOAD_SIZE_MB`, ports;
  frontend canonical URLs use `VITE_SITE_URL` (injected at build time; `sitemap.xml` is generated only
  when set — no hardcoded domain).
- Static assets: `frontend/dist` via nginx; SPA fallback configured.
- Health check: `GET /api/health`.
- No CI pipeline exists in the repository; a proposed GitHub Actions workflow (install → lint →
  typecheck → unit tests → build → container build) is described in `release-checklist.md` but was not
  added to avoid assuming a hosting platform without credentials/destination.
