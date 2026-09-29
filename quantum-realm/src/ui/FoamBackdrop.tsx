import { useEffect, useRef } from 'react'
import { useGame } from '../game/store'

const VERT = `#version 100
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/**
 * "Quantum foam": a raymarched interference field. Three emitters superpose,
 * the modulus is drawn as a ridged surface, and a slow drift keeps it alive.
 */
const FRAG = `#version 100
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uHue;
uniform float uEnergy;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)),
                 dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
             mix(dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)),
                 dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec3 palette(float t) {
  vec3 a = vec3(0.42, 0.30, 0.62);
  vec3 b = vec3(0.38, 0.34, 0.44);
  vec3 c = vec3(1.00, 1.00, 1.00);
  vec3 d = vec3(0.20, 0.32, 0.58);
  return a + b * cos(6.28318 * (c * t + d + uHue));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.08;

  // domain warp: the whole field writhes like a probability cloud
  vec2 q = vec2(fbm(uv * 1.6 + t), fbm(uv * 1.6 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 2.2 + 3.4 * q + vec2(1.7, 9.2) + 0.15 * t),
                fbm(uv * 2.2 + 3.4 * q + vec2(8.3, 2.8) - 0.12 * t));
  float f = fbm(uv * 2.4 + 3.0 * r);

  // three superposed emitters, exactly like the interference scene
  vec2 s0 = vec2(-0.62, 0.18) + vec2(cos(t * 1.7), sin(t * 1.3)) * 0.12;
  vec2 s1 = vec2(0.05, -0.34) + vec2(cos(t * 1.1 + 2.0), sin(t * 1.6)) * 0.16;
  vec2 s2 = vec2(0.66, 0.26) + vec2(cos(t * 0.8 + 4.0), sin(t * 1.9)) * 0.10;
  float d0 = sin(length(uv - s0) * 17.0 - t * 5.0);
  float d1 = sin(length(uv - s1) * 21.0 - t * 3.4);
  float d2 = sin(length(uv - s2) * 14.0 - t * 6.1);
  float psi = (d0 + d1 + d2) / 3.0;
  float prob = psi * psi;                    // |psi|^2 : the actual probability

  float ridge = abs(1.0 - abs(f * 3.2));
  float lum = pow(1.0 - ridge, 3.0) * 0.55;
  vec3 col = palette(f * 0.5 + 0.5 + uHue * 0.2) * (lum + prob * 0.30 * (0.5 + uEnergy));
  col += vec3(0.55, 0.75, 1.0) * pow(prob, 6.0) * 0.7 * (0.4 + uEnergy);

  // fine interference fringes where the field is nearly flat
  float fringe = sin(prob * 90.0 + uTime * 2.0) * 0.5 + 0.5;
  col += vec3(0.8, 0.7, 1.0) * fringe * 0.02 * (1.0 - abs(psi));

  // vignette and grain
  float vig = 1.0 - 0.75 * dot(uv, uv);
  col *= vig;
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453) - 0.5) * 0.025;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/**
 * Full-bleed WebGL backdrop. Falls back to a CSS gradient when WebGL is
 * unavailable or the shader refuses to compile.
 */
export function FoamBackdrop({ hue = 0, energy = 0 }: { hue?: number; energy?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduceMotion = useGame((s) => s.reduceMotion)
  const state = useRef({ hue, energy, failed: false })

  useEffect(() => {
    state.current.hue = hue
    state.current.energy = energy
  }, [hue, energy])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl =
      (canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) as
        | WebGLRenderingContext
        | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) {
      state.current.failed = true
      canvas.classList.add('is-fallback')
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const prog = vs && fs ? gl.createProgram() : null
    if (!vs || !fs || !prog) {
      state.current.failed = true
      canvas.classList.add('is-fallback')
      return
    }
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      state.current.failed = true
      canvas.classList.add('is-fallback')
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uHue = gl.getUniformLocation(prog, 'uHue')
    const uEnergy = gl.getUniformLocation(prog, 'uEnergy')

    // Render at reduced resolution: the field is soft, nobody can tell, and it
    // keeps phones at 60fps.
    const scale = 0.55
    let raf = 0
    const start = performance.now()

    const resize = () => {
      const w = Math.max(1, Math.round(window.innerWidth * scale))
      const h = Math.max(1, Math.round(window.innerHeight * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      resize()
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, reduceMotion ? (now - start) * 0.00012 : (now - start) * 0.001)
      gl.uniform1f(uHue, state.current.hue)
      gl.uniform1f(uEnergy, state.current.energy)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [reduceMotion])

  return <canvas ref={ref} className="foam" aria-hidden="true" />
}
