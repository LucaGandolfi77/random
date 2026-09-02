# Case study — Real-Time Embedded AI Runtime (deterministic C++17)

Problem: run a small ML model deterministically in an embedded-style environment with deadlines,
bounded memory, integrity checks and safe fallback. Architecture: C++17 runtime, preallocated
tensors, SHA-256 model integrity recomputed per inference, input/output validation, watchdog,
deadline statistics (p50/p95/p99, misses, jitter) and controllable fault injection (checksum,
timeout, NaN output, allocation pressure). Trade-offs: self-contained runtime vs ONNX/TFLM (absent
in this workspace); deterministic float vs fixed point (future); host timing vs target hardware
(not claimed). Measured (Linux x86_64, -O2, 200k runs): mean 0.0001 ms, max 2.0000 ms outlier,
14 deadline misses @ 0.02 ms budget, 0 fallbacks. Limits: synthetic inputs, host-only, no WCET,
no ARM/cross. Contribution: reusable embedded-safe inference loop. CV bullets: (1) deterministic
C++17 ML runtime with preallocated inference and SHA-256 integrity; (2) latency distributions over
200k runs (p50/p95/p99, misses, jitter); (3) validated input/output guards, watchdog and
deterministic fallback with fault-injection tests.
