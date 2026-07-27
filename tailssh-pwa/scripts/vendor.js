'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'vendor');
const mkdir = (p) => fs.mkdirSync(p, { recursive: true });

const files = [
  ['node_modules/@xterm/xterm/css/xterm.css', 'xterm.css'],
  ['node_modules/@xterm/xterm/lib/xterm.js', 'xterm.js'],
  ['node_modules/@xterm/addon-fit/lib/addon-fit.js', 'addon-fit.js'],
];

for (const [src, dest] of files) {
  const from = path.join(root, src);
  const to = path.join(out, dest);
  fs.copyFileSync(from, to);
  console.log(`vendored ${src} -> public/vendor/${dest}`);
}

// noVNC core
const novncPkg = path.join(root, 'node_modules/@novnc/novnc');
const novncOut = path.join(out, 'novnc');
for (const sub of ['core', 'vendor']) {
  fs.cpSync(path.join(novncPkg, sub), path.join(novncOut, sub), { recursive: true });
}
console.log(`vendored @novnc/novnc (core+vendor) -> public/vendor/novnc/`);
