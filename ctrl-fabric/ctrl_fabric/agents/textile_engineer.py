"""Textile Engineer AI - Fabric specifications."""

from typing import Dict, Any, Optional
from .base import BaseAgent


class TextileEngineer(BaseAgent):
    """Specializes in textile specifications."""
    
    def __init__(self):
        super().__init__("Textile Engineer", "Fabric specifications")
        self.fabrics = {
            "french_terry": {"gsm": 420, "traspirabilita": 8.5, "pilling": 4},
            "cotton_combed": {"gsm": 210, "traspirabilita": 7.0, "pilling": 5},
            "polyester_fleece": {"gsm": 300, "traspirabilita": 6.0, "pilling": 3}
        }
    
    def run(self, garment_type: str, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend fabric based on requirements."""
        self.status = "analyzing"
        
        # Simple recommendation logic
        if garment_type == "hoodie":
            recommendation = "french_terry"
            reason = "420 gsm for warmth, good durability"
        elif garment_type == "tshirt":
            recommendation = "cotton_combed"
            reason = "210 gsm for comfort, good breathability"
        else:
            recommendation = "polyester_fleece"
            reason = "Balanced weight and performance"
        
        self.status = "idle"
        return {
            "recommended_fabric": recommendation,
            "reason": reason,
            "specs": self.fabrics.get(recommendation, {})
        }
    
    def get_fabric_specs(self, fabric_name: str) -> Optional[Dict[str, Any]]:
        """Get specifications for a fabric."""
        return self.fabrics.get(fabric_name)