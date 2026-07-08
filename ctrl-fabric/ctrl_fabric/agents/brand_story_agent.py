"""Brand Story Agent - Content creation."""

from typing import Dict, Any
from .base import BaseAgent


class BrandStoryAgent(BaseAgent):
    """Creates brand content with consistent voice."""
    
    def __init__(self):
        super().__init__("Brand Story Agent", "Content creation")
        self.voice = "Minimal, technical, precise"
    
    def run(self, content_type: str, topic: str) -> str:
        """Generate content with brand voice."""
        self.status = "writing"
        
        if content_type == "newsletter":
            content = f"Subject: {topic}\n\nEngineered for precision. Designed for purpose."
        elif content_type == "manifesto":
            content = "We build clothing like code. Every stitch is intentional."
        elif content_type == "packaging":
            content = "TEE-4.2 v1.0\nRelease Notes: Initial release\nSpecs: 210gsm, 9800 abrasion cycles"
        else:
            content = f"{topic} - Engineered with precision."
        
        self.status = "idle"
        return content