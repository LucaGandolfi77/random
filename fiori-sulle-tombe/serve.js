#!/usr/bin/env node
/**
 * serve.js — server statico di preview. Nessuna dipendenza, nessun build step.
 *
 * Uso:  node serve.js            # poi apri http://localhost:4184
 *       PORT=8080 node serve.js  # porta custom
 *       HOST=0.0.0.0 node serve.js
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4184);
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400).end('URL non valida'); return; }

  if (urlPath === '/' || urlPath.endsWith('/')) urlPath += 'index.html';

  const file = path.join(ROOT, path.normalize(urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Vietato'); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404'); return; }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'content-length': st.size,
      /* Lo sviluppo deve vedere subito le modifiche: niente cache HTTP. */
      'cache-control': 'no-store',
      /* La PWA ha bisogno di questi due header su alcuni browser mobile. */
      'service-worker-allowed': '/',
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Fiori sulle Tombe — http://${HOST}:${PORT}`);
  console.log('Su iPhone apri la porta in rete (HOST=0.0.0.0) e usa "Aggiungi alla schermata Home".');
});