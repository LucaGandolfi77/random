# Benchmark report (Linux x86_64, this repo, -O2)

runs=200000; min=0.0000 ms; max=2.0000 ms (outlier); mean=0.0001 ms; p50/p95/p99 < 0.0001 ms at 4 dp;
deadline_misses=5 @ budget 0.02 ms; jitter(max-min)=2.0000 ms; cycles=200000; fallbacks=0.
Notes: worst observed execution time (not WCET); timers on shared CI-like host; memory: stack buffers
only in forward; full memory-accounting test not executed; ARM not measured (documented).
