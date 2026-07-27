'use strict';

/* SFTP file browser — wires into window.tailssh */

const T = window.tailssh;

let reqIdCounter = 0;
let currentPath = '.';
let pendingReqs = {};
let sftpReady = false;

function send(msg) {
  if (T.send) T.send(msg);
}

function escHtml(s) {
  const d = document.createElement('span');
  d.textContent = s;
  return d.innerHTML;
}

function escAttr(s) {
  return s.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
}

function showError(msg) {
  const p = document.getElementById('progress-area');
  if (!p) return;
  p.innerHTML = `<div style="color:var(--danger);font-size:13px;padding:4px 0;">${escHtml(msg)}</div>`;
  setTimeout(() => { p.innerHTML = ''; }, 3000);
}

// ---------------------------------------------------------------------------
// Directory listing
// ---------------------------------------------------------------------------
function listDir(path) {
  currentPath = path || '.';
  const reqId = ++reqIdCounter;
  send({ type: 'sftp-list', reqId, path: currentPath });
}

function renderFiles(path, entries) {
  const listEl = document.getElementById('file-list');
  const bcEl = document.getElementById('breadcrumb');
  if (!listEl) return;

  listEl.innerHTML = '';
  bcEl.innerHTML = '';

  if (path === '.') {
    bcEl.innerHTML = '<a href="#" data-path=".">~</a>';
  } else {
    const parts = path.replace(/\/$/, '').split('/');
    const accum = [];
    parts.forEach((p, i) => {
      accum.push(p);
      const full = accum.join('/');
      const sep = i > 0 ? '<span class="sep">/</span>' : '';
      bcEl.innerHTML += sep + '<a href="#" data-path="' + escAttr(full) + '">' + escHtml(p) + '</a>';
    });
  }
  bcEl.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); listDir(a.dataset.path); });
  });

  // Parent dir
  if (path !== '.') {
    const up = document.createElement('div');
    up.className = 'file-row';
    up.innerHTML = '<span class="icon">\u2B06</span><span class="name">..</span>';
    up.addEventListener('click', () => {
      const parent = path.replace(/\/?[^/]*$/, '') || '.';
      listDir(parent);
    });
    listEl.appendChild(up);
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  entries.forEach((e) => {
    const row = document.createElement('div');
    row.className = 'file-row';
    const icon = e.isDir ? '\uD83D\uDCC1' : '\uD83D\uDCC4';
    const size = e.isDir ? '' : fmtSize(e.size);
    const mtime = e.mtime ? fmtTime(new Date(e.mtime)) : '';
    row.innerHTML =
      '<span class="icon">' + icon + '</span>' +
      '<span class="name">' + escHtml(e.name) + '</span>' +
      '<span class="meta">' + size + ' ' + mtime + '</span>';
    const fullPath = (currentPath === '.' ? '' : currentPath) + '/' + e.name;
    row.addEventListener('click', () => {
      if (e.isDir) listDir(fullPath);
      else downloadFile(fullPath);
    });
    row.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showFileActions(e, fullPath);
    });
    listEl.appendChild(row);
  });
}

// ---------------------------------------------------------------------------
// File operations: rename, delete, mkdir
// ---------------------------------------------------------------------------
function showFileActions(entry, fullPath) {
  const existing = document.querySelector('.action-sheet');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'action-sheet';
  menu.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--border);padding:12px;display:flex;flex-direction:column;gap:8px;z-index:100;';

  const renameBtn = document.createElement('button');
  renameBtn.textContent = 'Rename';
  renameBtn.addEventListener('click', () => { menu.remove(); promptRename(fullPath); });
  menu.appendChild(renameBtn);

  const delBtn = document.createElement('button');
  delBtn.textContent = entry.isDir ? 'Delete folder' : 'Delete file';
  delBtn.className = 'danger';
  delBtn.addEventListener('click', () => { menu.remove(); confirmDelete(fullPath, entry.isDir); });
  menu.appendChild(delBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => menu.remove());
  menu.appendChild(cancelBtn);

  document.body.appendChild(menu);
}

function promptRename(path) {
  const name = prompt('New name:', path.split('/').pop());
  if (!name) return;
  const parent = path.substring(0, path.lastIndexOf('/'));
  const toPath = parent ? parent + '/' + name : name;
  send({ type: 'sftp-rename', reqId: ++reqIdCounter, fromPath: path, toPath });
}

function confirmDelete(path, isDir) {
  if (!confirm('Delete ' + (isDir ? 'folder' : 'file') + ' ' + path + '?')) return;
  send({ type: 'sftp-delete', reqId: ++reqIdCounter, path, isDir });
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
function startUploadFromPicker() {
  const input = document.getElementById('file-picker');
  if (!input) return;
  const file = input.files && input.files[0];
  if (!file) return;
  const remotePath = (currentPath === '.' ? '' : currentPath) + '/' + file.name;
  const reqId = ++reqIdCounter;
  send({ type: 'sftp-upload-start', reqId, path: remotePath });
  pendingReqs[reqId] = { type: 'upload', file, path: remotePath, bytes: 0, reqId };
}

function startUpload(msg) {
  const pending = pendingReqs[msg.reqId];
  if (!pending || pending.type !== 'upload') return;
  const file = pending.file;
  const chunkSize = 65536;
  let offset = 0;
  const progs = document.getElementById('progress-area');

  function next() {
    if (offset >= file.size) {
      send({ type: 'sftp-upload-end', reqId: msg.reqId });
      if (progs) progs.innerHTML = '<div class="progress-bar"><div class="fill" style="width:100%"></div></div>';
      setTimeout(() => { if (progs) progs.innerHTML = ''; }, 1500);
      return;
    }
    const slice = file.slice(offset, Math.min(offset + chunkSize, file.size));
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result.split(',')[1];
      send({ type: 'sftp-upload-chunk', reqId: msg.reqId, data: b64 });
      offset += chunkSize;
      const pct = Math.min(100, Math.round((offset / file.size) * 100));
      if (progs) progs.innerHTML = '<div class="progress-bar"><div class="fill" style="width:' + pct + '%"></div></div>';
      setTimeout(next, 0);
    };
    reader.readAsDataURL(slice);
  }
  next();
}

function uploadDone(msg) {
  delete pendingReqs[msg.reqId];
  listDir(currentPath);
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------
function downloadFile(path) {
  send({ type: 'sftp-download', reqId: ++reqIdCounter, path });
}

function startDownload(msg) {
  pendingReqs[msg.reqId] = { type: 'download', chunks: [], size: msg.size, bytes: 0, path: msg.path || '' };
  const progs = document.getElementById('progress-area');
  if (progs) progs.innerHTML = '<div class="progress-bar"><div class="fill" style="width:0%"></div></div>';
}

function onDownloadData(msg) {
  const pending = pendingReqs[msg.reqId];
  if (!pending || pending.type !== 'download') return;
  if (msg.data) pending.chunks.push(msg.data);
  pending.bytes += ((msg.data || '').length * 3) / 4;
  const progs = document.getElementById('progress-area');

  if (msg.done) {
    const b64 = pending.chunks.join('');
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pending.path.split('/').pop() || 'download';
    a.click();
    URL.revokeObjectURL(url);
    delete pendingReqs[msg.reqId];
    if (progs) progs.innerHTML = '';
    return;
  }
  const pct = Math.min(100, Math.round((pending.bytes / pending.size) * 100));
  if (progs) progs.innerHTML = '<div class="progress-bar"><div class="fill" style="width:' + pct + '%"></div></div>';
}

// ---------------------------------------------------------------------------
// Entry point (called from app.js when switching to file view)
// ---------------------------------------------------------------------------
let started = false;
T.enterFilePanel = function () {
  if (!started) {
    started = true;
  }
  const listEl = document.getElementById('file-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="file-row"><span class="icon">\u23f3</span><span class="name">Loading\u2026</span></div>';
  listDir('.');
};

// ---------------------------------------------------------------------------
// Message dispatcher (called from app.js ws.onmessage)
// ---------------------------------------------------------------------------
T.onSftpMsg = function (msg) {
  switch (msg.type) {
    case 'sftp-list':
      renderFiles(msg.path || '.', msg.entries || []);
      break;
    case 'sftp-error':
      showError(msg.message);
      if (pendingReqs[msg.reqId]) { delete pendingReqs[msg.reqId]; }
      break;
    case 'sftp-ok':
      if (pendingReqs[msg.reqId]) { delete pendingReqs[msg.reqId]; }
      listDir(currentPath);
      break;
    case 'sftp-download-start':
      startDownload(msg);
      break;
    case 'sftp-data':
      onDownloadData(msg);
      break;
    case 'sftp-upload-ack':
      startUpload(msg);
      break;
    case 'sftp-upload-done':
      uploadDone(msg);
      break;
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return (i === 0 ? s : s.toFixed(1)) + ' ' + units[i];
}

function fmtTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// ---------------------------------------------------------------------------
// Wire UI buttons
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('file-upload-btn');
  const picker = document.getElementById('file-picker');
  const mkdirBtn = document.getElementById('file-mkdir-btn');

  if (uploadBtn && picker) {
    uploadBtn.addEventListener('click', () => picker.click());
    picker.addEventListener('change', startUploadFromPicker);
  }
  if (mkdirBtn) {
    mkdirBtn.addEventListener('click', () => {
      const name = prompt('Folder name:');
      if (!name) return;
      const path = (currentPath === '.' ? '' : currentPath) + '/' + name;
      send({ type: 'sftp-mkdir', reqId: ++reqIdCounter, path });
    });
  }

  // VNC toolbar
  const vncKbd = document.getElementById('vnc-kbd-btn');
  if (vncKbd) {
    vncKbd.addEventListener('click', () => {
      const canvas = document.getElementById('vnc-canvas');
      if (canvas && canvas.rfb) canvas.rfb.focus();
    });
  }
  const vncCtrlAltDel = document.getElementById('vnc-ctrl-alt-del-btn');
  if (vncCtrlAltDel) {
    vncCtrlAltDel.addEventListener('click', () => {
      const canvas = document.getElementById('vnc-canvas');
      if (canvas && canvas.rfb) {
        canvas.rfb.sendKey(0xFFE3, 1);  // Ctrl
        canvas.rfb.sendKey(0xFFE9, 1);  // Alt
        canvas.rfb.sendKey(0xFFFF, 1);  // Delete
        canvas.rfb.sendKey(0xFFFF, 0);  // Delete up
        canvas.rfb.sendKey(0xFFE9, 0);  // Alt up
        canvas.rfb.sendKey(0xFFE3, 0);  // Ctrl up
      }
    });
  }
});
