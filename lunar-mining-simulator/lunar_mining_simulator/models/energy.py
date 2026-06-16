from pydantic import BaseModel
from typing import Optional
import numpy as np


class SolarPanel(BaseModel):
    """Solar panel array with dust degradation."""
    
    area_m2: float = 10.0
    efficiency: float = 0.28  # 28% efficiency
    dust_accumulation_rate: float = 0.002  # 0.2% per day
    power_output_kw: float = 0.0
    
    def calculate_power_output(self, days_operational: int = 0, illumination_factor: float = 1.0) -> float:
        """Calculate power output considering dust and illumination."""
        degradation = max(0, 1 - (self.dust_accumulation_rate * days_operational))
        self.power_output_kw = self.area_m2 * 1361 * self.efficiency * degradation * illumination_factor
        return self.power_output_kw


class NuclearReactor(BaseModel):
    """Kilopower-style fission reactor."""
    
    thermal_power_kw: float = 1000.0
    electrical_efficiency: float = 0.30  # 30% conversion
    operational_lifetime_years: float = 15.0
    mass_kg: float = 1500.0
    
    @property
    def electrical_power_kw(self) -> float:
        return self.thermal_power_kw * self.electrical_efficiency


class EnergySystem(BaseModel):
    """Combined energy system for mining operation."""
    
    solar_panels: list[SolarPanel] = []
    nuclear_reactors: list[NuclearReactor] = []
    total_power_kw: float = 0.0
    
    def add_solar_panel(self, panel: SolarPanel) -> None:
        self.solar_panels.append(panel)
    
    def add_nuclear_reactor(self, reactor: NuclearReactor) -> None:
        self.nuclear_reactors.append(reactor)
    
    def calculate_total_power(self, days_operational: int = 0, illumination_factor: float = 1.0) -> float:
        """Calculate total available power."""
        solar_power = sum(
            p.calculate_power_output(days_operational, illumination_factor) 
            for p in self.solar_panels
        )
        nuclear_power = sum(r.electrical_power_kw for r in self.nuclear_reactors)
        self.total_power_kw = solar_power + nuclear_power
        return self.total_power_kw
    
    def get_energy_for_mining(self, extraction_rate_tons_per_hour: float) -> float:
        """Energy required for extraction (kWh per ton)."""
        # Based on real mining energy requirements
        return extraction_rate_tons_per_hour * 25.0  # kWh/ton