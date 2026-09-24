let ctx = null;
  let master = null;
  let ambientNodes = [];
  let ambientTimer = null;
  let enabled = true;
  let started = false;

  const progressions = [
    [110, 130.81, 164.81, 196],
    [98, 116.54, 146.83, 174.61],
    [87.31, 110, 130.81, 164.81],
    [73.42, 98, 123.47, 146.83]
  ];

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.55 : 0;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.05, when = 0) {
    if (!enabled || !ensure()) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function chord(freqs, dur = 4.2, gain = 0.035) {
    freqs.forEach((f, i) => {
      tone(f, dur, 'triangle', gain, i * 0.06);
      tone(f * 2.001, dur * 0.7, 'sine', gain * 0.35, i * 0.06 + 0.1);
    });
  }

  function noiseBed() {
    if (!enabled || !ensure()) return;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    const g = ctx.createGain();
    g.gain.value = 0.018;
    src.connect(filter).connect(g).connect(master);
    src.start();
    ambientNodes.push({ src, g });
  }

  function playAmbient() {
    stopAmbient();
    if (!enabled || !ensure()) return;
    noiseBed();
    let step = 0;
    const tick = () => {
      if (!enabled) return;
      const prog = progressions[step % progressions.length];
      chord(prog, 5.5, 0.03);
      if (step % 2 === 0) tone(prog[0] / 2, 6, 'sine', 0.045);
      step++;
    };
    tick();
    ambientTimer = setInterval(tick, 5200);
  }

  function stopAmbient() {
    if (ambientTimer) clearInterval(ambientTimer);
    ambientTimer = null;
    ambientNodes.forEach(({ src, g }) => {
      try { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4); } catch { /* noop */ }
      try { src.stop(ctx.currentTime + 0.5); } catch { /* noop */ }
    });
    ambientNodes = [];
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!started && enabled) {
      started = true;
      playAmbient();
    }
  }

  function setEnabled(on) {
    enabled = on;
    if (master) master.gain.value = on ? 0.55 : 0;
    if (on) unlock();
    else stopAmbient();
  }

  function haptic(ms = 12) {
    const settings = window.__CDL_SETTINGS__;
    if (settings && settings.haptics === false) return;
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  const audio = {
    unlock,
    setEnabled,
    haptic,
    blip() { tone(520, 0.09, 'triangle', 0.04); haptic(8); },
    select() { tone(660, 0.1, 'triangle', 0.045); haptic(10); },
    error() { tone(180, 0.22, 'sawtooth', 0.03); haptic(28); },
    win() {
      tone(392, 0.18, 'triangle', 0.05);
      tone(494, 0.2, 'triangle', 0.05, 0.08);
      tone(587, 0.3, 'triangle', 0.055, 0.16);
      tone(784, 0.45, 'sine', 0.04, 0.26);
      haptic([14, 40, 18]);
    },
    page() { tone(320, 0.12, 'sine', 0.03); },
    ambience: playAmbient
  };

export default audio;
