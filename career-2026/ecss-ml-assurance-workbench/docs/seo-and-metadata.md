# SEO and metadata

Implemented per page via `src/components/seo/Seo.tsx`: document title, meta description, Open Graph,
Twitter Card, canonical link (when `VITE_SITE_URL` is set). JSON-LD: Person (home), Article
(publication pages). `dist/robots.txt` is generated at build; `dist/sitemap.xml` is generated only
when a domain is configured. `index.html` contains base title/description. No personal data is exposed
beyond what is configured in the profile.
