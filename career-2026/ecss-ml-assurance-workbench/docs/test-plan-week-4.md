# Test plan — week 4

- Content validation: `npm run validate:content` (title, 12 competencies, project links, article
  frontmatter/conclusion/limitations/references/checklist, synthetic labelling, four articles).
- Frontend unit: 17 vitest tests including new site tests (home title + four cards, expertise areas,
  CV 12 competencies + print control, flagship regions, publications list, mobile navigation menu).
- E2E Playwright: 7 specs — week-1 main flow, week-3 portfolio flows, week-4 recruiter / publication /
  engineer journeys.
- Checks: `npm run lint`, `npx tsc --noEmit`, `npm run build` (incl. postbuild robots/sitemap),
  `docker compose build`.
