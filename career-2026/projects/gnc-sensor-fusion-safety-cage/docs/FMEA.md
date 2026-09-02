# FMEA (summary)

- Corrupted/stuck altimeter -> EKF reference biased; cage flags disagreement (tested; limitation: a
  corrupted *reference* is not fixable by the cage — mitigation: independent second sensor channel).
- ML invalid/stale/NaN/OOD -> ML_INVALID/ML_OOD reason -> fallback (tested).
- Covariance growth/divergence -> veto via COVARIANCE_GROWTH (tested).
- Sensor missing/stale -> drop handling (tested).
Residual: single-sensor reference architecture (documented, linked risk RISK-GNC-001/002/003).
