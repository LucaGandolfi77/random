// features/index.js — tutte le feature avanzate, un unico punto d'accesso.
// Ogni feature è opt-in e degrada graceful se l'API non è supportata.
import { t } from '../core/i18n.js';
import { bus } from '../core/bus.js';
import { extractPalette } from '../ui/avatar.js';
import { getSeason, SEASONS } from '../services/ambient.js';
import { safeLocalStorage } from '../core/utils.js';

// ─── 1. Coreografia aptica (Vibration API) ──────────
export function haptic(pattern) {
  try {
    if ('vibrate' in navigator) {
      const p = typeof pattern === 'number' ? pattern : (Array.isArray(pattern) ? pattern : [30]);
      navigator.vibrate(p);
    }
  } catch {}
}
export const HAPTICS = { vote: [30, 40, 30], success: [50, 30, 70], badge: [80, 40, 80, 40, 120], click: 20, error: [100, 30, 100], ritual: [60, 30, 60, 30, 200] };

// ─── 2. Rituale serale (Il Cerchio della Sera) ──────
export function ritualAvailable() {
  const today = new Date().toDateString();
  const lastDate = safeLocalStorage('get', 'stellaria-ritual-date') || '';
  return { ok: lastDate !== today };
}
export function performRitual(state) {
  const r = ritualAvailable();
  if (!r.ok) return { ok: false, reason: 'cooldown' };
  state.riflesso += 2;
  state.stats.rituals = (state.stats.rituals || 0) + 1;
  safeLocalStorage('set', 'stellaria-ritual-last', String(Date.now()));
  safeLocalStorage('set', 'stellaria-ritual-date', new Date().toDateString());
  bus.emit('ritual', state);
  return { ok: true, riflesso: state.riflesso };
}

// ─── 3. Badging API + notifiche gentili ─────────────
export function requestBadge(count) {
  try {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge().then(() => bus.emit('badge:set', count)).catch(() => {});
    }
  } catch {}
}
export function clearBadge() {
  try {
    if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
  } catch {}
}
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const r = await Notification.requestPermission();
    return r;
  } catch { return 'unsupported'; }
}
export function sendGentleNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, icon: './icons/icon-192.png', silent: true });
    return true;
  } catch { return false; }
}

// ─── 4. Diario di Stellaria ─────────────────────────
export function generateDiary(state) {
  const entries = [];
  const stats = state && state.stats || {};
  const s = state || {};
  entries.push(`# Diario di Stellaria — ${new Date().toLocaleDateString('it-IT')}\n`);
  entries.push(`> La fama è la moneta. Il riflesso è la verità.\n`);
  entries.push(`## Oggi\n`);
  entries.push(`- Stelle: ${s.stars || 0} ◈ Riflesso: ${s.riflesso || 0} ✧ Fama: ${s.fame || 1}/6\n`);
  entries.push(`- Gestualità: ${stats.gestures || 0} esibizioni, ${stats.helps || 0} aiuti, ${stats.moves || 0} spostamenti\n`);
  const friends = Object.values(s.citizens || {}).filter((c) => (c.affinity || 0) >= 80).map((c) => c.nameIT || c.name);
  if (friends.length) entries.push(`- Amici stretti: ${friends.join(', ')}\n`);
  const season = getSeason(s);
  entries.push(`- Stagione attuale: ${season.emoji} ${season.nameIT}\n`);
  const collectibles = s.collectibles || [];
  if (collectibles.length) entries.push(`- Collezionabili: ${collectibles.join(', ')}\n`);
  entries.push(`## Riflessione\n`);
  entries.push(`${ambientLineLite(s)}\n`);
  return entries.join('');
}
function ambientLineLite(s) {
  const hour = (s && s.time && s.time.hour) || new Date().getHours();
  if (hour < 6 || hour >= 20) return 'Di notte, chi non ha fama diventa specchio.';
  if (hour < 18) return 'Il sole illumina ciò che conta davvero.';
  return 'Tra stelle e ombre, ci si trova o si cerca.';
}

// ─── 5. Mood-sync da foto ───────────────────────────
export async function moodSyncFromImage(imgElement) {
  const palette = extractPalette(imgElement, 5);
  if (!palette) return null;
  return {
    palette,
    label: `Tonalità: ${palette.join(' · ')}`,
    apply: (state) => {
      if (!state) return;
      if (!state.stats) state.stats = {};
      state.stats.moodPalette = palette;
      return state;
    },
  };
}

// ─── 6. WebRTC P2P — Piazza condivisa ───────────────
export class PlazaChannel {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.pc = null;
    this.dc = null;
    this.offer = null;
    this.connected = false;
  }
  async start() {
    if (!('RTCPeerConnection' in window)) return { ok: false, reason: 'unsupported' };
    try {
      this.pc = new RTCPeerConnection({ iceServers: [] });
      this.dc = this.pc.createDataChannel('plaza');
      this._setupDC();
      this.pc.onicecandidate = (e) => {
        if (!e.candidate && this.onMessage) {
          const offer = this.pc.localDescription;
          this.onMessage({ type: 'ice-ready', offer: { type: offer.type, sdp: offer.sdp } });
        }
      };
      this.offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(this.offer);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }
  async receiveOffer(offer) {
    if (!this.pc) return false;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      return { ok: true, answer };
    } catch { return false; }
  }
  async receiveAnswer(answer) {
    if (!this.pc) return false;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      return { ok: true };
    } catch { return false; }
  }
  async receiveIce(candidate) {
    if (!this.pc) return false;
    try { await this.pc.addIceCandidate(candidate); return true; } catch { return false; }
  }
  send(payload) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }
  getOfferSnapshot() {
    if (!this.pc) return null;
    const ld = this.pc.localDescription;
    return { type: ld.type, sdp: ld.sdp };
  }
  _setupDC() {
    this.dc.onopen = () => { this.connected = true; bus.emit('plaza:connected'); };
    this.dc.onclose = () => { this.connected = false; bus.emit('plaza:disconnected'); };
    this.dc.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (this.onMessage) this.onMessage(data);
      } catch {}
    };
  }
}

// ─── 7. Stagioni UI ─────────────────────────────────
export { getSeason as seasonUI, SEASONS };

// ─── 8. Oracolo in UI ───────────────────────────────
export function oracleForUI(state) {
  const hour = (state && state.time && state.time.hour) || new Date().getHours();
  let line = 'Ogni ora ha la sua verità.';
  let mood = 'ricerca';
  let phase = 'giorno';
  if (hour < 6 || hour >= 20) { phase = 'notte'; line = 'Di notte, chi non ha fama diventa specchio.'; mood = 'interiorità'; }
  else if (hour < 18) { phase = 'giorno'; line = 'Il sole illumina ciò che conta davvero.'; }
  else { phase = 'crepuscolo'; line = 'Tra stelle e ombre, ci si trova o si cerca.'; }
  return { line, mood, phase };
}
