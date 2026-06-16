# Holographic Story Builder

An immersive, interactive storytelling application that brings characters to life through 3D holograms with realistic speech synthesis.

## Features

- **3D Character Engine**: Panda3D-powered holographic characters with animations
- **Speech Synthesis**: Offline TTS with pytttsx3 and emotional voice modulation
- **Interactive Stories**: Branching narratives with visual node editor
- **Hologram Effects**: Shader-based holographic rendering with scanlines and glow
- **Lip Sync**: Automatic phoneme-based lip synchronization

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python -m holographic_story_builder
```

## Project Structure

```
holographic-story-builder/
├── src/
│   ├── core/
│   │   ├── story_engine.py
│   │   ├── character_manager.py
│   │   └── audio_manager.py
│   ├── ui/
│   │   ├── main_window.py
│   │   ├── story_canvas.py
│   │   └── character_editor.py
│   ├── rendering/
│   │   ├── hologram_shader.py
│   │   └── scene_manager.py
│   └── utils/
│       ├── asset_loader.py
│       └── config.py
├── assets/
│   └── shaders/
├── stories/
└── main.py
```