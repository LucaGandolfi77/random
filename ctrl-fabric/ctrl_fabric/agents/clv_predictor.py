"""CLV Predictor Agent - Customer Lifetime Value prediction."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class CLVPredictor(BaseAgent):
    """Predicts customer lifetime value and retention."""
    
    def __init__(self):
        super().__init__("CLV Predictor", "Customer lifetime value")
    
    def run(self, customer_id: str = None, purchase_history: List[Dict] = None) -> Dict[str, Any]:
        """Predict CLV for customer or segment."""
        self.status = "predicting"
        
        if purchase_history is None:
            purchase_history = self._simulate_history()
        
        clv = self._calculate_clv(purchase_history)
        retention = self._predict_retention(purchase_history)
        
        self.status = "idle"
        return {
            "customer_id": customer_id or "segment_avg",
            "predicted_clv": clv,
            "retention_probability": retention,
            "next_purchase_days": self._predict_next_purchase(purchase_history)
        }
    
    def _simulate_history(self) -> List[Dict]:
        """Simulate purchase history."""
        return [
            {"date": "2026-01-15", "amount": 29.99, "category": "t-shirts"},
            {"date": "2026-03-22", "amount": 59.99, "category": "hoodies"},
            {"date": "2026-05-10", "amount": 49.99, "category": "pants"},
        ]
    
    def _calculate_clv(self, history: List[Dict]) -> float:
        """Calculate customer lifetime value."""
        total_spent = sum(h["amount"] for h in history)
        purchase_frequency = len(history) / 6  # purchases per month
        
        # Simple CLV model: avg monthly spend * predicted months
        avg_monthly = total_spent / 6
        predicted_months = 24  # 2 year prediction
        
        return round(avg_monthly * predicted_months * 0.7, 2)  # 70% retention factor
    
    def _predict_retention(self, history: List[Dict]) -> float:
        """Predict retention probability."""
        if len(history) < 2:
            return 0.65
        
        # Higher retention for frequent buyers
        frequency = len(history) / 6
        base = 0.5 + (frequency * 0.1)
        
        return min(0.95, round(base, 2))
    
    def _predict_next_purchase(self, history: List[Dict]) -> int:
        """Predict days until next purchase."""
        if len(history) < 2:
            return 30
        
        # Simple average interval
        return random.randint(20, 45)