# System model

Scenario: lunar descent (documented choice — matches the Workbench Lunar Landing Safety Cage project).
State x = [altitude (m, +down from 2000 m), vertical velocity (m/s, +down), accel bias (m/s2)].
Process: commanded braking accel + bias (constant 0.35 m/s2 simulated), dt=0.1 s. Measurement: range
(altimeter) 10 Hz, sigma 1.5 m; IMU accel as control input, sigma 0.05 m/s2. ML estimate: simulated
altitude, sigma 3 m. Units SI; frames in docs/COORDINATE_FRAMES.md. Init: alt 2000, P0=diag(10,1,0.01).
Observability note: bias observable only via IMU/range mix; altimeter-only outages degrade velocity
observability (documented limitation).
