# Case study — GNC sensor-fusion safety cage (lunar descent demo)

Problem: accept or reject a simulated ML navigation estimate using physics-based evidence, not ML
confidence. Architecture: deterministic lunar-descent simulator, EKF reference (IMU input +
altimeter updates), simulated ML altitude estimate, safety cage comparing residual vs combined
covariance, covariance/physical/OOD checks, fallback to EKF, flight recorder with reason codes.
Measured (synthetic host, seed 20260902): nominal ML accepted ~100%, zero unnecessary
interventions, zero missed unsafe; injected ML bias ramp/stale/NaN/OOD -> fallback with reason
codes; altimeter bias/stuck flag disagreement and single-reference limitation documented.
Trade-offs: 1-D EKF vs 3-D attitude; float vs fixed point; host vs hardware. Limits: synthetic,
single-sensor reference, host-only timing. Contribution: reusable deterministic arbitration +
recorder + fault campaign. CV bullets: (1) built an EKF-based sensor-fusion safety cage
arbitrating ML estimates against a physics reference; (2) deterministic fault campaigns (bias,
stuck, stale, missing, OOD, covariance growth) with rejection/miss metrics; (3) recorder-driven
reason codes and fallback transitions with documented limitations.
