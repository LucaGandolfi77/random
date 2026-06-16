from pydantic import BaseModel
from typing import Dict, Optional
import numpy as np


class Replicator(BaseModel):
    """3D printing fabricator for robot replication."""
    
    id: int = 0
    production_rate_kg_per_day: float = 50.0  # Total material processing
    efficiency: float = 0.75  # 75% material utilization
    power_consumption_kw: float = 3.0
    assembly_time_hours: float = 48.0  # 2 days for full assembly
    
    # Production rates for different materials (kg/day)
    material_rates: Dict[str, float] = {
        "aluminum_kg": 20.0,
        "iron_kg": 15.0,
        "silicon_kg": 10.0,
        "copper_kg": 2.0,
        "electronics_kg": 3.0,
    }


class ReplicationCalculator(BaseModel):
    """Calculate replication time and requirements."""
    
    replicator: Replicator
    materials_available: Dict[str, float] = {}
    materials_needed: Dict[str, float] = {}
    
    def calculate_replication_time(self) -> float:
        """
        Calculate time needed to replicate one robot.
        Returns days required.
        """
        # Find the bottleneck material
        max_time = 0.0
        
        for mat, needed in self.materials_needed.items():
            available = self.materials_available.get(mat, 0)
            rate = self.replicator.material_rates.get(mat, 1.0)
            
            if available < needed and rate > 0:
                # Time to produce the deficit
                time_needed = (needed - available) / rate
                max_time = max(max_time, time_needed)
        
        # Add assembly time
        total_days = (max_time / 24.0) + (self.replicator.assembly_time_hours / 24.0)
        return total_days
    
    def calculate_self_sufficiency(self) -> float:
        """
        Calculate self-sufficiency percentage.
        Returns percentage of materials that can be produced internally.
        """
        if not self.materials_needed:
            return 100.0
        
        total_needed = sum(self.materials_needed.values())
        total_available = sum(self.materials_available.get(k, 0) for k in self.materials_needed)
        
        return min(100.0, (total_available / total_needed) * 100.0)
    
    def project_replication_growth(self, initial_robots: int, days: int) -> list[int]:
        """
        Project robot population growth over time.
        Returns list of robot counts per day.
        """
        population = [initial_robots]
        current_materials = self.materials_available.copy()
        
        for day in range(1, days + 1):
            # Simulate daily extraction
            daily_extraction = initial_robots * 2.0 * 16.0 * 0.85  # tons
            
            # Add extracted materials
            for mat in self.materials_needed:
                current_materials[mat] = current_materials.get(mat, 0) + daily_extraction * 0.1
            
            # Check for replication
            if self.calculate_replication_time() <= 1.0:
                population.append(population[-1] + 1)
                # Consume materials for new robot
                for mat, amount in self.materials_needed.items():
                    current_materials[mat] = max(0, current_materials.get(mat, 0) - amount)
            else:
                population.append(population[-1])
        
        return population