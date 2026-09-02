# Operational design domain (demo)

Altitude 0–2000 m, |vel| bounded, altimeter sigma<=1.5 m, ML error sigma<=3 m, sample 10 Hz, dt 0.1 s.
Nominal: healthy sensors, no bias/stale/OOD. Degraded: single measurement drop, bounded noise.
Prohibited: sensor bias>10 m unattended, ML stale>5 s, covariance>500 — cage must veto or fallback.
Unverified: real sensors, real ML, target hardware.
