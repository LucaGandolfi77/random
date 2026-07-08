"""Quality Assurance Agent - Automated garment testing and certification."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class QualityAssuranceAgent(BaseAgent):
    """Automated quality testing and certification for garments."""
    
    def __init__(self):
        super().__init__("Quality Assurance", "Testing & certification")
        self.test_results = {}
    
    def run(self, garment_sku: str, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Run quality tests on a garment."""
        self.status = "testing"
        
        tests = {
            "abrasion": self._test_abrasion(specs),
            "stretch": self._test_stretch(specs),
            "wash": self._test_wash_durability(specs),
            "color_fastness": self._test_color_fastness(specs)
        }
        
        certification = self._generate_certification(tests)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "tests": tests,
            "certification": certification,
            "quality_score": self._calculate_quality_score(tests)
        }
    
    def _test_abrasion(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Test fabric abrasion resistance."""
        weight = specs.get("weight_gsm", 200)
        # Martindale test simulation
        cycles = int(weight * 30 + random.randint(0, 2000))
        
        return {
            "test": "Abrasion Resistance",
            "cycles": cycles,
            "rating": "Excellent" if cycles > 20000 else "Good" if cycles > 10000 else "Fair",
            "standard": "ISO 12947-2"
        }
    
    def _test_stretch(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Test stretch recovery."""
        stretch = specs.get("stretch_percent", 5)
        recovery = 95 + random.randint(0, 5) if stretch > 10 else 90 + random.randint(0, 8)
        
        return {
            "test": "Stretch Recovery",
            "recovery_percent": recovery,
            "rating": "Excellent" if recovery > 95 else "Good",
            "standard": "ISO 9073-4"
        }
    
    def _test_wash_durability(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Test wash durability."""
        weight = specs.get("weight_gsm", 200)
        washes = int(weight * 1.5 + random.randint(0, 100))
        
        return {
            "test": "Wash Durability",
            "expected_washes": washes,
            "rating": "Excellent" if washes > 300 else "Good" if washes > 200 else "Fair",
            "standard": "ISO 6330"
        }
    
    def _test_color_fastness(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        """Test color fastness."""
        score = 4 + random.randint(0, 1)  # Scale 1-5
        
        return {
            "test": "Color Fastness",
            "rating": score,
            "scale": "1-5 (5=excellent)",
            "standard": "ISO 105-B02"
        }
    
    def _generate_certification(self, tests: Dict[str, Any]) -> Dict[str, Any]:
        """Generate certification based on test results."""
        all_passed = all(
            t.get("rating") in ["Excellent", "Good", 4, 5] 
            for t in tests.values()
        )
        
        return {
            "certified": all_passed,
            "certification": "OEKO-TEX Standard 100" if all_passed else "Pending",
            "test_report_id": f"QA-{random.randint(10000, 99999)}",
            "valid_until": "2027-12-31"
        }
    
    def _calculate_quality_score(self, tests: Dict[str, Any]) -> float:
        """Calculate overall quality score."""
        scores = []
        for test in tests.values():
            if test.get("rating") == "Excellent":
                scores.append(10)
            elif test.get("rating") == "Good":
                scores.append(8)
            elif test.get("rating") == "Fair":
                scores.append(6)
            elif isinstance(test.get("rating"), int):
                scores.append(test["rating"] * 2)
        
        return round(sum(scores) / len(scores), 1) if scores else 0