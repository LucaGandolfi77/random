# Federated Constellation Health Monitor

Local simulation: satellites train on non-IID data, send checksummed, versioned updates to a ground
aggregator with robust aggregation, validation (corrupt/stale/outlier), rollback and per-round
evidence. Communication cost/offline nodes modelled; privacy not claimed. Tests: 6 PASS. Run:
make test.
