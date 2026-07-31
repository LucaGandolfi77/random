/* ===================================================
   💀 Esqueleto Explosivo Clone — Simboli SVG
   Teschi big-head chibi in stile Día de los Muertos.
   Modulo puro (no DOM), UMD: browser + Node.
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkullSymbols = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SKULL_PATH = 'M50 14 C79 14 96 30 96 56 C96 71 92 81 85 88 C79 94 78 100 74 106 C67 118 33 118 26 106 C22 100 21 94 15 88 C8 81 4 71 4 56 C4 30 21 14 50 14 Z';

  function heartPath(cx, cy, s) {
    return `M${cx} ${cy + s * 0.3} C${cx + s * 0.9} ${cy - s * 0.9} ${cx + s * 1.6} ${cy - s * 0.2} ${cx + s * 1.6} ${cy + s * 0.6} C${cx + s * 1.6} ${cy + s * 1.3} ${cx + s * 0.7} ${cy + s * 1.8} ${cx} ${cy + s * 2.1} C${cx - s * 0.7} ${cy + s * 1.8} ${cx - s * 1.6} ${cy + s * 1.3} ${cx - s * 1.6} ${cy + s * 0.6} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.9} ${cy - s * 0.9} ${cx} ${cy + s * 0.3} Z`;
  }

  function starPoints(cx, cy, ro, ri) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? ro : ri;
      const a = Math.PI / 2 + i * Math.PI / 5;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  function flower(cx, cy, petalR, dist, fill, centerFill) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      const a = i * 2 * Math.PI / 5 - Math.PI / 2;
      out += `<circle cx="${(cx + dist * Math.cos(a)).toFixed(1)}" cy="${(cy + dist * Math.sin(a)).toFixed(1)}" r="${petalR}" fill="${fill}"/>`;
    }
    return out + `<circle cx="${cx}" cy="${cy}" r="${(petalR * 0.8).toFixed(1)}" fill="${centerFill}"/>`;
  }

  function dot(cx, cy, r, fill) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  }

  function diamond(cx, cy, w, h, fill) {
    return `<polygon points="${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}" fill="${fill}"/>`;
  }

  function drops(x, cy, fill, hi) {
    const d = `M${x} ${cy - 12} C${x + 14} ${cy - 2} ${x + 14} ${cy + 8} ${x} ${cy + 13} C${x - 14} ${cy + 8} ${x - 14} ${cy - 2} ${x} ${cy - 12} Z`;
    return `<path d="${d}" fill="${fill}"/>` + (hi ? `<circle cx="${x - 3}" cy="${cy - 4}" r="4" fill="#fff"/>` : '');
  }

  function eyes(cx1, cx2, cy, shape, fill, hi) {
    if (shape === 'drop') return drops(cx1, cy, fill, hi) + drops(cx2, cy, fill, hi);
    if (shape === 'heart') {
      const s = 6.5;
      return `<path d="${heartPath(cx1, cy, s)}" fill="${fill}"/>` + `<path d="${heartPath(cx2, cy, s)}" fill="${fill}"/>` +
        `<circle cx="${cx1 - 4}" cy="${cy - 3}" r="2.6" fill="#fff"/>` + `<circle cx="${cx2 + 4}" cy="${cy - 3}" r="2.6" fill="#fff"/>`;
    }
    return `<circle cx="${cx1}" cy="${cy}" r="14" fill="${fill}"/>` + `<circle cx="${cx2}" cy="${cy}" r="14" fill="${fill}"/>` +
      `<circle cx="${cx1 - 4}" cy="${cy - 4}" r="4" fill="#fff"/>` + `<circle cx="${cx2 + 4}" cy="${cy - 4}" r="4" fill="#fff"/>`;
  }

  function mouth(teethFill) {
    const bars = [];
    for (let x = 32; x <= 62; x += 6) bars.push(`<rect x="${x}" y="86" width="3" height="6" fill="${teethFill}"/>`);
    return `<rect x="27" y="84" width="46" height="10" rx="4" fill="#14131c"/>` + bars.join('');
  }

  function mustache(fill) {
    return `<path d="M30 84 Q38 76 50 84 Q62 76 70 84 Q60 92 50 90 Q40 92 30 84 Z" fill="${fill}" stroke="${fill}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }

  function bigMustache(fill) {
    return `<path d="M26 82 Q36 72 50 82 Q64 72 74 82 Q64 96 50 93 Q36 96 26 82 Z" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>`;
  }

  function lapels(fill) {
    return `<path d="M22 102 L14 128 L30 128 L36 110 Z" fill="${fill}" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="M78 102 L86 128 L70 128 L64 110 Z" fill="${fill}" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" stroke-linejoin="round"/>`;
  }

  function rays(cx, cy, r0, r1, color) {
    let out = '';
    for (let i = 0; i < 8; i++) {
      const a0 = i * Math.PI / 4;
      const a1 = a0 + Math.PI / 4 * 0.5;
      out += `<polygon points="${(cx + r0 * Math.cos(a0)).toFixed(1)},${(cy + r0 * Math.sin(a0)).toFixed(1)} ${(cx + r0 * Math.cos(a1)).toFixed(1)},${(cy + r0 * Math.sin(a1)).toFixed(1)} ${(cx + r1 * Math.cos((a0 + a1) / 2)).toFixed(1)},${(cy + r1 * Math.sin((a0 + a1) / 2)).toFixed(1)}" fill="${color}"/>`;
    }
    return out;
  }

  function buildSkullSVG(o) {
    const head = `<path d="${SKULL_PATH}" fill="${o.base}" stroke="#d8d2c4" stroke-width="1.5"/>`;
    let top = '';
    if (o.crown) {
      top += `<path d="M30 22 L30 6 L39 13 L50 4 L61 13 L70 6 L70 22 Z" fill="#f6c63f" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/>` +
        `<circle cx="50" cy="15" r="2.5" fill="#b8860b"/>` +
        `<circle cx="38" cy="13" r="1.8" fill="#fff"/>` +
        `<circle cx="62" cy="13" r="1.8" fill="#fff"/>`;
    }
    if (o.hat) {
      top += `<ellipse cx="50" cy="20" rx="42" ry="9" fill="#9c5a2f"/>` +
        `<path d="M28 18 C28 4 72 4 72 18 Z" fill="#c97a45" stroke="#8a4a20" stroke-width="1.5"/>` +
        `<path d="M33 14 L67 14" stroke="#e8b54a" stroke-width="3"/>` +
        `<circle cx="50" cy="7" r="3" fill="#e8b54a"/>`;
    }
    let deco = '';
    if (o.forehead === 'heart') deco += `<path d="${heartPath(50, 28, 6.5)}" fill="${o.pattern}"/>`;
    if (o.forehead === 'flower') deco += flower(50, 28, 5, 6, o.pattern, '#ffd24a');
    if (o.forehead === 'star') deco += `<polygon points="${starPoints(50, 28, 10, 4.5)}" fill="${o.pattern}"/>`;
    if (o.sideFlower) deco += flower(o.sideFlower[0], o.sideFlower[1], 5.5, 7, o.sideFlower[2], '#ffd24a');
    (o.dots || []).forEach(d => { deco += dot(d[0], d[1], d[2], d[3]); });
    (o.diamonds || []).forEach(d => { deco += diamond(d[0], d[1], d[2], d[3], d[4]); });
    const face = eyes(34, 66, 56, o.eye, '#14131c', true) +
      `<path d="${heartPath(50, 72, 4)}" fill="#14131c"/>` +
      (o.mouthBand ? mouth('#f7f2e9') : '') +
      (o.mustache ? mustache(o.mustache) : '') +
      (o.bigMustache ? bigMustache(o.bigMustache) : '') +
      (o.vest ? lapels(o.vest) : '') +
      (o.jacket ? lapels('#155e63') + `<path d="M40 129 L50 114 L60 129 Z" fill="#e8e4da"/>` : '');
    return `<svg viewBox="0 0 100 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${top}${head}${deco}${face}</svg>`;
  }

  const SKULLS = {
    gold: buildSkullSVG({ base: '#f7f2e9', eye: 'circle', mouthBand: true, forehead: 'heart', pattern: '#3ec96a', sideFlower: [85, 42, '#ff9a3d'], dots: [[17, 67, 2.5, '#3ec96a'], [14, 78, 2.5, '#3ec96a'], [19, 88, 2.5, '#3ec96a'], [83, 67, 2.5, '#3ec96a'], [86, 78, 2.5, '#3ec96a'], [81, 88, 2.5, '#3ec96a']] }),
    pink: buildSkullSVG({ base: '#fdf3c9', eye: 'drop', mouthBand: true, crown: true, diamonds: [[36, 77, 4, 4, '#ff8c1a'], [64, 77, 4, 4, '#ff8c1a'], [20, 70, 4, 5, '#f6c63f'], [80, 70, 4, 5, '#f6c63f'], [34, 38, 4, 4, '#ff8c1a'], [66, 38, 4, 4, '#ff8c1a']] }),
    green: buildSkullSVG({ base: '#f7f2e9', eye: 'heart', bigMustache: '#191920', vest: '#2b2b31', forehead: 'flower', pattern: '#8fd8ff', dots: [[19, 68, 2.5, '#8fd8ff'], [16, 80, 2.5, '#8fd8ff'], [20, 90, 2.5, '#8fd8ff'], [80, 90, 2.5, '#8fd8ff'], [84, 80, 2.5, '#8fd8ff'], [81, 68, 2.5, '#8fd8ff']] }),
    blue: buildSkullSVG({ base: '#f7f2e9', eye: 'drop', mouthBand: true, mustache: '#ff6fb0', vest: '#4a2036', forehead: 'star', pattern: '#ff9ecb', dots: [[18, 66, 2.5, '#ff9ecb'], [15, 78, 2.5, '#ff9ecb'], [20, 88, 2.5, '#ff9ecb'], [80, 88, 2.5, '#ff9ecb'], [85, 78, 2.5, '#ff9ecb'], [82, 66, 2.5, '#ff9ecb']] }),
    orange: buildSkullSVG({ base: '#f7f2e9', eye: 'circle', mouthBand: true, jacket: true, hat: true, forehead: 'flower', pattern: '#2ec4b6', dots: [[19, 67, 2.5, '#2ec4b6'], [16, 79, 2.5, '#2ec4b6'], [21, 88, 2.5, '#2ec4b6'], [79, 88, 2.5, '#2ec4b6'], [84, 79, 2.5, '#2ec4b6'], [81, 67, 2.5, '#2ec4b6'], [34, 40, 2.2, '#2ec4b6'], [66, 40, 2.2, '#2ec4b6']] }),
    wild: `<svg viewBox="0 0 100 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${rays(50, 70, 34, 52, '#ffd24a')}<path d="${SKULL_PATH}" fill="#fff8e0" stroke="#f0c33c" stroke-width="2.5"/>${eyes(34, 66, 56, 'circle', '#f0c33c', true)}<path d="${heartPath(50, 72, 4)}" fill="#f0c33c"/><rect x="27" y="84" width="46" height="10" rx="4" fill="#b8860b"/><path d="M30 84 Q38 76 50 84 Q62 76 70 84 Q60 92 50 90 Q40 92 30 84 Z" fill="#f0c33c"/></svg>`
  };

  return { SKULL_PATH, buildSkullSVG, SKULLS };
});
