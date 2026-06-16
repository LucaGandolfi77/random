import typer
from typing import Optional
from .simulation import SimulationEngine
from .models.regolith import LunarLocation
import json

app = typer.Typer()


@app.command()
def run(
    years: int = typer.Option(30, "--years", "-y", help="Simulation years"),
    robots: int = typer.Option(10, "--robots", "-r", help="Initial robot count"),
    location: str = typer.Option("lunar_pole", "--location", "-l", help="Lunar location"),
    output: str = typer.Option("table", "--output", "-o", help="Output format (json/table)"),
):
    """Run lunar mining simulation."""
    loc = LunarLocation(location)
    engine = SimulationEngine(location=loc, initial_robots=robots, years=years)
    results = engine.run_simulation()
    
    if output == "json":
        print(json.dumps(results, indent=2))
    else:
        print("=" * 80)
        print("LUNAR MINING SIMULATION RESULTS")
        print("=" * 80)
        print(f"\nLocation: {location}")
        print(f"Initial Robots: {robots}")
        print(f"Simulation Years: {years}")
        
        print("\n" + "-" * 80)
        print("YEARLY STATISTICS")
        print("-" * 80)
        print(f"{'Year':<6} {'Regolith (t)':<15} {'Iron (kg)':<12} {'Al (kg)':<12} {'Si (kg)':<12} {'O2 (kg)':<12} {'Power (kW)':<10}")
        print("-" * 80)
        
        for year_stat in results.get("yearly_stats", []):
            print(f"{year_stat['year']:<6} "
                  f"{year_stat['regolith_tons']:<15.0f} "
                  f"{year_stat['iron_kg']:<12.0f} "
                  f"{year_stat['aluminum_kg']:<12.0f} "
                  f"{year_stat['silicon_kg']:<12.0f} "
                  f"{year_stat['oxygen_kg']:<12.0f} "
                  f"{year_stat['total_power_kw']:<10.0f}")
        
        print("\n" + "-" * 80)
        print("TOTALS")
        print("-" * 80)
        print(f"Total Regolith Processed: {results['total_regolith_processed']:.2f} tons")
        print(f"Final Robot Count: {results['final_robot_count']}")
        print(f"Replication Potential: {results['replication_potential']}")
        
        print("\nMaterials Extracted:")
        for mat, amount in results['total_materials'].items():
            print(f"  {mat}: {amount:.2f} kg")
        
        print("\nEnergy System:")
        print(f"  Total Power: {results['energy_stats']['total_power_kw']:.2f} kW")
        print(f"  Solar Panels: {results['energy_stats']['solar_count']}")
        print(f"  Nuclear Reactors: {results['energy_stats']['nuclear_count']}")
        
        print("\nMonte Carlo Statistics (tons):")
        mc = results['monte_carlo']
        print(f"  Mean: {mc['mean_tons']:.2f}")
        print(f"  95% CI: [{mc['ci_lower']:.2f}, {mc['ci_upper']:.2f}]")
        
        print("\nColonization Milestones:")
        for milestone, count in results['colonization_milestones'].items():
            print(f"  {milestone}: {count} robots")


@app.command()
def milestones(
    robots: int = typer.Option(10, "--robots", "-r", help="Initial robot count"),
):
    """Show colonization milestones."""
    engine = SimulationEngine(initial_robots=robots)
    milestones = engine.time_series.calculate_colonization_milestones()
    
    print("Colonization Milestones:")
    for milestone, count in milestones.items():
        print(f"  {milestone}: {count} robots")


if __name__ == "__main__":
    app()