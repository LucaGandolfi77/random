# Publication workflow

1. Create `src/content/publications/<slug>.json` (see an existing file for the schema).
2. Add the slug to `profile.publicationSlugs`.
3. Run `npm run validate:content` — checks abstract/dates, conclusion, limitations, references,
   checklist, project links and profile consistency.
4. Preview locally (`npm run dev`) and run `npx vitest run`.
5. Build (`npm run build`) to regenerate robots/sitemap assets.

Sections supported: `h2`, `p`, `ul`, `checklist`, `table`, `note`. Content is original engineering
notes (no journal/conference claims); dates are set in the file.
