# Case study — AI Assurance Digital Thread

Problem: connect mission need through requirements/ODD/data/model/test/evidence/risk/deployment/
monitoring so a change is traceable. Architecture: typed JSON graph (stable IDs, per-kind link
rules), validation (orphans, cycles, duplicates, kind mismatches), suspect-link impact analysis
(downstream only; evidence never auto-updated), DOT export. Demo: a system-requirement change in the
lunar-landing ML case marks ODD/model/test/evidence/risk/decision/monitoring Suspect and reports
affected-by-kind. Results: 8/8 tests PASS. Trade-offs: JSON/DOT subset vs full SysML/XMI; model
fidelity vs tool integration. Limits: subset, synthetic, no parametric diagrams. Contribution:
traceability and impact-analysis engine reusable by the Workbench. CV bullets: (1) designed a
typed digital-thread model linking requirements to evidence and decisions; (2) implemented
suspect-link change impact analysis that never auto-updates evidence; (3) exported requirement and
impact views (JSON/DOT) with validation.
