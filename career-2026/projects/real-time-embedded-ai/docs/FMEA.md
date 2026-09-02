# FMEA (summary)

- Corrupted model weights -> checksum recompute detects -> fallback (tested).
- Input out-of-range/missing -> validation rejects -> fallback (tested).
- Inference timeout (simulated) -> deadline counter + fallback (tested).
- Output NaN/infinite/implausible -> plausibility check -> fallback (tested).
- Watchdog trigger -> status flag (supervision path tested).
Residual: single-host timing variance; no WCET claim; synthetic environment.
