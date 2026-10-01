/* scena.js — i testi: formattazione, scelte, ascolto e rinnovo.
 *
 * Qui dentro non c'è nessun DOM. Il markup dei testi è minimo e chiuso:
 *
 *   {a} {b} {c} {d}   una voce colorata (chi parla, il colore, il male, la terra)
 *   > righe           un verso: va in corsivo e va a capo
 *   riga vuota        un cambio di paragrafo
 *
 * Tutto il resto viene passato attraverso escapeHtml: il contenuto di
 * story.json finisce in innerHTML, e non mi va di imparare cosa succede
 * quando qualcuno ci mette una maiuscola.
 *
 * E qui dentro c'è anche `visibile()`, che è la cosa che rende vera una
 * telenovela: le scelte scrivono flag, i flag decidono che battute esistono.
 * Senza, una scelta è un turno sprecato.
 */
(function () {
'use strict';

const CLASSI = { a: 'a', b: 'b', c: 'c', d: 'd' };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Le voci colorate.
 *
 * Il testo viene prima scappato, poi passato una volta sola: a ogni `{a}` si
 * apre uno span, a ogni `}` si chiude. Il nome della classe viene da una
 * tabella fissa, quindi dal contenuto di story.json non può uscire nient'altro
 * che quattro lettere: è l'unico punto in cui qui si genera markup.
 */
function colora(testo) {
  let fuori = '';
  let aperto = false;
  const chiudi = () => { if (aperto) { fuori += '</span>'; aperto = false; } };

  /* Un solo cammino sul testo, carattere per carattere. Si scappa ogni
   * pezzo di prosa prima di scriverlo: così nessuna graffa, nessuna
   * parentesi angolare e nessun `&` del contenuto di story.json può mai
   * finire dentro un tag. L'unico markup che esce da qui sono i quattro
   * span, e il nome della loro classe viene da una tabella fissa. */
  const sorgente = String(testo);
  let i = 0;
  while (i < sorgente.length) {
    const c = sorgente[i];

    /* `{a}` apre una voce. */
    if (c === '{' && /^[abcd]$/.test(sorgente[i + 1] || '') && sorgente[i + 2] === '}') {
      chiudi();
      fuori += `<span class="${CLASSI[sorgente[i + 1]]}">`;
      aperto = true;
      i += 3;
      continue;
    }

    /* `{/}` chiude la voce aperta. È la forma che i testi usano, perché
     * «{c}Il Commiato{/}» si legge come se la seconda lettera fosse un colore
     * e non una chiusura — e in un testo pieno di nomi propri, succede. */
    if (c === '{' && sorgente[i + 1] === '/' && sorgente[i + 2] === '}') {
      chiudi();
      i += 3;
      continue;
    }

    if (c === '}') {
      if (aperto) { fuori += '</span>'; aperto = false; }
      else fuori += '}';
      i++;
      continue;
    }

    /* prosegue fino al prossimo carattere di controllo; parte da i+1 perché
     * qui si arriva solo con una `{` che non ha aperto niente, e ripartire
     * da i sarebbe un ciclo infinito */
    let j = i + 1;
    while (j < sorgente.length && sorgente[j] !== '{' && sorgente[j] !== '}') j++;
    fuori += escapeHtml(sorgente.slice(i, j));
    i = j;
  }
  chiudi();
  return fuori;
}

/* Un a capo fra due righe normali è un <br>; dentro un verso no, perché il
 * verso va a capo da solo. */
function blocco(righe, { verso }) {
  const parti = righe.map((r) => (verso ? r.slice(1).replace(/^ /, '') : r));
  return verso
    ? `<span class="verso">${colora(parti.join('\n')).replace(/\n/g, '<br>')}</span>`
    : colora(parti.join('\n')).replace(/\n/g, '<br>');
}

/** HTML di un blocco di testo, pronto per il DOM. */
function format(testo) {
  const righe = String(testo).split('\n');
  const out = [];
  let paragrafo = [];
  const chiudi = () => {
    if (!paragrafo.length) return;
    const verso = paragrafo.every((r) => r.startsWith('>'));
    out.push(blocco(paragrafo, { verso }));
    paragrafo = [];
  };
  for (const r of righe) {
    if (!r.trim()) chiudi();
    else paragrafo.push(r);
  }
  chiudi();
  return out.join('\n');
}

/** Testo pulito per la lettura ad alta voce: niente markup, niente versi. */
function semplifica(testo) {
  const righe = String(testo).split('\n');
  const parti = [];
  for (let i = 0; i < righe.length; i++) {
    let r = righe[i].trim();
    if (!r) continue;
    r = r.replace(/^>\s?/, '');
    r = r.replace(/\{\/?[abcd]\}/g, '').replace(/\{\/\}/g, '');
    r = r.replace(/[*_`«»]/g, '');
    parti.push(/[.!?…]$/.test(r) ? r : `${r}.`);
  }
  return parti.join(' ');
}

/* ── il branch: i flag decidono che cosa esiste ──────────── */

/**
 * Una condizione è un oggetto piatto `{flag: valore}`. Tutte le coppie devono
 * valere: è un "e", e un "e" si legge. Una condizione vuota è sempre vera,
 * così `se: {}` non spegne niente e `undefined` non spegne niente.
 *
 * Funzione pura e senza sapere nulla della storia: se il flag non c'è, la
 * condizione non vale. È deliberato — se la dimentichi, la battuta sparisce e
 * te ne accorgi giocando, che è molto meglio che leggerla e non capire perché.
 */
function visibile(cond, salva) {
  if (!cond || typeof cond !== 'object') return true;
  const s = (salva && salva.scelte) || {};
  for (const k of Object.keys(cond)) {
    if (s[k] !== cond[k]) return false;
  }
  return true;
}

/* Le battute di una scena che spettano a questa partita, nell'ordine in cui
 * vanno lette. È l'unico posto in cui il testo viene filtrato, e quindi
 * l'unico posto in cui un atto può essere due atti diversi. */
function battuteVisibili(scena, salva) {
  if (!scena || !scena.battute) return [];
  return scena.battute.filter((b) => visibile(b.se, salva));
}

/* Le scelte di una scena che spettano a questa partita. */
function scelteVisibili(scena, salva) {
  if (!scena || !scena.scelte) return [];
  return scena.scelte.filter((c) => visibile(c.se, salva));
}

/* ── scelte ──────────────────────────────────────────────── */

/**
 * Applica una scelta. Restituisce un resoconto, così la UI può dire ad alta
 * voce che cosa è successo: è la parte che il giocatore deve capire.
 *
 * Una scelta che costa una scheda che non hai più non ti blocca: semplicemente
 * non costa niente, con una nota che lo dice. Il gioco non deve mai
 * bloccarsi per colpa di una scelta presa tre atti fa.
 */
function applicaScelta(salva, scelta, defs) {
  const Mem = window.FSTMemoria;
  const messaggi = [];
  const trovate = [];
  if (!scelta) return { messaggi, trovate };

  if (scelta.imposta) {
    for (const k of Object.keys(scelta.imposta)) {
      salva.scelte[k] = scelta.imposta[k];
      /* QUANDO è stato scritto, non solo che cosa. Senza questo un flag non
       * ha età: si sa che esiste, non da quanto, e la domanda «questa scelta
       * ritornerà?» non ha risposta. Un flag che nessuno rilegge è una scelta
       * che il gioco ha finto di chiederti. */
      if (!salva.scelteAl) salva.scelteAl = {};
      if (salva.scelteAl[k] === undefined) salva.scelteAl[k] = salva.atto || null;
    }
  }
  for (const id of scelta.costa || []) {
    if (!Mem.ha(salva, id)) {
      messaggi.push({ tipo: 'nota', testo: 'Non te lo ricordavi più: non è costato niente.' });
      continue;
    }
    Mem.brucia(salva, [id]);
    const def = defs.find((d) => d.id === id);
    messaggi.push({ tipo: 'costo', testo: `Non ricordi più: ${def ? def.titolo.toLowerCase() : id}.` });
  }
  /* Una scheda che non esiste non entra nel Mazzetto: aggiungerebbe un id
   * che nessuno sa disegnare, e il Mazzetto mostrerebbe un fiore vuoto. */
  for (const id of scelta.dai || []) {
    const def = defs.find((d) => d.id === id);
    if (!def) {
      messaggi.push({ tipo: 'nota', testo: 'Non ricordi niente di nuovo, in realtà.' });
      continue;
    }
    Mem.trova(salva, id);
    trovate.push(id);
    messaggi.push({ tipo: 'dono', testo: `Ti torna: ${def.titolo.toLowerCase()}.` });
  }
  return { messaggi, trovate };
}

/* ── i nodi di un atto ───────────────────────────────────── */

/**
 * La sequenza di un atto: le scene del prima, l'orto, le scene del dopo.
 * Un atto senza `dopo` finisce col finale.
 */
function nodi(atto) {
  const out = [];
  for (const s of atto.scena || []) out.push({ tipo: 'scena', id: s.id, scena: s, fase: 'prima' });
  if (atto.combattimento) out.push({ tipo: 'orto', id: atto.combattimento });
  for (const s of atto.dopo || []) out.push({ tipo: 'scena', id: s.id, scena: s, fase: 'dopo' });
  return out;
}

/* ── Annusa ──────────────────────────────────────────────── */

/**
 * Rileggere un ricordo non costa niente ed è la parte più bella del gioco:
 * ti fa vedere, dopo che hai dato metà del mondo al terreno, che cosa ti resta
 * e com'è. Non dà vantaggi. Dà solo quello che ti spetta.
 */
function annusa(salva, defs, rng = Math.random) {
  const Mem = window.FSTMemoria;
  const carte = Mem.schede(defs, salva);
  if (!carte.length) return null;
  return carte[Math.floor(rng() * carte.length) % carte.length];
}

/* ── Rinnova ─────────────────────────────────────────────── */

/**
 * Tornare a cercare un ricordo bruciato. Si paga con il ricordo più fresco:
 * è l'unico scambio possibile in questo gioco, e non è mai vantaggioso, è
 * solo onesto — si dà una cosa recentissima per riaverne una vecchia.
 */
function rinnovoPossibile(salva, defs, atto) {
  const Mem = window.FSTMemoria;
  if (!Mem.schedaDaRiafferrare(salva)) return { ok: false, motivo: 'Non c\'è niente che sia andato perso per davvero.' };
  if (salva.memoria.length < 2) return { ok: false, motivo: 'Ti resterebbe un ricordo solo. Non si può.' };
  if (giàUsato(salva, atto)) return { ok: false, motivo: 'Hai già rinnovato in questo atto.' };
  return { ok: true };
}

const chiaveRinnovo = (atto) => `rinnovo_${atto}`;

function giàUsato(salva, atto) {
  return !!salva.scelte[chiaveRinnovo(atto)];
}

function segnaRinnovo(salva, atto) {
  salva.scelte[chiaveRinnovo(atto)] = Date.now();
}

/** Il giocatore ha indicato il fiore con cui pagare. */
function rinnovo(salva, defs, atto, idDaPagare) {
  const Mem = window.FSTMemoria;
  const via = rinnovoPossibile(salva, defs, atto);
  if (!via.ok) return via;
  if (!Mem.ha(salva, idDaPagare)) return { ok: false, motivo: 'Non ce l\'hai, quello.' };
  const riacquistato = Mem.schedaDaRiafferrare(salva);
  if (!riacquistato) return { ok: false, motivo: 'Non c\'è niente da riavere.' };
  Mem.brucia(salva, [idDaPagare]);
  Mem.riafferra(salva, riacquistato);
  segnaRinnovo(salva, atto);
  const perdi = defs.find((d) => d.id === idDaPagare);
  const riguadagni = defs.find((d) => d.id === riacquistato);
  return {
    ok: true,
    riacquistato,
    perso: idDaPagare,
    testo: `Non ricordi più: ${perdi ? perdi.titolo.toLowerCase() : idDaPagare}.\nTi torna: ${riguadagni ? riguadagni.titolo.toLowerCase() : riacquistato}.`,
  };
}

window.FSTScena = {
  format, semplifica, escapeHtml, applicaScelta, nodi,
  visibile, battuteVisibili, scelteVisibili,
  annusa, rinnovo, rinnovoPossibile, giàUsato, segnaRinnovo,
  CLASSI,
};
})();
