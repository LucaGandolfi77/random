// Accessibilità avanzata (Fase 3): descrizione stanza SR, comandi vocali.

/** Testo descrittivo della stanza per screen-reader (una stringa). */
export function describeRoom(state, t) {
  const lang = state.settings?.lang === 'en' ? 'en' : 'it';
  const room = state.room || 'hall';
  const roomLabel = {
    it: { hall: 'Aula Centrale', attic: 'Soppalco', winterGarden: 'Giardino d\'Inverno' },
    en: { hall: 'Main Hall', attic: 'Attic', winterGarden: 'Winter Garden' },
  }[lang][room] || room;

  const lit = (state.lanterns || []).filter(Boolean).length;
  const parts = {
    it: [
      `${roomLabel}.`,
      `Luce ${Math.round(state.resources?.luce ?? 0)}, Calma ${Math.round(state.resources?.calma ?? 0)}, Inchiostro ${Math.round(state.resources?.inchiostro ?? 0)}.`,
      `${lit} lanterne accese.`,
      `${state.booksOnTable ?? 0} libri sul tavolo.`,
      state.readerActive ? 'Un lettore aspetta.' : 'Nessun lettore in attesa.',
      state.event ? `Evento: ${state.event.type}.` : '',
    ],
    en: [
      `${roomLabel}.`,
      `Light ${Math.round(state.resources?.luce ?? 0)}, Calm ${Math.round(state.resources?.calma ?? 0)}, Ink ${Math.round(state.resources?.inchiostro ?? 0)}.`,
      `${lit} lanterns lit.`,
      `${state.booksOnTable ?? 0} books on the table.`,
      state.readerActive ? 'A reader is waiting.' : 'No reader waiting.',
      state.event ? `Event: ${state.event.type}.` : '',
    ],
  }[lang];

  return parts.filter(Boolean).join(' ');
}

/**
 * Mappa comandi vocali (IT/EN) → azioni data-action.
 * Ritorna { action, dataset? } oppure null.
 * Nessun ML: matching su sinonimi fissi.
 */
export function parseVoiceCommand(transcript) {
  const raw = String(transcript || '').toLowerCase().trim();
  if (!raw) return null;

  const rules = [
    { action: 'lantern', re: /\b(lanterna[s]?|lanterne|lanterns?|luce|light)\b/ },
    { action: 'tea', re: /\b(tè|te|tea|bollitore|kettle)\b/ },
    { action: 'reader', re: /\b(lettore|reader|ospite|guest|welcome)\b/ },
    { action: 'shelve', re: /\b(libri?|books?|riponi|riponi|shelve|scaffale|shelf)\b/ },
    { action: 'catalog', re: /\b(catalog|cataloga|collezione|collection)\b/ },
    { action: 'help', re: /\b(aiuto|help|come si gioca)\b/ },
    { action: 'settings', re: /\b(impostazioni|settings|opzioni|options)\b/ },
    { action: 'save', re: /\b(salva|save|salvataggio)\b/ },
    { action: 'collect-fallen', re: /\b(caduto|fallen|raccogli|pick up)\b/ },
    { action: 'switch-room', re: /\b(soppalco|attic)\b/, dataset: { room: 'attic' } },
    { action: 'switch-room', re: /\b(giardino|garden|inverno|winter)\b/, dataset: { room: 'winterGarden' } },
    { action: 'switch-room', re: /\b(aula|hall|centrale|main)\b/, dataset: { room: 'hall' } },
    { action: 'sort-archive', re: /\b(archivi|archive|riordina|sort)\b/ },
    { action: 'tend-plants', re: /\b(serre|plants|piante|greenhouse|cura)\b/ },
  ];

  for (const r of rules) {
    if (r.re.test(raw)) {
      return { action: r.action, dataset: r.dataset || {} };
    }
  }
  return null;
}

/**
 * Avvia il riconoscimento vocale (progressive enhancement).
 * Ritorna stop() oppure null se non supportato/disabilitato.
 */
export function startVoiceCommands({ onCommand, lang = 'it', onError } = {}) {
  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = lang === 'en' ? 'en-US' : 'it-IT';
  rec.continuous = true;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    if (!last || !last.isFinal) return;
    const transcript = last[0]?.transcript || '';
    const cmd = parseVoiceCommand(transcript);
    if (cmd && onCommand) onCommand(cmd, transcript);
  };
  rec.onerror = (e) => {
    if (onError) onError(e?.error || 'error');
  };
  rec.onend = () => {
    // riavvio leggero se ancora attivo
    if (startVoiceCommands._active === rec) {
      try { rec.start(); } catch { /* already started */ }
    }
  };

  startVoiceCommands._active = rec;
  try {
    rec.start();
  } catch {
    return null;
  }

  return function stop() {
    if (startVoiceCommands._active === rec) startVoiceCommands._active = null;
    try { rec.stop(); } catch { /* ok */ }
    try { rec.abort(); } catch { /* ok */ }
  };
}

export function stopVoiceCommands(stopFn) {
  if (typeof stopFn === 'function') stopFn();
}
