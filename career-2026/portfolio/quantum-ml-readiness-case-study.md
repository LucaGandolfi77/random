# Case study — Quantum ML Readiness Benchmark

Problem: benchmark classical vs quantum-inspired methods prudently for a small space-oriented
classification task without hype. Architecture: equal splits/preprocessing/metrics/seeds; classical
baseline (linear, small MLP) vs quantum-inspired kernel and simulated variational classifier
(classical emulation); deterministic readiness framework with conservative states; reproducibility
records. Result on the synthetic benchmark: classical linear 0.794, MLP 0.760, kernel 0.784,
variational 0.789, readiness = "No Demonstrated Benefit" — no advantage claimed. Trade-offs:
emulation cost vs hardware; small features vs scalability; reproducibility vs wall-clock. Limits:
synthetic, emulated, tiny scale. Contribution: disciplined benchmarking and critical evaluation.
CV bullets: (1) designed fair classical vs quantum-inspired benchmarks with equal splits and seeds;
(2) implemented a conservative readiness framework that avoids advantage claims; (3) produced
reproducible experiment manifests and limitation reports.
