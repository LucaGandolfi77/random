// One-shot static HTTP check: serve midnight-library, fetch paths, exit.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown',
};
const paths = [
  '/', '/index.html', '/offline.html', '/styles.css', '/manifest.webmanifest', '/content.json',
  '/src/app.js', '/src/controller.js', '/src/view.js', '/src/i18n.js', '/src/config.js',
  '/src/model/data.js', '/src/model/content.js', '/src/model/state.js', '/src/model/actions.js',
  '/src/services/storage.js', '/src/services/idb.js', '/src/services/audio.js', '/src/services/pwa.js',
  '/src/services/share.js', '/src/services/zip.js', '/src/services/mods.js',
  '/src/services/multiplayer.js', '/src/services/a11y.js',
  '/icons/icon.svg', '/icons/maskable.svg', '/icons/icon-180.png', '/icons/icon-192.png',
  '/icons/icon-512.png', '/icons/maskable-512.png',
  '/service-worker.js', '/LICENSE', '/README.md',
];

function get(urlPath) {
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: port,
      path: urlPath,
      method: 'GET',
      timeout: 2000,
    }, (res) => {
      let n = 0;
      res.on('data', (c) => { n += c.length; });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', bytes: n }));
    });
    req.on('error', () => resolve({ status: 0, type: '', bytes: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, type: '', bytes: 0 }); });
    req.end();
  });
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('missing'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
let fail = 0;
for (const p of paths) {
  const r = await get(p);
  if (r.status !== 200) { fail += 1; console.log(`FAIL ${r.status} ${p}`); }
}
const man = await get('/manifest.webmanifest');
const cj = await get('/content.json');
console.log(`checked ${paths.length} paths, failures=${fail}`);
console.log(`manifest ${man.status} ${man.type}`);
console.log(`content ${cj.status}`);
server.close();
process.exit(fail ? 1 : 0);
