"""CAD Agent - Tech packs and CAD files."""

from typing import Dict, Any, List
from .base import BaseAgent
from .pattern_generator import PatternGenerator


class CADAagent(BaseAgent):
    """Generates tech packs and CAD files."""
    
    def __init__(self):
        super().__init__("CAD Agent", "Tech packs & CAD files")
        self.pattern_generator = PatternGenerator()
    
    def run(self, garment_sku: str, specs: Dict[str, Any], 
            generate_pattern: bool = True, size: str = "M") -> Dict[str, Any]:
        """Generate tech pack and CAD files with optional pattern generation."""
        self.status = "generating"
        
        tech_pack = {
            "sku": garment_sku,
            "specifications": specs,
            "bill_of_materials": self._generate_bom(specs),
            "measurements": self._generate_measurements(specs),
            "construction": self._generate_construction(specs)
        }
        
        if generate_pattern:
            pattern_result = self.pattern_generator.run(garment_sku, specs, size)
            tech_pack["pattern"] = pattern_result["pattern"]
            tech_pack["simulation"] = pattern_result["simulation"]
        
        self.status = "idle"
        return tech_pack
    
    def _generate_bom(self, specs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate bill of materials."""
        return [
            {"item": "Main fabric", "quantity": 1.5, "unit": "meters"},
            {"item": "Thread", "quantity": 1, "unit": "spool"},
            {"item": "Labels", "quantity": 2, "unit": "pieces"}
        ]
    
    def _generate_measurements(self, specs: Dict[str, Any]) -> Dict[str, float]:
        """Generate measurement chart."""
        return {
            "chest": 110.0,
            "length": 75.0,
            "sleeve": 22.0,
            "shoulder": 45.0
        }
    
    def _generate_construction(self, specs: Dict[str, Any]) -> List[str]:
        """Generate construction notes."""
        return [
            "Flatlock seams",
            "Coverstitch hems",
            "Heat-sealed labels"
        ]