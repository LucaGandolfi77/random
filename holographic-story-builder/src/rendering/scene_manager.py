"""
Scene Manager - Manages Panda3D scene setup and camera
"""
from panda3d.core import NodePath, Vec3, Point3, AmbientLight, DirectionalLight
from direct.showbase.ShowBase import ShowBase
from typing import Optional, Dict


class SceneManager(ShowBase):
    def __init__(self):
        ShowBase.__init__(self)
        self.characters: Dict[str, NodePath] = {}
        self.camera_positions = [
            Point3(0, -20, 5),
            Point3(15, -15, 5),
            Point3(-15, -15, 5),
            Point3(0, -25, 10)
        ]
        self.current_camera_index = 0
        self.setup_scene()

    def setup_scene(self):
        """Initialize the 3D scene"""
        self.setup_lighting()
        self.setup_camera()
        self.setBackgroundColor(0.05, 0.05, 0.1, 1)

    def setup_lighting(self):
        """Configure scene lighting"""
        ambient = AmbientLight("ambient")
        ambient.setColor((0.3, 0.3, 0.3, 1))
        self.render.setLight(self.render.attachNewNode(ambient))

        directional = DirectionalLight("directional")
        directional.setDirection(Vec3(0, 1, -1))
        directional.setColor((0.8, 0.8, 0.8, 1))
        self.render.setLight(self.render.attachNewNode(directional))

    def setup_camera(self):
        """Configure initial camera position"""
        self.camera.setPos(self.camera_positions[0])
        self.camera.lookAt(0, 0, 2)

    def add_character(self, character_id: str, model_path: str) -> Optional[NodePath]:
        """Load and add a character to the scene"""
        try:
            character = self.loader.loadModel(model_path)
            character.reparentTo(self.render)
            character.setScale(2)
            character.setPos(0, 0, 0)
            self.characters[character_id] = character
            return character
        except Exception as e:
            print(f"Error loading character model: {e}")
            # Create placeholder geometry
            return self.create_placeholder_character(character_id)

    def create_placeholder_character(self, character_id: str) -> NodePath:
        """Create a simple placeholder character (sphere)"""
        from panda3d.core import CardMaker
        cm = CardMaker("character")
        cm.setFrame(-1, 1, -1, 1)
        character = self.render.attachNewNode(cm.generate())
        character.setScale(2)
        character.setPos(0, 10, 2)
        self.characters[character_id] = character
        return character

    def animate_camera(self, target_index: int, duration: float = 1.0):
        """Smoothly transition camera to new position"""
        from direct.interval.LerpInterval import LerpPosInterval
        if 0 <= target_index < len(self.camera_positions):
            self.current_camera_index = target_index
            LerpPosInterval(
                self.camera, duration,
                self.camera_positions[target_index]
            ).start()

    def cleanup(self):
        """Clean up scene resources"""
        for char in self.characters.values():
            char.removeNode()