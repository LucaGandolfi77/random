import { CHAPTERS, DIARY, countFragments, countQuizzes, countGamesInStory } from '../js/content/story.js';
import { LESSONS, GLOSSARY } from '../js/content/lessons.js';
import { GAMES, GAME_ORDER } from '../js/content/minigames.js';
import { ACHIEVEMENTS } from '../js/content/achievements.js';
import { CHARACTERS } from '../js/content/characters.js';
import { defaultState, loadState, saveState, clearState, loadSettings, saveSettings } from '../js/core/state.js';

let failed = 0;
function ok(cond, msg) {
  if (cond) return;
  failed++;
  console.error('FAIL:', msg);
}

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

ok(CHAPTERS.length === 12, 'attesi 12 capitoli');
ok(DIARY.length === 12, 'diario con 12 voci');
ok(countFragments() === 24, `frammenti attesi 24, trovati ${countFragments()}`);
ok(countQuizzes() === 12, `quiz attesi 12, trovati ${countQuizzes()}`);
ok(countGamesInStory() === 30, `giochi in storia attesi 30, trovati ${countGamesInStory()}`);
ok(GAME_ORDER.length === 30, `config minigiochi attese 30, trovate ${GAME_ORDER.length}`);
ok(GLOSSARY.length >= 40, 'glossario esaustivo (≥40 termini)');
ok(Object.keys(LESSONS).length >= 12, 'almeno 12 lezioni');

const fragIds = [];
const gameIds = [];
const quizIds = [];
const validTypes = new Set(['title', 'narr', 'say', 'choice', 'game', 'lesson', 'quiz', 'checkpoint']);

CHAPTERS.forEach((ch, ci) => {
  ok(ch.id && ch.title && ch.num, `capitolo ${ci + 1} meta incomplete`);
  ok(Array.isArray(ch.scenes) && ch.scenes.length >= 8, `${ch.id}: scarse scene (${ch.scenes?.length})`);
  ch.scenes.forEach((s, si) => {
    ok(validTypes.has(s.type), `${ch.id}[${si}] tipo sconosciuto ${s.type}`);
    if (s.type === 'game') {
      ok(GAMES[s.game], `${ch.id}[${si}] gioco mancante ${s.game}`);
      gameIds.push(s.game);
    }
    if (s.type === 'lesson') {
      ok(LESSONS[s.lesson], `${ch.id}[${si}] lezione mancante ${s.lesson}`);
    }
    if (s.type === 'quiz') {
      ok(Number.isInteger(s.correct) && s.correct >= 0 && s.correct < s.options.length, `${ch.id}[${si}] quiz correct invalido`);
      ok(s.options.length >= 2, `${ch.id}[${si}] quiz con meno di 2 opzioni`);
      quizIds.push(s.id);
    }
    if (s.fragment) fragIds.push(s.fragment);
    if (s.type === 'choice') {
      ok(s.options && s.options.length >= 2, `${ch.id}[${si}] choice con <2 opzioni`);
      s.options.forEach((o) => ok(o.label, `${ch.id}[${si}] opzione senza label`));
    }
  });
  const last = ch.scenes[ch.scenes.length - 1];
  if (ci < 11) ok(last.type === 'checkpoint', `${ch.id} deve finire con checkpoint`);
  else {
    const hasEnding = ch.scenes.some((s) => s.type === 'choice' && s.options.some((o) => o.ending));
    ok(hasEnding, 'capitolo finale deve offrire gli ending');
  }
});

ok(new Set(fragIds).size === fragIds.length, 'id frammenti duplicati');
ok(new Set(gameIds).size === gameIds.length, 'giochi ripetuti nella storia');
ok(new Set(quizIds).size === quizIds.length, 'id quiz duplicati');
ok(GAME_ORDER.every((g) => gameIds.includes(g)), 'ogni minigioco deve comparire nella campagna');
ok(gameIds.every((g) => GAME_ORDER.includes(g)), 'la storia non deve referenziare giochi fuori catalogo');

const glossaryIds = new Set(GLOSSARY.map((g) => g.id));
ok(glossaryIds.size === GLOSSARY.length, 'id glossario duplicati');
for (const [lid, L] of Object.entries(LESSONS)) {
  (L.terms || []).forEach((t) => ok(glossaryIds.has(t), `lezione ${lid} → termine sconosciuto ${t}`));
}
for (const [gid, G] of Object.entries(GAMES)) {
  (G.terms || []).forEach((t) => ok(glossaryIds.has(t), `gioco ${gid} → termine sconosciuto ${t}`));
  ok(G.title && G.intro && G.debrief, `gioco ${gid} testi incompleti`);
  ok(typeof G.engine === 'string', `gioco ${gid} senza engine`);
  ok(G.config && typeof G.config === 'object', `gioco ${gid} senza config`);
}

const achIds = ACHIEVEMENTS.map((a) => a.id);
ok(new Set(achIds).size === achIds.length, 'id achievement duplicati');
Object.keys(CHARACTERS).forEach((c) => ok(CHARACTERS[c].name !== undefined, `personaggio ${c} incompleto`));

const sceneWho = new Set();
CHAPTERS.forEach((ch) => ch.scenes.forEach((s) => { if (s.type === 'say') sceneWho.add(s.who); }));
sceneWho.forEach((w) => ok(CHARACTERS[w], `personaggio sconosciuto in scena: ${w}`));

const st = defaultState();
saveState(st);
const loaded = loadState();
ok(loaded.chapter === 0 && Array.isArray(loaded.completed), 'roundtrip stato');
loaded.completed = ['ch1'];
saveState(loaded);
ok(loadState().completed.includes('ch1'), 'persistenza completati');
clearState();
ok(!loadState().completed.length, 'clearState');
const set = loadSettings();
set.sound = false;
saveSettings(set);
ok(loadSettings().sound === false, 'impostazioni persistite');

const enginesUsed = new Set(Object.values(GAMES).map((g) => g.engine));
ok(enginesUsed.size >= 10, `almeno 10 motori di gioco (trovati ${enginesUsed.size})`);
console.log('motori:', [...enginesUsed].sort().join(', '));
console.log(`capitoli ${CHAPTERS.length} · giochi ${GAME_ORDER.length} · quiz ${quizIds.length} · frammenti ${fragIds.length} · lezioni ${Object.keys(LESSONS).length} · termini ${GLOSSARY.length}`);

if (failed) {
  console.error(`${failed} errori`);
  process.exit(1);
}
console.log('OK — tutti i test sono passati');
