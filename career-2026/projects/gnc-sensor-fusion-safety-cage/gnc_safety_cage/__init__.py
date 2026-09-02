"""GNC sensor-fusion safety cage demonstration (lunar descent scenario).

Self-contained numerical demo: simulated lunar vertical descent, EKF reference
navigation (IMU-like input + range/altimeter measurements), a simulated ML
altitude estimate, and a deterministic safety cage arbitrating ML vs EKF.
All data are synthetic (seed-registered). No flight/real-mission claims.
"""
__version__ = "0.1.0"
