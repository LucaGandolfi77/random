# Real-Time Artistic Vision Engine (RAVE)

A cutting-edge desktop application that transforms live camera feed into famous artistic styles using neural style transfer.

## Features

- Real-time webcam processing with OpenCV
- Multiple artistic styles (Van Gogh, Picasso, Monet, Hokusai)
- GPU acceleration via ONNX Runtime
- Style intensity control
- Snapshot and video recording
- Custom style upload support

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python -m rave
```

## Project Structure

```
rave/
├─ rave/
│   ├─ __init__.py
│   ├─ main.py          # Application entry point
│   ├─ camera.py        # Webcam handling
│   ├─ style_transfer.py  # Neural style transfer engine
│   ├─ ui/
│   │   ├─ __init__.py
│   │   ├─ main_window.py
│   │   └─ components.py
│   └─ models/
│       └─ style_models.py
├─ styles/              # Pre-trained style models
├─ requirements.txt
└─ README.md
```