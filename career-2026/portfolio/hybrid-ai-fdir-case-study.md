# Case study — Hybrid AI FDIR Assistant

Problem: move from anomaly detection to traceable, prudent diagnosis. Architecture: detection
(deterministic limits + rules), subsystem isolation, candidate failure-mode ranking, health score +
confidence, evidence, recovery recommendation requiring operator decision; irreversible recovery
never automatic; fault catalog with residual uncertainty. Scenarios executed: nominal (clean),
drift (battery), stuck (RWU), thermal (battery), power (EPS) with correct isolation. Results: 7/7
tests PASS. Metrics documented (detection/isolation/false-alarm/unknown rate definitions) — RUL not
estimated (documented limitation). Limits: synthetic telemetry; heuristics. Contribution: hybrid
detection→diagnosis with operator gate. CV bullets: (1) built a hybrid FDIR pipeline combining
limits, rules and fault knowledge for isolation and ranking; (2) enforced operator authority for
irreversible recovery recommendations; (3) documented prognostics limitations (no RUL without
validated data).
