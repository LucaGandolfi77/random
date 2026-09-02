"""Embedded Vision-Based Navigation demo: safe-landing-zone classification.

Lightweight, verifiable pipeline on synthetic 32x32 grayscale terrain frames:
feature extraction -> logistic classifier -> softmax -> OOD proxy -> temporal
consistency -> fallback. FP32 vs INT8 emulation. No full autonomous guidance is
claimed; camera/ODD documented in docs.
"""
from __future__ import annotations

import math
import statistics
import time
from dataclasses import dataclass, field

import numpy as np

N_FEATURES = 6


def _render_frame(rng: np.random.Generator, hazard_prob: float, style: float = 1.0) -> tuple[np.ndarray, int]:
    """Synthetic terrain patch 32x32. label 1 = central area flat/safe."""
    img = rng.normal(0.5, 0.08, size=(32, 32)).astype(np.float32)
    # smooth base by blurring rows
    img = np.clip(img + 0.1 * np.sin(np.linspace(0, 2 * np.pi, 32)[None, :] * style), 0, 1)
    if rng.random() < hazard_prob:
        # random bright/dark obstacle blobs (unsafe when central obstacle large)
        for _ in range(rng.integers(1, 4)):
            cy = int(rng.integers(8, 24))
            cx = int(rng.integers(8, 24))
            r = int(rng.integers(2, 5))
            img[cy - r:cy + r, cx - r:cx + r] = rng.choice([0.0, 1.0])
    center = img[12:20, 12:20]
    unsafe = float(np.mean(np.abs(center - np.median(center)))) > 0.35
    label = 0 if unsafe else 1
    return img, label


def _features(img: np.ndarray) -> np.ndarray:
    center = img[12:20, 12:20]
    edge = np.abs(np.diff(img, axis=1)).mean()
    return np.array([float(np.mean(img)), float(np.std(img)), float(np.std(center)),
                     float(np.mean(np.abs(center - np.median(center)))), float(edge),
                     float(np.percentile(img, 99) - np.percentile(img, 1))], dtype=np.float64)


@dataclass
class DataConfig:
    n_train: int = 800
    n_test: int = 300
    hazard_prob: float = 0.5
    seed: int = 20260910


def make_dataset(cfg: DataConfig) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(cfg.seed)
    X, y = [], []
    for _ in range(cfg.n_train):
        img, label = _render_frame(rng, cfg.hazard_prob)
        X.append(_features(img))
        y.append(label)
    Xt, yt = [], []
    rng2 = np.random.default_rng(cfg.seed + 1)
    for _ in range(cfg.n_test):
        img, label = _render_frame(rng2, cfg.hazard_prob)
        Xt.append(_features(img))
        yt.append(label)
    return np.asarray(X), np.asarray(y), np.asarray(Xt), np.asarray(yt)


def standardize(X: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    mu = X.mean(axis=0)
    sd = X.std(axis=0) + 1e-6
    return (X - mu) / sd, mu, sd


class LogisticVision:
    """Tiny deterministic linear classifier on 6 engineered features."""

    def __init__(self, seed: int = 7) -> None:
        self.rng = np.random.default_rng(seed)
        self.w = np.zeros(N_FEATURES + 1)

    def fit(self, Xs: np.ndarray, y: np.ndarray, epochs: int = 300, lr: float = 0.5) -> None:
        X = np.hstack([Xs, np.ones((Xs.shape[0], 1))])
        for _ in range(epochs):
            z = X @ self.w
            p = 1.0 / (1.0 + np.exp(-np.clip(z, -20, 20)))
            grad = X.T @ (p - y) / len(y)
            self.w -= lr * grad

    def logits(self, Xs: np.ndarray) -> np.ndarray:
        X = np.hstack([Xs, np.ones((Xs.shape[0], 1))])
        return X @ self.w

    def predict_proba(self, Xs: np.ndarray) -> np.ndarray:
        z = np.clip(self.logits(Xs), -30, 30)
        p = 1.0 / (1.0 + np.exp(-z))
        return np.stack([1.0 - p, p], axis=1)


def quantize_int8(w: np.ndarray) -> tuple[np.ndarray, float]:
    scale = float(np.max(np.abs(w))) / 127.0
    if scale == 0:
        return np.zeros_like(w), 0.0
    q = np.clip(np.round(w / scale), -127, 127).astype(np.int8)
    return q, scale


def accuracy(model: LogisticVision, mu: np.ndarray, sd: np.ndarray, X: np.ndarray, y: np.ndarray,
             quantized: bool = False) -> float:
    Xs = (X - mu) / sd
    if quantized:
        qw, scale = quantize_int8(model.w)
        logits = np.hstack([Xs, np.ones((Xs.shape[0], 1))]) @ (qw.astype(np.float64) * scale)
        p = 1.0 / (1.0 + np.exp(-np.clip(logits, -30, 30)))
        pred = (p >= 0.5).astype(int)
    else:
        pred = model.predict_proba(Xs).argmax(axis=1)
    return float(np.mean(pred == y))


def perturb(img: np.ndarray, kind: str) -> np.ndarray:
    out = img.copy()
    if kind == "lowlight":
        out = out * 0.35
    elif kind == "overexposure":
        out = np.clip(out * 2.2 + 0.15, 0, 1)
    elif kind == "blur":
        kernel = np.ones((3, 3)) / 9.0
        out = np.zeros_like(img)
        for i in range(3):
            for j in range(3):
                out[1:-1, 1:-1] += kernel[i, j] * img[i:i + 30, j:j + 30]
    elif kind == "noise":
        out = np.clip(out + np.random.default_rng(0).normal(0, 0.12, size=img.shape), 0, 1)
    elif kind == "occlusion":
        out[6:16, 22:32] = 0.0
    elif kind == "compression":
        small = out[::2, ::2]
        out = np.kron(small, np.ones((2, 2))) / 1.0
    elif kind == "unseen_terrain":
        out = np.clip(out + 0.4 * np.cos(np.linspace(0, 6 * np.pi, 32)[None, :]), 0, 1)
    elif kind == "corrupted":
        out = np.full((32, 32), np.nan)
    return out


@dataclass
class FrameResult:
    label: int
    probability: float
    ood: bool
    fallback: bool
    fallback_reason: str
    latency_ms: float


class VisionPipeline:
    def __init__(self, model: LogisticVision, mu: np.ndarray, sd: np.ndarray,
                 fallback_label: int = 1, history: int = 3) -> None:
        self.model = model
        self.mu = mu
        self.sd = sd
        self.fallback_label = fallback_label
        self.history: list[int] = field(default_factory=list) if False else []
        self.max_history = history

    def process(self, img: np.ndarray) -> FrameResult:
        start = time.perf_counter()
        if img.shape != (32, 32) or not np.all(np.isfinite(img)):
            return FrameResult(0, 0.0, ood=True, fallback=True,
                               fallback_reason="corrupted_or_missing_frame",
                               latency_ms=(time.perf_counter() - start) * 1000)
        feats = _features(img)
        Xs = (feats - self.mu) / self.sd
        ood = bool(np.any(np.abs(Xs) > 6.0))
        proba = self.model.predict_proba(Xs[None, :])[0]
        label = int(proba.argmax())
        p = float(proba[label])
        self.history.append(label)
        if len(self.history) > self.max_history:
            self.history.pop(0)
        # temporal consistency: use median of last k if window full
        if len(self.history) == self.max_history:
            label = int(statistics.median(self.history))
            p = float(proba[label])
        fallback = False
        reason = ""
        if p < 0.55 or ood:
            fallback = True
            reason = "low_confidence_or_ood"
            label = self.fallback_label
            p = 0.5
        return FrameResult(label=label, probability=p, ood=ood, fallback=fallback,
                           fallback_reason=reason,
                           latency_ms=(time.perf_counter() - start) * 1000)
