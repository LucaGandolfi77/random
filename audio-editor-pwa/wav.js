/* ===================================================
   🎚 Audio Editor PWA — Encoder WAV (modulo puro)
   PCM 16/24-bit stereo, RIFF/WAVE. UMD: browser + Node.
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WavEncoder = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp16(v) {
    return Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }

  function clamp24(v) {
    return Math.max(-8388608, Math.min(8388607, Math.round(v * 8388607)));
  }

  /* channels: array di Float32Array. bits: 16 | 24. Ritorna ArrayBuffer. */
  function encodeWav(channels, sampleRate, bits) {
    const numChannels = channels.length;
    const bps = bits === 24 ? 3 : 2;
    const frames = channels[0].length;
    const blockAlign = numChannels * bps;
    const byteRate = sampleRate * blockAlign;
    const dataSize = frames * blockAlign;
    const buf = new ArrayBuffer(44 + dataSize);
    const dv = new DataView(buf);
    let o = 0;

    dv.setUint32(o, 0x52494646, false); o += 4;            // 'RIFF'
    dv.setUint32(o, 36 + dataSize, true); o += 4;
    dv.setUint32(o, 0x57415645, false); o += 4;            // 'WAVE'
    dv.setUint32(o, 0x666d7420, false); o += 4;            // 'fmt '
    dv.setUint32(o, 16, true); o += 4;
    dv.setUint16(o, 1, true); o += 2;                      // PCM
    dv.setUint16(o, numChannels, true); o += 2;
    dv.setUint32(o, sampleRate, true); o += 4;
    dv.setUint32(o, byteRate, true); o += 4;
    dv.setUint16(o, blockAlign, true); o += 2;
    dv.setUint16(o, bits, true); o += 2;
    dv.setUint32(o, 0x64617461, false); o += 4;            // 'data'
    dv.setUint32(o, dataSize, true); o += 4;

    if (bps === 2) {
      for (let i = 0; i < frames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          dv.setInt16(o, clamp16(channels[ch][i]), true);
          o += 2;
        }
      }
    } else {
      for (let i = 0; i < frames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          let v = clamp24(channels[ch][i]);
          dv.setUint8(o, v & 0xff); dv.setUint8(o + 1, (v >> 8) & 0xff); dv.setUint8(o + 2, (v >> 16) & 0xff);
          o += 3;
        }
      }
    }
    return buf;
  }

  function encodeWavBlob(channels, sampleRate, bits, mime) {
    return new Blob([encodeWav(channels, sampleRate, bits)], { type: mime || 'audio/wav' });
  }

  return { encodeWav, encodeWavBlob };
});
