# Real-Time Embedded AI Runtime (deterministic C++17)

Deterministic runtime executing a small ML anomaly model (3 features -> hidden 8 ReLU -> logistic
output) with preallocated buffers, input/output validation, model integrity (SHA-256 recompute),
watchdog supervision, deadline accounting, deterministic fallback and controllable fault injection.
Baseline target: Linux x86_64 (measured in this repository). No WCET is claimed — only worst observed
execution time. No ONNX/TFLM present in the repo, so a self-contained engine is used (documented).

Build/test/bench: `make build && make test && make bench` (numbers in docs/BENCHMARK_REPORT.md).
