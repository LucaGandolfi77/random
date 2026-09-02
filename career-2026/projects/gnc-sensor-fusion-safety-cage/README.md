# GNC Sensor-Fusion Safety Cage (lunar descent scenario)

Deterministic Python demonstration: simulated lunar vertical descent where a simulated ML altitude
estimate is arbitrated against an EKF reference by a safety cage using normalized residuals,
covariance monitoring, physical plausibility, OOD flag and sensor health. On disagreement the system
selects EKF and activates fallback; all events are recorded by a flight recorder.

Run: `make test`, `make bench`, `make demo-faults`. All data synthetic (seeded 20260902). Host-only;
no flight/ECSS claims. Selected scenario: lunar descent (best supported by the repository's LLS
project). Full state/measurement/frame definitions in docs/SYSTEM_MODEL.md.
