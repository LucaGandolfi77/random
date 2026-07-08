"""Production Agent - Factory communication."""

from typing import Dict, Any, List
from .base import BaseAgent


class ProductionAgent(BaseAgent):
    """Manages factory communication and production."""
    
    def __init__(self):
        super().__init__("Production Agent", "Factory communication")
        self.factories = []
    
    def run(self, tech_pack: Dict[str, Any]) -> Dict[str, Any]:
        """Send RFQ to factories and compare quotes."""
        self.status = "sourcing"
        
        # Simulate factory responses
        quotes = [
            {"factory": "Factory A", "moq": 500, "cost": 12.50, "lead_time": 30},
            {"factory": "Factory B", "moq": 300, "cost": 14.00, "lead_time": 20},
            {"factory": "Factory C", "moq": 1000, "cost": 11.00, "lead_time": 45}
        ]
        
        best = min(quotes, key=lambda q: q["cost"])
        
        self.status = "idle"
        return {
            "quotes": quotes,
            "selected_factory": best["factory"],
            "production_cost": best["cost"],
            "moq": best["moq"],
            "lead_time": best["lead_time"]
        }