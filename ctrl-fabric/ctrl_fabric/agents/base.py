"""Base agent class for Ctrl+Fabric."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import json


class BaseAgent(ABC):
    """Base class for all AI agents."""
    
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        self.status = "idle"
    
    @abstractmethod
    def run(self, *args, **kwargs) -> Any:
        """Execute the agent's main task."""
        pass
    
    def report(self) -> Dict[str, Any]:
        """Return a status report."""
        return {
            "agent": self.name,
            "role": self.role,
            "status": self.status,
            "timestamp": self._timestamp()
        }
    
    def _timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def log(self, message: str):
        """Log a message."""
        print(f"[{self.name}] {message}")