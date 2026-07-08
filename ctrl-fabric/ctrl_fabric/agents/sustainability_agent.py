"""Sustainability Agent - Environmental impact and eco-optimization."""

from typing import Dict, Any, List
from .base import BaseAgent


class SustainabilityAgent(BaseAgent):
    """Calculates environmental impact and sustainability metrics."""
    
    # Carbon footprint factors (kg CO2 per kg of material)
    CARBON_FACTORS = {
        "cotton": 15.0,
        "polyester": 9.5,
        "wool": 25.0,
        "nylon": 12.0,
        "linen": 2.0,
        "recycled_polyester": 3.5,
        "organic_cotton": 8.0
    }
    
    def __init__(self):
        super().__init__("Sustainability", "Environmental impact")
        self.sustainability_score = 0
    
    def run(self, garment_sku: str, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate sustainability metrics."""
        self.status = "calculating"
        
        footprint = self._calculate_carbon_footprint(specs)
        water_usage = self._calculate_water_usage(specs)
        sustainability = self._calculate_sustainability_score(specs, footprint, water_usage)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "carbon_footprint_kg": footprint,
            "water_usage_liters": water_usage,
            "sustainability_score": sustainability,
            "eco_recommendations": self._generate_eco_recommendations(specs)
        }
    
    def _calculate_carbon_footprint(self, specs: Dict[str, Any]) -> float:
        """Calculate carbon footprint based on materials."""
        fabric_type = specs.get("fabric_type", "cotton")
        weight = specs.get("weight_gsm", 200) / 1000  # Convert to kg per meter
        
        factor = self.CARBON_FACTORS.get(fabric_type, 15.0)
        # Assume 1.5 meters of fabric per garment
        return round(factor * weight * 1.5, 2)
    
    def _calculate_water_usage(self, specs: Dict[str, Any]) -> int:
        """Calculate water usage for production."""
        fabric_type = specs.get("fabric_type", "cotton")
        
        # Water usage per kg of material
        water_factors = {
            "cotton": 10000,
            "polyester": 500,
            "wool": 15000,
            "nylon": 800,
            "linen": 2000,
            "recycled_polyester": 100,
            "organic_cotton": 2000
        }
        
        weight = specs.get("weight_gsm", 200) / 1000
        return int(water_factors.get(fabric_type, 5000) * weight * 1.5)
    
    def _calculate_sustainability_score(self, specs: Dict[str, Any], 
                                       carbon: float, water: int) -> float:
        """Calculate overall sustainability score (0-100)."""
        fabric_type = specs.get("fabric_type", "cotton")
        
        # Base score from materials
        eco_materials = ["linen", "organic_cotton", "recycled_polyester"]
        material_score = 85 if fabric_type in eco_materials else 50
        
        # Adjust for carbon and water
        carbon_score = max(0, 100 - (carbon / 2))
        water_score = max(0, 100 - (water / 100))
        
        return round((material_score + carbon_score + water_score) / 3, 1)
    
    def _generate_eco_recommendations(self, specs: Dict[str, Any]) -> List[str]:
        """Generate eco-friendly recommendations."""
        fabric_type = specs.get("fabric_type", "cotton")
        recommendations = []
        
        if fabric_type == "cotton":
            recommendations.append("Switch to organic cotton (-60% water usage)")
        elif fabric_type == "polyester":
            recommendations.append("Use recycled polyester (-63% carbon footprint)")
        
        recommendations.extend([
            "Implement closed-loop water system",
            "Source materials within 500km radius",
            "Use renewable energy in production"
        ])
        
        return recommendations
    
    def get_eco_alternatives(self, fabric_type: str) -> List[Dict[str, Any]]:
        """Get eco-friendly fabric alternatives."""
        alternatives = {
            "cotton": [
                {"name": "organic_cotton", "carbon_reduction": 47, "water_reduction": 80},
                {"name": "linen", "carbon_reduction": 85, "water_reduction": 98}
            ],
            "polyester": [
                {"name": "recycled_polyester", "carbon_reduction": 63, "water_reduction": 98}
            ]
        }
        return alternatives.get(fabric_type, [])