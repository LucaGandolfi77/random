# Week 4 — Professional launch

## 1. Goal

The repository now includes a public, professional engineering portfolio layered on the existing
Workbench (no new repository, same React/TypeScript/Vite stack, existing backend untouched for this
feature set). It presents the owner as **Embedded AI & ML Verification Engineer for Space Systems** and
makes the work of weeks 1–3 navigable by recruiters and engineers.

## 2. Professional message

> I design and verify dependable embedded AI systems for space applications, transforming
> machine-learning models into traceable, testable and operationally constrained engineering
> components.

All four portfolio projects are explicitly engineering projects / technical demonstrations using
synthetic or simulated environments; results carry that label. No ECSS certification, no real-mission
claims, no invented experience.

## 3. What was added

- Centralized profile configuration: `frontend/src/content/profile.json` (title, summary, 12
  competencies mapped to projects/evidence/articles, skills, projects, publication slugs, contact).
- Editorial system (versioned JSON content): `frontend/src/content/publications/*.json` with
  frontmatter-equivalent fields; content rendered from section blocks; TOC and reading-time derived.
- Public pages: Home, Expertise, Projects (site-projects), project case studies, Flagship
  (Lunar Landing Safety Cage), Publications index + 4 article pages, CV (print/ATS-friendly), Contact,
  Workbench hub. Site layout with responsive accessible navigation and skip link.
- SEO: per-page title/description, Open Graph, Twitter card, canonical URL (configurable via
  `VITE_SITE_URL`), JSON-LD (Person, Article), `robots.txt` (build-time), optional `sitemap.xml`
  generated only when a domain is configured (no hardcoded domain).
- Print support: CV print stylesheet (A4) + `window.print()` Print CV / Download via print-to-PDF.

## 4. Compatibility

Existing routes are preserved: `/projects` (week 1), `/portfolio` (week 3), `/assurance` (week 2), and
public pages live on new paths (`/`, `/expertise`, `/site-projects*`, `/flagship`, `/publications*`,
`/cv`, `/workbench`, `/contact`). No previously released link was removed.
