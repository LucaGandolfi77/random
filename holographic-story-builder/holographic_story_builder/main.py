#!/usr/bin/env python3
"""
Holographic Story Builder - Main Entry Point
"""
import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer

from .ui.main_window import MainWindow
from .rendering.scene_manager import SceneManager
from .core.story_engine import StoryEngine, StoryNode, NodeType
from .core.character_manager import CharacterManager, Character, Emotion
from .core.audio_manager import AudioManager, VoiceProfile


class HolographicStoryBuilder:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.window = MainWindow()
        self.scene = SceneManager()
        self.story_engine = StoryEngine()
        self.character_manager = CharacterManager()
        self.audio_manager = AudioManager()

        self.setup_demo_story()
        self.setup_demo_characters()

        self.timer = QTimer()
        self.timer.timeout.connect(self.update_hologram_effects)
        self.timer.start(16)  # ~60 FPS

    def setup_demo_story(self):
        """Create a demo story for testing"""
        nodes = [
            StoryNode("start", NodeType.START, "Welcome to the Holographic Story Builder!", next_node="intro"),
            StoryNode("intro", NodeType.DIALOGUE, "I am your holographic guide. What story would you like to create?",
                      character="guide", next_node="choice"),
            StoryNode("choice", NodeType.CHOICE, "Choose your path:",
                      choices=[
                          {"text": "Fantasy Adventure", "next_node": "fantasy"},
                          {"text": "Sci-Fi Mystery", "next_node": "scifi"}
                      ]),
            StoryNode("fantasy", NodeType.DIALOGUE, "The ancient wizard speaks in riddles...",
                      character="wizard", emotion="joy", next_node="end"),
            StoryNode("scifi", NodeType.DIALOGUE, "The robot's optical sensors glow with data...",
                      character="robot", emotion="neutral", next_node="end"),
            StoryNode("end", NodeType.END, "Story complete! Save your creation.")
        ]
        for node in nodes:
            self.story_engine.add_node(node)
        self.story_engine.current_node_id = "start"

    def setup_demo_characters(self):
        """Create demo characters"""
        guide = Character("guide", "Holographic Guide", "placeholder", VoiceProfile.NARRATOR)
        wizard = Character("wizard", "Ancient Wizard", "placeholder", VoiceProfile.WIZARD)
        robot = Character("robot", "Data Droid", "placeholder", VoiceProfile.ROBOT)

        self.character_manager.add_character(guide)
        self.character_manager.add_character(wizard)
        self.character_manager.add_character(robot)

    def update_hologram_effects(self):
        """Update shader time for animation"""
        import time
        t = time.time()
        # Would update hologram shader time here

    def run(self):
        """Start the application"""
        self.window.show()
        return self.app.exec()


def main():
    """Entry point for the application"""
    builder = HolographicStoryBuilder()
    return builder.run()


if __name__ == "__main__":
    sys.exit(main())