# Round evidence

Each round records: round ID, accepted/participants, mean/prev weight, aggregation method, seed;
rejections list (reason per node). Export via Aggregator.export_round_evidence (JSON). Simulated
scenario (seed 20260913): round1 3/3 accepted; round2 rejects stale+corrupt.
