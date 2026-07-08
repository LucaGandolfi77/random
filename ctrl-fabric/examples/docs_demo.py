"""Demo for Documentation Agent - Automatic documentation generation."""

from ctrl_fabric.agents import DocumentationAgent


def main():
    # Create agent
    doc_agent = DocumentationAgent()
    
    # Garment specifications
    garment_specs = {
        "weight_gsm": 250,
        "stretch_percent": 8,
        "fabric_type": "cotton_jersey",
        "garment_type": "t-shirt"
    }
    
    # Generate all documentation
    print("=== Documentation Generation ===")
    result = doc_agent.run("TSHIRT-001", garment_specs)
    
    print(f"\n--- Technical Specifications ---")
    print(f"Title: {result['tech_specs']['title']}")
    print(f"Materials: {result['tech_specs']['sections']['materials']}")
    print(f"Construction: {result['tech_specs']['sections']['construction']}")
    
    print(f"\n--- User Guide ---")
    print(f"Title: {result['user_guide']['title']}")
    print(f"Features: {result['user_guide']['sections']['features']}")
    
    print(f"\n--- Maintenance Manual ---")
    print(f"Title: {result['maintenance_manual']['title']}")
    print(f"Expected wears: {result['maintenance_manual']['sections']['lifetime']['expected_wears']}")
    print(f"Washing: {result['maintenance_manual']['sections']['washing']}")


if __name__ == "__main__":
    main()