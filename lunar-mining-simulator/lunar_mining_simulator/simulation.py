import pandas as pd
from typing import Dict, Optional
from .models.regolith import RegolithComposition, LunarLocation
from .models.mining import MiningRobot, MiningOperation
from .models.energy import EnergySystem, SolarPanel, NuclearReactor
from .models.replication import Replicator, ReplicationCalculator
from .models.statistics import MonteCarloSimulator, TimeSeriesProjection


class SimulationEngine:
    """Main simulation engine for lunar mining missions."""
    
    def __init__(
        self,
        location: LunarLocation = LunarLocation.POLE,
        initial_robots: int = 10,
        years: int = 30,
    ):
        self.location = location
        self.regolith = RegolithComposition.for_location(location)
        self.operation = MiningOperation()
        self.energy = EnergySystem()
        self.replicator = Replicator(id=0)
        self.calculator = ReplicationCalculator(
            replicator=self.replicator,
            materials_needed=MiningRobot().components_required,
        )
        self.monte_carlo = MonteCarloSimulator()
        self.time_series = TimeSeriesProjection(
            years=years,
            initial_robots=initial_robots,
        )
        
        # Initialize robots
        for i in range(initial_robots):
            self.operation.add_robot(MiningRobot(id=i))
        
        # Initialize energy system
        for _ in range(5):
            self.energy.add_solar_panel(SolarPanel())
        self.energy.add_nuclear_reactor(NuclearReactor())
    
    def run_simulation(self, days: Optional[int] = None) -> Dict:
        """Run complete simulation and return results."""
        if days is None:
            days = self.time_series.years * 365
        
        daily_results = []
        yearly_stats = []
        yearly_materials = {}
        prev_regolith = 0.0
        prev_materials = {"iron_kg": 0, "titanium_kg": 0, "aluminum_kg": 0, "silicon_kg": 0, "oxygen_kg": 0}
        
        for day in range(days):
            # Simulate mining
            materials = self.operation.simulate_day(day)
            daily_results.append(materials)
            
            # Update energy
            self.energy.calculate_total_power(day)
            
            # Check replication
            self.calculator.materials_available = self.operation.total_materials_extracted.copy()
            
            # Track yearly statistics (at end of each year)
            if (day + 1) % 365 == 0:
                year = day // 365
                yearly_materials[year] = {
                    "year": year,
                    "regolith_tons": self.operation.total_regolith_processed - prev_regolith,
                    "iron_kg": self.operation.total_materials_extracted.get("iron_kg", 0) - prev_materials["iron_kg"],
                    "titanium_kg": self.operation.total_materials_extracted.get("titanium_kg", 0) - prev_materials["titanium_kg"],
                    "aluminum_kg": self.operation.total_materials_extracted.get("aluminum_kg", 0) - prev_materials["aluminum_kg"],
                    "silicon_kg": self.operation.total_materials_extracted.get("silicon_kg", 0) - prev_materials["silicon_kg"],
                    "oxygen_kg": self.operation.total_materials_extracted.get("oxygen_kg", 0) - prev_materials["oxygen_kg"],
                    "robot_count": len(self.operation.robots),
                    "total_power_kw": self.energy.total_power_kw,
                }
                prev_regolith = self.operation.total_regolith_processed
                prev_materials = self.operation.total_materials_extracted.copy()
        
        # Compile yearly stats
        for year in sorted(yearly_materials.keys()):
            yearly_stats.append(yearly_materials[year])
        
        return {
            "total_regolith_processed": self.operation.total_regolith_processed,
            "total_materials": self.operation.total_materials_extracted,
            "final_robot_count": len(self.operation.robots),
            "replication_potential": self.operation.get_replication_potential(),
            "energy_stats": {
                "total_power_kw": self.energy.total_power_kw,
                "solar_count": len(self.energy.solar_panels),
                "nuclear_count": len(self.energy.nuclear_reactors),
            },
            "monte_carlo": self.monte_carlo.run_extraction_simulation(days * 16),
            "population_projection": self.time_series.project_population().to_dict(),
            "material_projection": self.time_series.project_materials(
                self.operation.robots[0].extraction_rate_tons_per_hour * 16 if self.operation.robots else 0
            ).to_dict(),
            "colonization_milestones": self.time_series.calculate_colonization_milestones(),
            "yearly_stats": yearly_stats,
        }
    
    def export_results(self, results: Dict, format: str = "csv") -> str:
        """Export simulation results."""
        if format == "csv":
            df = pd.DataFrame(results.get("daily_materials", []))
            return df.to_csv(index=False)
        elif format == "json":
            return pd.DataFrame(results.get("daily_materials", [])).to_json()
        return ""