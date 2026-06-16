from pydantic import BaseModel
from typing import List, Optional
import numpy as np


class MiningRobot(BaseModel):
    """Autonomous mining robot specifications."""
    
    id: int = 0
    name: str = "Miner-1"
    mass_kg: float = 500.0
    power_consumption_kw: float = 5.0
    extraction_rate_tons_per_hour: float = 2.0
    efficiency: float = 0.85  # 85% operational efficiency
    dust_degradation_rate: float = 0.001  # 0.1% per day
    operational_hours_per_day: float = 16.0  # Lunar day cycle
    
    # Component requirements for replication
    components_required: dict = {
        "aluminum_kg": 150,
        "iron_kg": 200,
        "silicon_kg": 100,
        "copper_kg": 20,
        "electronics_kg": 30,
    }
    
    def calculate_daily_extraction(self, days_operational: int = 0) -> float:
        """Calculate extraction considering dust degradation."""
        degradation_factor = max(0, 1 - (self.dust_degradation_rate * days_operational))
        return (
            self.extraction_rate_tons_per_hour 
            * self.operational_hours_per_day 
            * self.efficiency 
            * degradation_factor
        )


class MiningOperation(BaseModel):
    """Collection of mining robots and their operation."""
    
    robots: List[MiningRobot] = []
    total_regolith_processed: float = 0.0  # tons
    total_materials_extracted: dict = {}
    
    def add_robot(self, robot: MiningRobot) -> None:
        self.robots.append(robot)
    
    def simulate_day(self, day: int) -> dict:
        """Simulate one day of mining operation."""
        daily_extraction = sum(
            r.calculate_daily_extraction(day) for r in self.robots
        )
        self.total_regolith_processed += daily_extraction
        
        # Calculate materials (average composition)
        materials = {
            "iron_kg": daily_extraction * 5.0,
            "titanium_kg": daily_extraction * 0.4,
            "aluminum_kg": daily_extraction * 8.5,
            "silicon_kg": daily_extraction * 20.0,
            "magnesium_kg": daily_extraction * 8.0,
            "calcium_kg": daily_extraction * 10.0,
            "oxygen_kg": daily_extraction * 40.0,
        }
        
        for mat, amount in materials.items():
            self.total_materials_extracted[mat] = (
                self.total_materials_extracted.get(mat, 0) + amount
            )
        
        return materials
    
    def get_replication_potential(self) -> int:
        """Calculate how many new robots can be replicated."""
        if not self.robots:
            return 0
        
        template = self.robots[0]
        max_possible = float('inf')
        
        for mat, required in template.components_required.items():
            available = self.total_materials_extracted.get(mat, 0)
            if required > 0:
                max_possible = min(max_possible, available / required)
        
        return int(max_possible)