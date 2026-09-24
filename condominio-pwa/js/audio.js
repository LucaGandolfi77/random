/* Scala B, Civico 0 — suoni proceduali (Web Audio API) */

let ctx = null;
let enabled = true;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setSound(on) {
  enabled = !!on;
}

function tone({ freq, dur = 0.18, type = "sine", gain = 0.14, delay = 0, glide = 0 }) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap() {
    tone({ freq: 520, dur: 0.07, type: "triangle", gain: 0.07 });
  },
  favor() {
    tone({ freq: 660, dur: 0.14, type: "sine", gain: 0.12 });
    tone({ freq: 880, dur: 0.2, type: "sine", gain: 0.1, delay: 0.08 });
    tone({ freq: 1174, dur: 0.26, type: "sine", gain: 0.08, delay: 0.16 });
  },
  pop() {
    tone({ freq: 420, dur: 0.1, type: "triangle", gain: 0.1, glide: 260 });
  },
  rare() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.28, type: "sine", gain: 0.11, delay: i * 0.07 })
    );
  },
  epic() {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: "triangle", gain: 0.1, delay: i * 0.06 })
    );
  },
  error() {
    tone({ freq: 220, dur: 0.16, type: "sawtooth", gain: 0.06, glide: -60 });
  },
  unlock() {
    [330, 440, 550, 660, 880].forEach((f, i) =>
      tone({ freq: f, dur: 0.4, type: "sine", gain: 0.12, delay: i * 0.09 })
    );
  },
};

export function haptic(pattern = 12) {
  if (!navigator.vibrate) return;
  if (!window.__c0_haptics) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* niente */
  }
}
