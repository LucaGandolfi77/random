"""Demo for Quality Assurance and Sustainability Agents."""

from ctrl_fabric.agents import QualityAssuranceAgent, SustainabilityAgent


def main():
    # Create agents
    qa_agent = QualityAssuranceAgent()
    sustain_agent = SustainabilityAgent()
    
    # Garment specifications
    specs = {
        "weight_gsm": 250,
        "stretch_percent": 8,
        "fabric_type": "cotton",
        "garment_type": "t-shirt"
    }
    
    print("=== Quality Assurance ===")
    qa_result = qa_agent.run("TSHIRT-001", specs)
    
    print(f"Quality Score: {qa_result['quality_score']}/10")
    print(f"Certification: {qa_result['certification']['certification']}")
    print(f"Test Report ID: {qa_result['certification']['test_report_id']}")
    
    print("\nTests:")
    for test_name, test_data in qa_result['tests'].items():
        print(f"  {test_name}: {test_data['rating']}")
    
    print("\n=== Sustainability ===")
    sustain_result = sustain_agent.run("TSHIRT-001", specs)
    
    print(f"Sustainability Score: {sustain_result['sustainability_score']}/100")
    print(f"Carbon Footprint: {sustain_result['carbon_footprint_kg']} kg CO2")
    print(f"Water Usage: {sustain_result['water_usage_liters']} liters")
    
    print("\nEco Recommendations:")
    for rec in sustain_result['eco_recommendations']:
        print(f"  - {rec}")
    
    print("\n=== Eco Alternatives ===")
    alternatives = sustain_agent.get_eco_alternatives("cotton")
    for alt in alternatives:
        print(f"  {alt['name']}: -{alt['carbon_reduction']}% carbon, -{alt['water_reduction']}% water")


if __name__ == "__main__":
    main()