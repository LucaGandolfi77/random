// services/auth.js — WebAuthn locale (profilo protetto). Degradazione graceful.
// Nessun server: credential è legata al dispositivo. Il rawId persiste in localStorage.
import { bus } from '../core/bus.js';
import { safeLocalStorage } from '../core/utils.js';

const RP_ID = typeof location !== 'undefined' ? location.hostname : 'localhost';
const CRED_KEY = 'stellaria-pin-credential';
let credential = null;

function loadCredential() {
  try {
    const raw = safeLocalStorage('get', CRED_KEY);
    if (raw) credential = JSON.parse(raw);
  } catch { credential = null; }
}
function saveCredential() {
  try {
    if (credential) safeLocalStorage('set', CRED_KEY, JSON.stringify(credential));
    else safeLocalStorage('remove', CRED_KEY);
  } catch {}
}
loadCredential();

export async function isWebAuthnAvailable() {
  return !!(window.PublicKeyCredential
    && navigator.credentials
    && navigator.credentials.create
    && navigator.credentials.get);
}

export async function isBiometricPlatform() {
  try {
    if (!window.PublicKeyCredential) return false;
    const supports = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
      ? await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      : false;
    return !!supports;
  } catch { return false; }
}

function serializeCredential(cred) {
  if (!cred || !cred.rawId) return null;
  let rawId;
  if (cred.rawId instanceof ArrayBuffer) rawId = Array.from(new Uint8Array(cred.rawId));
  else if (ArrayBuffer.isView(cred.rawId)) rawId = Array.from(new Uint8Array(cred.rawId.buffer, cred.rawId.byteOffset, cred.rawId.byteLength));
  else if (Array.isArray(cred.rawId)) rawId = cred.rawId.slice();
  else return null;
  let transports = ['platform'];
  try {
    if (cred.response && typeof cred.response.getTransports === 'function') {
      const t = cred.response.getTransports();
      if (Array.isArray(t) && t.length) transports = t;
    }
  } catch {}
  return { rawId, type: cred.type || 'public-key', transports };
}

// Crea una credenziale locale (pin/biometria) per "chiudere a chia" il profilo.
export async function registerProfilePin() {
  if (!await isWebAuthnAvailable()) return { ok: false, reason: 'unsupported' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const created = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: RP_ID, name: 'Stellaria' },
        user: { id: new TextEncoder().encode('stellaria-profile'), name: 'stellaria', displayName: 'Stellaria' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -8 }],
        authenticatorSelection: { userVerification: 'required', residentKey: 'required' },
        timeout: 60000,
      },
    });
    const serialized = serializeCredential(created);
    if (!serialized) return { ok: false, reason: 'unavailable' };
    credential = serialized;
    saveCredential();
    bus.emit('auth:registered', true);
    return { ok: true };
  } catch (e) {
    if (e.name === 'NotAllowedError') return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'unavailable' };
  }
}

// Verifica la credential (sblocca il profilo).
export async function verifyProfilePin() {
  if (!credential) return { ok: true, bypass: true };
  if (!await isWebAuthnAvailable()) return { ok: false, reason: 'unsupported' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Array.isArray(credential.rawId) ? new Uint8Array(credential.rawId) : credential.rawId;
    const allow = rawId ? [{
      type: 'public-key', id: rawId, transports: credential.transports || ['platform'],
    }] : [];
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: allow,
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (assertion) return { ok: true };
    return { ok: false, reason: 'denied' };
  } catch (e) {
    if (e.name === 'NotAllowedError') return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'unavailable' };
  }
}

export async function clearProfilePin() {
  credential = null;
  saveCredential();
  bus.emit('auth:registered', false);
  return { ok: true };
}

export function hasPin() { return !!credential; }
