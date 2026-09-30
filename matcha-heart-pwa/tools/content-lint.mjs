/* content-lint.mjs — i gate automatici sui postscript delle lettere.
 *
 * Un modulo solo, due consumatori: la suite di test e tools/check.mjs.
 *
 * Perché esiste: il rischio maggiore di questa feature non è un bug, è
 * scrivere 190 postscript che dicono la stessa cosa con parole diverse. Il
 * gate "divergenza" lo rende rilevabile dalla macchina invece che dall'orecchio.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const GATES = {
  /* due varianti dello stesso episodio non possono condividere più del 60%
     delle parole di contenuto: oltre quella soglia sono la stessa frase riscritta */
  divergence: 0.60,
  minLen: 40,
  maxLen: 110,
  /* il Quaderno non chiama "rimpianti" le strade non percorse: nessun
     postscript può moralizzare sul cammino del giocatore */
  guiltWords: [
    'avresti dovuto', 'ti avevo avvertito', 'ti avevo detto', 'colpa',
    'peccato', 'hai sbagliato', 'errore tuo', 'avrei voluto che',
    'te l\'avevo detto', 'ti avvertivo', 'peccato tuo',
  ],
};

/* Stopword italiane: escludendole il confronto misura il contenuto, non la sintassi. */
const STOP = new Set(('a ad al allo ai alla alle ascolta ancora anche che chi ci coi col come con cui da dagli dai dal de della del dei di e ed è era essere fa fare fino fra gli grande ha hanno ho i il in io la le lei li lo loro ma me mi mia mie miei molto ne negli nei nel nella non nostro o per perché però più poi qual quale quando quanto quel quella quelle quello questa queste questi questo qui sara se sei senza si sia siamo solo sono sta stato su sua sue sui sul sulla suo te ti tra tu tua tuo tuoi tutti tutto un una uno vi via voi vostro era avrai avete').split(/\s+/));

const words = (text) => String(text)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s'’]/gu, ' ')
  .split(/\s+/)
  .filter((w) => w.length > 1 && !STOP.has(w));

/* Jaccard sulle parole di contenuto. */
export function jaccard(a, b) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size && !B.size) return 0;
  if (!A.size || !B.size) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/* Un postscript deve parlare della strada che il giocatore ha preso, non
   dell'altra. Confronto per prefisso di 4 caratteri così "versi" e "versare"
   si riconoscono: è un euristico che segnala, non un verdetto.
   Senza questo gate una polarità invertita passa i controlli precedenti:
   entrambi i testi sono validi, nello stesso registro, e divergenti. */
const stem = (w) => w.slice(0, 4);
/* quanti termini di contenuto dell'etichetta ricompaiono nel postscript */
export function echoScore(text, label) {
  const labelWords = [...new Set(words(label).map(stem))];
  const textWords = new Set(words(text).map(stem));
  let n = 0;
  for (const w of labelWords) if (textWords.has(w)) n++;
  return n;
}
export function echoes(text, label) {
  return echoScore(text, label) > 0;
}

const trunc = (t) => String(t || '').slice(0, 40);

/* Controlla i postscript di tutti gli episodi. `universes` è l'array di
   window.MHU.UNIVERSES. Restituisce un elenco di problemi, vuoto se tutto passa. */
export function lint(universes) {
  const problems = [];
  const stats = { postscripts: 0, episodesWithPs: 0 };

  for (const u of universes || []) {
    for (const ep of u.story || []) {
      const ps = ep.ps;
      if (!ps) continue;
      if (typeof ps !== 'object' || Array.isArray(ps)) {
        problems.push({ ep: ep.id, problem: 'ps non è un oggetto di effetti → testo' });
        continue;
      }
      stats.episodesWithPs++;

      const keys = Object.keys(ps);
      for (const k of keys) {
        stats.postscripts++;
        const text = ps[k];
        const where = `${u.id}/${ep.id}.ps.${k}`;

        if (typeof text !== 'string' || !text.trim()) {
          problems.push({ ep: ep.id, problem: `${where}: vuoto o non stringa` });
          continue;
        }
        /* la chiave deve essere un effetto che quell'episodio offre davvero */
        const offered = [ep.choiceA?.effect, ep.choiceB?.effect].filter(Boolean);
        if (!offered.includes(k)) {
          problems.push({ ep: ep.id, problem: `${where}: "${k}" non è uno degli effetti di questo episodio (${offered.join(' / ')})` });
        }
        if (String(k).startsWith('finale-')) {
          problems.push({ ep: ep.id, problem: `${where}: i finali sono gestiti da unlockEnding, non da ps` });
        }
        /* il postscript non deve contenere il separatore: romperebbe l'origine */
        if (text.includes('\n\n')) {
          problems.push({ ep: ep.id, problem: `${where}: contiene un a capo doppio, che è il separatore` });
        }
        if (text.length < GATES.minLen || text.length > GATES.maxLen) {
          problems.push({ ep: ep.id, problem: `${where}: ${text.length} caratteri, fuori ${GATES.minLen}-${GATES.maxLen}` });
        }
        const low = text.toLowerCase();
        for (const g of GATES.guiltWords) {
          if (low.includes(g)) problems.push({ ep: ep.id, problem: `${where}: contiene "${g}" — un postscript non moralizza` });
        }

        /* coerenza: il postscript parla della strada scelta, e dell'altra meno.
           Confrontare i RISCONTRI da entrambi i lati serve a prendere anche i
           casi in cui la parola giusta capita per caso (una volta "domani"
           era nell'etichetta della strada opposta). */
        const ownLabel = k === ep.choiceA?.effect ? ep.choiceA.label : ep.choiceB?.label;
        const otherLabel = k === ep.choiceA?.effect ? ep.choiceB?.label : ep.choiceA?.label;
        if (ownLabel) {
          const own = echoScore(text, ownLabel);
          const other = otherLabel ? echoScore(text, otherLabel) : 0;
          if (own === 0 || other > own) {
            problems.push({
              ep: ep.id,
              problem: `${where}: parla ${own === 0 ? 'di nessuna delle due strade' : `più dell'altra strada (${other} riscontri su "${trunc(otherLabel)}" contro ${own})`}`
                     + ` invece che di "${trunc(ownLabel)}"`,
            });
          }
        }
      }

      /* divergenza: due varianti non possono essere la stessa frase riscritta */
      if (keys.length === 2) {
        const sim = jaccard(ps[keys[0]], ps[keys[1]]);
        if (sim >= GATES.divergence) {
          problems.push({ ep: ep.id, problem: `${u.id}/${ep.id}: le due varianti sono al ${(sim * 100).toFixed(0)}% identiche (max ${(GATES.divergence * 100).toFixed(0)}%)` });
        }
      }
    }
  }
  return { problems, stats };
}

/* ── CLI: node tools/content-lint.mjs ── */
if (process.argv[1] && process.argv[1].endsWith('content-lint.mjs')) {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);
  const { loadGame } = await import(join(ROOT, 'test/harness.mjs'));
  const { win } = loadGame({ files });
  const { problems, stats } = lint(win.MHU.UNIVERSES);
  console.log(`${stats.postscripts} postscript in ${stats.episodesWithPs} episodi · soglia divergenza ${(GATES.divergence * 100).toFixed(0)}%`);
  for (const p of problems) console.log(`  \x1b[31m✗\x1b[0m ${p.problem}`);
  if (!problems.length) console.log('  \x1b[32m✓\x1b[0m nessun postscript viola i gate');
  process.exit(problems.length ? 1 : 0);
}
