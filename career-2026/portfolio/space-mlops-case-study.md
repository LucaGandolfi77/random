# Case study — Mission-Grade Model Registry

Problem: controlled local path from Candidate to Active without fake approval. Architecture: typed
registry (semver, hash, dataset/preprocessing/config baselines, evidence links), explicit
approval+promotion rules, simulated shadow/canary, rollback gate (allowlist+integrity+dry-run) with
audit trail. Results: 9/9 tests PASS, including rejected promotions (missing evidence / not
approved / wrong stage), canary failure -> rollback, integrity error, incompatible target.
Trade-offs: simulated shadow/canary vs real traffic split; registry policies vs runtime enforcement.
Limits: local, synthetic, not flight-qualified. Contribution: auditable promotion path reusable by
the Workbench. CV bullets: (1) implemented a versioned model registry with evidence-gated promotion
and approval workflow; (2) added simulated shadow/canary with rollback allowlist, checksum and
dry-run; (3) kept an audit trail for every stage transition without auto-promotion.
