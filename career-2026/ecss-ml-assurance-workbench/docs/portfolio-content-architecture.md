# Portfolio content architecture

- Single source of truth: `frontend/src/content/profile.json`.
- Publications: `frontend/src/content/publications/{slug}.json` (title, description, dates, author,
  category, tags, readingTime, featuredProject, seo fields, content sections).
- Pages consume the centralized profile instead of duplicating text (Home, Expertise, Projects, CV,
  case studies, Contact).
- Competencies (12) are grouped in 4 areas (Embedded AI Engineering, ML Verification, Space AI
  Assurance, Runtime Safety) and each maps to a project id, optional evidence id and optional article.
- Project cards show category, status, problem, contribution, verification, stack, top metric
  (labelled synthetic), main limitation and deployment decision — matching week-3 decisions.
