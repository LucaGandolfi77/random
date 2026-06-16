"""
Character Manager - Handles 3D character loading and animations
"""
from typing import Dict, Optional
from dataclasses import dataclass
from enum import Enum


class Emotion(Enum):
    NEUTRAL = "neutral"
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    SURPRISE = "surprise"
    FEAR = "fear"


@dataclass
class Character:
    id: str
    name: str
    model_path: str
    voice_profile: str = "default"
    current_emotion: Emotion = Emotion.NEUTRAL
    animations: Dict[str, str] = None

    def __post_init__(self):
        if self.animations is None:
            self.animations = {}


class CharacterManager:
    def __init__(self):
        self.characters: Dict[str, Character] = {}
        self.active_character: Optional[Character] = None

    def add_character(self, character: Character):
        self.characters[character.id] = character

    def load_character(self, character_id: str) -> Optional[Character]:
        return self.characters.get(character_id)

    def set_emotion(self, character_id: str, emotion: Emotion):
        char = self.characters.get(character_id)
        if char:
            char.current_emotion = emotion
            return True
        return False

    def play_animation(self, character_id: str, animation_name: str):
        char = self.characters.get(character_id)
        if char and animation_name in char.animations:
            # Would trigger Panda3D animation
            print(f"Playing animation '{animation_name}' for {char.name}")
            return True
        return False

    def get_emotion_modulation(self, emotion: Emotion) -> Dict[str, float]:
        """Return voice modulation parameters for emotion"""
        modulations = {
            Emotion.JOY: {"pitch": 1.2, "rate": 1.1, "volume": 1.0},
            Emotion.SADNESS: {"pitch": 0.8, "rate": 0.9, "volume": 0.8},
            Emotion.ANGER: {"pitch": 1.1, "rate": 1.2, "volume": 1.3},
            Emotion.SURPRISE: {"pitch": 1.3, "rate": 1.1, "volume": 1.1},
            Emotion.FEAR: {"pitch": 1.4, "rate": 1.3, "volume": 0.9},
            Emotion.NEUTRAL: {"pitch": 1.0, "rate": 1.0, "volume": 1.0}
        }
        return modulations.get(emotion, modulations[Emotion.NEUTRAL])