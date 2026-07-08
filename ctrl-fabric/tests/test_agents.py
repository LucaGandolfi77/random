"""Tests for Ctrl+Fabric agents."""

import sys
sys.path.insert(0, '/Users/jessicabottarelli/Desktop/Gandalf/Github/random-1/ctrl-fabric')

from ctrl_fabric.agents import (
    CEOAssistant, CreativeDirector, FashionArchitect, TextileEngineer,
    CADAagent, PatternGenerator, DocumentationAgent, QualityAssuranceAgent,
    SustainabilityAgent, FitPredictorAgent, ColorAI, CompetitorSpy,
    InventoryOptimizer, ReturnPredictor, MaterialInnovator, SupplyRisk,
    CLVPredictor, DataScientistAgent
)


def test_all_agents():
    """Test all agents can run and return valid results."""
    agents = [
        ("CEOAssistant", CEOAssistant(), lambda a: a.run([])),
        ("CreativeDirector", CreativeDirector(), lambda a: a.run()),
        ("FashionArchitect", FashionArchitect(), lambda a: a.run("FW26", "engineers", 45.0, ["cotton"], "aerospace")),
        ("TextileEngineer", TextileEngineer(), lambda a: a.run("hoodie", {"warmth": 8})),
        ("CADAagent", CADAagent(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250})),
        ("PatternGenerator", PatternGenerator(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250}, "M")),
        ("DocumentationAgent", DocumentationAgent(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250})),
        ("QualityAssuranceAgent", QualityAssuranceAgent(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250, "fabric_type": "cotton"})),
        ("SustainabilityAgent", SustainabilityAgent(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250, "fabric_type": "cotton"})),
        ("FitPredictorAgent", FitPredictorAgent(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250}, {"chest": 104, "waist": 88, "hip": 100})),
        ("ColorAI", ColorAI(), lambda a: a.run("FW26")),
        ("CompetitorSpy", CompetitorSpy(), lambda a: a.run("TSHIRT-001", "t-shirts")),
        ("InventoryOptimizer", InventoryOptimizer(), lambda a: a.run("TSHIRT-001")),
        ("ReturnPredictor", ReturnPredictor(), lambda a: a.run("TSHIRT-001", {"weight_gsm": 250})),
        ("MaterialInnovator", MaterialInnovator(), lambda a: a.run("t-shirt")),
        ("SupplyRisk", SupplyRisk(), lambda a: a.run("TSHIRT-001", ["cotton"])),
        ("CLVPredictor", CLVPredictor(), lambda a: a.run()),
        ("DataScientistAgent", DataScientistAgent(), lambda a: a.run()),
    ]
    
    passed = 0
    failed = 0
    
    for name, agent, run_fn in agents:
        try:
            result = run_fn(agent)
            assert result is not None, f"{name} returned None"
            assert isinstance(result, dict), f"{name} did not return dict"
            print(f"✓ {name}: OK")
            passed += 1
        except Exception as e:
            print(f"✗ {name}: FAILED - {e}")
            failed += 1
    
    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    success = test_all_agents()
    sys.exit(0 if success else 1)