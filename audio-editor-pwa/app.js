/* ===================================================
   🎚 Audio Editor PWA — Client
   Timeline multi-track, trasporto, effetti, export.
   =================================================== */
(function () {
  'use strict';

  const Project = window.AudioProject;
  const AudioEngine = window.AudioEngine;
  const Wav = window.WavEncoder;
  const Mp3 = window.Mp3Encoder;
  const Waveform = window.Waveform;
  const Store = window.AudioStore;

  const RULER_H = 26;
  const LANE_H = 84;

  const $ = id => document.getElementById(id);
  const el = {
    timelineScroll: $('timelineScroll'), trackArea: $('trackArea'),
    rulerCanvas: $('rulerCanvas'), lanes: $('lanes'),
    playhead: $('playhead'), regionOverlay: $('regionOverlay'),
    trackHeads: $('trackHeads'), inspectorBody: $('inspectorBody'),
    masterBody: $('masterBody'), timeDisplay: $('timeDisplay'),
    btnPlay: $('btnPlay'), btnStop: $('btnStop'), btnSplit: $('btnSplit'),
    btnImport: $('btnImport'), btnAddTrack: $('btnAddTrack'), btnNew: $('btnNew'),
    btnOpen: $('btnOpen'), btnSave: $('btnSave'), btnExportProject: $('btnExportProject'),
    btnExport: $('btnExport'), snapToggle: $('snapToggle'), zoomSlider: $('zoomSlider'),
    fileInput: $('fileInput'), projectInput: $('projectInput'),
    toast: $('toast'), exportModal: $('exportModal'), exFormat: $('exFormat'),
    exKbps: $('exKbps'), exRange: $('exRange'), exRate: $('exRate'),
    exGo: $('exGo'), exCancel: $('exCancel'), exProgress: $('exProgress'), exBar: $('exBar'), exStatus: $('exStatus'),
  };

  const state = {
    project: Project.createProject(),
    assets: new Map(),
    processed: new Map(),
    zoom: 60,
    playhead: 0,
    region: null,
    playing: false,
    ctx: null,
    graph: null,
    liveOut: null,
    playStartCtx: 0,
    playStartTime: 0,
    selectedClipId: null,
    selectedTrackId: null,
    saveTimer: null,
    raf: 0,
    toastTimer: null,
    loadingProject: false,
  };

  /* ==============================
     AUDIO CONTEXT
     ============================== */
  function getCtx() {
    if (!state.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      state.ctx = new AC();
    }
    return state.ctx;
  }

  /* ==============================
     TIME / GEOMETRY
     ============================== */
  const pxPerSec = () => state.zoom;

  function formatTime(t) {
    const neg = t < 0;
    const a = Math.abs(t);
    const mm = Math.floor(a / 60);
    const ss = Math.floor(a % 60);
    const ms = Math.floor((a % 1) * 1000);
    return `${neg ? '-' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  function eventTime(e) {
    const rect = el.rulerCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left + el.timelineScroll.scrollLeft;
    return Math.max(0, x / pxPerSec());
  }

  /* ==============================
     RENDER
     ============================== */
  function contentWidth() {
    return Math.max(el.timelineScroll.clientWidth, (Project.projectDuration(state.project) + 4) * pxPerSec() + 40);
  }

  function renderAll() {
    const w = contentWidth();
    el.trackArea.style.width = w + 'px';
    renderTrackHeads();
    renderLanes(w);
    renderRuler(w);
    updateOverlays();
    renderInspector();
    renderMaster();
  }

  /* --- Track heads --- */
  function renderTrackHeads() {
    el.trackHeads.innerHTML = '';
    const spacer = document.createElement('div');
    spacer.className = 'th-spacer';
    el.trackHeads.appendChild(spacer);
    if (state.project.tracks.length === 0) {
      const h = document.createElement('div');
      h.className = 'track-head';
      h.style.cssText = 'justify-content:center;color:var(--muted);font-size:11px;cursor:default';
      h.textContent = 'Import audio to create a track.';
      el.trackHeads.appendChild(h);
    }
    state.project.tracks.forEach(track => {
      const head = document.createElement('div');
      head.className = 'track-head' + (state.selectedTrackId === track.id ? ' selected' : '');
      head.dataset.track = track.id;

      const name = document.createElement('div');
      name.className = 'th-name';
      const color = document.createElement('span');
      color.className = 'th-color';
      color.style.background = track.color;
      const input = document.createElement('input');
      input.value = track.name;
      input.spellcheck = false;
      input.addEventListener('pointerdown', e => e.stopPropagation());
      input.addEventListener('change', () => {
        track.name = input.value || 'Track';
        autosave();
      });
      name.appendChild(color);
      name.appendChild(input);
      head.appendChild(name);

      const row = document.createElement('div');
      row.className = 'th-row';
      const mute = document.createElement('button');
      mute.className = 'th-btn' + (track.muted ? ' active' : '');
      mute.textContent = 'M';
      mute.title = 'Mute';
      mute.addEventListener('pointerdown', e => e.stopPropagation());
      mute.addEventListener('click', () => {
        track.muted = !track.muted;
        if (state.project.tracks.some(t => t.solo)) track.muted = true;
        liveApplyMaster();
        renderTrackHeads();
        autosave();
      });
      const solo = document.createElement('button');
      solo.className = 'th-btn' + (track.solo ? ' active' : '');
      solo.textContent = 'S';
      solo.title = 'Solo';
      solo.addEventListener('pointerdown', e => e.stopPropagation());
      solo.addEventListener('click', () => {
        track.solo = !track.solo;
        state.project.tracks.forEach(t => { if (t.id !== track.id) t.muted = t.solo ? true : t.muted; });
        if (!track.solo && !state.project.tracks.some(t => t.solo)) state.project.tracks.forEach(t => t.muted = false);
        liveApplyMaster();
        renderTrackHeads();
        autosave();
      });
      const del = document.createElement('button');
      del.className = 'th-btn del';
      del.textContent = '✕';
      del.title = 'Delete track';
      del.addEventListener('pointerdown', e => e.stopPropagation());
      del.addEventListener('click', () => {
        if (!confirm(`Delete track "${track.name}" and its clips?`)) return;
        state.project.tracks = state.project.tracks.filter(t => t.id !== track.id);
        if (state.selectedTrackId === track.id) state.selectedTrackId = null;
        if (state.selectedClipId) state.selectedClipId = null;
        stopLive();
        renderAll();
        autosave();
      });
      row.appendChild(mute);
      row.appendChild(solo);
      row.appendChild(del);
      head.appendChild(row);

      head.addEventListener('click', () => {
        state.selectedTrackId = track.id;
        state.selectedClipId = null;
        renderAll();
      });
      el.trackHeads.appendChild(head);
    });
  }

  /* --- Lanes / clips --- */
  function renderLanes(w) {
    el.lanes.innerHTML = '';
    const anySolo = state.project.tracks.some(t => t.solo);
    state.project.tracks.forEach(track => {
      const lane = document.createElement('div');
      lane.className = 'lane';
      lane.dataset.track = track.id;
      lane.style.width = w + 'px';
      track.clips.forEach(clip => lane.appendChild(makeClipEl(track, clip)));
      el.lanes.appendChild(lane);
      if (anySolo && !track.solo) lane.style.opacity = .25;
    });
    if (state.project.tracks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lane';
      empty.style.width = w + 'px';
      empty.style.display = 'flex';
      empty.style.alignItems = 'center';
      empty.style.justifyContent = 'center';
      empty.style.color = 'var(--muted)';
      empty.style.fontSize = '12px';
      empty.textContent = 'Drop audio files here or use "Import Audio…"';
      el.lanes.appendChild(empty);
    }
  }

  function makeClipEl(track, clip) {
    const elClip = document.createElement('div');
    elClip.className = 'clip' + (state.selectedClipId === clip.id ? ' selected' : '');
    elClip.dataset.clip = clip.id;
    const dur = Project.clipEffectiveDuration(clip);
    elClip.style.left = (clip.offset * pxPerSec()) + 'px';
    elClip.style.width = Math.max(8, dur * pxPerSec()) + 'px';
    elClip.style.borderColor = track.color;
    elClip.style.background = `linear-gradient(180deg, ${track.color}55, ${track.color}1a)`;

    const canvas = document.createElement('canvas');
    elClip.appendChild(canvas);
    drawClipWave(canvas, clip, state.assets.get(clip.assetId), track.color);

    const label = document.createElement('div');
    label.className = 'clip-label';
    label.textContent = clip.name;
    elClip.appendChild(label);

    const eL = document.createElement('div');
    eL.className = 'edge left';
    eL.dataset.edge = 'left';
    const eR = document.createElement('div');
    eR.className = 'edge right';
    eR.dataset.edge = 'right';
    elClip.appendChild(eL);
    elClip.appendChild(eR);

    bindClipPointer(elClip, clip, track, eL, eR);
    elClip.addEventListener('click', e => {
      if (e.target.dataset.edge) return;
      state.selectedClipId = clip.id;
      state.selectedTrackId = track.id;
      renderAll();
    });
    return elClip;
  }

  function drawClipWave(canvas, clip, asset, color) {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx2 = canvas.getContext('2d');
    if (!asset) return;
    const ch = asset.buffer.getChannelData(0);
    const rate = asset.buffer.sampleRate;
    const from = Math.floor(clip.trimStart * rate);
    const to = Math.min(ch.length, Math.ceil(clip.trimEnd * rate));
    const peaks = Waveform.computePeaks(ch, from, to, Math.max(2, w));
    Waveform.renderWaveform(ctx2, peaks, { x: 0, y: 0, w, h, color: color || '#4dc3ff' });
  }

  /* --- Ruler --- */
  function renderRuler(w) {
    el.rulerCanvas.width = Math.max(1, w);
    el.rulerCanvas.height = RULER_H;
    const ctx2 = el.rulerCanvas.getContext('2d');
    ctx2.clearRect(0, 0, w, RULER_H);
    ctx2.fillStyle = '#1e1e2c';
    ctx2.fillRect(0, 0, w, RULER_H);

    const zoom = pxPerSec();
    const steps = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    let step = steps[steps.length - 1];
    for (const s of steps) { if (s * zoom >= 70) { step = s; break; } }
    const minor = step / 5;

    ctx2.strokeStyle = '#3a3a52';
    ctx2.lineWidth = 1;
    ctx2.fillStyle = '#9a9ab0';
    ctx2.font = '10px system-ui, sans-serif';
    ctx2.textAlign = 'left';
    ctx2.textBaseline = 'top';

    const end = w / zoom;
    for (let t = 0; t <= end; t += minor) {
      const x = Math.round(t * zoom) + 0.5;
      const big = Math.abs((t / step) - Math.round(t / step)) < 1e-6;
      ctx2.beginPath();
      ctx2.moveTo(x, big ? RULER_H - 9 : RULER_H - 4);
      ctx2.lineTo(x, RULER_H);
      ctx2.stroke();
      if (big) ctx2.fillText(formatTime(t), x + 3, 3);
    }

    if (state.region) {
      ctx2.fillStyle = 'rgba(77,195,255,.18)';
      ctx2.fillRect(state.region.start * zoom, 0, Math.max(2, (state.region.end - state.region.start) * zoom), RULER_H);
    }
  }

  /* --- Playhead + region overlay --- */
  function updateOverlays() {
    el.playhead.style.left = (state.playhead * pxPerSec()) + 'px';
    if (state.region) {
      el.regionOverlay.classList.add('on');
      el.regionOverlay.style.left = (state.region.start * pxPerSec()) + 'px';
      el.regionOverlay.style.width = Math.max(2, (state.region.end - state.region.start) * pxPerSec()) + 'px';
      el.regionOverlay.style.height = '100%';
    } else {
      el.regionOverlay.classList.remove('on');
    }
  }

  /* ==============================
     POINTER: RULER
     ============================== */
  let rulerDrag = null;

  function bindRuler() {
    const c = el.rulerCanvas;
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      rulerDrag = { t0: eventTime(e), moved: false };
    });
    c.addEventListener('pointermove', e => {
      if (!rulerDrag) return;
      const t = eventTime(e);
      if (!rulerDrag.moved && Math.abs(t - rulerDrag.t0) > 0.04) rulerDrag.moved = true;
      if (rulerDrag.moved) {
        state.region = { start: Math.min(rulerDrag.t0, t), end: Math.max(rulerDrag.t0, t) };
        updateOverlays();
      }
    });
    const up = () => {
      if (!rulerDrag) return;
      if (!rulerDrag.moved) {
        state.playhead = state.region && eventTime({ clientX: 0 }) !== undefined ? clampPlayhead(rulerDrag.t0) : rulerDrag.t0;
        if (state.playing) seekPlayback(rulerDrag.t0);
        updateOverlays();
      }
      rulerDrag = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('dblclick', () => {
      state.region = null;
      renderRuler(contentWidth());
      updateOverlays();
    });
  }

  function clampPlayhead(t) {
    return Math.max(0, Math.min(t, Math.max(Project.projectDuration(state.project), 0.001)));
  }

  /* ==============================
     POINTER: CLIP (drag + trim)
     ============================== */
  function bindClipPointer(elClip, clip, track, eL, eR) {
    let mode = null; // 'move' | 'trim-l' | 'trim-r'
    let sx = 0, sT = 0, sTrim = 0, sOffset = 0, sDur = 0;
    let ghost = null;

    const onDown = (e, m) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      elClip.setPointerCapture(e.pointerId);
      mode = m;
      sx = e.clientX;
      sT = 0;
      sOffset = clip.offset;
      sTrim = m === 'trim-l' ? clip.trimStart : (m === 'trim-r' ? clip.trimEnd : 0);
      sDur = clip.trimEnd - clip.trimStart;
    };

    elClip.addEventListener('pointerdown', e => {
      if (e.target.dataset.edge === 'left') onDown(e, 'trim-l');
      else if (e.target.dataset.edge === 'right') onDown(e, 'trim-r');
      else onDown(e, 'move');
    });

    elClip.addEventListener('pointermove', e => {
      if (!mode) return;
      const dx = (e.clientX - sx) / pxPerSec();
      if (mode === 'move') {
        let off = sOffset + dx;
        if (state.project.snap) off = Project.snapValue(off, state.project.grid);
        off = Math.max(0, off);
        clip.offset = off;
        elClip.style.left = (off * pxPerSec()) + 'px';
      } else if (mode === 'trim-l') {
        const asset = state.assets.get(clip.assetId);
        const maxDur = asset ? asset.duration : sDur + 999;
        let ts = sTrim + dx;
        let te = sTrim + sDur;
        if (te - ts < Project.MIN_CLIP) ts = te - Project.MIN_CLIP;
        ts = Math.max(0, ts);
        te = Math.min(maxDur, te);
        const r = Project.clampTrim(ts, te, maxDur);
        clip.trimStart = r.trimStart;
        clip.trimEnd = r.trimEnd;
        const dur = Project.clipEffectiveDuration(clip);
        const off = sOffset + (r.trimEnd - sTrim - sDur) * -1 + (r.trimStart - sTrim) * 1;
        clip.offset = Math.max(0, off);
        elClip.style.left = (clip.offset * pxPerSec()) + 'px';
        elClip.style.width = Math.max(8, dur * pxPerSec()) + 'px';
        drawClipWave(elClip.querySelector('canvas'), clip, state.assets.get(clip.assetId), track.color);
      } else if (mode === 'trim-r') {
        const asset = state.assets.get(clip.assetId);
        const maxDur = asset ? asset.duration : sTrim + 999;
        const ts = clip.trimStart;
        let te = sTrim + dx;
        te = Math.min(maxDur, Math.max(ts + Project.MIN_CLIP, te));
        const r = Project.clampTrim(ts, te, maxDur);
        clip.trimEnd = r.trimEnd;
        const dur = Project.clipEffectiveDuration(clip);
        elClip.style.width = Math.max(8, dur * pxPerSec()) + 'px';
        drawClipWave(elClip.querySelector('canvas'), clip, state.assets.get(clip.assetId), track.color);
      }
    });

    const onUp = e => {
      if (!mode) return;
      mode = null;
      state.processed.delete(clip.id);
      autosave();
      restartLiveIfNeeded();
    };
    elClip.addEventListener('pointerup', onUp);
    elClip.addEventListener('pointercancel', onUp);
  }

  /* ==============================
     PLAYBACK
     ============================== */
  async function ensureProcessed() {
    const ctx = getCtx();
    const jobs = [];
    for (const t of state.project.tracks) {
      for (const c of t.clips) {
        const needs = c.tempo !== 1 || c.pitch !== 0;
        if (needs && !state.processed.has(c.id)) jobs.push(c);
        if (!needs && state.processed.has(c.id)) state.processed.delete(c.id);
      }
    }
    for (const c of jobs) {
      const asset = state.assets.get(c.assetId);
      if (!asset) continue;
      try {
        const out = await AudioEngine.processTempoPitch(ctx, asset.buffer, c.tempo, c.pitch);
        state.processed.set(c.id, out);
      } catch (err) {
        toast('Tempo/pitch failed: ' + err.message);
      }
    }
  }

  function buildLive() {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const g = AudioEngine.buildGraph(ctx, state.project, state.assets, state.processed);
    for (const t of state.project.tracks) AudioEngine.applyTrackParams(g, state.project, t.id);
    AudioEngine.applyMasterParams(g, state.project);
    AudioEngine.scheduleClips(g, state.project, state.playhead, Project);
    state.graph = g;
    state.liveOut = g.nodes.masterGain;
  }

  function stopLive() {
    if (state.graph) {
      for (const id in state.graph.clips) {
        try { state.graph.clips[id].source.stop(); } catch (e) { /* già fermo */ }
      }
      state.graph = null;
    }
    if (state.liveOut) {
      try { state.liveOut.disconnect(); } catch (e) { /* noop */ }
      state.liveOut = null;
    }
  }

  async function play() {
    if (state.playing) { pause(); return; }
    await ensureProcessed();
    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    if (Project.projectDuration(state.project) <= 0) {
      toast('Add some audio clips first.');
      return;
    }
    stopLive();
    state.playStartTime = state.playhead;
    state.playStartCtx = ctx.currentTime;
    buildLive();
    state.playing = true;
    el.btnPlay.textContent = '⏸';
    tick();
  }

  function pause() {
    if (!state.playing) return;
    stopLive();
    state.playing = false;
    el.btnPlay.textContent = '▶';
    cancelAnimationFrame(state.raf);
  }

  function stop() {
    pause();
    state.playhead = 0;
    updateOverlays();
    el.timeDisplay.textContent = formatTime(0);
  }

  function seekPlayback(t) {
    state.playhead = clampPlayhead(t);
    if (state.playing) {
      stopLive();
      state.playStartTime = state.playhead;
      state.playStartCtx = getCtx().currentTime;
      buildLive();
      tick();
    }
  }

  function tick() {
    if (!state.playing) return;
    const elapsed = getCtx().currentTime - state.playStartCtx;
    state.playhead = state.playStartTime + elapsed;
    const dur = Project.projectDuration(state.project);
    if (state.playhead >= dur) {
      state.playhead = dur;
      el.timeDisplay.textContent = formatTime(dur);
      pause();
      updateOverlays();
      return;
    }
    el.timeDisplay.textContent = formatTime(state.playhead);
    updateOverlays();
    state.raf = requestAnimationFrame(tick);
  }

  function liveApplyMaster() {
    if (state.graph) AudioEngine.applyMasterParams(state.graph, state.project);
  }

  function restartLiveIfNeeded() {
    if (!state.playing) return;
    pause();
    play();
  }

  /* ==============================
     MODEL OPERATIONS
     ============================== */
  function addTrack() {
    const t = Project.createTrack(state.project);
    state.selectedTrackId = t.id;
    state.selectedClipId = null;
    renderAll();
    autosave();
  }

  function splitAtPlayhead() {
    if (!state.selectedClipId) { toast('Select a clip first.'); return; }
    const clip = Project.findClip(state.project, state.selectedClipId);
    if (!clip) return;
    const dur = Project.clipEffectiveDuration(clip);
    if (state.playhead <= clip.offset || state.playhead >= clip.offset + dur) {
      toast('Playhead is not over the selected clip.');
      return;
    }
    const right = Project.splitClip(state.project, clip.id, state.playhead);
    if (!right) return;
    const track = Project.findTrackByClip(state.project, clip.id);
    Project.addClip(state.project, track.id, right);
    state.selectedClipId = right.id;
    state.processed.delete(right.id);
    renderAll();
    autosave();
  }

  function deleteSelection() {
    if (state.selectedClipId) {
      state.processed.delete(state.selectedClipId);
      Project.removeClip(state.project, state.selectedClipId);
      state.selectedClipId = null;
      renderAll();
      autosave();
    } else if (state.selectedTrackId) {
      const t = state.project.tracks.find(t => t.id === state.selectedTrackId);
      if (t && confirm(`Delete track "${t.name}"?`)) {
        state.project.tracks = state.project.tracks.filter(x => x.id !== t.id);
        state.selectedTrackId = null;
        renderAll();
        autosave();
      }
    }
  }

  /* ==============================
     IMPORT
     ============================== */
  async function importFiles(fileList) {
    if (!fileList || !fileList.length) return;
    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    let target = state.project.tracks.find(t => t.id === state.selectedTrackId) || state.project.tracks[state.project.tracks.length - 1];
    for (const file of fileList) {
      const ab = await file.arrayBuffer();
      let buf;
      try {
        buf = await ctx.decodeAudioData(ab);
      } catch (e) {
        toast(`Could not decode "${file.name}".`);
        continue;
      }
      const id = 'asset_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
      const asset = {
        id, name: file.name,
        mime: file.type || 'audio/*',
        size: file.size,
        duration: buf.duration,
        sampleRate: buf.sampleRate,
        channels: buf.numberOfChannels,
        buffer: buf,
        blob: file,
      };
      state.assets.set(id, asset);
      try { await Store.saveAsset(id, file); } catch (e) { /* IDB non disponibile */ }

      if (!target) {
        target = Project.createTrack(state.project);
        state.selectedTrackId = target.id;
      }
      const offset = Math.max(Project.trackDuration(target), state.playhead);
      const clip = Project.defaultClip(state.project, id, {
        name: file.name.replace(/\.[^.]+$/, ''),
        offset, trimStart: 0, trimEnd: buf.duration,
      });
      Project.addClip(state.project, target.id, clip);
      state.selectedClipId = clip.id;
    }
    renderAll();
    autosave();
    toast(`${fileList.length} file(s) imported.`);
  }

  /* ==============================
     INSPECTOR + MASTER
     ============================== */
  function sliderRow(label, min, max, step, value, fmt, onChange, opts) {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-grid';
    const l = document.createElement('label');
    l.textContent = label;
    const r = document.createElement('input');
    r.type = 'range';
    r.min = min; r.max = max; r.step = step;
    r.value = value;
    const v = document.createElement('span');
    v.className = 'val';
    v.textContent = fmt(value);
    r.addEventListener('input', () => {
      v.textContent = fmt(parseFloat(r.value));
      onChange(parseFloat(r.value));
    });
    wrap.appendChild(l); wrap.appendChild(r); wrap.appendChild(v);
    if (opts && opts.onReshape) r.addEventListener('change', opts.onReshape);
    return wrap;
  }

  function renderInspector() {
    const clip = state.selectedClipId ? Project.findClip(state.project, state.selectedClipId) : null;
    const track = !clip && state.selectedTrackId ? state.project.tracks.find(t => t.id === state.selectedTrackId) : null;
    el.inspectorBody.innerHTML = '';
    if (clip) buildClipInspector(clip);
    else if (track) buildTrackInspector(track);
    else {
      const d = document.createElement('div');
      d.className = 'inspector-empty';
      d.textContent = 'Select a clip or a track to edit its properties.';
      el.inspectorBody.appendChild(d);
    }
  }

  function buildClipInspector(clip) {
    const b = el.inspectorBody;
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:800;margin-bottom:8px';
    title.textContent = `🎵 ${clip.name}`;
    b.appendChild(title);

    const sec = document.createElement('div');
    sec.className = 'section-label';
    sec.textContent = 'Levels & fades';
    b.appendChild(sec);

    b.appendChild(sliderRow('Volume', 0, 2, 0.01, clip.volume, v => `${v.toFixed(2)}×`, v => {
      clip.volume = v; autosave(); restartLiveIfNeeded();
    }));
    b.appendChild(sliderRow('Fade in (s)', 0, 20, 0.1, clip.fadeIn, v => `${v.toFixed(1)}s`, v => {
      clip.fadeIn = v; autosave(); restartLiveIfNeeded();
    }));
    b.appendChild(sliderRow('Fade out (s)', 0, 20, 0.1, clip.fadeOut, v => `${v.toFixed(1)}s`, v => {
      clip.fadeOut = v; autosave(); restartLiveIfNeeded();
    }));

    const sec2 = document.createElement('div');
    sec2.className = 'section-label';
    sec2.textContent = 'Time & pitch';
    b.appendChild(sec2);

    b.appendChild(sliderRow('Tempo', 0.5, 2, 0.01, clip.tempo, v => `${v.toFixed(2)}×`, v => {
      clip.tempo = v; state.processed.delete(clip.id); autosave(); renderAll(); restartLiveIfNeeded();
    }));
    b.appendChild(sliderRow('Pitch', -12, 12, 1, clip.pitch, v => `${v > 0 ? '+' : ''}${v} st`, v => {
      clip.pitch = v; state.processed.delete(clip.id); autosave(); renderAll(); restartLiveIfNeeded();
    }));

    const asset = state.assets.get(clip.assetId);
    const info = document.createElement('div');
    info.className = 'section-label';
    info.textContent = `Trim: ${clip.trimStart.toFixed(2)}s → ${clip.trimEnd.toFixed(2)}s${asset ? ' · source ' + asset.duration.toFixed(1) + 's' : ''}`;
    b.appendChild(info);

    const row = document.createElement('div');
    row.className = 'btn-row';
    const dup = document.createElement('button');
    dup.textContent = '⧉ Duplicate';
    dup.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(clip));
      copy.id = 'clip_' + (state.project.counters.clip = (state.project.counters.clip || 0) + 1);
      copy.offset += Project.clipEffectiveDuration(clip) + 0.1;
      Project.addClip(state.project, Project.findTrackByClip(state.project, clip.id).id, copy);
      state.selectedClipId = copy.id;
      renderAll();
      autosave();
    });
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      Project.removeClip(state.project, clip.id);
      state.selectedClipId = null;
      renderAll();
      autosave();
    });
    row.appendChild(dup); row.appendChild(del);
    b.appendChild(row);
  }

  function buildTrackInspector(track) {
    const b = el.inspectorBody;
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:800;margin-bottom:8px';
    title.textContent = `🎛 ${track.name}`;
    b.appendChild(title);

    b.appendChild(sliderRow('Volume', 0, 2, 0.01, track.volume, v => `${v.toFixed(2)}×`, v => {
      track.volume = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Pan', -1, 1, 0.01, track.pan, v => v === 0 ? 'C' : (v < 0 ? `L ${(-v * 100).toFixed(0)}` : `R ${(v * 100).toFixed(0)}`), v => {
      track.pan = v; liveApplyMaster(); autosave();
    }));

    const sec = document.createElement('div');
    sec.className = 'section-label';
    sec.textContent = 'EQ';
    b.appendChild(sec);
    b.appendChild(sliderRow('Bass (dB)', -12, 12, 0.5, track.low, v => `${v.toFixed(1)} dB`, v => {
      track.low = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Mid (dB)', -12, 12, 0.5, track.mid, v => `${v.toFixed(1)} dB`, v => {
      track.mid = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Treble (dB)', -12, 12, 0.5, track.high, v => `${v.toFixed(1)} dB`, v => {
      track.high = v; liveApplyMaster(); autosave();
    }));

    const sec2 = document.createElement('div');
    sec2.className = 'section-label';
    sec2.textContent = 'Filters & space';
    b.appendChild(sec2);
    b.appendChild(sliderRow('High-pass (Hz)', 20, 20000, 10, track.hp, v => v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v} Hz`, v => {
      track.hp = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Low-pass (Hz)', 100, 20000, 100, track.lp, v => v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v} Hz`, v => {
      track.lp = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Reverb send', 0, 1, 0.01, track.reverb, v => `${(v * 100).toFixed(0)}%`, v => {
      track.reverb = v; liveApplyMaster(); autosave();
    }));

    const row = document.createElement('div');
    row.className = 'btn-row';
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Delete track';
    del.addEventListener('click', () => {
      if (!confirm(`Delete track "${track.name}"?`)) return;
      state.project.tracks = state.project.tracks.filter(t => t.id !== track.id);
      state.selectedTrackId = null;
      renderAll();
      autosave();
    });
    row.appendChild(del);
    b.appendChild(row);
  }

  function renderMaster() {
    const b = el.masterBody;
    b.innerHTML = '';
    const m = state.project.master;
    b.appendChild(sliderRow('Master volume', 0, 2, 0.01, m.volume, v => `${(v * 100).toFixed(0)}%`, v => {
      m.volume = v; liveApplyMaster(); autosave();
    }));

    const sec = document.createElement('div');
    sec.className = 'section-label';
    sec.textContent = 'Master EQ';
    b.appendChild(sec);
    b.appendChild(sliderRow('Bass (dB)', -12, 12, 0.5, m.low, v => `${v.toFixed(1)} dB`, v => {
      m.low = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Mid (dB)', -12, 12, 0.5, m.mid, v => `${v.toFixed(1)} dB`, v => {
      m.mid = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Treble (dB)', -12, 12, 0.5, m.high, v => `${v.toFixed(1)} dB`, v => {
      m.high = v; liveApplyMaster(); autosave();
    }));

    const sec2 = document.createElement('div');
    sec2.className = 'section-label';
    sec2.textContent = 'Reverb';
    b.appendChild(sec2);
    b.appendChild(sliderRow('Wet mix', 0, 1, 0.01, m.reverbWet, v => `${(v * 100).toFixed(0)}%`, v => {
      m.reverbWet = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Room size', 0.3, 5, 0.1, m.reverbDecay, v => `${v.toFixed(1)}s`, v => {
      m.reverbDecay = v; liveApplyMaster(); autosave();
    }));

    const sec3 = document.createElement('div');
    sec3.className = 'section-label';
    sec3.textContent = 'Compressor';
    b.appendChild(sec3);
    b.appendChild(sliderRow('Threshold (dB)', -48, 0, 1, m.compThreshold, v => `${v} dB`, v => {
      m.compThreshold = v; liveApplyMaster(); autosave();
    }));
    b.appendChild(sliderRow('Ratio', 1, 20, 0.5, m.compRatio, v => `${v.toFixed(1)}:1`, v => {
      m.compRatio = v; liveApplyMaster(); autosave();
    }));
  }

  /* ==============================
     PERSISTENCE
     ============================== */
  function autosave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      const payload = Project.serialize(state.project, [...state.assets.values()]);
      Store.saveProject(payload).then(() => {
        el.btnSave.textContent = 'Saved ✓';
        setTimeout(() => { el.btnSave.textContent = 'Save'; }, 1200);
      }).catch(e => console.warn('autosave failed', e));
    }, 400);
  }

  async function restore() {
    try {
      const saved = await Store.loadProject();
      if (!saved || !saved.project) return;
      state.project = saved.project;
      for (const meta of saved.assets) {
        const blob = await Store.getAsset(meta.id);
        if (!blob) continue;
        try {
          const ctx = getCtx();
          const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
          state.assets.set(meta.id, { ...meta, buffer: buf, blob });
        } catch (e) { /* asset non decodificabile, skippa */ }
      }
    } catch (e) {
      console.warn('restore failed', e);
    }
  }

  function buildProjectFile() {
    const meta = [...state.assets.values()].map(a => ({ id: a.id, name: a.name, mime: a.mime, size: a.size, duration: a.duration, sampleRate: a.sampleRate, channels: a.channels }));
    const payload = Project.serialize(state.project, meta);
    return Promise.all([...state.assets.values()].map(a => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const data = typeof fr.result === 'string' ? fr.result.split(',')[1] || '' : '';
        res({ id: a.id, data });
      };
      fr.onerror = rej;
      fr.readAsDataURL(a.blob);
    }))).then(entries => {
      payload.audio = entries.reduce((o, e) => { o[e.id] = e.data; return o; }, {});
      return JSON.stringify(payload, null, 2);
    });
  }

  async function openProjectFile(file) {
    const text = await file.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { toast('Invalid project file.'); return; }
    const data = Project.deserialize(json);
    state.project = data.project;
    state.assets = new Map();
    state.processed = new Map();
    state.selectedClipId = null;
    state.selectedTrackId = null;
    state.region = null;
    const ctx = getCtx();
    for (const meta of data.assets) {
      const b64 = data.audio && data.audio[meta.id];
      if (b64) {
        try {
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: meta.mime || 'audio/wav' });
          const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
          state.assets.set(meta.id, { ...meta, buffer: buf, blob });
        } catch (e) { toast(`Asset ${meta.name} could not be loaded.`); }
      }
    }
    renderAll();
    autosave();
    toast('Project opened.');
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ==============================
     EXPORT
     ============================== */
  function setExportProgress(p, text) {
    el.exBar.style.width = Math.round(p * 100) + '%';
    if (text) el.exStatus.textContent = text;
  }

  async function doExport() {
    const total = Project.projectDuration(state.project);
    if (total <= 0) { toast('The timeline is empty.'); return; }
    const useRegion = el.exRange.value === 'region';
    if (useRegion && !state.region) { toast('No region selected — drag on the ruler.'); return; }

    const format = el.exFormat.value;
    const rate = parseInt(el.exRate.value, 10);
    const region = useRegion ? state.region : null;

    el.exProgress.classList.remove('hidden');
    el.exGo.disabled = true;
    el.exStatus.textContent = 'Rendering…';
    try {
      await ensureProcessed();
      const sliced = await AudioEngine.exportRegion(state.project, state.assets, state.processed, {
        region,
        sampleRate: rate,
        onRender: p => setExportProgress(p, p >= 1 ? 'Encoding…' : `Rendering ${Math.round(p * 100)}%`),
      }, Project);

      let blob;
      let name = 'export';
      if (format === 'wav16') { blob = Wav.encodeWavBlob(sliced.channels, sliced.sampleRate, 16); name = 'export.wav'; }
      else if (format === 'wav24') { blob = Wav.encodeWavBlob(sliced.channels, sliced.sampleRate, 24); name = 'export.wav'; }
      else {
        const kbps = parseInt(el.exKbps.value, 10);
        setExportProgress(0.5, `Encoding MP3 (${kbps} kbps)…`);
        const res = Mp3.encodeMp3(sliced.channels, sliced.sampleRate, kbps, p => setExportProgress(0.5 + p * 0.5, `Encoding MP3… ${Math.round(p * 100)}%`));
        blob = res.blob;
        name = 'export.mp3';
      }
      setExportProgress(1, 'Done ✓');
      download(blob, name);
      setTimeout(() => { el.exportModal.classList.add('hidden'); }, 600);
    } catch (e) {
      console.error(e);
      toast('Export failed: ' + e.message);
    } finally {
      el.exGo.disabled = false;
      setTimeout(() => el.exProgress.classList.add('hidden'), 1500);
    }
  }

  /* ==============================
     UI BINDINGS
     ============================== */
  function bindUI() {
    el.btnPlay.addEventListener('click', () => { play(); });
    el.btnStop.addEventListener('click', () => { stop(); });
    el.btnSplit.addEventListener('click', () => { splitAtPlayhead(); });
    el.btnAddTrack.addEventListener('click', () => { addTrack(); });
    el.btnImport.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', () => {
      importFiles(el.fileInput.files);
      el.fileInput.value = '';
    });
    el.btnNew.addEventListener('click', () => {
      if (!confirm('Create a new project? Unsaved changes will be lost.')) return;
      stopLive();
      state.project = Project.createProject();
      state.assets = new Map();
      state.processed = new Map();
      state.selectedClipId = null;
      state.selectedTrackId = null;
      state.playhead = 0;
      state.region = null;
      Store.clearAll().catch(() => {});
      renderAll();
    });
    el.btnOpen.addEventListener('click', () => el.projectInput.click());
    el.projectInput.addEventListener('change', () => {
      const f = el.projectInput.files[0];
      if (f) openProjectFile(f);
      el.projectInput.value = '';
    });
    el.btnSave.addEventListener('click', () => autosave());
    el.btnExportProject.addEventListener('click', async () => {
      try {
        const text = await buildProjectFile();
        download(new Blob([text], { type: 'application/json' }), 'project.json');
        toast('Project exported.');
      } catch (e) { toast('Export failed: ' + e.message); }
    });
    el.btnExport.addEventListener('click', () => {
      if (Project.projectDuration(state.project) <= 0) { toast('The timeline is empty.'); return; }
      el.exportModal.classList.remove('hidden');
    });
    el.exCancel.addEventListener('click', () => el.exportModal.classList.add('hidden'));
    el.exGo.addEventListener('click', () => doExport());
    el.exFormat.addEventListener('change', () => {
      el.exKbps.parentElement.style.display = el.exFormat.value === 'mp3' ? 'flex' : 'none';
    });
    el.exKbps.parentElement.style.display = 'none';

    el.snapToggle.addEventListener('change', () => { state.project.snap = el.snapToggle.checked; });
    el.zoomSlider.addEventListener('input', () => {
      state.zoom = parseInt(el.zoomSlider.value, 10);
      renderAll();
    });

    el.timelineScroll.addEventListener('scroll', () => {
      updateOverlays();
      renderRuler(contentWidth());
    });
    bindRuler();

    /* drag & drop audio */
    let dragDepth = 0;
    window.addEventListener('dragover', e => { e.preventDefault(); });
    window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; });
    window.addEventListener('dragleave', e => { e.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); });
    window.addEventListener('drop', e => {
      e.preventDefault();
      dragDepth = 0;
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name));
      if (files.length) importFiles(files);
    });

    /* keyboard */
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); play(); }
      else if (e.code === 'Delete' || e.code === 'Backspace') deleteSelection();
      else if (e.key === 's' || e.key === 'S') splitAtPlayhead();
      else if (e.key === 'Escape') el.exportModal.classList.add('hidden');
    });

    el.exportModal.addEventListener('click', e => { if (e.target === el.exportModal) el.exportModal.classList.add('hidden'); });
  }

  /* ==============================
     TOAST
     ============================== */
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 2600);
  }

  /* ==============================
     SW + INIT
     ============================== */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  window.addEventListener('resize', () => renderAll());

  (async function init() {
    bindUI();
    renderAll();
    await restore();
    renderAll();
    el.exKbps.parentElement.style.display = 'none';
    if (state.project.tracks.length > 0) toast('Project restored from browser storage.');
    registerSW();
  })();
})();
