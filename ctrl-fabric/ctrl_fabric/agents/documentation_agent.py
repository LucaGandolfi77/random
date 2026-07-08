"""Documentation Agent - Automatic technical documentation generation."""

from typing import Dict, Any, List
from .base import BaseAgent


class DocumentationAgent(BaseAgent):
    """Generates automatic technical documentation."""
    
    def __init__(self):
        super().__init__("Documentation Agent", "Technical docs & manuals")
    
    def run(self, garment_sku: str, specs: Dict[str, Any], 
            pattern: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate all documentation for a garment."""
        self.status = "generating"
        
        tech_specs = self._generate_tech_specs(garment_sku, specs, pattern)
        user_guide = self._generate_user_guide(garment_sku, specs)
        maintenance_manual = self._generate_maintenance_manual(garment_sku, specs)
        
        self.status = "idle"
        return {
            "tech_specs": tech_specs,
            "user_guide": user_guide,
            "maintenance_manual": maintenance_manual
        }
    
    def _generate_tech_specs(self, sku: str, specs: Dict[str, Any], 
                            pattern: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate technical specifications for PDF export."""
        return {
            "sku": sku,
            "title": f"Technical Specifications - {sku}",
            "sections": {
                "materials": self._get_material_specs(specs),
                "construction": self._get_construction_specs(specs),
                "measurements": self._get_measurement_specs(specs, pattern),
                "care": self._get_care_specs(specs),
                "compliance": self._get_compliance_specs(specs)
            },
            "format": "PDF"
        }
    
    def _get_material_specs(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Get material specifications."""
        return {
            "main_fabric": {
                "composition": specs.get("fabric_type", "cotton"),
                "weight_gsm": specs.get("weight_gsm", 200),
                "stretch": f"{specs.get('stretch_percent', 5)}%"
            },
            "thread": "Polyester core-spun",
            "trim": ["Labels", "Buttons", "Zippers"]
        }
    
    def _get_construction_specs(self, specs: Dict[str, Any]) -> List[str]:
        """Get construction specifications."""
        return [
            "Stitch type: 4-thread overlock",
            "Seam allowance: 1.5cm",
            "Hem allowance: 2cm",
            "Notions: Standard"
        ]
    
    def _get_measurement_specs(self, specs: Dict[str, Any], 
                               pattern: Dict[str, Any] = None) -> Dict[str, float]:
        """Get measurement specifications."""
        if pattern and "pieces" in pattern:
            # Extract from pattern
            return {"pattern_pieces": len(pattern["pieces"])}
        return {
            "chest": 104.0,
            "length": 72.0,
            "sleeve": 22.0
        }
    
    def _get_care_specs(self, specs: Dict[str, Any]) -> Dict[str, str]:
        """Get care specifications."""
        return {
            "washing": "Machine wash cold",
            "drying": "Tumble dry low",
            "ironing": "Warm iron",
            "chemical": "Do not bleach"
        }
    
    def _get_compliance_specs(self, specs: Dict[str, Any]) -> List[str]:
        """Get compliance specifications."""
        return [
            "ISO 9001:2015",
            "OEKO-TEX Standard 100",
            "REACH compliant"
        ]
    
    def _generate_user_guide(self, sku: str, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Generate user guide."""
        return {
            "sku": sku,
            "title": f"User Guide - {sku}",
            "sections": {
                "overview": f"Welcome to your {sku} garment guide",
                "features": self._get_features(specs),
                "how_to_wear": self._get_how_to_wear(specs),
                "sizing": self._get_sizing_info()
            }
        }
    
    def _get_features(self, specs: Dict[str, Any]) -> List[str]:
        """Get garment features."""
        features = []
        if specs.get("stretch_percent", 0) > 10:
            features.append("4-way stretch for mobility")
        features.extend([
            "Classic fit",
            "Durable construction",
            "Easy care fabric"
        ])
        return features
    
    def _get_how_to_wear(self, specs: Dict[str, Any]) -> List[str]:
        """Get wearing instructions."""
        return [
            "For best fit, select your normal size",
            "Model wears size M, height 175cm",
            "Refer to size chart for measurements"
        ]
    
    def _get_sizing_info(self) -> Dict[str, str]:
        """Get sizing information."""
        return {
            "XS": "Chest 92cm, Waist 76cm",
            "S": "Chest 98cm, Waist 82cm",
            "M": "Chest 104cm, Waist 88cm",
            "L": "Chest 110cm, Waist 94cm",
            "XL": "Chest 116cm, Waist 100cm"
        }
    
    def _generate_maintenance_manual(self, sku: str, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Generate maintenance manual."""
        return {
            "sku": sku,
            "title": f"Maintenance Manual - {sku}",
            "sections": {
                "washing": self._get_washing_instructions(specs),
                "drying": self._get_drying_instructions(specs),
                "repair": self._get_repair_info(specs),
                "lifetime": self._get_lifetime_expectations(specs)
            }
        }
    
    def _get_washing_instructions(self, specs: Dict[str, Any]) -> List[str]:
        """Get washing instructions."""
        return [
            "Turn inside out before washing",
            "Use mild detergent",
            "Wash with similar colors",
            "Do not use fabric softener"
        ]
    
    def _get_drying_instructions(self, specs: Dict[str, Any]) -> List[str]:
        """Get drying instructions."""
        return [
            "Tumble dry low heat",
            "Remove promptly to prevent wrinkles",
            "Do not over-dry"
        ]
    
    def _get_repair_info(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Get repair information."""
        return {
            "common_issues": ["Missing button", "Small tear", "Seam stress"],
            "tools_needed": ["Matching thread", "Needle", "Fabric glue"],
            "warranty_period": "90 days"
        }
    
    def _get_lifetime_expectations(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Get lifetime expectations."""
        base_wears = 200
        if specs.get("weight_gsm", 200) > 300:
            base_wears = 300
        
        return {
            "expected_wears": base_wears,
            "care_tips": [
                "Wash less frequently",
                "Air dry when possible",
                "Store properly"
            ]
        }
    
    def export_pdf(self, content: Dict[str, Any], doc_type: str) -> str:
        """Export documentation to PDF (placeholder)."""
        return f"{doc_type} exported for {content['sku']} in PDF format"