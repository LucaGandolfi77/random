# TEST_PLAN

Federated constellation health-monitor simulation: local trainers on non-IID synthetic slopes,
ground aggregator (median-then-mean robust), update packages with checksum/version, stale/corrupt/
outlier rejection, rollback, per-round evidence JSON, reproducible seeds. No guaranteed privacy is
claimed (DP not implemented); intermittent/asynchronous links modelled via offline/stale/delayed
nodes. See fed/federated.py.
