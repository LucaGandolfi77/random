# Release checklist (week 4)

Content: professional title ✓ · summary ✓ · 12 competencies ✓ · 4 projects ✓ · flagship ✓ · 4
articles ✓ (validate:content) · limitations visible ✓ · synthetic results labelled ✓ · CV updated ✓ ·
contact configurable ✓.
Technical: lint ✓ · typecheck ✓ · vitest ✓ · production build ✓ · Docker build ✓ · e2e flows ✓ ·
internal link checks (Playwright + content validation) ✓ · env vars documented ✓.
Quality: mobile layout (Playwright mobile flow + responsive classes) ✓ · accessibility (manual +
menu test) ✓ · print CV (print stylesheet + `window.print` test) ✓ · SEO metadata ✓ · Evidence Package
links ✓ · article references ✓ · deployment decisions consistent with week 3 ✓.
Security: no committed secrets (scanned in this repo scope) ✓ · no private paths ✓ · no sensitive
files in `frontend/dist` ✓ · dependencies unchanged from weeks 1–3 ✓ · external links protected ✓.
Checks not executed (documented honestly): automated axe audit, Lighthouse run, dependency audit
(`npm audit` not run — network/tool availability), full-secret scan of the entire monorepo outside
`/career-2026`. These are recommended before any public deployment and do not block the local launch
artefacts.
