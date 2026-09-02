# Test plan

Executed (build/tests): unit inference vs golden; integrity/checksum; version mismatch; input
validation (out-of-range/missing); output validation + fallback; deadline + timeout injection;
no-alloc forward (fault-flag-controlled allocation); watchdog; deterministic replay (bitwise within
instance, 1e-4 across instances); latency percentiles. Results: ALL TESTS PASSED on this machine.
Not executed: ARM/QEMU cross, stack-usage measurement, custom allocation counter test (documented).
