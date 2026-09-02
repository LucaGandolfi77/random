# Monitoring strategy

Per-cycle: latency, deadline misses, fallback count, watchdog heartbeats, last status. Thresholds:
mean<0.001 ms, p99<0.01 ms on host (pending target); alert on fallback_count jump or checksum
mismatch; safe state: deterministic fallback output 0.5. Host-only numbers.
