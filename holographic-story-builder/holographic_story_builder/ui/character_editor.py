"""
Character Editor - UI for character customization
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QSlider, QComboBox,
    QGroupBox, QFormLayout, QSpinBox
)
from PyQt6.QtCore import Qt


class CharacterEditor(QWidget):
    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)

        # Character selection
        char_group = QGroupBox("Character Selection")
        char_layout = QVBoxLayout(char_group)
        self.char_combo = QComboBox()
        self.char_combo.addItems(["Hero", "Villain", "Wizard", "Robot"])
        char_layout.addWidget(self.char_combo)
        layout.addWidget(char_group)

        # Emotion controls
        emotion_group = QGroupBox("Emotion Controls")
        emotion_layout = QFormLayout(emotion_group)

        self.joy_slider = QSlider(Qt.Orientation.Horizontal)
        self.joy_slider.setRange(0, 100)
        emotion_layout.addRow("Joy", self.joy_slider)

        self.anger_slider = QSlider(Qt.Orientation.Horizontal)
        self.anger_slider.setRange(0, 100)
        emotion_layout.addRow("Anger", self.anger_slider)

        self.sadness_slider = QSlider(Qt.Orientation.Horizontal)
        self.sadness_slider.setRange(0, 100)
        emotion_layout.addRow("Sadness", self.sadness_slider)

        layout.addWidget(emotion_group)

        # Animation controls
        anim_group = QGroupBox("Animations")
        anim_layout = QVBoxLayout(anim_group)
        anim_layout.addWidget(QPushButton("Play Idle"))
        anim_layout.addWidget(QPushButton("Play Talk"))
        anim_layout.addWidget(QPushButton("Play Gesture"))
        layout.addWidget(anim_group)

        # Voice controls
        voice_group = QGroupBox("Voice Settings")
        voice_layout = QFormLayout(voice_group)
        self.pitch_slider = QSlider(Qt.Orientation.Horizontal)
        self.pitch_slider.setRange(50, 200)
        self.pitch_slider.setValue(100)
        voice_layout.addRow("Pitch", self.pitch_slider)

        self.speed_slider = QSlider(Qt.Orientation.Horizontal)
        self.speed_slider.setRange(50, 200)
        self.speed_slider.setValue(100)
        voice_layout.addRow("Speed", self.speed_slider)

        layout.addWidget(voice_group)

        layout.addStretch()