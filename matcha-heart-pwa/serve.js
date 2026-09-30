#!/usr/bin/env node
/**
 * serve.js — server statico di preview per Matcha Heart.
 * Nessuna dipendenza, nessun passo di build: serve i file così come sono.
 *
 * Uso:  node serve.js            # poi apri http://localhost:4173
 *       PORT=8080 node serve.js  # porta custom
 *       HOST=0.0.0.0 node serve.js
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
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
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  // normalizzare e bloccare il path traversal fuori dalla root
  const file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // la SPA è a view singola: qualunque percorso sconosciuto torna alla home
      fs.readFile(path.join(ROOT, 'index.html'), (e2, body) => {
        if (e2) return res.writeHead(404).end('Not found');
        res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(body);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      // il service worker non deve mai essere servito dalla HTTP cache
      'Cache-Control': file.endsWith('sw.js') ? 'no-cache' : 'no-cache',
    };
    if (pathname === '/index.html' || pathname.endsWith('sw.js')) headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🍵  Matcha Heart → http://${HOST}:${PORT}`);
  console.log(`    dal telefono in rete locale:  http://<tuo-ip>:${PORT}  (serve HOST=0.0.0.0)`);
  console.log('    i service worker richiedono http://localhost, mai file://');
});
