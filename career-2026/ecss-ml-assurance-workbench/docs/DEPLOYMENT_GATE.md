# Deployment gate (week 5)

The gate produces an automatic recommendation plus detected inconsistencies. It does not perform
approval. The official deployment decision is stored in the portfolio and remains the human artefact.

API: `GET /api/assurance-engine/projects/{id}/deployment-gate` (rules, recommendation, blocking rules,
inconsistencies). Formula documentation: see `docs/ASSURANCE_RULES.md`. Current portfolio decisions
remain as imported in week 3 (CONDITIONAL_GO / NO_GO / …); recommendation and decision are shown
side-by-side in the UI.
