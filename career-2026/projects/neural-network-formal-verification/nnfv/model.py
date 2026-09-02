"""Reuse a small ReLU network exported from the Real-Time Embedded AI module.

The C++ header `tiny_anomaly_model.h` (model version 1.2, seed 20260101) contains
a 3->8 ReLU -> logistic network with an explicit input scale. Formal verification
is applied to the *logit* (affine output before logistic), which is order
equivalent to the probability output: for any monotonic increasing final map,
upper bound on the logit implies upper bound on probability. All properties are
declared in raw (physical) input units; the model's input scale is folded into
the first affine layer inside this package.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np

PROJECT_DIR = Path(__file__).resolve().parents[1]
MODEL_HEADER = PROJECT_DIR.parent / "real-time-embedded-ai" / "models" / "tiny_anomaly_model.h"


def parse_cpp_floats(text: str, marker: str) -> np.ndarray:
    block = re.search(rf"{re.escape(marker)}(?:\[\d+\])?\s*=\s*\{{([^}}]+)\}}", text)
    if block is None:
        raise ValueError(f"marker {marker} not found in model header")
    values = [float(v.rstrip('f')) for v in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?f?", block.group(1))]
    return np.asarray(values, dtype=np.float64)


def load_embedded_model(header: Path | None = None) -> dict:
    header = header or MODEL_HEADER
    text = header.read_text(encoding="utf-8")
    scale = parse_cpp_floats(text, "kInputScale")
    w1 = parse_cpp_floats(text, "kWeights1")
    b1 = parse_cpp_floats(text, "kBias1")
    w2 = parse_cpp_floats(text, "kWeights2")
    b2 = float(re.search(r"kBias2\s*=\s*([-+]?\d*\.?\d+)f?", text).group(1))
    n_in, n_hid = 3, 8
    W1 = w1.reshape(n_hid, n_in).T * scale[:, None]  # fold scale into W1 (physical -> hidden)
    B1 = b1
    W2 = w2.reshape(n_hid, 1)
    return {
        "model_id": "PRJ-RT-001-model-v1.2",
        "header_path": str(header),
        "W1": np.ascontiguousarray(W1, dtype=np.float64),
        "B1": np.ascontiguousarray(B1, dtype=np.float64),
        "W2": np.ascontiguousarray(W2, dtype=np.float64),
        "B2": float(b2),
        "activation": "relu",
        "final_map": "logistic (verified on logit; order-equivalent)",
        "hash": __import__("hashlib").sha256(header.read_bytes()).hexdigest()[:16],
    }


def forward_logit(model: dict, x: np.ndarray) -> np.ndarray:
    h = np.maximum(x @ model["W1"] + model["B1"], 0.0)
    return h @ model["W2"] + model["B2"]


def sigmoid(z: np.ndarray) -> np.ndarray:
    z = np.clip(z, -30.0, 30.0)
    return 1.0 / (1.0 + np.exp(-z))
