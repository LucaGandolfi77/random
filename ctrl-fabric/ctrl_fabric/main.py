"""Main orchestrator for Ctrl+Fabric."""

from typing import List
from .agents import (
    CEOAssistant, CreativeDirector, FashionArchitect, TextileEngineer,
    CADAagent, PatternGenerator, DocumentationAgent, QualityAssuranceAgent,
    SustainabilityAgent, FitPredictorAgent, ColorAI, CompetitorSpy,
    InventoryOptimizer, ReturnPredictor, MaterialInnovator, SupplyRisk,
    CLVPredictor, ProductionAgent, SupplyChainAgent, FinanceAgent,
    LegalAgent, MarketingStrategist, BrandStoryAgent, SocialMediaTeam,
    AdvertisingAgent, CustomerAgent, DataScientistAgent
)
from .agents.base import BaseAgent


class CtrlFabricSystem:
    """Orchestrates all AI agents for the fashion company."""
    
    def __init__(self):
        self.agents: List[BaseAgent] = [
            CEOAssistant(),
            CreativeDirector(),
            FashionArchitect(),
            TextileEngineer(),
            CADAagent(),
            PatternGenerator(),
            DocumentationAgent(),
            QualityAssuranceAgent(),
            SustainabilityAgent(),
            FitPredictorAgent(),
            ColorAI(),
            CompetitorSpy(),
            InventoryOptimizer(),
            ReturnPredictor(),
            MaterialInnovator(),
            SupplyRisk(),
            CLVPredictor(),
            ProductionAgent(),
            SupplyChainAgent(),
            FinanceAgent(),
            LegalAgent(),
            MarketingStrategist(),
            BrandStoryAgent(),
            SocialMediaTeam(),
            AdvertisingAgent(),
            CustomerAgent(),
            DataScientistAgent()
        ]
    
    def run_daily_cycle(self):
        """Run the daily business cycle."""
        print("=== Ctrl+Fabric Daily Report ===")
        
        # CEO generates report
        ceo = self.agents[0]
        report = ceo.run(self.agents)
        
        print(f"\nCash Flow: ${report['cash_flow']}")
        print(f"Orders: {report['orders']}")
        print(f"Problems: {report['problems']}")
        print(f"Decisions Needed: {report['decisions_needed']}")
        
        # Each agent runs its task with appropriate arguments
        for agent in self.agents[1:]:
            result = self._run_agent(agent)
            print(f"\n[{agent.name}] {agent.role}")
            if isinstance(result, dict):
                for key, value in result.items():
                    if isinstance(value, list):
                        print(f"  {key}: {', '.join(str(v) for v in value[:3])}")
                    else:
                        print(f"  {key}: {value}")
    
    def _run_agent(self, agent):
        """Run an agent with appropriate default arguments."""
        if agent.name == "Fashion Architect":
            return agent.run("FW26", "engineers", 45.0, ["cotton", "polyester"], "aerospace")
        elif agent.name == "Textile Engineer":
            return agent.run("hoodie", {"warmth": 8})
        elif agent.name == "CAD Agent":
            return agent.run("HOODIE-2.0", {"weight_gsm": 420})
        elif agent.name == "Pattern Generator":
            return agent.run("TSHIRT-001", {"weight_gsm": 250}, "M")
        elif agent.name == "Documentation Agent":
            return agent.run("TSHIRT-001", {"weight_gsm": 250})
        elif agent.name == "Quality Assurance":
            return agent.run("TSHIRT-001", {"weight_gsm": 250, "fabric_type": "cotton"})
        elif agent.name == "Sustainability":
            return agent.run("TSHIRT-001", {"weight_gsm": 250, "fabric_type": "cotton"})
        elif agent.name == "Fit Predictor":
            return agent.run("TSHIRT-001", {"chest": 104, "waist": 88, "hip": 100}, {"weight_gsm": 250})
        elif agent.name == "Color AI":
            return agent.run("FW26")
        elif agent.name == "Competitor Spy":
            return agent.run("TSHIRT-001", "t-shirts")
        elif agent.name == "Inventory Optimizer":
            return agent.run("TSHIRT-001")
        elif agent.name == "Return Predictor":
            return agent.run("TSHIRT-001", {"weight_gsm": 250})
        elif agent.name == "Material Innovator":
            return agent.run("t-shirt")
        elif agent.name == "Supply Risk":
            return agent.run("TSHIRT-001", ["cotton"])
        elif agent.name == "CLV Predictor":
            return agent.run()
        elif agent.name == "Production Agent":
            return agent.run({})
        elif agent.name == "Supply Chain Agent":
            return agent.run()
        elif agent.name == "Finance Agent":
            return agent.run()
        elif agent.name == "Legal Agent":
            return agent.run("HOODIE-2.0")
        elif agent.name == "Marketing Strategist":
            return agent.run()
        elif agent.name == "Brand Story Agent":
            return agent.run("manifesto", "Ctrl+Fabric")
        elif agent.name == "Social Media Team":
            return agent.run()
        elif agent.name == "Advertising Agent":
            return agent.run()
        elif agent.name == "Customer Agent":
            return agent.run("cust_001", "size help")
        elif agent.name == "Data Scientist":
            return agent.run()
        else:
            return agent.run()
    
    def get_agent(self, name: str) -> BaseAgent:
        """Get an agent by name."""
        for agent in self.agents:
            if agent.name == name:
                return agent
        raise ValueError(f"Agent {name} not found")


def main():
    """Entry point."""
    system = CtrlFabricSystem()
    system.run_daily_cycle()


if __name__ == "__main__":
    main()