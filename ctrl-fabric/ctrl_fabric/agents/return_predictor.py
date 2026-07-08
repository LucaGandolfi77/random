"""Return Predictor Agent - Predicts and prevents returns."""

from typing import Dict, Any, List
import random
from .base import BaseAgent


class ReturnPredictor(BaseAgent):
    """Predicts return likelihood and suggests improvements."""
    
    def __init__(self):
        super().__init__("Return Predictor", "Return prevention")
    
    def run(self, garment_sku: str, specs: Dict[str, Any], 
            fit_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Predict return risk and suggest improvements."""
        self.status = "analyzing"
        
        if fit_data is None:
            fit_data = {"return_risk": 15.0}
        
        risk_factors = self._analyze_risk_factors(specs, fit_data)
        prevention = self._suggest_prevention(risk_factors)
        
        self.status = "idle"
        return {
            "sku": garment_sku,
            "return_risk_percent": fit_data.get("return_risk", 15.0),
            "risk_factors": risk_factors,
            "prevention_strategies": prevention,
            "potential_savings": self._calculate_savings(fit_data.get("return_risk", 15.0))
        }
    
    def _analyze_risk_factors(self, specs: Dict[str, Any], 
                             fit_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze factors contributing to return risk."""
        factors = []
        
        # Fit inconsistency
        ease = fit_data.get("ease_allowance_cm", {})
        if ease:
            variations = [abs(ease.get(k, 0)) for k in ease]
            if max(variations) - min(variations) > 10:
                factors.append({"factor": "fit_inconsistency", "impact": "high"})
        
        # Fabric stretch
        stretch = specs.get("stretch_percent", 0)
        if stretch < 5:
            factors.append({"factor": "low_stretch", "impact": "medium"})
        
        # Size range
        factors.append({"factor": "size_range", "impact": "low"})
        
        return factors
    
    def _suggest_prevention(self, risk_factors: List[Dict[str, Any]]) -> List[str]:
        """Suggest prevention strategies."""
        strategies = []
        
        for factor in risk_factors:
            if factor["factor"] == "fit_inconsistency":
                strategies.append("Add fit consistency testing")
            elif factor["factor"] == "low_stretch":
                strategies.append("Consider adding elastane for better fit")
        
        strategies.extend([
            "Add detailed size guide with measurements",
            "Include fit predictor tool on product page",
            "Offer free returns for first purchase"
        ])
        
        return strategies
    
    def _calculate_savings(self, risk_percent: float) -> Dict[str, float]:
        """Calculate potential savings from reduced returns."""
        monthly_sales = 500
        avg_price = 29.99
        
        current_returns = monthly_sales * risk_percent / 100
        reduced_returns = current_returns * 0.4  # 40% reduction
        
        return {
            "current_return_cost": round(current_returns * avg_price, 2),
            "projected_savings": round((current_returns - reduced_returns) * avg_price, 2),
            "reduction_percent": 40
        }