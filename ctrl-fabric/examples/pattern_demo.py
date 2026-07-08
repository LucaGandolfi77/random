"""Demo for Pattern Generator - Automatic pattern creation and 3D simulation."""

from ctrl_fabric.agents import CADAagent, PatternGenerator


def main():
    # Create agents
    cad_agent = CADAagent()
    pattern_gen = PatternGenerator()
    
    # Garment specifications
    garment_specs = {
        "weight_gsm": 250,
        "stretch_percent": 8,
        "fabric_type": "cotton_jersey",
        "garment_type": "t-shirt"
    }
    
    # Generate pattern with CAD agent
    print("=== CAD Agent with Pattern Generation ===")
    result = cad_agent.run("TSHIRT-001", garment_specs, generate_pattern=True, size="L")
    
    print(f"\nSKU: {result['sku']}")
    print(f"\nPattern pieces:")
    for piece_name, piece_data in result['pattern']['pieces'].items():
        print(f"  - {piece_name}: {len(piece_data['points'])} points")
    
    print(f"\n3D Simulation:")
    print(f"  - Avatar size: {result['simulation']['avatar_size']}")
    print(f"  - Fabric drape: {result['simulation']['fabric_properties']['drape']}")
    print(f"  - Fit score: {result['simulation']['fit_simulation']['fit_score']}/10")
    
    # Generate pattern directly
    print("\n=== Direct Pattern Generation ===")
    pattern_result = pattern_gen.run("TSHIRT-002", garment_specs, size="M")
    
    print(f"\nPattern for {pattern_result['size']} size:")
    for piece_name, piece_data in pattern_result['pattern']['pieces'].items():
        print(f"  - {piece_name}: {piece_data['points']}")
    
    print(f"\nFit simulation:")
    print(f"  - {pattern_result['simulation']['fit_simulation']}")


if __name__ == "__main__":
    main()