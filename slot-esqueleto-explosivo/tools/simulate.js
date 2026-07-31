#!/usr/bin/env node
/* ===================================================
   💀 Esqueleto Explosivo Clone — Calibratore RTP
   Monte Carlo: esegue N spin sul motore e riporta
   RTP, frequenza di hit, cascate medie e moltiplicatori.

   Uso:
     node tools/simulate.js --spins=5000000
     node tools/simulate.js --gold=12 --pink=15 --wild=4 --spins=1000000
   =================================================== */
'use strict';
const Engine = require('../engine.js');

/* --- Argomenti CLI --- */
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.findIndex(a => a.startsWith('--' + name + '='));
  if (i === -1) return fallback;
  const raw = args[i].split('=')[1];
  if (raw === undefined) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : raw;
}

const spins = arg('spins', 1000000);
const bet = arg('bet', 10);
const seed = arg('seed', 12345);

/* Override pesi da CLI (--simbolo=peso) */
for (const s of Engine.CONFIG.symbols) {
  const v = arg(s.id);
  if (v !== undefined) s.weight = v;
}

/* --- RNG deterministico (mulberry32) per riproducibilita' --- */
function createSimRng(seedVal) {
  let a = seedVal >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- Simulazione --- */
const rng = createSimRng(seed);
let totalBet = 0;
let totalWin = 0;
let hitRounds = 0;
let totalSteps = 0;
let winningStepMultSum = 0;
let winningStepCount = 0;
let maxRoundWin = 0;
let maxCascadeDepth = 0;
let maxMultiplierHit = 0;
let zeroStepRounds = 0;
let wildHitRounds = 0;
const stepDist = {};

console.log('Sesame: Esqueleto Explosivo Clone — simulazione RTP');
console.log(`spin=${spins} bet=${bet} seed=${seed}`);
console.log('pesi:', Engine.CONFIG.symbols.map(s => `${s.id}=${s.weight}`).join('  '));
console.log('---');

for (let i = 0; i < spins; i++) {
  const timeline = Engine.runRound(bet, rng);
  const roundWin = timeline[timeline.length - 1].roundTotal;
  totalBet += bet;
  totalWin += roundWin;

  const steps = timeline.length;
  totalSteps += steps;
  stepDist[steps] = (stepDist[steps] || 0) + 1;
  maxCascadeDepth = Math.max(maxCascadeDepth, steps);

  if (roundWin > 0) {
    hitRounds++;
    maxRoundWin = Math.max(maxRoundWin, roundWin);
  }
  if (timeline.length === 1 && roundWin === 0) zeroStepRounds++;
  if (timeline.some(st => st.wilds.length > 0)) wildHitRounds++;

  for (const st of timeline) {
    if (st.stepWin > 0) {
      winningStepMultSum += st.multiplier;
      winningStepCount++;
      maxMultiplierHit = Math.max(maxMultiplierHit, st.multiplier);
    }
  }
}

const rtp = totalWin / totalBet;
const hitFreq = hitRounds / spins;
const wildFreq = wildHitRounds / spins;
const avgSteps = totalSteps / spins;
const avgMultWinning = winningStepCount ? winningStepMultSum / winningStepCount : 0;

/* Errore statistico ~1 sigma sul RTP */
const se = Math.sqrt((rtp * Math.max(0, 1 - rtp)) / spins);

console.log(`RTP                     : ${(rtp * 100).toFixed(4)}%  (±${(se * 100).toFixed(4)}% @1σ)`);
console.log(`Hit frequency (rounds)  : ${(hitFreq * 100).toFixed(2)}%`);
console.log(`Rounds con Wild         : ${(wildFreq * 100).toFixed(2)}%`);
console.log(`Cascate medie / round   : ${avgSteps.toFixed(3)} (max ${maxCascadeDepth})`);
console.log(`Multiplier medio (win)  : ${avgMultWinning.toFixed(3)} (max ${maxMultiplierHit})`);
console.log(`Vincita max round       : ${maxRoundWin} (${(maxRoundWin / bet).toFixed(2)}x bet)`);
console.log(`Distribuzione step:`, Object.keys(stepDist).sort((a, b) => a - b).map(k => `${k}→${((stepDist[k] / spins) * 100).toFixed(2)}%`).join('  '));
