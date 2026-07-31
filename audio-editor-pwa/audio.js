/* ===================================================
   🎚 Audio Editor PWA — Motore audio
   Grafo live (Web Audio), rendering offline, export.
   Tempo/pitch indipendenti via SoundTouch (vendor).
   UMD: browser + Node (le API WebAudio arrivano come
   parametri, mai lette a livello di modulo).
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.AudioEngine = factory(root);
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  const FILL = 16384;

  /* ---------- Reverb (impulse generata, niente download) ---------- */
  function makeImpulse(ctx, duration, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /* ---------- Tempo/pitch indipendenti (SoundTouch) ---------- */
  function getSoundTouch() {
    const lib = root.SoundTouch;
    if (!lib) throw new Error('Libreria SoundTouch non disponibile');
    return lib;
  }

  /* buffer: AudioBuffer. Ritorna Promise<AudioBuffer> riprocessato. */
  function processTempoPitch(ctx, buffer, tempo, pitchSemitones) {
    return new Promise((resolve, reject) => {
      try {
        const lib = getSoundTouch();
        const s = new lib.SoundTouch();
        s.tempo = tempo || 1;
        s.pitch = Math.pow(2, (pitchSemitones || 0) / 12);

        const srcFrames = buffer.length;
        const padded = Math.ceil(srcFrames / FILL) * FILL + FILL;
        const chL = buffer.getChannelData(0);
        const chR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : chL;
        let served = 0;

        const source = {
          extract(target, numFrames) {
            const n = Math.min(numFrames, padded - served);
            for (let i = 0; i < n; i++) {
              const k = served + i;
              target[i * 2] = k < srcFrames ? chL[k] : 0;
              target[i * 2 + 1] = k < srcFrames ? chR[k] : 0;
            }
            served += n;
            return n;
          }
        };

        const filter = new lib.SimpleFilter(source, s);
        const tmp = new Float32Array(FILL * 2);
        const chunks = [];
        let total = 0;
        for (;;) {
          const n = filter.extract(tmp, FILL);
          if (n === 0) break;
          chunks.push(tmp.slice(0, n * 2));
          total += n;
        }

        /* taglia il coda di silenzio del padding */
        const expect = Math.max(1, Math.round(srcFrames / (tempo || 1)));
        const outLen = Math.min(total, expect);

        const out = ctx.createBuffer(2, outLen, buffer.sampleRate);
        const OL = out.getChannelData(0);
        const OR = out.getChannelData(1);
        let o = 0;
        let written = 0;
        for (const c of chunks) {
          for (let i = 0; i < c.length && written < outLen; i += 2) {
            OL[written] = c[i];
            OR[written] = c[i + 1];
            written++;
          }
          o += c.length;
          if (written >= outLen) break;
        }
        resolve(out);
      } catch (e) {
        reject(e);
      }
    });
  }

  /* ---------- Costruzione del grafo ---------- */
  function makeEq(ctx) {
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf'; low.frequency.value = 220;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.8;
    const high = ctx.createBiquadFilter();
    high.type = 'highshelf'; high.frequency.value = 4000;
    return { low, mid, high };
  }

  function makeFilter(ctx, type) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    if (type === 'lowpass') f.frequency.value = 20000;
    if (type === 'highpass') f.frequency.value = 20;
    return f;
  }

  /* Costruisce il grafo completo in ctx (AudioContext o OfflineAudioContext).
     Non fa partire nulla: ritorna nodi e schedule per i clip. */
  function buildGraph(ctx, project, assets, processed) {
    const g = { ctx, nodes: {}, tracks: {}, clips: {} };

    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, project.master.reverbDecay || 1.8, 2.5);
    const reverbWet = ctx.createGain();
    const masterIn = ctx.createGain();
    const eq = makeEq(ctx);
    const lp = makeFilter(ctx, 'lowpass');
    const hp = makeFilter(ctx, 'highpass');
    const comp = ctx.createDynamicsCompressor();
    const masterGain = ctx.createGain();

    convolver.connect(reverbWet);
    reverbWet.connect(masterIn);

    masterIn.connect(eq.low);
    eq.low.connect(eq.mid);
    eq.mid.connect(eq.high);
    eq.high.connect(hp);
    hp.connect(lp);
    lp.connect(comp);
    comp.connect(masterGain);
    masterGain.connect(ctx.destination);

    g.nodes = { convolver, reverbWet, masterIn, eq, lp, hp, comp, masterGain };

    for (const track of project.tracks) {
      const pan = ctx.createStereoPanner();
      const trackGain = ctx.createGain();
      const teq = makeEq(ctx);
      const tHp = makeFilter(ctx, 'highpass');
      const tLp = makeFilter(ctx, 'lowpass');
      const reverbSend = ctx.createGain();

      pan.connect(trackGain);
      trackGain.connect(teq.low);
      teq.low.connect(teq.mid);
      teq.mid.connect(teq.high);
      teq.high.connect(tHp);
      tHp.connect(tLp);
      tLp.connect(masterIn);
      tLp.connect(reverbSend);
      reverbSend.connect(convolver);

      g.tracks[track.id] = { pan, trackGain, eq: teq, hp: tHp, lp: tLp, reverbSend };

      for (const clip of track.clips) {
        const src = ctx.createBufferSource();
        const assetBuf = assets.get ? assets.get(clip.assetId) : assets[clip.assetId];
        src.buffer = processed[clip.id] || (assetBuf && assetBuf.buffer);
        src.loop = false;
        const clipGain = ctx.createGain();
        src.connect(clipGain);
        clipGain.connect(pan);
        g.clips[clip.id] = { source: src, clipGain };
      }
    }
    return g;
  }

  function applyTrackParams(g, project, trackId) {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) return;
    const n = g.tracks[trackId];
    if (!n) return;
    n.trackGain.gain.setValueAtTime(track.muted ? 0 : track.volume, g.ctx.currentTime);
    n.pan.pan.setValueAtTime(Math.max(-1, Math.min(1, track.pan)), g.ctx.currentTime);
    n.eq.low.gain.setValueAtTime(track.low || 0, g.ctx.currentTime);
    n.eq.mid.gain.setValueAtTime(track.mid || 0, g.ctx.currentTime);
    n.eq.high.gain.setValueAtTime(track.high || 0, g.ctx.currentTime);
    n.hp.frequency.setValueAtTime(track.hp || 20, g.ctx.currentTime);
    n.lp.frequency.setValueAtTime(track.lp || 20000, g.ctx.currentTime);
    n.reverbSend.gain.setValueAtTime(track.reverb || 0, g.ctx.currentTime);
  }

  function applyMasterParams(g, project) {
    const m = project.master;
    const n = g.nodes;
    n.masterGain.gain.setValueAtTime(m.volume != null ? m.volume : 0.9, g.ctx.currentTime);
    n.eq.low.gain.setValueAtTime(m.low || 0, g.ctx.currentTime);
    n.eq.mid.gain.setValueAtTime(m.mid || 0, g.ctx.currentTime);
    n.eq.high.gain.setValueAtTime(m.high || 0, g.ctx.currentTime);
    n.hp.frequency.setValueAtTime(m.hp || 20, g.ctx.currentTime);
    n.lp.frequency.setValueAtTime(m.lp || 20000, g.ctx.currentTime);
    n.reverbWet.gain.setValueAtTime(m.reverbOn ? (m.reverbWet || 0) : 0, g.ctx.currentTime);
    const c = n.comp;
    c.threshold.setValueAtTime(m.compOn ? (m.compThreshold != null ? m.compThreshold : -18) : 0, g.ctx.currentTime);
    c.knee.setValueAtTime(m.compKnee != null ? m.compKnee : 22, g.ctx.currentTime);
    c.ratio.setValueAtTime(m.compOn ? (m.compRatio || 4) : 1, g.ctx.currentTime);
    c.attack.setValueAtTime(m.compAttack || 0.003, g.ctx.currentTime);
    c.release.setValueAtTime(m.compRelease || 0.25, g.ctx.currentTime);
  }

  /* Avvia i clip nel grafo (tempo assoluto della timeline).
     startAt: istante ctx da cui parte la riproduzione della timeline.
     playhead: posizione timeline di partenza. */
  function scheduleClips(g, project, playhead, api) {
    const ctx = g.ctx;
    const now = ctx.currentTime;
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const n = g.clips[clip.id];
        if (!n) continue;
        const dur = api.clipEffectiveDuration(clip);
        const clipStart = clip.offset;
        const clipEnd = clipStart + dur;
        if (clipEnd <= playhead) continue;
        const sourceOffset = Math.max(0, (playhead - clipStart) * (clip.tempo || 1)) + clip.trimStart;
        const sourceDur = clip.trimEnd - sourceOffset;
        const when = now + Math.max(0, clipStart - playhead);
        n.source.start(when, sourceOffset, sourceDur);

        /* fade in/out sul gain del clip */
        const gGain = n.clipGain.gain;
        const fadeIn = Math.min(clip.fadeIn || 0, dur / 2);
        const fadeOut = Math.min(clip.fadeOut || 0, dur / 2);
        const startT = when;
        gGain.cancelScheduledValues(startT);
        gGain.setValueAtTime(0, startT);
        gGain.linearRampToValueAtTime(clip.volume || 1, startT + fadeIn);
        const endT = when + (sourceDur / (clip.tempo || 1));
        gGain.setValueAtTime(clip.volume || 1, Math.max(startT + fadeIn, endT - fadeOut));
        gGain.linearRampToValueAtTime(0, endT);
      }
    }
  }

  /* ---------- Render offline (per export) ---------- */
  function renderProject(project, assets, processed, sampleRate, onProgress, api) {
    return new Promise((resolve, reject) => {
      try {
        const duration = api.projectDuration(project);
        const len = Math.max(1, Math.ceil(duration * sampleRate));
        const ctx = new OfflineAudioContext(2, len, sampleRate);
        const g = buildGraph(ctx, project, assets, processed);
        for (const t of project.tracks) applyTrackParams(g, project, t.id);
        applyMasterParams(g, project);
        scheduleClips(g, project, 0, api);
        ctx.oncomplete = (ev) => {
          if (onProgress) onProgress(1);
          resolve(ev.renderedBuffer);
        };
        ctx.startRendering().then(null, reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  /* ---------- Estrazione della regione e miscela ---------- */
  function sliceBuffer(buffer, start, end) {
    const rate = buffer.sampleRate;
    const a = Math.max(0, Math.floor(start * rate));
    const b = Math.min(buffer.length, Math.ceil(end * rate));
    const len = Math.max(1, b - a);
    const out = {
      channels: [],
      sampleRate: rate,
      length: len,
    };
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const d = new Float32Array(len);
      d.set(src.subarray(a, b));
      out.channels.push(d);
    }
    return out;
  }

  /* ---------- Export a file ---------- */
  function exportRegion(project, assets, processed, opts, api) {
    const sampleRate = opts.sampleRate;
    const region = opts.region; // {start,end}
    return renderProject(project, assets, processed, sampleRate, opts.onRender, api).then(rendered => {
      const total = api.projectDuration(project);
      const start = region && region.start != null ? Math.max(0, region.start) : 0;
      const end = region && region.end != null ? Math.min(region.end, total) : total;
      const sliced = sliceBuffer(rendered, start, Math.max(end, start + 0.001));
      return sliced;
    });
  }

  return {
    makeImpulse,
    processTempoPitch,
    buildGraph,
    applyTrackParams,
    applyMasterParams,
    scheduleClips,
    renderProject,
    sliceBuffer,
    exportRegion,
  };
});
