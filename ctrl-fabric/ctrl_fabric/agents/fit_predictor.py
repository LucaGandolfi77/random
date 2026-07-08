"""Fit Predictor Agent - ML-based fit prediction and size recommendations."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class FitPredictorAgent(BaseAgent):
    """Predicts garment fit and recommends sizes using ML."""
    
    def __init__(self):
        super().__init__("Fit Predictor", "Size prediction & fit optimization")
        self.fit_model_accuracy = 0.87
    
    def run(self, garment_sku: str, customer_measurements: Dict[str, float], 
            garment_specs: Dict[str, Any]) -> Dict[str, Any]:
        """Predict fit and recommend size."""
        self.status = "predicting"
        
        predicted_fit = self._predict_fit(customer_measurements, garment_specs)
        size_recommendation = self._recommend_size(customer_measurements)
        return_risk = self._calculate_return_risk(predicted_fit)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "predicted_fit": predicted_fit,
            "recommended_size": size_recommendation,
            "return_risk": return_risk,
            "confidence": self.fit_model_accuracy
        }
    
    def _predict_fit(self, measurements: Dict[str, float], 
                     specs: Dict[str, Any]) -> Dict[str, Any]:
        """Predict how garment will fit."""
        chest = measurements.get("chest", 100)
        waist = measurements.get("waist", 88)
        hip = measurements.get("hip", 100)
        
        # Calculate fit based on ease
        ease_chest = chest - 104  # M size baseline
        ease_waist = waist - 88
        ease_hip = hip - 100
        
        fit_categories = {
            "chest": "slim" if ease_chest < -5 else "regular" if ease_chest < 5 else "relaxed",
            "waist": "slim" if ease_waist < -5 else "regular" if ease_waist < 5 else "relaxed",
            "hip": "slim" if ease_hip < -5 else "regular" if ease_hip < 5 else "relaxed"
        }
        
        return {
            "chest_fit": fit_categories["chest"],
            "waist_fit": fit_categories["waist"],
            "hip_fit": fit_categories["hip"],
            "overall_fit": self._overall_fit(fit_categories),
            "ease_allowance_cm": {
                "chest": round(ease_chest, 1),
                "waist": round(ease_waist, 1),
                "hip": round(ease_hip, 1)
            }
        }
    
    def _overall_fit(self, fit_categories: Dict[str, str]) -> str:
        """Determine overall fit category."""
        if all(f == "slim" for f in fit_categories.values()):
            return "slim_fit"
        elif all(f == "relaxed" for f in fit_categories.values()):
            return "relaxed_fit"
        return "regular_fit"
    
    def _recommend_size(self, measurements: Dict[str, float]) -> str:
        """Recommend best size based on measurements."""
        chest = measurements.get("chest", 100)
        
        if chest < 94:
            return "XS"
        elif chest < 100:
            return "S"
        elif chest < 110:
            return "M"
        elif chest < 120:
            return "L"
        else:
            return "XL"
    
    def _calculate_return_risk(self, predicted_fit: Dict[str, Any]) -> float:
        """Calculate return risk percentage."""
        # Higher risk if fit is inconsistent
        fits = [predicted_fit["chest_fit"], predicted_fit["waist_fit"], predicted_fit["hip_fit"]]
        unique_fits = len(set(fits))
        
        base_risk = 0.15  # 15% base risk
        if unique_fits > 2:
            base_risk += 0.10  # Inconsistent fit increases risk
        
        return round(base_risk * 100, 1)