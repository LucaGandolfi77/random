/* ===================================================
   🎚 Audio Editor PWA — Modello progetto (modulo puro)
   Track, clip, regione, serializzazione. Nessun DOM,
   nessuna Web Audio: solo dati e matematica timeline.
   UMD: browser + Node (per i test).
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioProject = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MIN_CLIP = 0.05;          // durata minima di un clip in secondi
  const DEFAULT_GRID = 0.5;       // snap grid in secondi

  const VERSION = 1;

  function nextId(project, type) {
    project.counters[type] = (project.counters[type] || 0) + 1;
    return `${type}_${project.counters[type]}`;
  }

  function createProject() {
    return {
      version: VERSION,
      counters: { track: 0, clip: 0 },
      tracks: [],
      master: {
        volume: 0.9, low: 0, mid: 0, high: 0,
        reverbOn: true, reverbWet: 0.18, reverbDecay: 1.8,
        compOn: true, compThreshold: -18, compRatio: 4, compKnee: 22, compAttack: 0.003, compRelease: 0.25,
      },
      snap: true,
      grid: DEFAULT_GRID,
    };
  }

  function createTrack(project, name) {
    const track = {
      id: nextId(project, 'track'),
      name: name || `Track ${project.tracks.length + 1}`,
      muted: false, solo: false,
      volume: 1, pan: 0,
      low: 0, mid: 0, high: 0,
      hp: 20, lp: 20000,
      reverb: 0.25,
      color: TRACK_COLORS[project.tracks.length % TRACK_COLORS.length],
      clips: [],
    };
    project.tracks.push(track);
    return track;
  }

  const TRACK_COLORS = ['#3aa0ff', '#ff6b9d', '#35d0ba', '#f6c63f', '#b18cff', '#ff8c42', '#57c7ff', '#9ddc55'];

  function defaultClip(project, assetId, opts) {
    const o = opts || {};
    return {
      id: nextId(project, 'clip'),
      assetId,
      name: o.name || 'Clip',
      offset: o.offset != null ? o.offset : 0,
      trimStart: o.trimStart != null ? o.trimStart : 0,
      trimEnd: o.trimEnd != null ? o.trimEnd : 0,
      volume: o.volume != null ? o.volume : 1,
      fadeIn: o.fadeIn != null ? o.fadeIn : 0,
      fadeOut: o.fadeOut != null ? o.fadeOut : 0,
      tempo: o.tempo != null ? o.tempo : 1,
      pitch: o.pitch != null ? o.pitch : 0,   // semitoni
    };
  }

  function addClip(project, trackId, clip) {
    const track = project.tracks.find(t => t.id === trackId);
    if (!track) return null;
    track.clips.push(clip);
    track.clips.sort((a, b) => a.offset - b.offset);
    return clip;
  }

  function removeClip(project, clipId) {
    for (const t of project.tracks) {
      const i = t.clips.findIndex(c => c.id === clipId);
      if (i >= 0) {
        t.clips.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function findClip(project, clipId) {
    for (const t of project.tracks) {
      const c = t.clips.find(c => c.id === clipId);
      if (c) return c;
    }
    return null;
  }

  function findTrackByClip(project, clipId) {
    return project.tracks.find(t => t.clips.some(c => c.id === clipId)) || null;
  }

  /* Durata di un clip sulla timeline (tempo != 1 cambia la lunghezza). */
  function clipSourceLength(clip) {
    return Math.max(0, clip.trimEnd - clip.trimStart);
  }

  function clipEffectiveDuration(clip) {
    return clipSourceLength(clip) / (clip.tempo || 1);
  }

  function trackDuration(track) {
    let end = 0;
    for (const c of track.clips) end = Math.max(end, c.offset + clipEffectiveDuration(c));
    return end;
  }

  function projectDuration(project) {
    let end = 0;
    for (const t of project.tracks) end = Math.max(end, trackDuration(t));
    return end;
  }

  function clampTrim(trimStart, trimEnd, assetDuration, minLen) {
    const min = minLen || MIN_CLIP;
    let a = Math.max(0, trimStart);
    let b = Math.min(assetDuration || trimEnd + min, trimEnd);
    if (b - a < min) {
      if (a + min <= (assetDuration || Infinity)) b = a + min;
      else if (b - min >= 0) a = b - min;
    }
    return { trimStart: a, trimEnd: b };
  }

  /* Split di un clip al tempo t (tempo assoluto sulla timeline). */
  function splitClip(project, clipId, t) {
    const clip = findClip(project, clipId);
    if (!clip) return null;
    const rel = t - clip.offset;
    const sourcePos = clip.trimStart + rel * clip.tempo;
    const clipLen = clipSourceLength(clip);
    if (sourcePos - clip.trimStart < MIN_CLIP) return null;
    if (clip.trimEnd - sourcePos < MIN_CLIP) return null;

    const b = JSON.parse(JSON.stringify(clip));
    b.id = nextId(project, 'clip');
    clip.trimEnd = sourcePos;
    b.trimStart = sourcePos;
    b.offset = clip.offset + clipEffectiveDuration(clip);
    return b;
  }

  function snapValue(t, grid) {
    const g = grid || DEFAULT_GRID;
    return Math.round(t / g) * g;
  }

  function regionOfSelection(project) {
    const end = projectDuration(project);
    return { start: 0, end: Math.max(end, 0) };
  }

  /* Serializzazione: solo dati, niente AudioBuffer. */
  function serialize(project, assetMeta) {
    return {
      app: 'audio-editor-pwa',
      exportedAt: new Date().toISOString(),
      project: project,
      assets: assetMeta.map(a => ({
        id: a.id, name: a.name, mime: a.mime, size: a.size,
        duration: a.duration, sampleRate: a.sampleRate, channels: a.channels,
      })),
    };
  }

  function deserialize(json) {
    if (!json || !json.project || !Array.isArray(json.assets)) {
      throw new Error('File di progetto non valido');
    }
    if (!Array.isArray(json.project.tracks)) {
      throw new Error('Progetto non valido: mancano le tracce');
    }
    return json;
  }

  return {
    VERSION,
    MIN_CLIP,
    DEFAULT_GRID,
    TRACK_COLORS,
    createProject,
    createTrack,
    defaultClip,
    addClip,
    removeClip,
    findClip,
    findTrackByClip,
    clipSourceLength,
    clipEffectiveDuration,
    trackDuration,
    projectDuration,
    clampTrim,
    splitClip,
    snapValue,
    regionOfSelection,
    serialize,
    deserialize,
  };
});
