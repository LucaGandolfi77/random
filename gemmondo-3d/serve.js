#!/usr/bin/env node
/**
 * serve.js — server statico per GEMMONDO. Nessuna dipendenza, nessun build step:
 * serve i file esattamente come sono, con i MIME corretti (indispensabili per
 * i moduli ES e per l'import map).
 *
 * Uso:  node serve.js            # poi apri http://127.0.0.1:8333
 *       PORT=9000 node serve.js
 *       HOST=0.0.0.0 node serve.js
 */
import { createServer } from 'node:http';
import { stat, createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 8333);
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
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
};

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Richiesta malformata');
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = normalize(join(ROOT, pathname));

  /* Nessun escaping fuori dalla root del progetto. */
  if (target !== ROOT && !target.startsWith(ROOT.endsWith('/') ? ROOT : ROOT + '/')) {
    send(res, 403, 'Vietato');
    return;
  }

  stat(target, (err, st) => {
    if (err || !st.isFile()) {
      send(res, 404, '404 — non trovato');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      /* La cache la gestisce il service worker: il server non deve accavallarsi. */
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    });
    createReadStream(target).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n  💠 GEMMONDO in ascolto su http://${HOST}:${PORT}\n`);
});