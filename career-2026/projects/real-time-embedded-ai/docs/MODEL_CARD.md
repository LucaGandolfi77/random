# Model card

- Model: tiny anomaly scorer, 3 features -> 8 hidden (ReLU) -> logistic output (version 1.2).
- Training: numpy, fixed seed 20260101; golden outputs committed (models/golden.json).
- Intended use: deterministic classification/demo on telemetry-style floats.
- Limits: toy feature set, synthetic data, float32 host math; not flight-ready, no certification.
