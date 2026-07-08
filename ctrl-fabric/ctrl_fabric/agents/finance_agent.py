"""Finance Agent - Cash flow and forecasting."""

from typing import Dict, Any
from .base import BaseAgent


class FinanceAgent(BaseAgent):
    """Manages financial operations."""
    
    def __init__(self):
        super().__init__("Finance Agent", "Finance & forecasting")
        self.cash_flow = 0.0
        self.margin = 0.0
    
    def run(self) -> Dict[str, Any]:
        """Generate financial report."""
        self.status = "calculating"
        
        report = {
            "cash_flow": self.cash_flow,
            "margin": self.margin,
            "vat": self.cash_flow * 0.22,
            "taxes": self.cash_flow * 0.25,
            "forecast_30_days": self.cash_flow * 1.15
        }
        
        self.status = "idle"
        return report
    
    def update_cash_flow(self, amount: float):
        """Update cash flow."""
        self.cash_flow += amount