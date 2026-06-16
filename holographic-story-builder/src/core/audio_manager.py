"""
Audio Manager - Handles speech synthesis with pytttsx3
"""
import pyttsx3
from typing import Optional, Dict
from enum import Enum


class VoiceProfile(Enum):
    DEFAULT = "default"
    NARRATOR = "narrator"
    HERO = "hero"
    VILLAIN = "villain"
    WIZARD = "wizard"
    ROBOT = "robot"


class AudioManager:
    def __init__(self):
        self.engine = pyttsx3.init()
        self.voices = self.engine.getProperty('voices')
        self.current_profile = VoiceProfile.DEFAULT
        self.is_speaking = False

    def set_voice_profile(self, profile: VoiceProfile):
        self.current_profile = profile
        # Map profiles to voice properties
        profile_settings = {
            VoiceProfile.NARRATOR: {"rate": 150, "pitch": 50},
            VoiceProfile.HERO: {"rate": 170, "pitch": 70},
            VoiceProfile.VILLAIN: {"rate": 130, "pitch": 30},
            VoiceProfile.WIZARD: {"rate": 140, "pitch": 80},
            VoiceProfile.ROBOT: {"rate": 120, "pitch": 20},
            VoiceProfile.DEFAULT: {"rate": 160, "pitch": 60}
        }
        settings = profile_settings.get(profile, profile_settings[VoiceProfile.DEFAULT])
        self.engine.setProperty('rate', settings['rate'])

    def speak(self, text: str, modulation: Optional[Dict[str, float]] = None):
        if self.is_speaking:
            self.stop()

        self.is_speaking = True
        original_rate = self.engine.getProperty('rate')

        if modulation:
            rate = int(original_rate * modulation.get('rate', 1.0))
            self.engine.setProperty('rate', rate)

        self.engine.say(text)
        self.engine.runAndWait()
        self.is_speaking = False
        self.engine.setProperty('rate', original_rate)

    def stop(self):
        self.engine.stop()
        self.is_speaking = False

    def get_available_voices(self) -> list:
        return [v.name for v in self.voices]

    def set_voice(self, voice_name: str):
        for voice in self.voices:
            if voice_name in voice.name:
                self.engine.setProperty('voice', voice.id)
                return True
        return False