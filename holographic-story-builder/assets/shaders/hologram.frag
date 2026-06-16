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