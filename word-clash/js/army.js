/* ARMY — parole-truppa: stats calcolate dalle lettere, addestramento, capienza, parola libera. */
'use strict';

const VOWELS = 'aeiouàèéìòóù';
const RARE = 'zhqxykwj';

function normalizeWord(w){ return String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, (m, i) => '').replace(/[^a-z]/g, ''); }
function lettersOf(w){ return normalizeWord(w).length; }
function vowelsOf(w){ let n = 0; for (const c of normalizeWord(w)) if (VOWELS.indexOf(c) !== -1) n++; return n; }
function rareOf(w){ let n = 0; for (const c of normalizeWord(w)) if (RARE.indexOf(c) !== -1) n++; return n; }
function doublesOf(w){
  const n = normalizeWord(w);
  let d = 0;
  for (let i = 0; i < n.length - 1; i++) if (n[i] === n[i + 1]) d++;
  return d;
}

/* stats complete: o da una parola-truppa (id) o da una parola digitata (isFree) */
function computeWordStats(input){
  const st = BALANCE.wordStats;
  const isTrained = typeof input === 'object' && input !== null && input.id;
  const def = isTrained ? input : null;
  const word = def ? def.word : String(input).toUpperCase();
  const letters = lettersOf(word);
  const vowels = vowelsOf(word);
  const rare = rareOf(word);
  const doubles = doublesOf(word);
  const type = def ? def.type : 'melee';
  const trait = def ? def.trait : null;

  let hp = st.hpBase + st.hpPerLetter * letters + st.hpPerDouble * doubles;
  let dps = st.dpsBase + st.dpsPerVowel * vowels + st.dpsPerRare * rare;
  let speed = clamp(st.speedBase - st.speedPerLetter * letters, st.speedMin, 200);

  const lab = getBuilding('laboratorio');
  const labLv = buildingLevel('laboratorio');
  const boost = labLv >= 1 && lab ? lab.boost[labLv - 1] : 1;

  if (trait === 'fast'){ hp *= 0.7; speed *= 1.4; }
  if (trait === 'tank'){ hp *= 1.8; speed *= 0.65; dps *= 0.8; }
  if (trait === 'swarm'){ hp *= 0.8; speed *= 1.1; }

  hp = Math.round(hp * boost);
  dps = Math.round(dps * boost);

  return {
    word, emoji: def ? def.emoji : '📝', type, trait,
    letters, vowels, rare, doubles,
    hp, maxHp: hp, dps,
    speed,
    range: type === 'ranged' ? st.rangedRange : st.meleeRange,
    attackRate: trait === 'double' ? st.attackRate * 2 : st.attackRate,
    crit: trait === 'crit' ? 0.2 : 0,
    splash: type === 'splash',
    ranged: type === 'ranged',
    splashRadius: st.splashRadius
  };
}

/* ---- tipografia / sblocchi ---- */
function tipografiaLevel(){ return buildingLevel('tipografia'); }
function wordUnlocked(wordDef){ return tipografiaLevel() >= wordDef.tier; }
function unlockedWords(){ return WORDS.filter(w => wordUnlocked(w)); }

/* ---- capienza: parole schierabili in battaglia ---- */
function warCapacity(){
  const q = getBuilding('quaderno');
  const lv = buildingLevel('quaderno');
  return lv >= 1 && q ? q.cap[lv - 1] : 0;
}
function stockCap(){ return warCapacity() * 2; }
function totalStock(){ return Object.keys(G.army).reduce((s, id) => s + G.army[id], 0); }

/* ---- addestramento (istantaneo, costa monete) ---- */
function trainCost(wordDef){
  const boost = wordDef.tier >= 4 ? 1.6 : 1;
  return Math.round(wordDef.cost * boost);
}
function train(wordId){
  const def = getWord(wordId);
  if (!def) return { ok:false, reason:'Parola sconosciuta.' };
  if (!wordUnlocked(def)) return { ok:false, reason:'Serve una Tipografia di livello ' + def.tier + ' per stampare questa parola.' };
  if (totalStock() >= stockCap()) return { ok:false, reason:'Il Quaderno di Guerra è pieno (potenzialo per più parole).' };
  const cost = trainCost(def);
  if (!canAffordCoins(cost)) return { ok:false, reason:'Servono 🪙 ' + fmt(cost) + ' monete.' };
  payCoins(cost);
  G.army[def.id] = (G.army[def.id] || 0) + 1;
  audio.tick();
  return { ok:true, msg: def.word + ' stampata e pronta al combattimento.' };
}

/* ---- parola libera: la scrivi tu in battaglia (statistiche dalle lettere) ---- */
function validateFreeWord(s){
  const clean = String(s || '').trim().toUpperCase().replace(/[^A-ZÀÈÉÌÒÓÙ]/g, '');
  if (clean.length < BALANCE.freeWord.min) return { ok:false, reason:'Troppo corta: servono almeno ' + BALANCE.freeWord.min + ' lettere.' };
  if (clean.length > BALANCE.freeWord.max) return { ok:false, reason:'Troppo lunga: max ' + BALANCE.freeWord.max + ' lettere (i romanzi si scrivono al massimo così).' };
  if (vowelsOf(clean) === 0) return { ok:false, reason:'Deve contenere almeno una vocale.' };
  return { ok:true, word: clean };
}

function battleTeamFromStock(){
  const team = [];
  for (const id in G.army){
    const def = getWord(id);
    const n = Math.min(G.army[id], warCapacity());
    if (n > 0 && def) team.push({ id, count: n, stats: computeWordStats(def) });
  }
  return team;
}