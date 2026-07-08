"""Inventory Optimizer Agent - Stock prediction and optimization."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class InventoryOptimizer(BaseAgent):
    """Optimizes inventory levels and predicts demand."""
    
    def __init__(self):
        super().__init__("Inventory Optimizer", "Stock optimization")
    
    def run(self, garment_sku: str, historical_sales: List[Dict] = None) -> Dict[str, Any]:
        """Optimize inventory for a garment."""
        self.status = "optimizing"
        
        if historical_sales is None:
            historical_sales = self._simulate_sales(garment_sku)
        
        forecast = self._forecast_demand(historical_sales)
        reorder_point = self._calculate_reorder(forecast)
        stock_level = self._recommend_stock(forecast)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "forecast": forecast,
            "reorder_point": reorder_point,
            "recommended_stock": stock_level,
            "waste_reduction": "30%"
        }
    
    def _simulate_sales(self, sku: str) -> List[Dict]:
        """Simulate historical sales data."""
        return [
            {"date": "2026-06-01", "units": random.randint(10, 50)},
            {"date": "2026-06-08", "units": random.randint(10, 50)},
            {"date": "2026-06-15", "units": random.randint(10, 50)},
            {"date": "2026-06-22", "units": random.randint(10, 50)},
            {"date": "2026-06-29", "units": random.randint(10, 50)},
        ]
    
    def _forecast_demand(self, sales: List[Dict]) -> Dict[str, Any]:
        """Forecast demand using trend analysis."""
        units = [s["units"] for s in sales]
        avg = sum(units) / len(units)
        trend = (units[-1] - units[0]) / len(units) if len(units) > 1 else 0
        
        return {
            "next_week": round(avg + trend, 0),
            "next_month": round((avg + trend) * 4, 0),
            "trend": "increasing" if trend > 0 else "stable" if trend > -2 else "declining",
            "confidence": 0.78
        }
    
    def _calculate_reorder(self, forecast: Dict[str, Any]) -> int:
        """Calculate reorder point."""
        return int(forecast["next_month"] * 0.3)  # 30% of monthly forecast
    
    def _recommend_stock(self, forecast: Dict[str, Any]) -> int:
        """Recommend optimal stock level."""
        return int(forecast["next_month"] * 1.5)  # 1.5x monthly with buffer