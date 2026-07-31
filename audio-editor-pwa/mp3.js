/* ===================================================
   🎚 Audio Editor PWA — Encoder MP3 (browser)
   Wrapper su lamejs (vendor/lame.min.js, globale `lamejs`).
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.Mp3Encoder = factory(root);
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  const CHUNK = 1152 * 4;

  function toInt16(f32) {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      out[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
    }
    return out;
  }

  /* channels: array di Float32Array. kbps: 96/128/192/256/320. */
  function encodeMp3(channels, sampleRate, kbps, onProgress) {
    const lib = root.lamejs;
    if (!lib || !lib.Mp3Encoder) {
      throw new Error('Encoder MP3 non disponibile (lamejs non caricato)');
    }
    const numChannels = channels.length;
    const encoder = new lib.Mp3Encoder(numChannels, sampleRate, kbps || 192);
    const left = toInt16(channels[0]);
    const right = numChannels > 1 ? toInt16(channels[1]) : null;
    const total = left.length;
    const outChunks = [];
    let processed = 0;
    let dataSize = 0;
    let li, ri;

    const flushChunk = () => {
      const d = numChannels > 1 ? encoder.encodeBuffer(li, ri) : encoder.encodeBuffer(li);
      if (d.length > 0) {
        outChunks.push(d);
        dataSize += d.length;
      }
    };

    while (processed < total) {
      const end = Math.min(total, processed + CHUNK);
      li = left.subarray(processed, end);
      ri = right ? right.subarray(processed, end) : null;
      flushChunk();
      processed = end;
      if (onProgress) onProgress(processed / total);
    }
    const tail = encoder.flush();
    if (tail.length > 0) {
      outChunks.push(tail);
      dataSize += tail.length;
    }

    const blob = new Blob(outChunks, { type: 'audio/mpeg' });
    return { blob, bytes: dataSize };
  }

  return { encodeMp3, toInt16 };
});
