from pathlib import Path

import joblib
import numpy as np

from .features import extract_aggregated
from .phrases import get_phrase

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
CLASSES = ["brushing", "food", "isolation"]


def load_model():
    scaler = joblib.load(str(MODELS_DIR / "scaler.joblib"))
    model = joblib.load(str(MODELS_DIR / "model.joblib"))
    return scaler, model


def predict(wav_path: str) -> dict:
    scaler, model = load_model()

    feats = extract_aggregated(wav_path)
    if feats.sum() == 0:
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "phrase": "Non ho sentito nessun miagolio. Il tuo gatto ti giudica in silenzio.",
        }

    feats_scaled = scaler.transform(feats.reshape(1, -1))
    probs = model.predict_proba(feats_scaled)[0]
    pred_idx = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    intent = CLASSES[pred_idx]
    phrase = get_phrase(intent, confidence)

    return {
        "intent": intent,
        "confidence": round(confidence, 3),
        "phrase": phrase,
    }
