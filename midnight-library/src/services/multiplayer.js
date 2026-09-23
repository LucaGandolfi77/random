// Local-first multiplayer leggero · WebRTC con signaling manuale (zero server).
// Due peer nella stessa LAN si scambiano lettere e uno snapshot di stato.

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

let pc = null;
let dc = null;
let role = null; // 'offer' | 'answer'
let onMessage = null;
let onStatus = null;
let pendingCandidates = [];

export function isSupported() {
  return typeof RTCPeerConnection !== 'undefined';
}

export function reset() {
  try { dc?.close(); } catch { /* ok */ }
  try { pc?.close(); } catch { /* ok */ }
  pc = null;
  dc = null;
  role = null;
  pendingCandidates = [];
}

export function setHandlers({ onMessage: m, onStatus: s } = {}) {
  if (m) onMessage = m;
  if (s) onStatus = s;
}

function emitStatus(status, extra = {}) {
  if (onStatus) onStatus({ status, ...extra });
}

function wireDataChannel(channel) {
  dc = channel;
  dc.onopen = () => emitStatus('open', { role });
  dc.onclose = () => emitStatus('closed');
  dc.onerror = () => emitStatus('error');
  dc.onmessage = (e) => {
    let data;
    try { data = JSON.parse(e.data); } catch { return; }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'letter' && typeof data.text === 'string') {
      if (onMessage) onMessage({ kind: 'letter', text: data.text.slice(0, 280) });
    } else if (data.type === 'status' && data.payload && typeof data.payload === 'object') {
      if (onMessage) onMessage({ kind: 'status', payload: data.payload });
    }
  };
}

function ensurePeer() {
  if (pc) return pc;
  pc = new RTCPeerConnection(RTC_CONFIG);
  pc.onicecandidate = (e) => {
    if (e.candidate && role === 'answer') {
      // candidate embedded nel answer via onicecandidate buffering → semplifichiamo
      // con exchange solo SDP (sufficiente su LAN con host candidates).
    }
  };
  pc.ondatachannel = (e) => {
    wireDataChannel(e.channel);
  };
  return pc;
}

/** Crea un offer da copiare all'altro dispositivo. */
export async function createOffer() {
  if (!isSupported()) return { ok: false, error: 'unsupported' };
  reset();
  role = 'offer';
  emitStatus('creating-offer');
  const peer = ensurePeer();
  const channel = peer.createDataChannel('lumina', { ordered: true });
  wireDataChannel(channel);
  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    // attesa ICE completa (best-effort, timeout corto)
    await waitIce(peer, 1500);
    const sdp = peer.localDescription?.sdp || '';
    return { ok: true, sdp: encodeSignal({ t: 'offer', sdp }) };
  } catch (err) {
    reset();
    return { ok: false, error: err?.message || 'offer-failed' };
  }
}

/** Accetta un offer remoto e produce la risposta da incollare. */
export async function acceptOffer(offerCode) {
  if (!isSupported()) return { ok: false, error: 'unsupported' };
  const parsed = decodeSignal(offerCode);
  if (!parsed || parsed.t !== 'offer' || !parsed.sdp) {
    return { ok: false, error: 'bad-offer' };
  }
  reset();
  role = 'answer';
  emitStatus('creating-answer');
  const peer = ensurePeer();
  try {
    await peer.setRemoteDescription({ type: 'offer', sdp: parsed.sdp });
    await flushPending(peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await waitIce(peer, 1500);
    const sdp = peer.localDescription?.sdp || '';
    return { ok: true, sdp: encodeSignal({ t: 'answer', sdp }) };
  } catch (err) {
    reset();
    return { ok: false, error: err?.message || 'answer-failed' };
  }
}

/** Completa l'exchange da chi ha creato l'offer. */
export async function acceptAnswer(answerCode) {
  if (!pc || role !== 'offer') return { ok: false, error: 'no-offer' };
  const parsed = decodeSignal(answerCode);
  if (!parsed || parsed.t !== 'answer' || !parsed.sdp) {
    return { ok: false, error: 'bad-answer' };
  }
  try {
    await pc.setRemoteDescription({ type: 'answer', sdp: parsed.sdp });
    await flushPending(pc);
    emitStatus('connecting');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'set-remote-failed' };
  }
}

async function flushPending(peer) {
  while (pendingCandidates.length) {
    const c = pendingCandidates.shift();
    try { await peer.addIceCandidate(c); } catch { /* best-effort */ }
  }
}

function waitIce(peer, ms) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      peer.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, ms);
    function check() {
      if (peer.iceGatheringState === 'complete') {
        clearTimeout(t);
        peer.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    }
    peer.addEventListener('icegatheringstatechange', check);
  });
}

export function isConnected() {
  return Boolean(dc && dc.readyState === 'open');
}

function send(obj) {
  if (!isConnected()) return false;
  try {
    dc.send(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

/** Invia una lettera al peer. */
export function sendLetter(text) {
  const t = String(text ?? '').trim().slice(0, 280);
  if (!t) return false;
  return send({ type: 'letter', text: t });
}

/** Invia snapshot leggero di stato. */
export function sendStatus(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const clean = {
    room: String(payload.room || 'hall').slice(0, 32),
    readersServed: Number(payload.readersServed) || 0,
    rares: Array.isArray(payload.rares) ? payload.rares.slice(0, 32).map(String) : [],
    playtime: Number(payload.playtime) || 0,
    lang: payload.lang === 'en' ? 'en' : 'it',
    name: String(payload.name || '').slice(0, 32),
  };
  return send({ type: 'status', payload: clean });
}

// ---- Signal codec: base64url di JSON (compatibile clipboard) ----
export function encodeSignal(obj) {
  const json = JSON.stringify(obj);
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSignal(code) {
  try {
    const s = String(code || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const json = typeof atob === 'function'
      ? decodeURIComponent(escape(atob(s + pad)))
      : Buffer.from(s + pad, 'base64').toString('utf8');
    const obj = JSON.parse(json);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}
