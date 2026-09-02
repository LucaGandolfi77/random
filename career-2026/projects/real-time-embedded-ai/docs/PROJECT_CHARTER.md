# Project charter (Real-Time Embedded AI)

Demonstrates deterministic embedded ML inference (C++17, no-alloc forward pass, watchdog, deadlines,
fallback, fault injection) as engineering evidence for the portfolio. ML-vs-non-ML comparison: linear
threshold fallback vs tiny neural model; decision: hybrid runtime (ML + deterministic fallback).
Synthetic telemetry-style inputs; not flight hardware.
