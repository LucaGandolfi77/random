/*
 * Keyfall — Web Audio piano engine.
 * No external samples: a layered-oscillator piano with velocity-sensitive
 * envelope, a generated impulse reverb and a master limiter.
 *
 * API:
 *   new PianoAudio()
 *   ensure()          // create/resume AudioContext (call from a user gesture)
 *   get running()
 *   get currentTime() // seconds on the ctx timeline
 *   scheduleNote({ midi, velocity, start, end }) // end is the effective release (pedal-aware)
 *   stopAll(fade)     // kill every voice fast
 *   setVolume(v)      // 0..1
 *   setReverb(on)
 *   setSustainSim(on) // damp tails while many notes ring (cheapness)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KeyfallAudio = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_VOICES = 64;

  class PianoAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.reverbOn = true;
      this.voices = new Set();
    }

    get running() { return !!this.ctx && this.ctx.state === 'running'; }
    get currentTime() { return this.ctx ? this.ctx.currentTime : 0; }

    ensure() {
      if (!this.ctx) {
        const AC = (window.AudioContext || window.webkitAudioContext);
        if (!AC) throw new Error('Web Audio non supportato in questo browser.');
        this.ctx = new AC();

        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 22;
        comp.ratio.value = 9;
        comp.attack.value = 0.002;
        comp.release.value = 0.24;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);

        // generated impulse reverb
        this.wet = this.ctx.createGain();
        this.wet.gain.value = this.reverbOn ? 0.16 : 0.0001;
        const conv = this.ctx.createConvolver();
        conv.buffer = this.makeImpulse(1.9, 2.4);
        this.wet.connect(conv);
        conv.connect(this.master);
        this.dry = this.ctx.createGain();
        this.dry.gain.value = 0.92;
        this.dry.connect(this.master);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    makeImpulse(seconds, decay) {
      const rate = this.ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const buf = this.ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < len; i++) {
          ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
      }
      return buf;
    }

    setVolume(v) {
      if (this.master) this.master.gain.value = Math.max(0.0001, Math.min(1, v));
    }

    setReverb(on) {
      this.reverbOn = on;
      if (this.wet) this.wet.gain.setTargetAtTime(on ? 0.16 : 0.0001, this.ctx.currentTime, 0.15);
    }

    /* frequency partials tuned to be piano-ish across the range */
    partials(midi) {
      // fundamental + two detuned upper partials; brightness grows with pitch & velocity
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const bright = Math.max(0, (midi - 30) / 70); // 0..1
      return [
        { type: 'triangle', mult: 1, det: 0, gain: 0.9 },
        { type: 'sine', mult: 2, det: 1.4, gain: 0.22 + bright * 0.18 },
        { type: 'sine', mult: 3.98, det: -2.1, gain: 0.05 + bright * 0.16 },
        { type: 'sawtooth', mult: 1, det: 6, gain: 0.05 * (1 - bright * 0.4) },
      ];
    }

    scheduleNote(n) {
      if (!this.ctx) return;
      while (this.voices.size >= MAX_VOICES) this.dropOldest();
      const t0 = Math.max(this.ctx.currentTime + 0.001, n.start);
      const tEnd = Math.max(t0 + 0.06, n.end);
      const dur = tEnd - t0;
      const midi = Math.max(0, Math.min(127, n.midi));
      const vel = Math.max(0.04, Math.min(1, (n.velocity || 80) / 127));
      const peak = 0.34 * Math.pow(vel, 1.35);

      const out = this.ctx.createGain();
      const p = this.partials(midi);
      const voices = [];
      const now = this.ctx.currentTime;

      for (const part of p) {
        const osc = this.ctx.createOscillator();
        osc.type = part.type;
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12) * part.mult;
        osc.detune.value = part.det;
        const g = this.ctx.createGain();
        g.gain.value = part.gain * (0.35 + 0.65 * vel);
        osc.connect(g);
        g.connect(out);
        osc.start(t0);
        osc.stop(tEnd + 0.3);
        voices.push(osc);
      }

      // envelope — attack, settle, natural decay, clean release
      const env = out.gain;
      env.setValueAtTime(0.0001, t0);
      env.linearRampToValueAtTime(peak, t0 + 0.004);
      env.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.55), t0 + 0.06);
      if (dur > 0.22) {
        env.setTargetAtTime(0.00025, t0 + 0.06, Math.min(2.2, Math.max(0.15, dur * 0.4)));
      }
      env.exponentialRampToValueAtTime(0.00005, tEnd + 0.05);

      out.connect(this.dry);
      out.connect(this.wet);

      const voice = { out, oscs: voices, end: tEnd };
      this.voices.add(voice);
      const self = this;
      setTimeout(function () { self.voices.delete(voice); }, Math.ceil((tEnd - now + 0.5) * 1000) + 60);
    }

    dropOldest() {
      let oldest = null;
      for (const v of this.voices) if (!oldest || v.end < oldest.end) oldest = v;
      if (oldest) this.killVoice(oldest, 0.02);
    }

    killVoice(v, fade) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      try {
        v.out.gain.cancelScheduledValues(now);
        v.out.gain.setTargetAtTime(0.0001, now, Math.max(0.008, fade));
        for (const o of v.oscs) { try { o.stop(now + Math.max(0.05, fade) + 0.1); } catch (e) {} }
      } catch (e) {}
      this.voices.delete(v);
    }

    stopAll(fade) {
      if (!this.ctx) return;
      for (const v of Array.from(this.voices)) this.killVoice(v, fade || 0.03);
    }

    dispose() {
      if (!this.ctx) return;
      this.stopAll(0.02);
      try { this.ctx.close(); } catch (e) {}
      this.ctx = null;
      this.voices.clear();
    }
  }

  return PianoAudio;
});
