# Case study — Embedded Vision-Based Navigation

Problem: verify a lightweight onboard vision classifier (safe landing zone) under operational
conditions. Architecture: synthetic frame renderer, engineered features, logistic model (FP32) with
INT8 weight quantization emulation, pipeline with OOD proxy, temporal consistency and deterministic
fallback. Results (host, synthetic): FP32 baseline accuracy >= 0.80 on test split; quantization
regression <= 0.15; robustness slices (low light, overexposure, blur, noise, occlusion,
compression, unseen terrain) run without failure; corrupted frames -> explicit fallback. Trade-offs:
feature-based simplicity vs deep features; INT8 emulation vs real target; synthetic vs real imagery.
Limits: no real camera/hardware; latency host-only; not a guidance system. Contribution: verifiable
pipeline + quantization comparison + robustness slices. CV bullets: (1) built and verified a
lightweight onboard vision pipeline with FP32/INT8 comparison; (2) added robustness slices and OOD +
temporal fallback; (3) documented camera/ODD/data limitations honestly.
