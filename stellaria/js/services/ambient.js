// services/ambient.js — sensori ambientali + oracolo procedurale locale.
import { bus } from '../core/bus.js';
import { phaseFor } from '../domain/world.js';
import { t } from '../core/i18n.js';

let listeners = [];
let profile = null;

function detectColorScheme() {
  try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'dark'; }
}
async function detectBattery() {
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      return { level: b.level, charging: b.charging };
    }
  } catch { /* no battery */ }
  return null;
}
async function detectLight() {
  try {
    if ('AmbientLightSensor' in window) {
      const s = new AmbientLightSensor();
      return new Promise((res) => {
        s.onreading = () => { res(s.illuminance); s.stop(); };
        s.onerror = () => res(null);
        try { s.start(); } catch { res(null); }
      });
    }
  } catch { /* no sensor */ }
  return null;
}

export async function ambientProfile(state) {
  const hour = (state && state.time && state.time.hour) || 10;
  const phase = phaseFor(hour);
  profile = {
    hour,
    phase: phase.id,
    phaseNameIT: phase.nameIT,
    weather: (state && state.time && state.time.weather) || 'sereno',
    colorScheme: detectColorScheme(),
    battery: null,
    light: null,
  };
  detectBattery().then((b) => { profile.battery = b; bus.emit('ambient:change', profile); });
  detectLight().then((l) => { profile.light = l; bus.emit('ambient:change', profile); });
  return profile;
}

export function oracleLine(state, citizenId) {
  const stars = (state && state.stars) || 0;
  const riflesso = (state && state.riflesso) || 0;
  const fame = (state && state.fame) || 1;
  const hour = (state && state.time && state.time.hour) || 10;
  const phase = hour < 6 || hour >= 20 ? 'notte' : hour < 18 ? 'giorno' : 'crepuscolo';
  const mood = riflesso > 25 ? 'interiorità' : fame > 3 ? 'fama' : 'ricerca';
  const pool = {
    giorno: [
      `Il sole illumina ciò che conta davvero: ${mood === 'interiorità' ? 'il silenzio dentro' : 'i riflessi fuori'}.`,
      `Oggi la piazza sente ${mood} più forte del vento.`,
      `${stars > 30 ? 'Molti ti applaudano.' : 'Pochi ti conoscono.'} E tu?`,
    ],
    crepuscolo: [
      `Tra stelle e ombre, ${riflesso > 20 ? 'trovati.' : 'cercati.'}`,
      `La fama si posa sulle spalle come un mantello leggero.`,
    ],
    notte: [
      `Di notte, chi non ha fama diventa specchio. ${riflesso > 20 ? 'E tu rifletti.' : 'E tu cerchi.'}`,
      `Nessun occhio, solo il tuo battito. ${riflesso > 30 ? 'È abbastanza.' : 'Ancora non basta.'}`,
    ],
  };
  const lines = pool[phase] || pool.giorno;
  const line = lines[(hour + riflesso) % lines.length];
  return { line, mood, phase, stars, riflesso, fame };
}

export function ambientProfileText(state) {
  const o = oracleLine(state);
  return o.line;
}

// Micro-sensori → aggiustamento estetico (ritorna tonalità/weather sugerita).
export function ambientTint(profile) {
  if (!profile) return null;
  let hue = 260;
  if (profile.phase === 'notte') hue = 230;
  if (profile.phase === 'crepuscolo') hue = 200;
  if (profile.colorScheme === 'light') hue = 250;
  if (profile.weather === 'nebbia') hue = 220;
  return { hue, saturation: 35, lightness: profile.phase === 'notte' ? 18 : 30 };
}

export function startAmbientListening() {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const cb = (e) => { profile = profile ? { ...profile, colorScheme: e.matches ? 'dark' : 'light' } : null; bus.emit('ambient:change', profile); };
    mq.addEventListener && mq.addEventListener('change', cb);
    listeners.push(() => mq.removeEventListener && mq.removeEventListener('change', cb));
  } catch {}
}
export function stopAmbientListening() { listeners.forEach((fn) => fn && fn()); listeners = []; }

// ─── Stagioni (real calendar) ─────────────────
// Equinoxi/solstizi UTC. Riferimento: hemisphere Nord.
const SEASONS = [
  { id: 'primavera', nameIT: 'Primavera', nameEN: 'Spring', emoji: '🌸', from: { m: 3, d: 20 }, to: { m: 6, d: 20 }, accent: '#f4a26a', sky: '#ffb27a' },
  { id: 'estate', nameIT: 'Estate', nameEN: 'Summer', emoji: '☀️', from: { m: 6, d: 21 }, to: { m: 9, d: 22 }, accent: '#ffd166', sky: '#ffd166' },
  { id: 'autunno', nameIT: 'Autunno', nameEN: 'Autumn', emoji: '🍂', from: { m: 9, d: 23 }, to: { m: 12, d: 20 }, accent: '#c97b3a', sky: '#c97b3a' },
  { id: 'inverno', nameIT: 'Inverno', nameEN: 'Winter', emoji: '❄️', from: { m: 12, d: 21 }, to: { m: 3, d: 19 }, accent: '#8fb4ff', sky: '#8fb4ff' },
];

function todayMD() {
  const d = new Date();
  return { m: d.getMonth() + 1, d: d.getDate() };
}

function mdAfter(a, b) {
  if (a.m !== b.m) return a.m > b.m;
  return a.d >= b.d;
}

export function getSeason(state) {
  const today = (state && state.time && state.time.date) || todayMD();
  for (const s of SEASONS) {
    const afterFrom = mdAfter(today, s.from);
    const beforeTo = !mdAfter(today, s.to);
    if (s.id === 'inverno') {
      // Wrap: Dec 21 → Mar 19
      if (afterFrom || beforeTo) return s;
    } else {
      if (afterFrom && beforeTo) return s;
    }
  }
  return SEASONS[0];
}

export function getSeasonalItems(seasonId) {
  const seasonalTags = {
    primavera: ['fiori', 'natura', 'dolce'],
    estate: ['calore', 'natura', 'comunità'],
    autunno: ['quiete', 'cose', 'natura'],
    inverno: ['notte', 'calore', 'specchio'],
  };
  return (seasonalTags[seasonId] || []);
}

export { SEASONS };
