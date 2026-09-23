// Mod support · pacchetti *.luminapack (zip JSON+SVG) senza eval/sandbox aperta.
// I pack vengono validati strutturalmente e sovrapposti al content base.

import { zipRead, zipEntriesToTexts } from './zip.js';

export const PACK_EXT = '.luminapack';
const MAX_PACK_BYTES = 512 * 1024;
const MAX_BOOKS = 32;
const MAX_MESSAGES = 64;
const MAX_SVG_BYTES = 64 * 1024;

/**
 * Valida un pack.json e restituisce la forma normalizzata o null.
 * Nessun eval, nessuna HTML injection: solo stringhe/numeri/array.
 */
export function validatePack(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(id)) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 64) : '';
  if (!name) return null;
  const version = typeof raw.version === 'string' ? raw.version.trim().slice(0, 16) : '1.0.0';
  const author = typeof raw.author === 'string' ? raw.author.trim().slice(0, 64) : '';
  const description = typeof raw.description === 'string' ? raw.description.slice(0, 280) : '';

  const content = raw.content && typeof raw.content === 'object' ? raw.content : {};
  const rareBooks = sanitizeBooks(content.rareBooks);
  const messages = sanitizeMessages(content.messages);
  const assets = sanitizeAssets(raw.assets);

  if (!rareBooks.length && !messages.it.length && !Object.keys(assets).length) return null;

  return { id, name, version, author, description, content: { rareBooks, messages }, assets };
}

function sanitizeBooks(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const b of list) {
    if (out.length >= MAX_BOOKS) break;
    if (!b || typeof b !== 'object') continue;
    const id = typeof b.id === 'string' ? b.id.trim() : '';
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(id)) continue;
    if (seen.has(id)) continue;
    const it = b.it && typeof b.it === 'object' ? b.it : {};
    const en = b.en && typeof b.en === 'object' ? b.en : {};
    const titleIt = typeof it.title === 'string' ? it.title.slice(0, 80) : '';
    const titleEn = typeof en.title === 'string' ? en.title.slice(0, 80) : '';
    if (!titleIt && !titleEn) continue;
    seen.add(id);
    out.push({
      id,
      it: { title: titleIt || titleEn, desc: typeof it.desc === 'string' ? it.desc.slice(0, 200) : '' },
      en: { title: titleEn || titleIt, desc: typeof en.desc === 'string' ? en.desc.slice(0, 200) : '' },
      cover: typeof b.cover === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(b.cover) ? b.cover : '#5b6bbf',
      glyph: typeof b.glyph === 'string' && b.glyph.length <= 4 ? b.glyph : '✦',
      mod: true,
    });
  }
  return out;
}

function sanitizeMessages(msgs) {
  const out = { it: [], en: [] };
  if (!msgs || typeof msgs !== 'object') return out;
  ['it', 'en'].forEach((lang) => {
    const arr = Array.isArray(msgs[lang]) ? msgs[lang] : [];
    out[lang] = arr
      .filter((m) => typeof m === 'string' && m.trim())
      .map((m) => m.trim().slice(0, 200))
      .slice(0, MAX_MESSAGES);
  });
  return out;
}

function sanitizeAssets(assets) {
  const out = {};
  if (!assets || typeof assets !== 'object') return out;
  for (const [key, svg] of Object.entries(assets)) {
    if (Object.keys(out).length >= 32) break;
    if (typeof key !== 'string' || !/^[a-z0-9][a-z0-9-]{0,38}$/.test(key)) continue;
    if (typeof svg !== 'string') continue;
    if (svg.length > MAX_SVG_BYTES) continue;
    // Solo SVG minimale: nessun event handler, nessun script.
    if (!/^\s*<svg[\s>]/i.test(svg)) continue;
    if (/<script|on\w+\s*=|javascript:/i.test(svg)) continue;
    out[key] = svg;
  }
  return out;
}

/**
 * Carica un *.luminapack da ArrayBuffer/Blob/stringa JSON.
 * Ritorna { ok, pack?|error }
 */
export async function loadPack(input) {
  try {
    if (typeof input === 'string') {
      // raw JSON (comodità test / drop singolo file JSON)
      let parsed;
      try { parsed = JSON.parse(input); } catch { return { ok: false, error: 'invalid' }; }
      const pack = validatePack(parsed);
      return pack ? { ok: true, pack } : { ok: false, error: 'invalid' };
    }

    let buf;
    if (input instanceof ArrayBuffer) buf = input;
    else if (input && typeof input.arrayBuffer === 'function') buf = await input.arrayBuffer();
    else return { ok: false, error: 'unsupported' };

    if (buf.byteLength > MAX_PACK_BYTES) return { ok: false, error: 'tooLarge' };

    // Prova ZIP; se fallisce, prova come testo JSON
    try {
      const entries = await zipRead(buf);
      const texts = zipEntriesToTexts(entries);
      const jsonEntry = texts.find((t) => t.name === 'pack.json' || t.name.endsWith('/pack.json'));
      if (!jsonEntry) return { ok: false, error: 'noPackJson' };
      let parsed;
      try { parsed = JSON.parse(jsonEntry.text); } catch { return { ok: false, error: 'invalid' }; }

      // Assets SVG dallo zip
      const assets = {};
      texts.forEach((t) => {
        if (!/\.svg$/i.test(t.name)) return;
        const key = t.name.replace(/^.*\//, '').replace(/\.svg$/i, '');
        if (/^[a-z0-9][a-z0-9-]{0,38}$/.test(key)) assets[key] = t.text;
      });
      if (parsed && typeof parsed === 'object' && !parsed.assets) parsed.assets = assets;
      else if (parsed && typeof parsed === 'object' && parsed.assets && typeof parsed.assets === 'object') {
        Object.assign(parsed.assets, assets);
      }

      const pack = validatePack(parsed);
      return pack ? { ok: true, pack } : { ok: false, error: 'invalid' };
    } catch (zipErr) {
      if (zipErr && zipErr.message === 'not-a-zip') {
        const text = new TextDecoder().decode(new Uint8Array(buf));
        return loadPack(text);
      }
      return { ok: false, error: zipErr?.message || 'invalid' };
    }
  } catch {
    return { ok: false, error: 'invalid' };
  }
}

// ---- Persistenza pack attivi (localStorage, chiave dedicata) ----
const LS_KEY = 'lumina-packs-v1';

export function listPacks() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((p) => validatePack(p)).filter(Boolean);
  } catch {
    return [];
  }
}

export function savePacks(packs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(packs));
    return true;
  } catch {
    return false;
  }
}

export function addPack(pack) {
  const valid = validatePack(pack);
  if (!valid) return { ok: false, error: 'invalid' };
  const packs = listPacks().filter((p) => p.id !== valid.id);
  packs.push(valid);
  const okSave = savePacks(packs);
  return okSave ? { ok: true, pack: valid } : { ok: false, error: 'storage' };
}

export function removePack(id) {
  const packs = listPacks().filter((p) => p.id !== id);
  return savePacks(packs);
}

/**
 * Applica i pack attivi sovrapponendoli a un content base validato.
 * Pure: non tocca CONTENT globale (il chiamante decide).
 */
export function applyPacks(baseContent, packs) {
  if (!baseContent || typeof baseContent !== 'object') return baseContent;
  const list = Array.isArray(packs) ? packs.map((p) => validatePack(p)).filter(Boolean) : [];
  if (!list.length) return baseContent;

  const copy = structuredClone(baseContent);
  const known = new Set((copy.rareBooks || []).map((b) => b.id));
  const messages = {
    it: [...(copy.messages?.it || [])],
    en: [...(copy.messages?.en || [])],
  };

  list.forEach((pack) => {
    (pack.content.rareBooks || []).forEach((b) => {
      if (known.has(b.id)) return;
      known.add(b.id);
      copy.rareBooks.push(b);
    });
    messages.it.push(...pack.content.messages.it);
    messages.en.push(...pack.content.messages.en);
    if (messages.it.length > 128) messages.it = messages.it.slice(-128);
    if (messages.en.length > 128) messages.en = messages.en.slice(-128);
    if (!copy.modAssets) copy.modAssets = {};
    Object.assign(copy.modAssets, pack.assets);
  });

  copy.messages = messages;
  copy.modPackIds = list.map((p) => p.id);
  return copy;
}
