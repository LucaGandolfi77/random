"""Data Scientist Agent - Advanced analytics and ML predictions."""

from typing import Dict, Any, List
import random
from datetime import datetime, timedelta
from .base import BaseAgent


class DataScientistAgent(BaseAgent):
    """Analyzes data and generates insights with ML predictions."""
    
    def __init__(self):
        super().__init__("Data Scientist", "Analytics & insights")
        self.insights = []
        self.customer_segments = {}
        self.price_history = {}
    
    def run(self, sales_data: List[Dict] = None, customer_data: List[Dict] = None) -> Dict[str, Any]:
        """Run all analytics."""
        self.status = "analyzing"
        
        if sales_data:
            trends = self.predict_trends(sales_data)
        else:
            trends = self._simulate_trends()
        
        if customer_data:
            segments = self.segment_customers(customer_data)
        else:
            segments = self._simulate_segments()
        
        prices = self.optimize_prices(trends, segments)
        
        self.status = "idle"
        return {
            "trends": trends,
            "segments": segments,
            "price_optimization": prices,
            "recommendation": self._generate_recommendation(trends, segments)
        }
    
    def predict_trends(self, sales_data: List[Dict]) -> Dict[str, Any]:
        """Predict fashion trends using ML simulation."""
        self.status = "predicting_trends"
        
        # Simulate trend prediction based on sales patterns
        categories = {}
        for sale in sales_data:
            cat = sale.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        # Predict next season trends
        trend_scores = {}
        for cat, count in categories.items():
            # Simple ML-like prediction: growth rate + seasonality
            growth = random.uniform(0.8, 1.5)
            seasonal = random.uniform(0.9, 1.2)
            trend_scores[cat] = round(count * growth * seasonal, 2)
        
        return {
            "predicted_categories": trend_scores,
            "confidence": 0.85,
            "forecast_period": "next_90_days",
            "top_trend": max(trend_scores, key=trend_scores.get) if trend_scores else "t-shirts"
        }
    
    def _simulate_trends(self) -> Dict[str, Any]:
        """Simulate trend predictions."""
        return {
            "predicted_categories": {
                "t-shirts": 1250,
                "hoodies": 980,
                "pants": 750,
                "jackets": 420
            },
            "confidence": 0.82,
            "forecast_period": "next_90_days",
            "top_trend": "t-shirts"
        }
    
    def segment_customers(self, customer_data: List[Dict]) -> Dict[str, Any]:
        """Segment customers in real-time using behavioral clustering."""
        self.status = "segmenting"
        
        segments = {
            "premium": {"count": 0, "avg_spend": 0, "preferences": []},
            "value": {"count": 0, "avg_spend": 0, "preferences": []},
            "trend_focused": {"count": 0, "avg_spend": 0, "preferences": []}
        }
        
        for customer in customer_data:
            spend = customer.get("total_spent", 0)
            if spend > 500:
                segments["premium"]["count"] += 1
                segments["premium"]["avg_spend"] += spend
            elif spend > 200:
                segments["value"]["count"] += 1
                segments["value"]["avg_spend"] += spend
            else:
                segments["trend_focused"]["count"] += 1
                segments["trend_focused"]["avg_spend"] += spend
        
        # Calculate averages
        for seg in segments.values():
            if seg["count"] > 0:
                seg["avg_spend"] = round(seg["avg_spend"] / seg["count"], 2)
        
        return segments
    
    def _simulate_segments(self) -> Dict[str, Any]:
        """Simulate customer segmentation."""
        return {
            "premium": {"count": 156, "avg_spend": 650.0, "preferences": ["premium_fabrics", "new_arrivals"]},
            "value": {"count": 342, "avg_spend": 320.0, "preferences": ["sales", "classic_styles"]},
            "trend_focused": {"count": 523, "avg_spend": 120.0, "preferences": ["limited_editions", "social_media"]}
        }
    
    def optimize_prices(self, trends: Dict[str, Any], segments: Dict[str, Any]) -> Dict[str, Any]:
        """Dynamic price optimization based on demand and segments."""
        self.status = "optimizing"
        
        base_prices = {
            "t-shirts": 29.99,
            "hoodies": 59.99,
            "pants": 49.99,
            "jackets": 89.99
        }
        
        optimized = {}
        top_trend = trends.get("top_trend", "t-shirts")
        
        for category, base_price in base_prices.items():
            # Dynamic pricing factors
            demand_factor = 1.2 if category == top_trend else 1.0
            premium_factor = 1.15  # Premium segment willingness to pay
            competition_factor = 0.95  # Market competition
            
            optimized_price = round(base_price * demand_factor * premium_factor * competition_factor, 2)
            optimized[category] = {
                "base_price": base_price,
                "optimized_price": optimized_price,
                "change_percent": round((optimized_price - base_price) / base_price * 100, 1)
            }
        
        return optimized
    
    def _generate_recommendation(self, trends: Dict[str, Any], segments: Dict[str, Any]) -> str:
        """Generate actionable recommendation."""
        top = trends.get("top_trend", "t-shirts")
        premium_count = segments.get("premium", {}).get("count", 0)
        
        return f"Increase {top} inventory by 20%, target premium segment ({premium_count} customers) with early access"