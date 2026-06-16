"""
Asset Loader - Handles loading 3D models and audio assets
"""
import os
from typing import Optional, List


class AssetLoader:
    def __init__(self, assets_path: str = "assets"):
        self.assets_path = assets_path
        self.supported_formats = {
            'models': ['.gltf', '.glb', '.fbx', '.obj', '.bam'],
            'textures': ['.png', '.jpg', '.jpeg', '.dds'],
            'audio': ['.wav', '.mp3', '.ogg']
        }

    def find_assets(self, category: str) -> List[str]:
        """Find all assets of a given category"""
        if category not in self.supported_formats:
            return []

        extensions = self.supported_formats[category]
        assets = []
        category_path = os.path.join(self.assets_path, category)

        if os.path.exists(category_path):
            for file in os.listdir(category_path):
                if any(file.endswith(ext) for ext in extensions):
                    assets.append(os.path.join(category_path, file))

        return assets

    def load_model(self, model_path: str) -> Optional[str]:
        """Validate and return model path"""
        if os.path.exists(model_path):
            return model_path
        # Try in assets folder
        full_path = os.path.join(self.assets_path, 'characters', model_path)
        if os.path.exists(full_path):
            return full_path
        return None

    def load_shader(self, shader_name: str) -> Optional[str]:
        """Load shader source code"""
        shader_path = os.path.join(self.assets_path, 'shaders', f"{shader_name}.glsl")
        if os.path.exists(shader_path):
            with open(shader_path, 'r') as f:
                return f.read()
        return None