# Performance review (v0.6.0)

- Bundle: single-page React build ~ >500 kB warning (recharts); content pages lazy-free but routes
  are code-split by route tree at build (rollup). No data-heavy assets loaded on the landing.
- Data: detail pages fetch per-project payloads on demand; package ZIPs download only on request.
- Measured in this environment: frontend build ~9 s; engine/report/package operations complete in
  < 1 s on the synthetic portfolio (local run).
- Interventions: server-side JSON payload reuse (no duplicate model copies), deterministic zip
  generation, no polling loops except health query (15 s).
- Limitations: no Lighthouse profile captured; tables are capped/scrollable; large real datasets are
  out of scope for the portfolio demo.
