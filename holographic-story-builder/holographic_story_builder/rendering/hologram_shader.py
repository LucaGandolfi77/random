"""
Hologram Shader - Custom GLSL shaders for holographic effects
"""
from panda3d.core import Shader, Texture, CardMaker
from typing import Optional


class HologramShader:
    def __init__(self):
        self.shader = self._create_hologram_shader()
        self.scanline_texture = self._create_scanline_texture()

    def _create_hologram_shader(self) -> Shader:
        vertex_shader = """
        #version 140
        uniform mat4 p3d_ModelViewProjectionMatrix;
        in vec4 p3d_Vertex;
        in vec2 p3d_MultiTexCoord;
        out vec2 texcoord;
        uniform float hologram_time;
        uniform float hologram_intensity;
        
        void main() {
            gl_Position = p3d_ModelViewProjectionMatrix * p3d_Vertex;
            texcoord = p3d_MultiTexCoord;
        }
        """

        fragment_shader = """
        #version 140
        in vec2 texcoord;
        out vec4 fragColor;
        uniform float hologram_time;
        uniform float hologram_intensity;
        uniform vec3 hologram_color;
        
        void main() {
            float scanline = sin(texcoord.y * 50.0 + hologram_time * 5.0);
            float glow = hologram_intensity * (0.5 + 0.5 * sin(hologram_time * 3.0));
            vec3 color = hologram_color * (0.3 + 0.7 * glow);
            color += vec3(0.1, 0.3, 0.5) * scanline * 0.2;
            fragColor = vec4(color, 0.7 + 0.3 * glow);
        }
        """

        return Shader.make(Shader.SL_GLSL, vertex_shader, fragment_shader)

    def _create_scanline_texture(self) -> Texture:
        tex = Texture("scanline")
        # Create a simple scanline pattern
        return tex

    def apply_to_node(self, node, color: tuple = (0.3, 0.7, 1.0), intensity: float = 1.0):
        """Apply hologram shader to a Panda3D node"""
        node.set_shader(self.shader)
        node.set_shader_input("hologram_color", color)
        node.set_shader_input("hologram_intensity", intensity)
        node.set_shader_input("hologram_time", 0.0)

    def update_time(self, node, time: float):
        """Update shader time uniform for animation"""
        node.set_shader_input("hologram_time", time)