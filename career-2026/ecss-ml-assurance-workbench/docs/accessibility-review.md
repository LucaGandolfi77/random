# Accessibility review

Implemented: semantic HTML and heading hierarchy; skip link; keyboard-visible focus (existing focus
styles); labelled form controls; mobile menu button with aria-label and aria-labelled navigation;
tables with `<caption>`/headers (sr-only captions for tables without visible captions); descriptive
link text; status messages via toasts (`aria-live`) and inline text; `prefers-reduced-motion`
stylesheet rule; colour is never the only indicator (chips include text and icons).
Checked with keyboard navigation in Playwright flows (menu open/close) and component tests; a full
automated axe audit is listed under "checks not executed" in the release checklist (no axe dependency
was added).
