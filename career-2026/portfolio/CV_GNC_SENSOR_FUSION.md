# CV description — GNC / sensor fusion

One line: "Designed a lunar-descent sensor-fusion safety cage that arbitrates simulated ML
navigation estimates against an EKF reference using normalized innovations, covariance monitoring
and deterministic fallback, with fault campaigns and a flight recorder."

Three bullets:
- Implemented an EKF reference navigation (IMU input + altimeter updates) with explicit state,
  noise and observability documentation.
- Built a deterministic safety cage (residual vs combined covariance, covariance growth,
  physical plausibility, OOD) that never uses ML confidence alone.
- Ran reproducible fault campaigns (bias, stuck, stale, missing, outlier, disagreement,
  covariance growth) and reported RMSE, rejection/unnecessary/missed rates and recorder events.

Synthetic host demonstration; no flight or certification claims.
