"""Garment technical specification model."""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime


@dataclass
class Version:
    """A version of a garment with technical specs."""
    version: str
    release_date: datetime
    changes: List[str] = field(default_factory=list)
    specs: Dict[str, Any] = field(default_factory=dict)
    
    def __str__(self) -> str:
        changes_str = " → ".join(self.changes) if self.changes else "Initial release"
        return f"v{self.version}: {changes_str}"


@dataclass
class Garment:
    """A garment with technical specifications and version history."""
    sku: str
    name: str
    category: str
    versions: List[Version] = field(default_factory=list)
    current_version: Optional[str] = None
    
    def add_version(self, version: str, changes: List[str], specs: Dict[str, Any]):
        """Add a new version to the garment."""
        v = Version(
            version=version,
            release_date=datetime.now(),
            changes=changes,
            specs=specs
        )
        self.versions.append(v)
        self.current_version = version
    
    def get_specs(self) -> Dict[str, Any]:
        """Get current version specifications."""
        for v in reversed(self.versions):
            if v.version == self.current_version:
                return v.specs
        return {}
    
    def __str__(self) -> str:
        version_history = " → ".join(str(v) for v in self.versions[-3:])
        return f"{self.sku} - {self.name}\n{version_history}"


# Example garments
TEE_4_2 = Garment(
    sku="TEE-4.2",
    name="Essential T-Shirt",
    category="tops"
)
TEE_4_2.add_version(
    version="1.0",
    changes=["Initial release"],
    specs={
        "weight_gsm": 210,
        "thermal_efficiency": 7.8,
        "stretch_percent": 12,
        "abrasion_cycles": 9800,
        "wrinkle_recovery": 92,
        "expected_lifetime_washes": 430,
        "fabric": "Combed cotton",
        "fit": "Regular"
    }
)

HOODIE_V2 = Garment(
    sku="HOODIE-2.0",
    name="Technical Hoodie",
    category="outerwear"
)
HOODIE_V2.add_version(
    version="2.0",
    changes=["Fabric updated", "Improved collar"],
    specs={
        "weight_gsm": 420,
        "thermal_efficiency": 8.5,
        "stretch_percent": 8,
        "abrasion_cycles": 12000,
        "wrinkle_recovery": 88,
        "expected_lifetime_washes": 380,
        "fabric": "French Terry",
        "fit": "Relaxed",
        "features": ["Hidden zipper pocket", "Reflective details"]
    }
)