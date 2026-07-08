"""Demo for all new agents - Comprehensive showcase."""

from ctrl_fabric.agents import (
    FitPredictorAgent, ColorAI, CompetitorSpy, InventoryOptimizer,
    ReturnPredictor, MaterialInnovator, SupplyRisk, CLVPredictor
)


def main():
    print("=== Fit Predictor ===")
    fit_agent = FitPredictorAgent()
    fit_result = fit_agent.run("TSHIRT-001", {"weight_gsm": 250}, {"chest": 104, "waist": 88, "hip": 100})
    print(f"Recommended size: {fit_result['recommended_size']}")
    print(f"Fit: {fit_result['predicted_fit']['overall_fit']}")
    
    print("\n=== Color AI ===")
    color_agent = ColorAI()
    color_result = color_agent.run("FW26")
    print(f"Season: {color_result['season']}")
    print(f"Palette: {[c['hex'] for c in color_result['palette'][:3]]}")
    
    print("\n=== Competitor Spy ===")
    spy_agent = CompetitorSpy()
    spy_result = spy_agent.run("TSHIRT-001", "t-shirts")
    print(f"Market position: {spy_result['market_position']['position']}")
    print(f"Opportunities: {spy_result['opportunities'][:2]}")
    
    print("\n=== Inventory Optimizer ===")
    inv_agent = InventoryOptimizer()
    inv_result = inv_agent.run("TSHIRT-001")
    print(f"Next month forecast: {inv_result['forecast']['next_month']} units")
    print(f"Recommended stock: {inv_result['recommended_stock']} units")
    
    print("\n=== Return Predictor ===")
    ret_agent = ReturnPredictor()
    ret_result = ret_agent.run("TSHIRT-001", {"weight_gsm": 250})
    print(f"Potential savings: ${ret_result['potential_savings']['projected_savings']}")
    
    print("\n=== Material Innovator ===")
    mat_agent = MaterialInnovator()
    mat_result = mat_agent.run("t-shirt")
    print(f"Innovations: {[i['name'] for i in mat_result['innovations'][:2]]}")
    
    print("\n=== Supply Risk ===")
    sup_agent = SupplyRisk()
    sup_result = sup_agent.run("TSHIRT-001", ["cotton"])
    print(f"Risk score: {sup_result['risk_score']}/100")
    
    print("\n=== CLV Predictor ===")
    clv_agent = CLVPredictor()
    clv_result = clv_agent.run()
    print(f"Predicted CLV: ${clv_result['predicted_clv']}")
    print(f"Retention: {clv_result['retention_probability'] * 100}%")


if __name__ == "__main__":
    main()