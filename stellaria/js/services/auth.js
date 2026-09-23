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
  return !!(window.PublicKey && (navigator.credentials || {}).create && (navigator.credentials || {}).get);
}

export async function isBiometricPlatform() {
  try {
    if (!window.PublicKey) return false;
    const supports = window.PublicKey?.isUserVerifyingPlatformAuthenticatorAvailable
      ? await window.PublicKey.isUserVerifyingPlatformAuthenticatorAvailable()
      : false;
    return !!supports;
  } catch { return false; }
}

// Crea una credenziale locale (pin/biometria) per "chiudere a chia" il profilo.
export async function registerProfilePin() {
  if (!await isWebAuthnAvailable()) return { ok: false, reason: 'unsupported' };
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: RP_ID, name: 'Stellaria' },
        user: { id: new TextEncoder().encode('stellaria-profile'), name: 'stellaria', displayName: 'Stellaria' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -8 }],
        authenticatorSelection: { userVerification: 'required', residentKey: 'required' },
        timeout: 60000,
      },
    });
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
    const allow = [credential.rawId ? {
      type: 'public-key', id: new Uint8Array(credential.rawId), transports: credential.transports || ['platform'],
    } : credential];
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
