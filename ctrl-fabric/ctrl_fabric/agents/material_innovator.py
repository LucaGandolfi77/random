"""Material Innovator Agent - Research and development of new sustainable materials."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class MaterialInnovator(BaseAgent):
    """Researches and develops innovative sustainable materials."""
    
    def __init__(self):
        super().__init__("Material Innovator", "Sustainable materials R&D")
        self.innovation_pipeline = []
    
    def run(self, garment_type: str = "t-shirt") -> Dict[str, Any]:
        """Research material innovations."""
        self.status = "researching"
        
        innovations = self._research_innovations(garment_type)
        recommendations = self._recommend_materials(garment_type, innovations)
        
        self.status = "idle"
        return {
            "garment_type": garment_type,
            "innovations": innovations,
            "recommendations": recommendations,
            "r_d_score": 8.2
        }
    
    def _research_innovations(self, garment_type: str) -> List[Dict[str, Any]]:
        """Research cutting-edge materials."""
        return [
            {
                "name": "Mycelium Leather",
                "source": "Mushroom-based",
                "carbon_reduction": 85,
                "water_reduction": 95,
                "readiness": "pilot",
                "cost_premium": 15
            },
            {
                "name": "Algae Fiber",
                "source": "Ocean algae",
                "carbon_reduction": 70,
                "water_reduction": 80,
                "readiness": "lab",
                "cost_premium": 25
            },
            {
                "name": "Lab-grown Cotton",
                "source": "Bioengineered",
                "carbon_reduction": 50,
                "water_reduction": 70,
                "readiness": "production",
                "cost_premium": 10
            }
        ]
    
    def _recommend_materials(self, garment_type: str, 
                              innovations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Recommend materials based on garment type."""
        recommendations = []
        
        for innovation in innovations:
            if innovation["readiness"] == "production":
                recommendations.append({
                    "material": innovation["name"],
                    "priority": "high",
                    "implementation": "immediate"
                })
            elif innovation["readiness"] == "pilot":
                recommendations.append({
                    "material": innovation["name"],
                    "priority": "medium",
                    "implementation": "Q4_2026"
                })
        
        return recommendations
    
    def get_material_comparison(self, current_material: str) -> Dict[str, Any]:
        """Compare current material with alternatives."""
        comparisons = {
            "cotton": {
                "alternatives": ["organic_cotton", "linen", "hemp"],
                "improvement_potential": "60-85% sustainability gain"
            },
            "polyester": {
                "alternatives": ["recycled_polyester", "econyl"],
                "improvement_potential": "70-90% sustainability gain"
            }
        }
        return comparisons.get(current_material, {"alternatives": [], "improvement_potential": "unknown"})