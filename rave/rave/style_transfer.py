#!/usr/bin/env python3
"""Neural style transfer engine for RAVE."""

import numpy as np
import onnxruntime as ort
from PIL import Image


class StyleTransferEngine:
    """Handles neural style transfer inference."""
    
    def __init__(self, model_path: str = None):
        self.session = None
        self.model_path = model_path
    
    def load_model(self, style_name: str):
        """Load ONNX model for specific style."""
        model_file = f"styles/{style_name}.onnx"
        self.session = ort.InferenceSession(model_file)
    
    def apply_style(self, frame: np.ndarray, intensity: float = 1.0) -> np.ndarray:
        """Apply style transfer to frame."""
        if self.session is None:
            return frame
        
        # Preprocess
        input_tensor = frame.astype(np.float32).transpose(2, 0, 1)
        input_tensor = np.expand_dims(input_tensor, 0)
        
        # Inference
        output = self.session.run(None, {"input": input_tensor})
        
        # Postprocess
        styled = output[0][0].transpose(1, 2, 0)
        styled = (styled * 255).astype(np.uint8)
        
        # Blend with original
        blended = cv2.addWeighted(frame, 1 - intensity, styled, intensity, 0)
        return blended