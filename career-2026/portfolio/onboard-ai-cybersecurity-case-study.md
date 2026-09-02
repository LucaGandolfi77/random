# Case study — Onboard ML Security Lab

Problem: keep ML integrity and update safety in an onboard-style pipeline (local lab). Architecture:
checksum+manifest gate, pinned allowlist, UpdateGate with replay/staleness detection, rollback to
trusted versions, filename sanitization, path/symlink/archive defenses, audit reasons. Results: 8/8
defensive tests PASS; threat coverage 12/12 with traceability. Trade-offs: checksum vs key-based
signatures; heuristics vs hardware anchors; lab realism vs deployment. Limits: no real keys/anchors,
synthetic fixtures, no external targets. Contribution: repeatable defensive harness for model
integrity, telemetry authenticity and secure update/recovery. CV bullets: (1) built a checksum +
manifest + allowlist integrity gate for model artefacts; (2) implemented secure update gate with
replay/staleness/rollback logic and defensive tests; (3) documented threat-to-control-to-test
traceability and residual cyber risk.
