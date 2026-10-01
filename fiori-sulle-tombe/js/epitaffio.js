/* epitaffio.js — alla fine della partita il gioco scrive il tuo epitaffio.
 *
 * Non è un testo prefabbricato: è una piccola grammatica che incrocia che cosa
 * hai scelto di tenere e che cosa hai scelto di dare in pasto alla terra. Due
 * partite diverse danno due epitaffi diversi; la stessa partita ne dà sempre
 * lo stesso.
 *
 * E poi, sotto l'epitaffio, c'è la puntata: il titolo dell'ultima puntata, la
 * logline, e il destino di ognuno dei sette. Il destino è l'arc[o] della
 * persona letto dalla partita — nessun testo prefabbricato, nessuna tabella
 * scritta a mano per ogni possibile fine.
 *
 * Funzione pura: prende un oggetto, restituisce stringhe. Testabile senza DOM.
 */
(function () {
'use strict';

/* Ordine di tenerezza: quando devi scegliere chi nominare, comincia da qui.
 * È anche l'ordine con cui il Mazzetto è nato, quindi chi è stato perso per
 * primo è il primo ricordato. */
const PRIORITA = ['sauro', 'orielia', 'betta', 'ansi', 'nadia', 'donata', 'brizio'];
const NOME_PERSONA = {
  sauro: 'Sauro',
  orielia: 'Orielia',
  betta: 'Betta',
  ansi: 'Anselmo',
  nadia: 'sé stessa',
  donata: 'Donata',
  brizio: 'Brizio',
};

const APERTURE = {
  giardino: [
    'Qui riposa Nadia Ferro, che ha fatto crescere il giardino e non si è accorta di essere morta.',
    'Qui riposa Nadia Ferro, che ha seminato per tutti e ha tenuto la terra per sé.',
  ],
  vigna: [
    'Qui riposa Nadia Ferro, e il giardino ha ancora dei buchi.',
    'Qui riposa Nadia Ferro, che ha fatto fiorire quasi tutto e ha contato le macchie.',
  ],
  prato: [
    'Qui riposa Nadia Ferro, che non ricorda i nomi e ha ricordato il verde.',
    'Qui riposa Nadia Ferro, che ha perso il dizionario e tenuto la stagione.',
  ],
  spoglio: [
    'Qui riposa Nadia Ferro, che ha una persona sola e non è nemmeno lei.',
    'Qui riposa Nadia Ferro. Resta un nome, e non è il suo.',
  ],
  terra: [
    'Qui riposa Nadia Ferro. Di lei resta l\'aiuola, che è la cosa più grande che resti.',
    'Qui riposa Nadia Ferro, che ha dato tutto e non ha tenuto niente, nemmeno sé.',
  ],
};

const CONCLUSIONI = {
  giardino: [
    'Il giardino è pieno. E va tutto bene: è questo il punto, e ci si arriva solo così.',
    'Non l\'ha sconfitto nessuno. L\'ha fatto crescere, e crescere è l\'unica cosa che si vince davvero.',
  ],
  vigna: [
    'Manca un angolo. Quell\'angolo era lei, e ora è terra buona per qualcun altro.',
    'I buchi si vedono solo d\'estate, quando la luce arriva bassa. E va bene così.',
  ],
  prato: [
    'Non tornò. Tornò il prato, un po\' più verde, e la gente non chiese perché.',
    'La chiamavano Nadia. Lei rispondeva, ogni volta, con un attimo di ritardo.',
  ],
  spoglio: [
    'Una persona sola, e un nome che non è il suo. È una fine, e non è la peggiore.',
    'Rimase un vaso. Va bene così: era il vaso, non lei, a essere importante.',
  ],
  terra: [
    'Tutto è fiorito. E chi ti amava ti ha dimenticata in modo caldo, come si dimentica un buon odore.',
    'La terra ha preso tutto, anche l\'ultimo pezzo. Non c\'è rimasto niente da cui tornare: ed è la fine più onesta che esista.',
  ],
};

/* Frasi speciali: si aggiungono solo se la condizione si è davvero verificata. */
const NOTA_SAURO = (stato) => (stato >= 2
  ? 'Lo ha saputo che era lui, e ha finito lo stesso: era l\'unico giardino che le restasse da chiudere.'
  : 'Non lo ha mai saputo chi era, l\'uomo sotto l\'aiuola. Ha nutrito pezzi di lui per quattro atti.');
const NOTA_PETALI = (n) => (n >= 6
  ? `Sei passata in tutti e sei i vasi. Un petalo per persona, e alla fine i petali erano di chi non poteva portarli.`
  : `Hai riempito ${n} vasi su sei. Gli altri sono ancora terra, e la terra aspetta.`);

/* La promessa: è l'unica nota che cambia a seconda di quello che hai scelto
 * e mantenuto, e per questo sta qui e non in un finale. Una scelta che non si
 * vede da nessuna parte è una scelta che non hai fatto. */
const NOTA_PROMESSA = (mantenuta) => (mantenuta
  ? 'Hai mantenuto la promessa. È l\'unica cosa che ha contato, e nessuno se n\'è accorto tranne te.'
  : 'Non hai mantenuto la promessa. Te lo dice una lapide, che è il posto giusto per dirselo.');

function scegli(arr, rng) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/* Ordina per priorità di tenerezza, poi per ordine di arrivo (stabile). */
function ordina(cards) {
  return [...cards].sort((a, b) => {
    const pa = PRIORITA.indexOf(a.persona);
    const pb = PRIORITA.indexOf(b.persona);
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  });
}

/* Elenco di nomi, con l'ultimo congiunto da "e". */
function lista(frasi) {
  if (!frasi.length) return '';
  if (frasi.length === 1) return frasi[0];
  if (frasi.length === 2) return `${frasi[0]} e ${frasi[1]}`;
  return `${frasi.slice(0, -1).join(', ')} e ${frasi[frasi.length - 1]}`;
}

/* I titoli delle schede sono già frasi con articolo ("la rosa di Betta"): si
 * possono elencare così come sono. */
function frase(c) {
  return c.nome || c.titolo;
}

/**
 * @param {object} o
 * @param {object[]} o.tenute     schede rimaste
 * @param {object[]} o.bruciate   schede bruciate
 * @param {string}   o.finale     chiave del finale (giardino|vigna|prato|spoglio|terra)
 * @param {number}   o.petali     vasi riempiti
 * @param {number}   o.statoSauro arco del giardino
 * @param {boolean}  o.promessa   promessa mantenuta
 * @param {string}   o.nome       nome della protagonista (default Nadia Ferro)
 * @param {function} o.rng         () => [0,1)
 * @returns {{righe: string[], frasi: string[], finale: string, tenute: number, bruciate: number}}
 */
function componi(o = {}) {
  const rng = o.rng || Math.random;
  const nome = o.nome || 'Nadia Ferro';
  const tenute = ordina(o.tenute || []);
  const bruciate = ordina(o.bruciate || []);
  const finale = APERTURE[o.finale] ? o.finale : 'prato';
  const petali = Number(o.petali) || 0;
  const statoSauro = Number(o.statoSauro) || 0;
  const promessa = !!o.promessa;

  const righe = [];

  /* 1. Apertura. Se il finale è "giardino" e il nome della protagonista è
   *    cambiato lo rispetta: è una parte dell'epitaffio, non un dettaglio. */
  righe.push(scegli(APERTURE[finale], rng).replace('Nadia Ferro', nome));

  /* 2. Che cosa hai fatto crescere. I primi tre per priorità di tenerezza. */
  if (bruciate.length) {
    righe.push(`Fece fiorire: ${lista(bruciate.slice(0, 3).map(frase))}.`);
  } else {
    righe.push('Non diede niente al terreno. Finì il giardino intero e ci rimise la vita.');
  }

  /* 3. Che cosa è rimasto per lei: qui l'ordine è invertito, per non ripetere
   *    la coppia dell'inizio. È il punto in cui l'epitaffio diventa una persona. */
  if (tenute.length) {
    const scelte = [...tenute].reverse().slice(0, 3).map(frase);
    righe.push(`Tenne: ${lista(scelte)}.`);
  } else {
    righe.push('Non tenne niente, ma non le costò niente: erano tutte cose sue.');
  }

  /* 4. Note condizionali. I petali si dichiarano tutti e sei: cinque vasi non
   *    sono un giardino, sono un orto, e dirlo qui risparmierebbe al lettore
   *    una delusione che già si è presa.
   *
   *    La nota del giardino esce SEMPRE, e in due forme opposte: sapere chi è
   *    sotto l'aiuola e non saperlo sono due finali diversi, e quello che non
   *    lo sa è il caso più importante — è l'unico in cui la nota dice che non
   *    hai mai saputo niente. Se la si dichiarasse solo quando hai saputo, la
   *    parte peggiore del gioco resterebbe muta. */
  if (petali > 0) righe.push(NOTA_PETALI(petali));
  righe.push(NOTA_SAURO(statoSauro));
  righe.push(NOTA_PROMESSA(promessa));

  /* 5. Conclusione. */
  righe.push(scegli(CONCLUSIONI[finale], rng));

  return {
    finale: o.finale || finale,
    righe,
    frasi: righe,
    tenute: tenute.length,
    bruciate: bruciate.length,
    petali,
  };
}

/* Testo pronto da stampare sulla schermata finale. */
function testo(e) {
  return (e.righe || []).join('\n\n');
}

/* Frase riassuntiva per l'elenco degli epitaffi già letti. */
function riassunto(e) {
  return (e.righe && e.righe[0]) || 'Qui riposa Nadia Ferro.';
}

/* ── la puntata: il destino di ognuno ────────────────────── */

/**
 * Il destino di una persona non è una tabella scritta a mano per ognuna delle
 * 27 terne possibili (3 stati × 9): è l'arc[o] di quella persona, letto dalla
 * partita, più la frase del finale. È così che sette persone con tre stati
 * ciascuna restano sette righe corte e leggibili.
 *
 * @param {object} persona  voce di story.json: {id, nome, ruolo, arco[3]}
 * @param {number} stato    0 | 1 | 2
 * @param {boolean} fiorito se gli hai riempito il vaso
 * @param {boolean} vivo    se gli resta almeno una scheda
 * @param {string} finale   chiave del finale, per la chiusura
 */
function destino(persona, { stato = 0, fiorito = false, vivo = true } = {}) {
  if (!persona || !persona.arco || !persona.arco.length) return null;
  const k = Math.max(0, Math.min(2, stato));
  let riga = persona.arco[k] || '';
  if (fiorito) riga += ' Il suo vaso è fiorito tutto insieme.';
  else if (!vivo) riga += ' Non le resta più niente da ricordare di lei.';
  return { id: persona.id, nome: persona.nome, ruolo: persona.ruolo || '', stato: k, testo: riga };
}

/**
 * I titoli di coda. `cast` è l'elenco di voci di story.json; `stati` è la mappa
 * id → {stato, fiorito, vivo}. Restituisce sempre sette righe, anche se una
 * persona non ha ancora un arco: meglio una riga grigia che uno buco nei
 * titoli di coda.
 */
function puntata(cast = [], stati = {}, finale = 'prato') {
  const out = [];
  for (const p of cast) {
    const s = stati[p.id] || {};
    const d = destino(p, s);
    out.push(d || { id: p.id, nome: p.nome, ruolo: p.ruolo || '', stato: s.stato || 0, testo: '' });
  }
  return out;
}

/* I titoli delle puntate: cambiano col finale, e sono la prima cosa che leggi
 * quando arrivi alla fine. */
const TITOLI = {
  giardino: ['IL GIARDINO — puntata ultima', 'LA PUNTATA CHE NON MANCA A NESSUNO'],
  vigna: ['IL BUCO NEL PRATO — puntata ultima', 'TUTTO QUANTO, MENO UN ANGOLO'],
  prato: ['IL PRATO — puntata ultima', 'TUTTA L\'ERBA, NESSUN NOME'],
  spoglio: ['UN VASO — puntata ultima', 'L\'UNICO NOME CHE RESTA, E NON È IL TUO'],
  terra: ['LA TERRA — puntata ultima', 'NESSUN PERSONAGGIO, E TUTTI I PERSONAGGI'],
};

function titoloPuntata(finale, rng) {
  const arr = TITOLI[finale] || TITOLI.prato;
  return scegli(arr, rng);
}

window.FSTEpitaffio = {
  componi, testo, riassunto, lista, ordina, destino, puntata, titoloPuntata,
  PRIORITA, NOME_PERSONA, APERTURE, CONCLUSIONI, TITOLI,
};
})();
