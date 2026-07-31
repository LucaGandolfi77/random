/* ===================================================
   🎚 Audio Editor PWA — Waveform
   Calcolo dei picchi (puro) + disegno su canvas.
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Waveform = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Picchi massimi assoluti di un canale, ridotti a `width` bucket. */
  function computePeaks(channel, startFrame, endFrame, width) {
    const from = Math.max(0, startFrame | 0);
    const to = Math.min(channel.length, endFrame | 0);
    const n = Math.max(1, to - from);
    const peaks = new Float32Array(Math.max(1, width));
    const per = n / peaks.length;
    for (let b = 0; b < peaks.length; b++) {
      const s = from + Math.floor(b * per);
      const e = from + Math.ceil((b + 1) * per);
      let m = 0;
      for (let i = s; i < e; i++) {
        const v = Math.abs(channel[i]);
        if (v > m) m = v;
      }
      peaks[b] = m;
    }
    return peaks;
  }

  /* Disegna la waveform simmetrica (specchio). opts: {x,y,w,h,color,fill,bg}. */
  function renderWaveform(ctx, peaks, opts) {
    const { x, y, w, h } = opts;
    const color = opts.color || '#4dc3ff';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = opts.bg || 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y, w, h);
    const mid = y + h / 2;
    const step = w / peaks.length;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const v = Math.max(0.005, peaks[i]);
      const px = x + i * step;
      const hh = Math.max(1, v * h * 0.5);
      ctx.rect(px, mid - hh, Math.max(1, step + 0.5), hh * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  return { computePeaks, renderWaveform };
});
