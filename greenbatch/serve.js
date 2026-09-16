#!/usr/bin/env node
/**
 * serve.js — preview locale del prodotto GreenBatch.
 * Serve l'intera cartella (simulatore + documenti + diagrammi).
 *
 *   node serve.js            → http://localhost:4180  (redirect al simulatore)
 *   PORT=8080 node serve.js
 */
'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const PORT = Number(process.env.PORT || 4180)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (urlPath === '/' || urlPath === '/simulator' || urlPath === '/simulator/') {
    res.writeHead(302, { Location: '/simulator/index.html' })
    res.end()
    return
  }
  const rel = urlPath.replace(/^\/+/, '')
  const file = path.normalize(path.join(ROOT, rel))
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return }

  fs.readFile(file, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // markdown listing fallback: /docs/ → elenco
        fs.readdir(path.dirname(file), (e2, files) => {
          if (e2) { res.writeHead(404); res.end('Not found'); return }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end('<h1>Indice</h1><ul>' + files.map((f) => '<li><a href="' + path.join(urlPath, f) + '">' + f + '</a></li>').join('') + '</ul>')
        })
        return
      }
      res.writeHead(500); res.end('Server error'); return
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log('GreenBatch — simulatore: http://localhost:' + PORT + '/simulator/index.html')
  console.log('Documenti:            http://localhost:' + PORT + '/docs/')
})
