/* epitaffio.js — alla fine della partita il gioco scrive il tuo epitaffio.
 *
 * Non è un testo prefabbricato: è una piccola grammatica che incrocia che cosa
 * hai scelto di tenere e che cosa hai scelto di bruciare. Due partite diverse
 * danno due epitaffi diversi; la stessa partita ne dà sempre lo stesso.
 *
 * Funzione pura: prende un oggetto, restituisce stringhe. Testabile senza DOM.
 */
(function () {
'use strict';

/* Ordine di tenerezza: quando devi scegliere chi nominare, comincia da qui.
 * È anche l'ordine con cui il Quaderno è nato, quindi chi è stato perso per
 * primo è il primo ricordato. */
const PRIORITA = ['tecla', 'madre', 'ansi', 'aurelio', 'brizio', 'donata', 'ada'];
const NOME_PERSONA = {
  tecla: 'Tecla',
  madre: 'sua madre',
  ansi: 'Ansi',
  aurelio: 'il maestro',
  brizio: 'Brizio',
  donata: 'Donata',
  ada: 'sé stessa',
};

const APERTURE = {
  voce: [
    'Qui riposa Ada Sartori, che ha finito il quadro e si è ricordata di tutto.',
    'Qui riposa Ada Sartori, che ha lasciato la tela storta e la memoria dritta.',
    'Qui riposa Ada Sartori, che sapeva ancora il nome di ogni cosa.',
  ],
  studio: [
    'Qui riposa Ada Sartori, che ha finito il cielo prima del viso.',
    'Qui riposa Ada Sartori, che ha lasciato lo schizzo a chi legge dopo.',
  ],
  calore: [
    'Qui riposa Ada Sartori, che non ricorda le parole e ricorda il caldo.',
    'Qui riposa Ada Sartori, che ha perso il dizionario e tenuto la musica.',
  ],
  cielo: [
    'Qui riposa Ada Sartori, che ha perso il nome di tutti e ha salvato il cielo.',
    'Qui riposa Ada Sartori, che non sa più chi era e cosa stava facendo.',
  ],
  cenere: [
    'Qui riposa Ada Sartori. Di lei resta il buco nella parete dove stava la tela.',
    'Qui riposa Ada Sartori, che ha finito il quadro e non ha finito sé.',
  ],
};

const CONCLUSIONI = {
  voce: [
    'Non dipingeva per gli altri. Dipingeva perché il cielo era a metà.',
    'Morì guardando il cielo, che era la parte più facile da rifinire.',
  ],
  studio: [
    'Aurelio le aveva lasciato il cielo. Lei glielo ha restituito, e lui lo ha visto.',
    'Non fu un addio. Fu un cambio di turno: adesso guarda lui, dall\'altra parte.',
  ],
  calore: [
    'Non tornò. Tornò la stanza, un po\' più chiara.',
    'La chiamavano Ada. Lei rispondeva, ogni volta, con un attimo di ritardo.',
  ],
  cielo: [
    'Il cielo è finito. Il viso, mai. Va bene così: era il cielo che guardava lui.',
    'Rimase una finestra. È la parte di lei che non aveva bisogno di essere ricordata.',
  ],
  cenere: [
    'Il Male ha vinto. Ha vinto per quattro mesi, poi ha perso la memoria di sé.',
    'La tela è ancora lì. Non la guarda nessuno, e non sa più nemmeno lei.',
  ],
};

/* Frasi speciali: si aggiungono solo se la condizione si è davvero verificata. */
const NOTA_TECLA = 'Tenne la voce di Tecla: la prova che l\'amore non è un effetto dell\'inchiostro.';
const NOTA_FRAGMENTI = (n) => `Raccolse ${n} schizzi di cielo. Erano di un uomo che non smetteva di iniziare.`;
const NOTA_NIEN_BRUC = 'Non bruciò niente: finì il quadro intero e ci rimise la vita.';
const NOTA_TUTTE = 'Non tenne niente, ma non le costò niente: erano tutte cose sue.';

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

/* I titoli delle schede sono già frasi con articolo ("la voce di Tecla
 * quando ride"): si possono elencare così come sono. */
function frase(c) {
  return c.nome || c.titolo;
}

/**
 * @param {object} o
 * @param {object[]} o.tenute     schede rimaste
 * @param {object[]} o.bruciate   schede bruciate
 * @param {string}   o.finale     chiave del finale (voce|studio|calore|cielo|cenere)
 * @param {number}   o.frammenti  schizzi di cielo raccolti
 * @param {string}   o.nome       nome del protagonista (default Ada Sartori)
 * @param {function} o.rng         () => [0,1)
 * @returns {{righe: string[], frasi: string[], finale: string, tenute: number, bruciate: number}}
 */
function componi(o = {}) {
  const rng = o.rng || Math.random;
  const nome = o.nome || 'Ada Sartori';
  const tenute = ordina(o.tenute || []);
  const bruciate = ordina(o.bruciate || []);
  const finale = APERTURE[o.finale] ? o.finale : 'calore';
  const frammenti = Number(o.frammenti) || 0;

  const righe = [];

  /* 1. Apertura. Se il finale è "voce" e il nome del protagonista è cambiato
   *    lo rispetta: è una parte dell'epitaffio, non un dettaglio. */
  righe.push(scegli(APERTURE[finale], rng).replace('Ada Sartori', nome));

  /* 2. Cosa è stato tolto. I primi due per priorità di tenerezza. */
  if (bruciate.length) {
    righe.push(`Tolse dal mondo: ${lista(bruciate.slice(0, 3).map(frase))}.`);
  } else {
    righe.push(NOTA_NIEN_BRUC);
  }

  /* 3. Cosa è rimasto: qui l'ordine è invertito, per non ripetere la coppia
   *    dell'inizio. È il punto in cui l'epitaffio diventa una persona. */
  if (tenute.length) {
    const scelte = [...tenute].reverse().slice(0, 3).map(frase);
    righe.push(`Tenne: ${lista(scelte)}.`);
  } else {
    righe.push(NOTA_TUTTE);
  }

  /* 4. Note condizionali. Gli schizzi si dichiarano solo tutti e quattro:
   * due schizzi sciolti non sono un cielo, sono carta, e dirlo qui
   * risparmierebbe al lettore una delusione che già si è presa. */
  if (frammenti >= 4) righe.push(NOTA_FRAGMENTI(frammenti));
  if (tenute.some((c) => c.persona === 'tecla')) righe.push(NOTA_TECLA);

  /* 5. Conclusione. */
  righe.push(scegli(CONCLUSIONI[finale], rng));

  return {
    finale: o.finale || finale,
    righe,
    frasi: righe,
    tenute: tenute.length,
    bruciate: bruciate.length,
  };
}

/* Testo pronto da stampare sulla schermata finale. */
function testo(e) {
  return (e.righe || []).join('\n\n');
}

/* Frase riassuntiva per l'elenco degli epitaffi già letti. */
function riassunto(e) {
  return (e.righe && e.righe[0]) || 'Qui riposa Ada Sartori.';
}

window.PMFEpitaffio = { componi, testo, riassunto, lista, ordina, PRIORITA, NOME_PERSONA, APERTURE, CONCLUSIONI };
})();