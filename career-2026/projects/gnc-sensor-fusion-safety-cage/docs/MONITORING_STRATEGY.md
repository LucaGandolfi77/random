# Monitoring strategy

Per-cycle: EKF position covariance, |ML-EKF| residual, sensor health flags, OOD flag, mode. Alerts:
residual vetoed (ML_REF_DISAGREE), covariance>200, divergence>500, ML_INVALID/OOD counts.
Fallback: use EKF, mark ACTIVE; recovery when residual<3.5 sigma for N cycles. Metrics: RMSE, max
error, rejection/unnecessary/missed rates, fallback duration, innovation stats (see run_demo).
