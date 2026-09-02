# ADR-0005 — Synthetic demo data separation

All portfolio content is synthetic, versioned in `backend/app/portfolio/datadefs`, labelled in UI and
packages, and (re)imported/reset via dedicated scripts (`make seed-week3`,
`python -m app.scripts.reset_demo --reset-portfolio`). No real project data is stored in the demo.
Accepted.
