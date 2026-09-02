# Case study — Space AI V&V Test Bench (digital twin / HIL-oriented)

Problem: a reproducible bench to run MIL/SIL for a lunar-descent ML/controller system with explicit
level labelling (no fake HIL). Architecture: deterministic plant, environment noise, SimClock (sim vs
wall time, pause, sync), safety monitor, telemetry, evidence export (JSON), protocol v1.0. Results:
MIL and SIL executed (6 tests PASS, deterministic same-seed repeatability, safe-state trigger
verified); PIL and HIL explicitly Not Executed (no hardware). Trade-offs: in-process fidelity vs
socket-based real IPC; step-count loops vs wall-time guards. Limits: synthetic, host-only, no board.
Contribution: honest level matrix + evidence export. CV bullets: (1) built a deterministic
MIL/SIL test bench with simulation-time management and safe-state monitoring; (2) defined protocol
v1.0 and evidence export for reproducible runs; (3) documented PIL/HIL as Not Executed rather than
simulating hardware results.
