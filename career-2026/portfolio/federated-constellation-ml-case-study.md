# Case study — Federated Constellation Health Monitor

Problem: federated learning under non-IID data, intermittent links and malicious/corrupt updates.
Architecture: satellite node simulator (local trainers, per-node slope distributions), update
packages with checksum/version, ground aggregator with robust median-then-mean, rejection of
stale/corrupt/outlier updates, rollback, per-round evidence (JSON), reproducible seeds. Results:
6/6 tests PASS; simulated round handles offline/stale/corrupt nodes with correct rejection.
Trade-offs: robust aggregation vs efficiency; median-then-mean vs weighted FedAvg; simulated
communication vs real links. Privacy: not claimed (documented assumptions; no DP). Limits:
synthetic data, single-host simulation, no real constellation/links. Contribution: evidence-gated
federated rounds with rejection semantics. CV bullets: (1) simulated non-IID federated training with
per-round evidence; (2) implemented checksum/version/robust validation and rollback at the
aggregator; (3) documented privacy assumptions without overclaiming.
