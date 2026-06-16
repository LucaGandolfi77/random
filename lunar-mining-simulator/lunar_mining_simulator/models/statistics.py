import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional
from pydantic import BaseModel


class MonteCarloSimulator(BaseModel):
    """Monte Carlo simulation for extraction variability."""
    
    iterations: int = 1000
    mean_extraction_rate: float = 2.0  # tons/hour
    std_extraction_rate: float = 0.3   # variability
    confidence_level: float = 0.95
    
    def run_extraction_simulation(self, hours: float) -> Dict[str, float]:
        """
        Run Monte Carlo simulation for extraction.
        Returns statistics with confidence intervals.
        """
        samples = np.random.normal(
            self.mean_extraction_rate, 
            self.std_extraction_rate, 
            self.iterations
        )
        
        # Ensure positive values
        samples = np.maximum(samples, 0)
        
        total_extracted = samples * hours
        
        alpha = 1 - self.confidence_level
        lower = np.percentile(total_extracted, alpha / 2 * 100)
        upper = np.percentile(total_extracted, (1 - alpha / 2) * 100)
        
        return {
            "mean_tons": float(np.mean(total_extracted)),
            "median_tons": float(np.median(total_extracted)),
            "std_tons": float(np.std(total_extracted)),
            "min_tons": float(np.min(total_extracted)),
            "max_tons": float(np.max(total_extracted)),
            "ci_lower": float(lower),
            "ci_upper": float(upper),
        }


class TimeSeriesProjection(BaseModel):
    """Project colonization phases over time."""
    
    years: int = 30
    initial_robots: int = 10
    growth_rate: float = 0.15  # 15% annual growth
    material_decay_rate: float = 0.02  # 2% annual decay
    
    def project_population(self) -> pd.DataFrame:
        """Project robot population over years."""
        days = self.years * 365
        population = []
        dates = []
        
        current_pop = self.initial_robots
        for day in range(days):
            if day % 365 == 0:
                # Annual growth
                current_pop = int(current_pop * (1 + self.growth_rate))
            
            population.append(current_pop)
            dates.append(f"Year {day // 365}")
        
        return pd.DataFrame({
            "day": range(days),
            "year": [d // 365 for d in range(days)],
            "robots": population,
        })
    
    def project_materials(self, daily_extraction_tons: float) -> pd.DataFrame:
        """Project material accumulation over time."""
        days = self.years * 365
        
        # Material yields per ton (kg)
        yields = {
            "iron_kg": 5.0,
            "titanium_kg": 0.4,
            "aluminum_kg": 8.5,
            "silicon_kg": 20.0,
            "oxygen_kg": 40.0,
        }
        
        data = {"day": range(days)}
        for mat, yield_per_ton in yields.items():
            cumulative = []
            total = 0.0
            for day in range(days):
                total += daily_extraction_tons * yield_per_ton
                cumulative.append(total)
            data[mat] = cumulative
        
        return pd.DataFrame(data)
    
    def calculate_colonization_milestones(self) -> Dict[str, int]:
        """Calculate key milestones for Mars colonization."""
        # Based on NASA estimates for Mars mission
        milestones = {
            "initial_setup": self.initial_robots,
            "self_sufficient": int(self.initial_robots * 10),  # ~10x for self-sufficiency
            "mars_mission_ready": int(self.initial_robots * 50),  # ~50x for Mars launch
            "mars_colony_sustainable": int(self.initial_robots * 200),  # ~200x for Mars base
        }
        return milestones