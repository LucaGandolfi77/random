'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Client: SshClient } = require('ssh2');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '8022', 10);
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const ALLOW_HOSTS = (process.env.ALLOW_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const RATE_LIMIT_CONNECTS = parseInt(process.env.RATE_LIMIT_CONNECTS || '20', 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
const RATE_BAN_DURATION = parseInt(process.env.RATE_BAN_DURATION || '120000', 10);
const MAX_SFTP_BYTES = parseInt(process.env.MAX_SFTP_BYTES || '104857600', 10);
const SFTP_CHUNK_SIZE = parseInt(process.env.SFTP_CHUNK_SIZE || '131072', 10);

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---------------------------------------------------------------------------
// Rate limiter + origin check
// ---------------------------------------------------------------------------
const rateMap = new Map();
function rateInfo(ip) {
  let r = rateMap.get(ip);
  if (!r) { r = { connects: 0, windowStart: Date.now(), tokenFails: 0, banUntil: 0 }; rateMap.set(ip, r); }
  return r;
}
function checkConnectRate(ip) {
  const r = rateInfo(ip);
  if (Date.now() < r.banUntil) return false;
  if (Date.now() - r.windowStart > RATE_LIMIT_WINDOW) { r.connects = 0; r.windowStart = Date.now(); }
  r.connects++;
  if (r.connects > RATE_LIMIT_CONNECTS) { r.banUntil = Date.now() + RATE_BAN_DURATION; return false; }
  return true;
}
function checkOrigin(origin, host) {
  if (!origin) return true;
  const o = origin.toLowerCase();
  if (ALLOWED_ORIGINS.length) return ALLOWED_ORIGINS.some((ao) => o.includes(ao) || o === ao);
  try { const u = new URL(origin); return u.host === host; } catch { return false; }
}
function makeVerifyClient() {
  return (info, cb) => {
    if (!checkOrigin(info.origin, info.req.headers.host)) return cb(false, 403, 'Forbidden');
    if (!checkConnectRate(info.req.socket.remoteAddress)) return cb(false, 429, 'Too many requests');
    cb(true);
  };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://r').pathname); } catch { res.writeHead(400); return res.end(); }
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  const ct = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': ct,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// ---------------------------------------------------------------------------
// Single WebSocket server — manually dispatch by path (workaround for ws
// bug that corrupts frames when multiple Server instances share an HTTP server)
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server, maxPayload: 2 * 1024 * 1024, verifyClient: makeVerifyClient() });
wss.on('connection', (ws, req) => {
  const path = req.url;

  if (path === '/vnc') {
    return handleVnc(ws, req);
  }
  // default: /ssh
  handleSsh(ws, req);
});

// ---- /ssh handler ----
function handleSsh(ws, req) {
  let ssh = null, shell = null, sftp = null, authed = !AUTH_TOKEN;
  const ops = new Map(); // reqId -> { stream, type }

  const send = (obj) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); };
  const ping = setInterval(() => { if (ws.readyState === ws.OPEN) ws.ping(); }, 30000);

  function ensureSftp(cb) {
    if (sftp) return cb(null, sftp);
    if (!ssh) return cb(new Error('Not connected'));
    ssh.sftp((err, s) => {
      if (err) return cb(err);
      sftp = s;
      s.on('end', () => { sftp = null; });
      s.on('error', () => { sftp = null; });
      cb(null, s);
    });
  }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'connect':
        if (!authed) {
          if (typeof msg.token !== 'string' || !safeEqual(msg.token, AUTH_TOKEN)) { rateInfo(req.socket.remoteAddress).tokenFails++; send({ type: 'error', message: 'Unauthorized: invalid app token.' }); return ws.close(); }
          authed = true;
        }
        if (ssh) return;
        connectSsh(msg);
        break;
      case 'data':
        if (shell && typeof msg.data === 'string') shell.write(msg.data, 'utf8');
        break;
      case 'resize':
        if (shell && Number.isInteger(msg.cols) && Number.isInteger(msg.rows)) { try { shell.setWindow(msg.rows, msg.cols, 0, 0); } catch {} }
        break;

      // -- SFTP --
      case 'sftp-list':
        ensureSftp((err, s) => {
          if (err) return send({ type: 'sftp-error', reqId: msg.reqId, message: err.message });
          s.readdir(msg.path || '.', (err2, list) => {
            if (err2) return send({ type: 'sftp-error', reqId: msg.reqId, message: err2.message });
            send({ type: 'sftp-list', reqId: msg.reqId, path: msg.path, entries: list.map((e) => ({ name: e.filename, size: e.attrs.size, mtime: e.attrs.mtime * 1000, isDir: !!(e.attrs.mode & 0o40000), perms: e.attrs.mode & 0xFFF })) });
          });
        });
        break;
      case 'sftp-mkdir':
        ensureSftp((err, s) => {
          if (err) return send({ type: 'sftp-error', reqId: msg.reqId, message: err.message });
          s.mkdir(msg.path, (err2) => { if (err2) send({ type: 'sftp-error', reqId: msg.reqId, message: err2.message }); else send({ type: 'sftp-ok', reqId: msg.reqId }); });
        });
        break;
      case 'sftp-rename':
        ensureSftp((err, s) => {
          if (err) return send({ type: 'sftp-error', reqId: msg.reqId, message: err.message });
          s.rename(msg.fromPath, msg.toPath, (err2) => { if (err2) send({ type: 'sftp-error', reqId: msg.reqId, message: err2.message }); else send({ type: 'sftp-ok', reqId: msg.reqId }); });
        });
        break;
      case 'sftp-delete':
        ensureSftp((err, s) => {
          if (err) return send({ type: 'sftp-error', reqId: msg.reqId, message: err.message });
          const cb = (err2) => { if (err2) return send({ type: 'sftp-error', reqId: msg.reqId, message: err2.message }); send({ type: 'sftp-ok', reqId: msg.reqId }); };
          if (msg.isDir) s.rmdir(msg.path, cb); else s.unlink(msg.path, cb);
        });
        break;
      case 'sftp-download':
        ensureSftp((err, s) => {
          if (err) return send({ type: 'sftp-error', reqId: msg.reqId, message: err.message });
          if (ops.has(msg.reqId)) return send({ type: 'sftp-error', reqId: msg.reqId, message: 'reqId in use' });
          s.stat(msg.path, (err2, stat) => {
            if (err2) return send({ type: 'sftp-error', reqId: msg.reqId, message: err2.message });
            if (stat.size > MAX_SFTP_BYTES) return send({ type: 'sftp-error', reqId: msg.reqId, message: 'File too large' });
            const rs = s.createReadStream(msg.path, { highWaterMark: SFTP_CHUNK_SIZE });
            ops.set(msg.reqId, { stream: rs, type: 'read' });
            send({ type: 'sftp-download-start', reqId: msg.reqId, size: stat.size });
            rs.on('data', (chunk) => send({ type: 'sftp-data', reqId: msg.reqId, data: chunk.toString('base64'), done: false }));
            rs.on('end', () => { send({ type: 'sftp-data', reqId: msg.reqId, data: '', done: true }); ops.delete(msg.reqId); });
            rs.on('error', (e) => { send({ type: 'sftp-error', reqId: msg.reqId, message: e.message }); ops.delete(msg.reqId); });
          });
        });
        break;
      case 'sftp-upload-start':
        ensureSftp((err, s) => {
          if (err) return send({ type: 'sftp-error', reqId: msg.reqId, message: err.message });
          if (ops.has(msg.reqId)) return send({ type: 'sftp-error', reqId: msg.reqId, message: 'reqId in use' });
          const ws2 = s.createWriteStream(msg.path);
          ops.set(msg.reqId, { stream: ws2, type: 'write' });
          let bytes = 0;
          ws2.on('error', (e) => { send({ type: 'sftp-error', reqId: msg.reqId, message: e.message }); ops.delete(msg.reqId); });
          ws2.on('close', () => { send({ type: 'sftp-upload-done', reqId: msg.reqId, bytes }); ops.delete(msg.reqId); });
          send({ type: 'sftp-upload-ack', reqId: msg.reqId });
        });
        break;
      case 'sftp-upload-chunk': {
        const op = ops.get(msg.reqId);
        if (!op || op.type !== 'write') return;
        op.stream.write(Buffer.from(msg.data, 'base64'));
        break;
      }
      case 'sftp-upload-end': {
        const op = ops.get(msg.reqId);
        if (!op || op.type !== 'write') return;
        op.stream.end();
        break;
      }
      case 'sftp-cancel': {
        const op = ops.get(msg.reqId);
        if (op) { try { op.stream.destroy(); } catch {} ops.delete(msg.reqId); }
        send({ type: 'sftp-ok', reqId: msg.reqId });
        break;
      }
    }
  });

  function connectSsh(opts) {
    const host = String(opts.host || '').trim();
    const port = Math.min(Math.max(parseInt(opts.port, 10) || 22, 1), 65535);
    const username = String(opts.username || '').trim();
    if (!host || !username) { send({ type: 'error', message: 'Host and username are required.' }); return ws.close(); }
    if (ALLOW_HOSTS.length && !isAllowed(host, port)) { send({ type: 'error', message: `Destination ${host}:${port} not in ALLOW_HOSTS.` }); return ws.close(); }

    ssh = new SshClient();
    ssh.on('ready', () => {
      send({ type: 'status', message: `Authenticated ${username}@${host}` });
      ssh.shell({ term: 'xterm-256color', cols: opts.cols || 80, rows: opts.rows || 24 }, (err, s) => {
        if (err) { send({ type: 'error', message: 'Shell: ' + err.message }); return ws.close(); }
        shell = s;
        send({ type: 'ready' });
        s.on('data', (d) => send({ type: 'data', data: d.toString('utf8') }));
        if (s.stderr) s.stderr.on('data', (d) => send({ type: 'data', data: d.toString('utf8') }));
        s.on('close', () => { send({ type: 'exit' }); ws.close(); });
      });
    });
    ssh.on('keyboard-interactive', (_name, _instr, _lang, prompts, cb) => { if (opts.password) cb(prompts.map(() => String(opts.password))); });
    ssh.on('error', (err) => { send({ type: 'error', message: 'SSH: ' + err.message }); ws.close(); });
    ssh.on('end', () => { send({ type: 'exit' }); ws.close(); });

    const cfg = { host, port, username, readyTimeout: 20000, keepaliveInterval: 15000, tryKeyboard: true };
    if (opts.privateKey) { cfg.privateKey = String(opts.privateKey); if (opts.passphrase) cfg.passphrase = String(opts.passphrase); }
    if (opts.password) cfg.password = String(opts.password);
    try { ssh.connect(cfg); } catch (e) { send({ type: 'error', message: e.message }); ws.close(); }
  }

  function cleanup() {
    clearInterval(ping);
    try { if (shell) shell.end(); } catch {}
    try { if (sftp) sftp.end(); } catch {}
    try { if (ssh) ssh.end(); } catch {}
    for (const [, op] of ops) try { op.stream.destroy(); } catch {}
    ops.clear();
    shell = null; sftp = null; ssh = null;
  }
  ws.on('close', cleanup);
  ws.on('error', cleanup);
}

// ---- /vnc handler ----
function handleVnc(ws, req) {
  let ssh = null, fwd = null, authed = !AUTH_TOKEN, connected = false;

  const sendText = (s) => { if (ws.readyState === ws.OPEN) ws.send(s); };
  const ping = setInterval(() => { if (ws.readyState === ws.OPEN) ws.ping(); }, 30000);

  ws.once('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { sendText(JSON.stringify({ type: 'error', message: 'First message must be a JSON hello' })); return ws.close(); }

    if (!authed) {
      if (typeof msg.token !== 'string' || !safeEqual(msg.token, AUTH_TOKEN)) { rateInfo(req.socket.remoteAddress).tokenFails++; sendText(JSON.stringify({ type: 'error', message: 'Unauthorized' })); return ws.close(); }
      authed = true;
    }
    const host = String(msg.host || '').trim();
    const port = Math.min(Math.max(parseInt(msg.port, 10) || 22, 1), 65535);
    const username = String(msg.username || '').trim();
    const vncHost = String(msg.vncHost || '127.0.0.1').trim();
    const vncPort = Math.min(Math.max(parseInt(msg.vncPort, 10) || 5900, 1), 65535);
    if (!host || !username) { sendText(JSON.stringify({ type: 'error', message: 'Host and username required' })); return ws.close(); }
    if (ALLOW_HOSTS.length && !isAllowed(host, port)) { sendText(JSON.stringify({ type: 'error', message: `Destination ${host}:${port} not in ALLOW_HOSTS.` })); return ws.close(); }

    ssh = new SshClient();
    ssh.on('ready', () => {
      ssh.forwardOut('127.0.0.1', 0, vncHost, vncPort, (err, stream) => {
        if (err) { sendText(JSON.stringify({ type: 'error', message: 'VNC forward: ' + err.message })); return ws.close(); }
        fwd = stream; connected = true;
        ws.binaryType = 'nodebuffer';
        sendText('{"type":"vnc-ready"}');
        stream.on('data', (chunk) => { if (ws.readyState === ws.OPEN) ws.send(chunk); });
        ws.on('message', (data) => { if (Buffer.isBuffer(data) && fwd) try { fwd.write(data); } catch {} });
        stream.on('error', () => ws.close());
        stream.on('close', () => ws.close());
      });
    });
    ssh.on('keyboard-interactive', (_n, _i, _l, prompts, cb) => { if (msg.password) cb(prompts.map(() => String(msg.password))); });
    ssh.on('error', (err) => { sendText(JSON.stringify({ type: 'error', message: 'SSH: ' + err.message })); ws.close(); });

    const cfg = { host, port, username, readyTimeout: 20000, keepaliveInterval: 15000, tryKeyboard: true };
    if (msg.privateKey) { cfg.privateKey = String(msg.privateKey); if (msg.passphrase) cfg.passphrase = String(msg.passphrase); }
    if (msg.password) cfg.password = String(msg.password);
    try { ssh.connect(cfg); } catch (e) { sendText(JSON.stringify({ type: 'error', message: e.message })); ws.close(); }
  });

  function cleanup() {
    clearInterval(ping);
    try { if (fwd) fwd.end(); } catch {}
    try { if (ssh) ssh.end(); } catch {}
    fwd = null; ssh = null;
  }
  ws.on('close', cleanup);
  ws.on('error', cleanup);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isAllowed(host, port) {
  const h = host.toLowerCase();
  return ALLOW_HOSTS.some((e) => { const idx = e.indexOf(':'); return idx > 0 ? e.slice(0, idx) === h && parseInt(e.slice(idx + 1), 10) === port : e === h; });
}
function safeEqual(a, b) { const ba = Buffer.from(String(a)), bb = Buffer.from(String(b)); return ba.length === bb.length && crypto.timingSafeEqual(ba, bb); }

server.listen(PORT, HOST, () => {
  console.log(`TailSSH relay http://${HOST}:${PORT}`);
  console.log(`Token auth: ${AUTH_TOKEN ? 'ON' : 'OFF'}`);
  if (ALLOW_HOSTS.length) console.log(`ALLOW_HOSTS: ${ALLOW_HOSTS.join(', ')}`);
  if (ALLOWED_ORIGINS.length) console.log(`ALLOWED_ORIGINS: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Expose on tailnet: tailscale serve --bg ${PORT}`);
});
