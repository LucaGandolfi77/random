"""Supply Risk Agent - Supply chain risk assessment and mitigation."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class SupplyRisk(BaseAgent):
    """Assesses and mitigates supply chain risks."""
    
    def __init__(self):
        super().__init__("Supply Risk", "Supply chain risk management")
    
    def run(self, garment_sku: str, materials: List[str] = None) -> Dict[str, Any]:
        """Assess supply chain risks."""
        self.status = "assessing"
        
        if materials is None:
            materials = ["cotton", "polyester"]
        
        risks = self._assess_risks(materials)
        mitigation = self._suggest_mitigation(risks)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "risks": risks,
            "mitigation": mitigation,
            "risk_score": self._calculate_risk_score(risks)
        }
    
    def _assess_risks(self, materials: List[str]) -> List[Dict[str, Any]]:
        """Assess risks for each material."""
        risk_factors = {
            "cotton": {"geopolitical": 0.3, "weather": 0.7, "supply": 0.2},
            "polyester": {"geopolitical": 0.5, "weather": 0.1, "supply": 0.4},
            "wool": {"geopolitical": 0.4, "weather": 0.6, "supply": 0.3}
        }
        
        risks = []
        for material in materials:
            factors = risk_factors.get(material, {"geopolitical": 0.3, "weather": 0.3, "supply": 0.3})
            risks.append({
                "material": material,
                "geopolitical_risk": factors["geopolitical"],
                "weather_risk": factors["weather"],
                "supply_risk": factors["supply"],
                "overall_risk": round(sum(factors.values()) / 3, 2)
            })
        
        return risks
    
    def _suggest_mitigation(self, risks: List[Dict[str, Any]]) -> List[str]:
        """Suggest risk mitigation strategies."""
        strategies = []
        
        high_risk_materials = [r["material"] for r in risks if r["overall_risk"] > 0.5]
        
        if high_risk_materials:
            strategies.append(f"Diversify suppliers for {', '.join(high_risk_materials)}")
        
        strategies.extend([
            "Maintain 60-day safety stock",
            "Establish alternative sourcing regions",
            "Sign long-term contracts with key suppliers",
            "Implement real-time supply monitoring"
        ])
        
        return strategies
    
    def _calculate_risk_score(self, risks: List[Dict[str, Any]]) -> float:
        """Calculate overall risk score (0-100)."""
        if not risks:
            return 50.0
        
        avg_risk = sum(r["overall_risk"] for r in risks) / len(risks)
        return round(avg_risk * 100, 1)