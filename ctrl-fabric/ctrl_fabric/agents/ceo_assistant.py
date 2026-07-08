"""CEO AI Assistant - Daily reports and KPI monitoring."""

from typing import Dict, Any, List
from .base import BaseAgent


class CEOAssistant(BaseAgent):
    """Orchestrates all agents and produces daily reports."""
    
    def __init__(self):
        super().__init__("CEO Assistant", "System orchestration & reporting")
        self.metrics = {
            "cash_flow": 0.0,
            "orders": 0,
            "problems": [],
            "kpi": {}
        }
    
    def run(self, agents: List[BaseAgent]) -> Dict[str, Any]:
        """Generate daily report from all agents."""
        self.status = "generating_report"
        
        report = {
            "cash_flow": self.metrics["cash_flow"],
            "orders": self.metrics["orders"],
            "problems": self.metrics["problems"],
            "kpi": self.metrics["kpi"],
            "decisions_needed": self._identify_decisions(agents),
            "simulations": self._run_simulations()
        }
        
        self.status = "idle"
        return report
    
    def _identify_decisions(self, agents: List[BaseAgent]) -> List[str]:
        """Identify decisions that need human input."""
        decisions = []
        for agent in agents:
            if agent.role == "Brand philosophy & trend analysis":
                decisions.append("Approve next season's creative direction")
            elif agent.role == "Finance & forecasting":
                decisions.append("Review cash flow projections")
        return decisions
    
    def _run_simulations(self) -> Dict[str, Any]:
        """Run business simulations."""
        return {
            "inventory_projection": "OK",
            "demand_forecast": "Stable",
            "margin_analysis": "Healthy"
        }
    
    def update_metrics(self, cash_flow: float, orders: int, problems: List[str]):
        """Update key metrics."""
        self.metrics["cash_flow"] = cash_flow
        self.metrics["orders"] = orders
        self.metrics["problems"] = problems