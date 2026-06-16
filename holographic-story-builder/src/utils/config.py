"""
Configuration - Application settings management
"""
import json
from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class AppConfig:
    window_width: int = 1200
    window_height: int = 800
    dark_mode: bool = True
    hologram_color: tuple = (0.3, 0.7, 1.0)
    hologram_intensity: float = 1.0
    voice_rate: int = 160
    voice_pitch: int = 60
    recent_stories: list = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'window_width': self.window_width,
            'window_height': self.window_height,
            'dark_mode': self.dark_mode,
            'hologram_color': self.hologram_color,
            'hologram_intensity': self.hologram_intensity,
            'voice_rate': self.voice_rate,
            'voice_pitch': self.voice_pitch,
            'recent_stories': self.recent_stories
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AppConfig':
        return cls(
            window_width=data.get('window_width', 1200),
            window_height=data.get('window_height', 800),
            dark_mode=data.get('dark_mode', True),
            hologram_color=tuple(data.get('hologram_color', (0.3, 0.7, 1.0))),
            hologram_intensity=data.get('hologram_intensity', 1.0),
            voice_rate=data.get('voice_rate', 160),
            voice_pitch=data.get('voice_pitch', 60),
            recent_stories=data.get('recent_stories', [])
        )


class ConfigManager:
    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.config = self.load()

    def load(self) -> AppConfig:
        try:
            with open(self.config_path, 'r') as f:
                return AppConfig.from_dict(json.load(f))
        except FileNotFoundError:
            return AppConfig()

    def save(self):
        with open(self.config_path, 'w') as f:
            json.dump(self.config.to_dict(), f, indent=2)