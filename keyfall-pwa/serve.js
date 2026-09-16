#!/usr/bin/env node
/**
 * serve.js — server statico zero-dipendenze per Keyfall (dev/preview).
 * I service worker richiedono http/https: non aprire mai index.html via file://.
 *
 * Uso:   node serve.js            (porta 4173)
 *        PORT=8080 node serve.js
 */
'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const PORT = Number(process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mid': 'audio/midi',
  '.midi': 'audio/midi',
  '.md': 'text/markdown; charset=utf-8',
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    let rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
    // guard against traversal
    const file = path.normalize(path.join(ROOT, rel))
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return }

    fs.readFile(file, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') { res.writeHead(404); res.end('Not found'); }
        else { res.writeHead(500); res.end('Server error'); }
        return
      }
      const ext = path.extname(file).toLowerCase()
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Service-Worker-Allowed': '/',
      })
      res.end(data)
    })
  } catch (e) {
    res.writeHead(500)
    res.end('Server error')
  }
})

server.listen(PORT, () => {
  console.log('Keyfall — http://localhost:' + PORT)
})
