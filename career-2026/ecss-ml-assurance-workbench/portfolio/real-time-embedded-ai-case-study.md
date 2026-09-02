# Case study — Real-Time Embedded AI Runtime (deterministic C++17)

Problem: run a small ML model deterministically in an embedded-style environment with deadlines,
bounded memory, integrity checks and safe fallback. Architecture: C++17 runtime with preallocated
tensors, SHA-256 model integrity (recomputed per inference), input/output validation, watchdog,
deadline statistics (p50/p95/p99, misses, jitter) and controllable fault injection (checksum, timeout,
NaN output, allocation pressure). Trade-offs: self-contained runtime (no ONNX/TFLite Micro in repo)
vs framework reuse; deterministic float path vs quantized fixed point (future); measured host timings
vs target hardware (not claimed). Measured results (Linux x86_64, -O2, 200k runs): mean 0.0001 ms,
max 2.0000 ms outlier, 5 deadline misses at 0.02 ms budget, 0 fallbacks. Limits: synthetic inputs,
host-only, no WCET claim, no ARM/cross measurement. Contribution: embedded-safe inference loop with
integrity+watchdog+fallback as reusable C++ component. CV bullets: (1) Built a deterministic C++17 ML
runtime with preallocated inference, SHA-256 model integrity and watchdog supervision; (2) Measured
latency distributions (p50/p95/p99, deadline misses, jitter) over 200k runs; (3) Added validated
input/output guards and deterministic fallback with controlled fault-injection tests.
