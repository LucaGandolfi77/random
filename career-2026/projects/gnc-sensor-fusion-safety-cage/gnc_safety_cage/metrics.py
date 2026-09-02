"""Metrics computed from a FlightRecorder (host simulation only, not hardware)."""
from __future__ import annotations

import math

import numpy as np

from .ekf_cage import FlightRecorder


def compute_metrics(rec: FlightRecorder) -> dict:
    truth = np.asarray(rec.truth_alt)
    ekf = np.asarray(rec.ekf_alt)
    accepted = np.asarray([bool(a) for a in rec.ml_accepted], dtype=bool)
    ml = np.asarray([float(v) if v is not None else math.nan for v in rec.ml_alt])

    ekf_err = ekf - truth
    rmse_ekf = float(np.sqrt(np.mean(ekf_err ** 2)))
    max_ekf = float(np.max(np.abs(ekf_err)))

    valid = np.isfinite(ml) & accepted
    ml_err = ml[valid] - truth[valid]
    rmse_ml = float(np.sqrt(np.mean(ml_err ** 2))) if ml_err.size else math.nan
    max_ml = float(np.max(np.abs(ml_err))) if ml_err.size else math.nan

    interventions = rec.interventions
    falls = [iv for iv in interventions if iv.fallback_status == "ACTIVE"]
    reasons = [iv.reason_code for iv in falls]
    rejection_rate = len(falls) / max(len(interventions), 1)
    # unnecessary interventions: fallback while |residual| small and no fault flagged
    unnecessary = [iv for iv in falls if iv.residual is not None and abs(iv.residual) < 3.0
                   and "ML_OOD" not in iv.reason_code and "ML_INVALID" not in iv.reason_code
                   and "COVARIANCE" not in iv.reason_code and "DIVERGENCE" not in iv.reason_code]
    unnecessary_rate = len(unnecessary) / max(len(falls), 1)
    # missed unsafe: ML accepted while |ml - ekf| big (cage should have vetoed)
    truth_arr = np.asarray(rec.truth_alt)
    missed = sum(
        1 for iv in interventions
        if iv.selected_source == "ML_ACCEPTED" and iv.ml_est is not None
        and abs(iv.ml_est - truth_arr[iv.i]) > 15.0
    )
    innovations = np.array([iv.residual for iv in interventions if iv.residual is not None])
    return {
        "ekf_rmse_m": rmse_ekf, "ekf_max_error_m": max_ekf,
        "ml_rmse_m": rmse_ml, "ml_max_error_m": max_ml,
        "ml_accepted_ratio": float(valid.mean()) if ml.size else math.nan,
        "rejected_measurement_rate": rejection_rate,
        "unnecessary_intervention_rate": unnecessary_rate,
        "missed_unsafe_estimates": int(missed),
        "innovation_mean": float(innovations.mean()) if innovations.size else math.nan,
        "innovation_std": float(innovations.std()) if innovations.size else math.nan,
        "fallback_samples": int(len(falls)),
        "reason_codes": {r: reasons.count(r) for r in sorted(set(reasons))},
        "mode": "synthetic-host-simulation",
    }
