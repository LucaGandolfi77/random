from enum import Enum
from pydantic import BaseModel
from typing import Dict, Optional


class LunarLocation(str, Enum):
    POLE = "lunar_pole"
    EQUATOR = "lunar_equator"
    MARE = "lunar_mare"
    HIGHLAND = "lunar_highland"


class RegolithComposition(BaseModel):
    """
    Real lunar regolith composition based on Apollo samples and LRO data.
    Values are weight percentages.
    """
    
    # Base composition (typical lunar regolith)
    ilmenite: float = 0.15  # FeTiO3 - for iron/titanium extraction
    olivine: float = 12.0   # (Mg,Fe)2SiO4 - for silicon/magnesium
    pyroxene: float = 25.0   # Ca(Mg,Fe)Si2O6 - for calcium/iron/silicon
    anorthosite: float = 35.0  # CaAl2Si2O8 - for aluminum
    glass: float = 15.0     # Impact glass
    agglutinate: float = 8.0  # Agglutinate glass
    void: float = 5.0       # Porosity
    
    # Derived materials (kg per ton of regolith)
    iron: float = 5.0       # Fe from ilmenite/pyroxene
    titanium: float = 0.4    # Ti from ilmenite
    aluminum: float = 8.5   # Al from anorthosite
    silicon: float = 20.0   # Si from all silicates
    magnesium: float = 8.0   # Mg from olivine/pyroxene
    calcium: float = 10.0    # Ca from pyroxene/anorthosite
    oxygen: float = 40.0    # O bound in oxides
    
    @classmethod
    def for_location(cls, location: LunarLocation) -> "RegolithComposition":
        """Get location-specific composition."""
        compositions = {
            LunarLocation.POLE: cls(
                ilmenite=0.25,  # Higher in permanently shadowed regions
                olivine=10.0,
                pyroxene=20.0,
                anorthosite=40.0,
                glass=12.0,
                agglutinate=13.0,
            ),
            LunarLocation.EQUATOR: cls(
                ilmenite=0.12,
                olivine=15.0,
                pyroxene=30.0,
                anorthosite=25.0,
                glass=15.0,
                agglutinate=5.0,
            ),
            LunarLocation.MARE: cls(
                ilmenite=0.08,
                olivine=8.0,
                pyroxene=22.0,
                anorthosite=45.0,
                glass=10.0,
                agglutinate=5.0,
            ),
            LunarLocation.HIGHLAND: cls(
                ilmenite=0.10,
                olivine=18.0,
                pyroxene=28.0,
                anorthosite=38.0,
                glass=8.0,
                agglutinate=8.0,
            ),
        }
        return compositions.get(location, cls())
    
    def get_material_yield(self, regolith_tons: float) -> Dict[str, float]:
        """Calculate material yield in kg for given regolith mass."""
        return {
            "iron_kg": regolith_tons * self.iron,
            "titanium_kg": regolith_tons * self.titanium,
            "aluminum_kg": regolith_tons * self.aluminum,
            "silicon_kg": regolith_tons * self.silicon,
            "magnesium_kg": regolith_tons * self.magnesium,
            "calcium_kg": regolith_tons * self.calcium,
            "oxygen_kg": regolith_tons * self.oxygen,
        }