"""EKF reference navigation, simulated ML estimate, and the safety cage."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .model import DT, DeterministicDynamics, ScenarioFaults, SensorModel, SimConfig, TruthState


@dataclass
class EkfState:
    x: np.ndarray = field(default_factory=lambda: np.array([2000.0, 0.0, 0.0]))
    P: np.ndarray = field(default_factory=lambda: np.diag([10.0, 1.0, 0.01]))
    t: float = 0.0
    last_measurement_t: float = -1e9


class Ekf:
    """Extended Kalman filter for vertical descent (accel-as-input model)."""

    def __init__(self, cfg: SimConfig, init_alt: float) -> None:
        self.cfg = cfg
        self.s = EkfState(x=np.array([init_alt, 0.0, 0.0]))

    def predict(self, a_cmd: float, dt: float = DT) -> None:
        alt, vel, bias = self.s.x
        # nonlinear-ish integrate accel input (linear here; kept EKF structure)
        F = np.array([[1.0, dt, 0.5 * dt * dt], [0.0, 1.0, dt], [0.0, 0.0, 1.0]])
        u = a_cmd * np.array([0.5 * dt * dt, dt, 0.0])
        self.s.x = F @ self.s.x + u
        self.s.P = F @ self.s.P @ F.T + self.cfg.process_q
        self.s.x[0] = max(self.s.x[0], 0.0)
        self.s.t += dt

    def update_range(self, z: float, sigma: float = 1.5) -> None:
        H = np.array([[1.0, 0.0, 0.0]])
        R = np.array([[sigma * sigma]])
        y = z - (H @ self.s.x)[0]
        S = (H @ self.s.P @ H.T)[0, 0] + R[0, 0]
        K = self.s.P @ H.T / S
        self.s.x = self.s.x + K.flatten() * y
        self.s.P = (np.eye(3) - K @ H) @ self.s.P
        self.s.last_measurement_t = self.s.t

    def innovation(self, z: float) -> tuple[float, float]:
        H = np.array([[1.0, 0.0, 0.0]])
        y = z - (H @ self.s.x)[0]
        S = (H @ self.s.P @ H.T)[0, 0] + self.cfg.altimeter_sigma ** 2
        return y, float(np.sqrt(S))

    def position_cov(self) -> float:
        return float(self.s.P[0, 0])


class MlEstimator:
    """Simulated ML altitude estimator with injectable faults.

    Produces an altitude estimate and an OOD flag; the 'ML confidence' is never
    used alone as a safety proof (the cage compares physics-based evidence).
    """

    def __init__(self, cfg: SimConfig, rng: np.random.Generator, faults) -> None:
        self.cfg = cfg
        self.rng = rng
        self.f = faults
        self.held_alt: float | None = None
        self.held_since = -1

    def estimate(self, truth: TruthState, i: int) -> tuple[float | None, bool]:
        if self.f.ml_nan_from > -1 and i >= self.f.ml_nan_from:
            return float("nan"), False
        if self.f.ml_stale_from > -1 and i >= self.f.ml_stale_from:
            if self.held_since < 0:
                self.held_alt = truth.alt
                self.held_since = i
            return self.held_alt, False
        bias = 0.0
        if self.f.ml_bias_from > -1 and i >= self.f.ml_bias_from:
            bias = (i - self.f.ml_bias_from) * 0.3  # ramp m/sample
        ood = self.f.ml_ood_from > -1 and i >= self.f.ml_ood_from
        return truth.alt + bias + self.rng.normal(0, self.cfg.ml_sigma), ood


@dataclass
class Intervention:
    i: int
    timestamp: float
    reason_code: str
    alt_truth: float
    ml_est: float | None
    ekf_alt: float
    covariance: float
    residual: float | None
    selected_source: str
    fallback_status: str
    linked_risk: str
    linked_test: str


@dataclass
class FlightRecorder:
    t: list[float] = field(default_factory=list)
    truth_alt: list[float] = field(default_factory=list)
    ekf_alt: list[float] = field(default_factory=list)
    ml_alt: list[float | None] = field(default_factory=list)
    ml_accepted: list[bool] = field(default_factory=list)
    mode: list[str] = field(default_factory=list)
    interventions: list[Intervention] = field(default_factory=list)
    imu_samples: int = 0
    altimeter_updates: int = 0
    altimeter_drops: int = 0


class SafetyCage:
    """Deterministic arbitration between ML estimate and EKF reference.

    Decision inputs: normalized innovation-like residual (|ml-ekf|/sigma_combined),
    EKF position covariance, physical plausibility, OOD flag, sensor health.
    ML confidence alone never triggers acceptance.
    """

    def __init__(self, cfg: SimConfig, ml_sigma_factor: float = 3.5,
                 cov_limit: float = 200.0, veto_cov: float = 500.0) -> None:
        self.cfg = cfg
        self.ml_sigma_factor = ml_sigma_factor
        self.cov_limit = cov_limit
        self.veto_cov = veto_cov

    def evaluate(self, i: int, truth: TruthState, ml_alt: float | None, ml_ood: bool,
                 ekf: Ekf) -> Intervention:
        ekf_alt = float(ekf.s.x[0])
        cov = ekf.position_cov()
        reasons: list[str] = []

        if ml_alt is None or not np.isfinite(ml_alt):
            reasons.append("ML_INVALID_OR_MISSING")
        if not np.isfinite(ekf_alt) or cov > self.veto_cov:
            reasons.append("FILTER_DIVERGENCE")
        if cov > self.cov_limit:
            reasons.append("COVARIANCE_GROWTH")
        if ml_ood:
            reasons.append("ML_OOD_FLAG")

        sigma_ml = self.cfg.ml_sigma
        sigma_comb = np.hypot(sigma_ml, np.sqrt(max(cov, 1e-9)))
        residual: float | None = None
        if ml_alt is not None and np.isfinite(ml_alt) and np.isfinite(ekf_alt):
            residual = float(ml_alt - ekf_alt)
            if abs(residual) > self.ml_sigma_factor * sigma_comb:
                reasons.append("ML_REF_DISAGREE")

        # physical plausibility of ML altitude
        if ml_alt is not None and np.isfinite(ml_alt) and (ml_alt < -10.0 or ml_alt > 20000.0):
            reasons.append("ML_PHYSICALLY_IMPLAUSIBLE")

        fallback = bool(reasons)
        selected = "EKF_FALLBACK" if fallback else "ML_ACCEPTED"
        reason_code = "|".join(sorted(set(reasons))) if reasons else "OK"
        risk = "RISK-GNC-002" if "ML_REF_DISAGREE" in reasons else (
            "RISK-GNC-001" if "ML_INVALID_OR_MISSING" in reasons else "RISK-GNC-003")
        test = "TEST-CAGE-NOMINAL"
        if "ML_REF_DISAGREE" in reasons:
            test = "TEST-CAGE-DISAGREE"
        elif "COVARIANCE_GROWTH" in reasons or "FILTER_DIVERGENCE" in reasons:
            test = "TEST-CAGE-COV"
        elif "ML_INVALID_OR_MISSING" in reasons:
            test = "TEST-CAGE-MISSING"
        return Intervention(i=i, timestamp=truth.t, reason_code=reason_code,
                            alt_truth=float(truth.alt), ml_est=ml_alt, ekf_alt=ekf_alt,
                            covariance=float(cov), residual=residual, selected_source=selected,
                            fallback_status="ACTIVE" if fallback else "NOMINAL",
                            linked_risk=risk, linked_test=test)


def run_simulation(cfg: SimConfig | None = None, faults: ScenarioFaults | None = None) -> FlightRecorder:
    """Run the full scenario; returns a FlightRecorder with interventions/metrics inputs."""
    cfg = cfg or SimConfig()
    faults = faults or ScenarioFaults(seed=20260902)
    rng = np.random.default_rng(faults.seed)
    truth = TruthState(alt=cfg.initial_alt, vel=cfg.initial_vel)
    dynamics = DeterministicDynamics(cfg, seed=faults.seed)
    sensors = SensorModel(cfg, rng, faults)
    ml = MlEstimator(cfg, rng, faults)
    ekf = Ekf(cfg, init_alt=cfg.initial_alt)
    cage = SafetyCage(cfg)
    rec = FlightRecorder()
    n = int(cfg.duration_s / DT)
    for i in range(n):
        dynamics.step(truth)
        a_cmd = truth.a_cmd
        ekf.predict(a_cmd)
        z, imu = sensors.measure(truth, i)
        rec.imu_samples += 1
        if z is not None:
            # apply measurement delay by simply skipping update when stale/delayed period active
            if faults.delay_samples > 0 and i % (faults.delay_samples + 1) == 0 and i > 0:
                rec.altimeter_drops += 1
            else:
                ekf.update_range(z, cfg.altimeter_sigma)
                rec.altimeter_updates += 1
        else:
            rec.altimeter_drops += 1
        ml_alt, ml_ood = ml.estimate(truth, i)
        intervention = cage.evaluate(i, truth, ml_alt, ml_ood, ekf)
        accepted_ml = intervention.selected_source == "ML_ACCEPTED"
        rec.t.append(truth.t)
        rec.truth_alt.append(truth.alt)
        rec.ekf_alt.append(float(ekf.s.x[0]))
        rec.ml_alt.append(ml_alt)
        rec.ml_accepted.append(accepted_ml)
        rec.mode.append(intervention.fallback_status)
        rec.interventions.append(intervention)
    return rec
