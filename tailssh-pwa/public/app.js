'use strict';

/* global Terminal, FitAddon */

// ---------------------------------------------------------------------------
// PWA: service worker + install prompt
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

let deferredInstall = null;
const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  installBtn.classList.remove('hidden');
});
installBtn.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  installBtn.classList.add('hidden');
});

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (isIOS && !isStandalone) {
  document.getElementById('ios-install-hint').classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Module exports for files.js / vnc.js
// ---------------------------------------------------------------------------
window.tailssh = {};

const T = window.tailssh;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const connectView = $('connect-view');
const terminalView = $('terminal-view');
const filesView = $('files-view');
const screenView = $('screen-view');
const form = $('connect-form');
const connectBtn = $('connect-btn');
const disconnectBtn = $('disconnect-btn');
const backBtn = $('back-btn');
const statusEl = $('status');
const statusText = $('status-text');
const viewTabs = $('view-tabs');
const profilesEl = $('profiles');

// ---------------------------------------------------------------------------
// Profiles (client-side, non-secrets)
// ---------------------------------------------------------------------------
const PROFILES_KEY = 'tailssh.profiles';

function loadProfiles() {
  try {
    // Migrate old single-settings format
    const old = localStorage.getItem('tailssh.settings');
    if (old) {
      const s = JSON.parse(old);
      if (s.host && s.username) {
        const profiles = [{ id: Date.now(), name: s.username + '@' + s.host, host: s.host, username: s.username, port: s.port || '22', method: s.method || 'password' }];
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      }
      localStorage.removeItem('tailssh.settings');
    }
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function renderProfiles() {
  const profiles = loadProfiles();
  profilesEl.innerHTML = '';
  if (profiles.length === 0) {
    profilesEl.innerHTML = '<span class="placeholder">No saved profiles</span>';
    return;
  }
  profiles.forEach((p) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.innerHTML = `<span>${escHtml(p.name || p.username+'@'+p.host)}</span><span class="del">&times;</span>`;
    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('del')) {
        const updated = loadProfiles().filter((x) => x.id !== p.id);
        saveProfiles(updated);
        renderProfiles();
        return;
      }
      $('host').value = p.host || '';
      $('username').value = p.username || '';
      $('port').value = p.port || '22';
      if (p.method === 'key') {
        setAuthTab('key');
      } else {
        setAuthTab('password');
      }
    });
    profilesEl.appendChild(chip);
  });
}

function escHtml(s) {
  const d = document.createElement('span');
  d.textContent = s;
  return d.innerHTML;
}

function currentProfileName() {
  const host = $('host').value.trim();
  const username = $('username').value.trim();
  return username + '@' + host;
}

function saveCurrentProfile() {
  const host = $('host').value.trim();
  const username = $('username').value.trim();
  if (!host || !username) return;
  const profiles = loadProfiles();
  const existing = profiles.find((p) => p.host === host && p.username === username && (p.port || '22') === ($('port').value.trim() || '22'));
  if (existing) {
    existing.method = authMethod;
  } else {
    profiles.push({
      id: Date.now(),
      name: currentProfileName(),
      host,
      username,
      port: $('port').value.trim() || '22',
      method: authMethod,
    });
  }
  saveProfiles(profiles);
  renderProfiles();
}

renderProfiles();
$('save-profile-btn').addEventListener('click', saveCurrentProfile);

// ---------------------------------------------------------------------------
// Auth method tabs
// ---------------------------------------------------------------------------
let authMethod = 'password';
function setAuthTab(method) {
  authMethod = method === 'key' ? 'key' : 'password';
  $('tab-password').classList.toggle('active', authMethod === 'password');
  $('tab-key').classList.toggle('active', authMethod === 'key');
  $('pane-password').classList.toggle('hidden', authMethod !== 'password');
  $('pane-key').classList.toggle('hidden', authMethod !== 'key');
}
$('tab-password').addEventListener('click', () => setAuthTab('password'));
$('tab-key').addEventListener('click', () => setAuthTab('key'));

let privateKeyText = '';
$('keyfile').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  privateKeyText = await file.text();
  $('keyfile-name').textContent = `${file.name} (${file.size} bytes)`;
});

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------
let term = null;
let fitAddon = null;
let ws = null;
let ctrlLatch = false;
let currentTab = 'terminal';

// In-memory credentials for reuse by files/screen panels
T.sessionCreds = null;

// Shared send function for other modules (files.js, vnc.js)
T.send = function (msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

const SEQS = {
  esc: '\x1b', tab: '\t', left: '\x1b[D', up: '\x1b[A',
  down: '\x1b[B', right: '\x1b[C', tilde: '~', pipe: '|',
};

function setStatus(state, text) {
  statusEl.className = 'status status-' + state;
  statusText.textContent = text;
}

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------
function showView(name) {
  currentTab = name;
  document.querySelectorAll('.view-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === name);
  });
  connectView.classList.add('hidden');
  terminalView.classList.add('hidden');
  filesView.classList.add('hidden');
  screenView.classList.add('hidden');

  backBtn.classList.add('hidden');
  viewTabs.classList.add('hidden');

  if (name === 'terminal') {
    terminalView.classList.remove('hidden');
    viewTabs.classList.remove('hidden');
    if (term) setTimeout(() => { fitAndNotify(); term.focus(); }, 50);
  } else if (name === 'files') {
    filesView.classList.remove('hidden');
    viewTabs.classList.remove('hidden');
    if (T.enterFilePanel) T.enterFilePanel();
  } else if (name === 'screen') {
    screenView.classList.remove('hidden');
    viewTabs.classList.remove('hidden');
    launchScreen();
  }
}

document.querySelectorAll('.view-tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});

// Back to connect view (disconnect first)
backBtn.addEventListener('click', () => {
  if (ws) ws.close();
  else showConnect();
});

function showConnect() {
  connectView.classList.remove('hidden');
  terminalView.classList.add('hidden');
  filesView.classList.add('hidden');
  screenView.classList.add('hidden');
  viewTabs.classList.add('hidden');
  backBtn.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------
function ensureTerminal() {
  if (term) return;
  term = new Terminal({
    fontFamily: '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    fontSize: 14,
    cursorBlink: true,
    scrollback: 5000,
    allowProposedApi: true,
    theme: { background: '#0b1220', foreground: '#e5e9f0', cursor: '#38bdf8', selectionBackground: '#33415e' },
  });
  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open($('terminal'));

  term.onData((data) => {
    if (ctrlLatch) {
      data = toCtrl(data);
      ctrlLatch = false;
      $('ctrl-btn').classList.remove('active');
      $('ctrl-btn').setAttribute('aria-pressed', 'false');
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'data', data }));
    }
  });

  new ResizeObserver(fitAndNotify).observe($('terminal'));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitAndNotify);
}

function fitAndNotify() {
  if (!fitAddon || !term) return;
  try { fitAddon.fit(); } catch { return; }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
  }
}

function toCtrl(data) {
  if (data.length !== 1) return data;
  const c = data.toUpperCase().charCodeAt(0);
  if (c >= 0x40 && c <= 0x5f) return String.fromCharCode(c & 0x1f);
  if (data === '?') return '\x7f';
  return data;
}

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
function connect(e) {
  e.preventDefault();
  saveCurrentProfile();
  ensureTerminal();

  const host = $('host').value.trim();
  const username = $('username').value.trim();
  const port = parseInt($('port').value, 10) || 22;
  if (!host || !username) return;

  connectBtn.disabled = true;
  setStatus('busy', 'connecting\u2026');
  term.reset();
  term.writeln(`\x1b[2m\u203a ${username}@${host}:${port}\x1b[0m`);

  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(proto + location.host + '/ssh');

  ws.onopen = () => {
    const msg = {
      type: 'connect',
      host, port, username,
      cols: term.cols, rows: term.rows,
      token: $('token').value || undefined,
    };
    if (authMethod === 'key') {
      if (!privateKeyText) {
        term.writeln('\x1b[31m\u2717 Pick a private key file first.\x1b[0m');
        ws.close(); return;
      }
      msg.privateKey = privateKeyText;
      if ($('passphrase').value) msg.passphrase = $('passphrase').value;
    } else {
      msg.password = $('password').value;
    }
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    // Dispatch SFTP messages to files.js handler
    if (msg.type === 'sftp-list' || msg.type === 'sftp-data' || msg.type === 'sftp-error' ||
        msg.type === 'sftp-ok' || msg.type === 'sftp-download-start' || msg.type === 'sftp-upload-ack' ||
        msg.type === 'sftp-upload-done' || msg.type === 'sftp-cancel') {
      if (T.onSftpMsg) T.onSftpMsg(msg);
      return;
    }

    switch (msg.type) {
      case 'status':
        term.writeln(`\x1b[2m${msg.message}\x1b[0m`);
        break;
      case 'ready':
        setStatus('on', 'connected');
        connectBtn.disabled = false;
        T.sessionCreds = {
          host, port, username, authMethod,
          password: authMethod === 'password' ? $('password').value : undefined,
          privateKey: authMethod === 'key' ? privateKeyText : undefined,
          passphrase: $('passphrase').value || undefined,
          token: $('token').value || undefined,
          vncHost: '127.0.0.1', vncPort: 5900,
        };
        showView('terminal');
        disconnectBtn.classList.remove('hidden');
        break;
      case 'data':
        term.write(msg.data);
        break;
      case 'error':
        term.writeln(`\r\n\x1b[31m\u2717 ${msg.message}\x1b[0m`);
        setStatus('off', 'error');
        break;
      case 'exit':
        term.writeln('\r\n\x1b[2m[session closed]\x1b[0m');
        break;
    }
  };

  ws.onerror = () => {
    term.writeln('\r\n\x1b[31m\u2717 Connection to relay failed.\x1b[0m');
  };
  ws.onclose = () => {
    setStatus('off', 'offline');
    connectBtn.disabled = false;
    disconnectBtn.classList.add('hidden');
    T.sessionCreds = null;
    if (currentTab !== 'terminal') showConnect();
    else {
      // if already on connect view, nothing else to do
    }
    ws = null;
  };
}

form.addEventListener('submit', connect);

disconnectBtn.addEventListener('click', () => { if (ws) ws.close(); });

// ---------------------------------------------------------------------------
// Toolbar terminal keys
// ---------------------------------------------------------------------------
document.querySelectorAll('#toolbar [data-seq]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const seq = SEQS[btn.dataset.seq];
    if (seq !== undefined && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'data', data: seq }));
    }
    if (term) term.focus();
  });
});

$('ctrl-btn').addEventListener('click', () => {
  ctrlLatch = !ctrlLatch;
  $('ctrl-btn').classList.toggle('active', ctrlLatch);
  $('ctrl-btn').setAttribute('aria-pressed', String(ctrlLatch));
  if (term) term.focus();
});

$('kbd-btn').addEventListener('click', () => { if (term) term.focus(); });

// ---------------------------------------------------------------------------
// Screen (VNC) – lazy import
// ---------------------------------------------------------------------------
let screenStarted = false;

async function launchScreen() {
  if (screenStarted) return;
  screenStarted = true;
  try {
    const mod = await import('/vnc.js');
    mod.connectScreen($('vnc-canvas'), T.sessionCreds);
  } catch (e) {
    console.error('VNC init failed', e);
    setStatus('off', 'VNC error');
  }
}

// Reset screen on disconnect (reconnect should restart)
$('disconnect-btn').addEventListener('click', () => { screenStarted = false; });
