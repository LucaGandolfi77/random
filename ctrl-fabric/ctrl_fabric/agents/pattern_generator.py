"""Pattern Generator - Automatic pattern creation and 3D simulation."""

from typing import Dict, Any, List, Tuple
import math
from .base import BaseAgent


class PatternGenerator(BaseAgent):
    """Generates automatic patterns and 3D simulations."""
    
    def __init__(self):
        super().__init__("Pattern Generator", "Pattern creation & 3D simulation")
        self.measurement_standards = {
            "XS": {"chest": 92, "waist": 76, "hip": 88, "length": 68, "sleeve": 20},
            "S": {"chest": 98, "waist": 82, "hip": 94, "length": 70, "sleeve": 21},
            "M": {"chest": 104, "waist": 88, "hip": 100, "length": 72, "sleeve": 22},
            "L": {"chest": 110, "waist": 94, "hip": 106, "length": 74, "sleeve": 23},
            "XL": {"chest": 116, "waist": 100, "hip": 112, "length": 76, "sleeve": 24},
            "XXL": {"chest": 122, "waist": 106, "hip": 118, "length": 78, "sleeve": 25}
        }
    
    def run(self, garment_sku: str, specs: Dict[str, Any], size: str = "M") -> Dict[str, Any]:
        """Generate pattern and 3D simulation for a garment."""
        self.status = "generating"
        
        measurements = self.measurement_standards.get(size, self.measurement_standards["M"])
        
        pattern = self._generate_pattern(garment_sku, measurements, specs)
        simulation = self._generate_3d_simulation(garment_sku, measurements, specs)
        
        self.status = "idle"
        return {
            "pattern": pattern,
            "simulation": simulation,
            "size": size
        }
    
    def _generate_pattern(self, sku: str, measurements: Dict[str, float], 
                         specs: Dict[str, Any]) -> Dict[str, Any]:
        """Generate automatic pattern pieces."""
        # Pattern pieces with seam allowances
        seam_allowance = 1.5  # cm
        
        pieces = {
            "front": {
                "points": self._calculate_piece_points(measurements, "front", seam_allowance),
                "cutting_instructions": "Cut on fold"
            },
            "back": {
                "points": self._calculate_piece_points(measurements, "back", seam_allowance),
                "cutting_instructions": "Cut on fold"
            },
            "sleeve": {
                "points": self._calculate_sleeve_points(measurements, seam_allowance),
                "cutting_instructions": "Cut 2 pieces"
            }
        }
        
        return {
            "sku": sku,
            "pieces": pieces,
            "grainline": "Straight grain for body, cross grain for sleeves",
            "notches": ["Shoulder", "Side seam", "Armhole"],
            "file_format": "DXF"
        }
    
    def _calculate_piece_points(self, measurements: Dict[str, float], 
                                piece_type: str, seam_allowance: float) -> List[Tuple[float, float]]:
        """Calculate pattern piece coordinates."""
        chest = measurements["chest"] + seam_allowance * 2
        length = measurements["length"] + seam_allowance * 2
        shoulder = measurements["chest"] * 0.42
        
        if piece_type == "front":
            # Neck opening
            neck_width = 15
            return [
                (0, 0),  # Shoulder start
                (shoulder, 0),  # Shoulder point
                (chest / 2, length * 0.3),  # Armhole
                (chest / 2, length),  # Hem
                (neck_width / 2, 0),  # Neck
                (0, 0)  # Close
            ]
        else:  # back
            return [
                (0, 0),
                (shoulder, 0),
                (chest / 2, length * 0.3),
                (chest / 2, length),
                (0, length),
                (0, 0)
            ]
    
    def _calculate_sleeve_points(self, measurements: Dict[str, float], 
                                  seam_allowance: float) -> List[Tuple[float, float]]:
        """Calculate sleeve pattern points."""
        bicep = measurements["chest"] * 0.3 + seam_allowance * 2
        sleeve_length = measurements["sleeve"] + seam_allowance * 2
        
        return [
            (0, 0),  # Cap top
            (bicep * 0.6, 0),  # Cap curve
            (bicep, sleeve_length * 0.7),  # Elbow
            (bicep, sleeve_length),  # Cuff
            (0, sleeve_length),
            (0, 0)
        ]
    
    def _generate_3d_simulation(self, sku: str, measurements: Dict[str, float], 
                                specs: Dict[str, Any]) -> Dict[str, Any]:
        """Generate 3D simulation parameters."""
        # Simplified 3D body measurements
        body_measurements = {
            "chest": measurements["chest"],
            "waist": measurements["waist"],
            "hip": measurements["hip"],
            "height": 175  # cm
        }
        
        # Fabric properties for simulation
        fabric_props = {
            "weight_gsm": specs.get("weight_gsm", 200),
            "stretch": specs.get("stretch_percent", 5),
            "drape": self._calculate_drape(specs.get("weight_gsm", 200))
        }
        
        return {
            "avatar_size": body_measurements,
            "fabric_properties": fabric_props,
            "fit_simulation": self._simulate_fit(body_measurements, fabric_props),
            "render_settings": {
                "lighting": "studio",
                "background": "white",
                "angles": ["front", "back", "side"]
            }
        }
    
    def _calculate_drape(self, weight_gsm: float) -> str:
        """Calculate fabric drape based on weight."""
        if weight_gsm < 150:
            return "fluid"
        elif weight_gsm < 300:
            return "structured"
        else:
            return "rigid"
    
    def _simulate_fit(self, body: Dict[str, float], fabric: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate garment fit on avatar."""
        ease = 5  # cm positive ease
        
        return {
            "chest_fit": "comfortable" if fabric["stretch"] > 10 else "slim",
            "shoulder_fit": "standard",
            "length_fit": "regular",
            "ease_allowance": ease,
            "fit_score": 8.5  # out of 10
        }
    
    def export_pattern(self, pattern: Dict[str, Any], format: str = "dxf") -> str:
        """Export pattern to file format."""
        # In production, this would generate actual DXF/SVG files
        return f"Pattern exported for {pattern['sku']} in {format.upper()} format"