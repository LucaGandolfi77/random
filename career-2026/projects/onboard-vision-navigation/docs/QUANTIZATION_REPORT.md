# QUANTIZATION_REPORT

Embedded Vision-Based Navigation demo: safe-landing-zone classification (synthetic 32x32 grayscale,
pinhole-like camera doc). FP32 vs INT8 emulation compared; per-slice robustness tests; runtime
monitor (confidence/OOD/temporal consistency) with deterministic fallback. Host benchmark only;
no real target hardware measured. See vision/nav.py.
