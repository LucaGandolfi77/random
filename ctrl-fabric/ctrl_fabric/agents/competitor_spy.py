"""Competitor Spy Agent - Market intelligence and price monitoring."""

from typing import Dict, Any, List
import random
from datetime import datetime
from .base import BaseAgent


class CompetitorSpy(BaseAgent):
    """Monitors competitors and market pricing."""
    
    def __init__(self):
        super().__init__("Competitor Spy", "Market intelligence")
        self.competitors = ["Patagonia", "Uniqlo", "Lululemon", "Nike", "Arc'teryx"]
    
    def run(self, garment_sku: str, category: str = "t-shirts") -> Dict[str, Any]:
        """Analyze competitor landscape."""
        self.status = "monitoring"
        
        prices = self._get_competitor_prices(category)
        opportunities = self._find_opportunities(prices)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "category": category,
            "competitor_prices": prices,
            "market_position": self._calculate_position(prices),
            "opportunities": opportunities
        }
    
    def _get_competitor_prices(self, category: str) -> Dict[str, Any]:
        """Get competitor pricing data."""
        base_prices = {
            "t-shirts": {"Patagonia": 35, "Uniqlo": 15, "Lululemon": 45, "Nike": 30, "Arc'teryx": 55},
            "hoodies": {"Patagonia": 120, "Uniqlo": 40, "Lululemon": 100, "Nike": 80, "Arc'teryx": 150},
            "pants": {"Patagonia": 80, "Uniqlo": 30, "Lululemon": 90, "Nike": 60, "Arc'teryx": 120}
        }
        
        prices = base_prices.get(category, base_prices["t-shirts"])
        
        # Add variation
        for comp in prices:
            prices[comp] += random.randint(-5, 5)
        
        return prices
    
    def _calculate_position(self, prices: Dict[str, float]) -> Dict[str, Any]:
        """Calculate market position."""
        avg_price = sum(prices.values()) / len(prices)
        our_price = 29.99  # Our price
        
        position = "premium" if our_price > avg_price * 1.2 else "competitive" if our_price > avg_price * 0.8 else "value"
        
        return {
            "average_market_price": round(avg_price, 2),
            "our_price": our_price,
            "position": position,
            "price_index": round(our_price / avg_price, 2)
        }
    
    def _find_opportunities(self, prices: Dict[str, float]) -> List[str]:
        """Find market opportunities."""
        opportunities = []
        
        # Find gaps
        sorted_prices = sorted(prices.values())
        if sorted_prices[-1] - sorted_prices[0] > 30:
            opportunities.append("Price gap opportunity in mid-tier")
        
        # Check for underserved segments
        opportunities.append("Technical wear segment growing 15% YoY")
        opportunities.append("Sustainable materials premium +25%")
        
        return opportunities