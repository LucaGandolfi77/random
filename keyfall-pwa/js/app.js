/*
 * Keyfall — application controller.
 * Loads .mid/.midi, drives the renderer + audio engine with a lookahead
 * scheduler on a virtual (tempo-scaled) timeline.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const els = {};
  const state = {
    song: null,
    songNow: 0,
    playing: false,
    lastPerf: 0,
    tempo: 1,
    loop: false,
    audioReady: false,
    audioDenied: false,
    notes: [],
    schedIdx: 0,
    hitIdx: 0,
    burst: [],
    fileName: '',
  };

  const ui = {
    scene: $('scene'),
    fx: $('fx'),
    btnPlay: $('btn-play'),
    btnStop: $('btn-stop'),
    btnOpen: $('btn-open'),
    fileInput: $('file'),
    btnDemo: $('btn-demo'),
    drop: $('drop'),
    stageWrap: $('stage'),
    timeCur: $('time-cur'),
    timeTot: $('time-tot'),
    seek: $('seek'),
    songTitle: $('song-title'),
    meta: $('meta'),
    tempo: $('tempo'),
    tempoVal: $('tempo-val'),
    volume: $('volume'),
    btnReverb: $('btn-reverb'),
    btnLoop: $('btn-loop'),
    btnFit: $('btn-fit'),
    btnLabels: $('btn-labels'),
    scheme: $('scheme'),
    transpose: $('transpose'),
    legend: $('legend'),
    panel: $('panel'),
    btnPanel: $('btn-panel'),
    panelClose: $('panel-close'),
    toast: $('toast'),
    emptyStats: $('empty-stats'),
  };

  const audio = new KeyfallAudio();
  const renderer = new KeyfallRenderer(ui.scene);
  const fx = ui.fx.getContext('2d');

  /* ── helpers ─────────────────────────────────────────────── */

  function toast(msg, ms) {
    ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => ui.toast.classList.remove('show'), ms || 3200);
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function persist() {
    try {
      localStorage.setItem('keyfall.settings', JSON.stringify({
        tempo: state.tempo, volume: +ui.volume.value, reverb: audio.reverbOn,
        loop: state.loop, fit: renderer.settings.fitKeys, labels: renderer.settings.labels,
        scheme: renderer.settings.scheme, transpose: +ui.transpose.value,
      }));
    } catch (e) {}
  }

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem('keyfall.settings') || '{}');
      if (p.tempo) setTempo(p.tempo);
      if (p.volume != null) { audio.setVolume(p.volume); ui.volume.value = p.volume; }
      if (p.reverb != null) setReverb(p.reverb);
      if (p.loop != null) setLoop(p.loop);
      if (p.fit != null) renderer.setSettings({ fitKeys: p.fit });
      if (p.labels != null) renderer.setSettings({ labels: p.labels });
      if (p.scheme) setScheme(p.scheme);
      if (p.transpose != null) ui.transpose.value = p.transpose;
      syncButtons();
    } catch (e) {}
  }

  /* ── song loading ────────────────────────────────────────── */

  function loadFile(file) {
    if (!file) return;
    const okExt = /\.midi?$/i.test(file.name) || file.type === 'audio/midi' || file.type === 'audio/x-midi';
    if (!okExt && !/\.midi?$/i.test(file.name)) {
      toast('Per favore scegli un file .mid o .midi');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast('Impossibile leggere il file.');
    reader.onload = () => {
      try {
        const song = MidiEngine.parse(reader.result, file.name);
        state.fileName = file.name;
        applySong(song);
      } catch (err) {
        toast(err && err.message ? err.message : 'File MIDI non valido.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function buildDemo() {
    // A short original étude in C — generated at runtime, no assets needed.
    const bpm = 96;
    const beat = (b) => b * (60 / bpm); // quarter note = one beat
    const melody = { name: 'Étude', channel: 0, program: 0, notes: [] };
    const bass = { name: 'Basso', channel: 2, program: 33, notes: [] };

    // gentle melody with a slow arpeggio bass — original composition
    const seq = [
      [0, 72, 1.5], [2, 76, 1.5], [4, 79, 1], [5, 76, 1],
      [8, 81, 1], [9, 79, 1], [10, 76, 1.5], [12, 74, 2],
      [14, 71, 1.5], [16, 72, 1.5], [18, 76, 1.5], [20, 79, 1],
      [22, 81, 1], [24, 84, 2], [26, 81, 1], [28, 79, 1.5],
      [30, 76, 1.5], [32, 74, 3],
    ];
    for (const [b, m, len] of seq) {
      melody.notes.push({ time: beat(b), dur: beat(len), midi: m, velocity: 82 });
    }
    const bassPat = [
      [0, 48], [1, 52], [2, 55], [3, 52],
      [4, 48], [5, 52], [6, 55], [7, 52],
      [8, 45], [9, 48], [10, 52], [11, 48],
      [12, 43], [13, 47], [14, 50], [15, 47],
      [16, 48], [17, 52], [18, 55], [19, 52],
      [20, 48], [21, 52], [22, 55], [23, 52],
      [24, 52], [25, 55], [26, 60], [27, 55],
      [28, 50], [29, 55], [30, 59], [31, 55],
      [32, 43], [33, 50], [34, 55], [35, 50],
    ];
    for (const [b, m] of bassPat) {
      bass.notes.push({ time: beat(b), dur: beat(1) * 0.92, midi: m, velocity: 64 });
    }
    const buf = MidiEngine.buildMidi({ bpm, tracks: [bass, melody] });
    return { buffer: buf, name: 'Étude dimostrativa — Keyfall' };
  }

  function applySong(song) {
    state.song = song;
    state.notes = song.notes;
    stopAll();
    state.songNow = 0;
    state.schedIdx = 0;
    state.hitIdx = 0;
    renderer.setSong(song);
    updateSongMeta();
    setTransportEnabled(true);
    ui.stageWrap.classList.add('loaded'); // hides the empty-state card via CSS
    const sc = $('songcard');
    if (sc) sc.hidden = false;
    document.title = song.title + ' — Keyfall';
    resizeAll();
    renderer.draw(0, 0.016);
  }

  function updateSongMeta() {
    const s = state.song;
    if (!s) return;
    ui.songTitle.textContent = s.title;
    const ch = s.channelMap;
    const parts = [];
    if (s.bpm) parts.push(s.bpm.toFixed(0) + ' BPM');
    parts.push(s.noteCount.toLocaleString('it-IT') + ' note');
    parts.push(ch.length + ' canali');
    ui.meta.textContent = parts.join(' · ');
    renderLegend(ch);
    ui.timeTot.textContent = fmt(s.durationSeconds);
    ui.seek.max = Math.max(1, Math.round(s.durationSeconds * 100));
    ui.seek.value = 0;
    ui.timeCur.textContent = '0:00';
  }

  function renderLegend(channels) {
    const scheme = KeyfallRenderer.SCHEMES[ui.scheme.value] || KeyfallRenderer.SCHEMES.aurora;
    ui.legend.innerHTML = '';
    if (!channels.length) {
      const d = document.createElement('div');
      d.className = 'legend-empty';
      d.textContent = 'Nessuna nota in questo file.';
      ui.legend.appendChild(d);
      return;
    }
    for (const c of channels.slice(0, 10)) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = scheme[c.channel % scheme.length];
      chip.appendChild(dot);
      const label = document.createElement('span');
      label.textContent = c.name + ' (' + c.count + ')';
      chip.appendChild(label);
      ui.legend.appendChild(chip);
    }
  }

  /* ── transport ───────────────────────────────────────────── */

  function playPause() {
    if (!state.song) { toast('Apri prima un file .mid'); return; }
    if (state.playing) { pause(); return; }
    if (!state.audioReady) {
      try {
        audio.ensure();
        state.audioReady = true;
        audio.setVolume(+ui.volume.value);
        audio.setReverb(audio.reverbOn);
      } catch (e) {
        state.audioDenied = true;
        toast('Audio non disponibile — riproduzione solo visiva.');
      }
    }
    if (!state.audioDenied) audio.ensure();
    state.playing = true;
    syncButtons();
  }

  function pause() {
    state.playing = false;
    audio.stopAll(0.25);
    syncButtons();
  }

  function stopAll() {
    state.playing = false;
    audio.stopAll(0.08);
    state.songNow = 0;
    state.schedIdx = 0;
    state.hitIdx = 0;
    ui.seek.value = 0;
    ui.timeCur.textContent = '0:00';
    syncButtons();
  }

  function seekTo(sec) {
    state.songNow = Math.max(0, Math.min(sec, state.song ? state.song.durationSeconds : 0));
    state.schedIdx = 0;
    state.hitIdx = 0;
    state.burst = [];
    audio.stopAll(0.04);
    if (state.song) {
      ui.seek.value = Math.round(state.songNow * 100);
      ui.timeCur.textContent = fmt(state.songNow);
    }
  }

  /* effective release = note end extended while the sustain pedal is down */
  function effectiveEnd(note) {
    const pedal = state.song.pedal;
    if (!pedal || !pedal.length) return note.end;
    let e = note.end;
    for (const seg of pedal) {
      if (seg.channel !== note.channel) continue;
      if (seg.down <= note.end && note.end <= seg.up) e = Math.max(e, seg.up + 0.15);
    }
    return e;
  }

  function scheduleAhead() {
    const s = state.song;
    if (!s) return;
    const horizon = 0.38 * state.tempo;
    let now = state.songNow;
    const notes = state.notes;
    while (state.schedIdx < notes.length && notes[state.schedIdx].start < now + horizon) {
      const n = notes[state.schedIdx++];
      if (n.end < now - 0.05) continue;
      const delay = (n.start - now) / state.tempo;
      const endDelay = (effectiveEnd(n) - now) / state.tempo;
      const ctxNow = audio.ctx ? audio.ctx.currentTime : 0;
      audio.scheduleNote({
        midi: n.midi + (+ui.transpose.value || 0),
        velocity: n.velocity,
        start: ctxNow + Math.max(0.001, delay),
        end: ctxNow + Math.max(delay + 0.06, endDelay),
      });
    }
  }

  /* ── FX particles ────────────────────────────────────────── */

  function burstAt(x, y, color, power) {
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const n = 10 + Math.round(power * 10);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 190 * power;
      state.burst.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.7 + Math.random() * 0.5,
        max: 1.2,
        color,
        size: 1.5 + Math.random() * 2.6,
      });
    }
  }

  function stepFx(dt) {
    const c = fx;
    const dpr = renderer.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, renderer.cssW, renderer.cssH);
    c.globalCompositeOperation = 'lighter';
    for (let i = state.burst.length - 1; i >= 0; i--) {
      const p = state.burst[i];
      p.life -= dt;
      if (p.life <= 0) { state.burst.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
      p.vx *= 0.985;
      const k = Math.max(0, p.life / p.max);
      c.globalAlpha = k * 0.9;
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size * (0.5 + k), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  /* ── main loop ───────────────────────────────────────────── */

  function frame(perf) {
    const dt = Math.min(0.1, (perf - state.lastPerf) / 1000 || 0.016);
    state.lastPerf = perf;
    const s = state.song;

    if (state.playing && s) {
      // burst detection at note hits (crossing the current time)
      while (state.hitIdx < state.notes.length && state.notes[state.hitIdx].start <= state.songNow + 0.001) {
        const n = state.notes[state.hitIdx];
        if (n.start >= state.songNow - dt * state.tempo - 0.02) {
          const x = renderer.keyCenterX(n.midi + (+ui.transpose.value || 0));
          const scheme = KeyfallRenderer.SCHEMES[ui.scheme.value] || KeyfallRenderer.SCHEMES.aurora;
          burstAt(x, renderer.keyTopY() - 4, scheme[n.channel % scheme.length], 0.35 + 0.65 * (n.velocity / 127));
        }
        state.hitIdx++;
      }
      state.songNow += dt * state.tempo;
      if (state.songNow >= s.durationSeconds) {
        if (state.loop) {
          state.songNow = 0;
          state.schedIdx = 0;
          state.hitIdx = 0;
          audio.stopAll(0.05);
        } else {
          state.songNow = s.durationSeconds;
          state.playing = false;
          audio.stopAll(0.4);
          syncButtons();
        }
      }
      scheduleAhead();
      ui.seek.value = Math.round(state.songNow * 100);
      ui.timeCur.textContent = fmt(state.songNow);
    }

    if (s) renderer.draw(state.songNow, dt);
    stepFx(dt);
    requestAnimationFrame(frame);
  }

  /* ── settings / buttons ──────────────────────────────────── */

  function setTempo(v) {
    state.tempo = Math.min(2, Math.max(0.4, v));
    ui.tempo.value = state.tempo;
    ui.tempoVal.textContent = state.tempo.toFixed(2) + '×';
  }
  function setReverb(on) {
    audio.setReverb(on);
    ui.btnReverb.classList.toggle('on', on);
  }
  function setLoop(on) {
    state.loop = on;
    ui.btnLoop.classList.toggle('on', on);
  }
  function setFit(on) {
    renderer.setSettings({ fitKeys: on });
    ui.btnFit.classList.toggle('on', on);
    resizeAll();
  }
  function setLabels(on) {
    renderer.setSettings({ labels: on });
    ui.btnLabels.classList.toggle('on', on);
  }
  function setScheme(v) {
    renderer.setSettings({ scheme: v });
    if (state.song) renderLegend(state.song.channelMap);
  }
  function syncButtons() {
    ui.btnPlay.classList.toggle('playing', state.playing);
    ui.btnPlay.setAttribute('aria-label', state.playing ? 'Pausa' : 'Riproduci');
    ui.btnLoop.classList.toggle('on', state.loop);
    ui.btnReverb.classList.toggle('on', audio.reverbOn);
    ui.btnFit.classList.toggle('on', renderer.settings.fitKeys);
    ui.btnLabels.classList.toggle('on', renderer.settings.labels);
  }

  function setTransportEnabled(on) {
    ui.btnPlay.disabled = !on;
    ui.btnStop.disabled = !on;
    ui.seek.disabled = !on;
    ui.stageWrap.classList.toggle('has-song', on);
  }

  /* ── resizing ────────────────────────────────────────────── */

  function resizeAll() {
    renderer.resize();
    ui.fx.width = Math.round(renderer.cssW * renderer.dpr);
    ui.fx.height = Math.round(renderer.cssH * renderer.dpr);
    ui.fx.style.width = renderer.cssW + 'px';
    ui.fx.style.height = renderer.cssH + 'px';
    if (state.song) renderer.draw(state.songNow, 0.016);
  }

  /* ── events ──────────────────────────────────────────────── */

  function loadDemo() {
    const demo = buildDemo();
    const name = demo.name + '.mid';
    const song = MidiEngine.parse(demo.buffer, name);
    state.fileName = name;
    applySong(song);
    toast('Demo caricata — premi play.');
  }

  function bind() {
    ui.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) loadFile(e.target.files[0]);
      e.target.value = '';
    });
    ui.btnOpen.addEventListener('click', () => ui.fileInput.click());
    ui.btnDemo.addEventListener('click', loadDemo);

    const emptyOpen = $('empty-open');
    const emptyDemo = $('empty-demo');
    if (emptyOpen) emptyOpen.addEventListener('click', () => ui.fileInput.click());
    if (emptyDemo) emptyDemo.addEventListener('click', loadDemo);
    const ver = $('ver');
    if (ver) ver.textContent = 'v1.0.0';

    ui.btnPlay.addEventListener('click', playPause);
    ui.btnStop.addEventListener('click', stopAll);
    ui.btnReverb.addEventListener('click', () => { setReverb(!audio.reverbOn); persist(); });
    ui.btnLoop.addEventListener('click', () => { setLoop(!state.loop); persist(); });
    ui.btnFit.addEventListener('click', () => { setFit(!renderer.settings.fitKeys); persist(); });
    ui.btnLabels.addEventListener('click', () => { setLabels(!renderer.settings.labels); persist(); });
    ui.scheme.addEventListener('change', () => { setScheme(ui.scheme.value); persist(); });
    ui.transpose.addEventListener('change', () => {
      renderer.setSettings({ transpose: +ui.transpose.value });
      if (state.playing) { pause(); playPause(); }
      persist();
    });

    ui.tempo.addEventListener('input', () => { setTempo(+ui.tempo.value); persist(); });
    ui.volume.addEventListener('input', () => { audio.setVolume(+ui.volume.value); persist(); });

    let wasPlaying = false;
    ui.seek.addEventListener('pointerdown', () => {
      wasPlaying = state.playing;
      if (state.playing) pause();
    });
    ui.seek.addEventListener('input', () => {
      if (!state.song) return;
      seekTo((+ui.seek.value / 100) * state.song.durationSeconds);
    });
    ui.seek.addEventListener('change', () => {
      if (wasPlaying && state.song && !state.audioDenied) {
        state.playing = true;
        scheduleAhead();
        syncButtons();
      }
    });

    ui.btnPanel.addEventListener('click', () => ui.panel.classList.toggle('open'));
    ui.panelClose.addEventListener('click', () => ui.panel.classList.remove('open'));

    // click on the piano while idle: audition a note
    ui.scene.addEventListener('pointerdown', (e) => {
      if (!state.song || state.playing) return;
      const rect = ui.scene.getBoundingClientRect();
      const midi = renderer.keyAt(e.clientX - rect.left, e.clientY - rect.top);
      if (midi == null) return;
      if (!state.audioReady) {
        try { audio.ensure(); state.audioReady = true; audio.setVolume(+ui.volume.value); audio.setReverb(audio.reverbOn); }
        catch (err) { state.audioDenied = true; }
      }
      if (!state.audioDenied && audio.ctx) {
        const t0 = audio.ctx.currentTime + 0.01;
        audio.scheduleNote({ midi, velocity: 100, start: t0, end: t0 + 0.9 });
      }
    });

    // drag & drop
    for (const ev of ['dragenter', 'dragover']) {
      window.addEventListener(ev, (e) => { e.preventDefault(); ui.drop.classList.add('visible'); });
    }
    for (const ev of ['dragleave', 'drop']) {
      window.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'dragleave' && e.target === document.documentElement) ui.drop.classList.remove('visible'); });
    }
    ui.drop.addEventListener('drop', (e) => {
      ui.drop.classList.remove('visible');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement && document.activeElement.tagName)) {
        e.preventDefault();
        playPause();
      }
    });

    let rzTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(() => { resizeAll(); }, 80);
    });
  }

  function boot() {
    bind();
    loadPrefs();
    syncButtons();
    setTransportEnabled(false);
    resizeAll();

    // service worker (only over http/https)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    if (ui.emptyStats) {
      ui.emptyStats.textContent = 'MIDI analizzato al 100% nel browser · zero caricamenti';
    }

    requestAnimationFrame((p) => { state.lastPerf = p; frame(p); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
