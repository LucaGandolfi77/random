/* ===================================================
   💀 Esqueleto Explosivo Clone — Motore matematico
   Logica pura e indipendente dal DOM (RNG, paylines,
   cascate, Explosivo Wild, Mucho Multiplier).
   Trasferibile su un server senza modifiche.
   =================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EsqueletoEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==============================
     CONFIGURAZIONE GIOCO
     ============================== */
  const ROWS = 3;
  const COLS = 5;
  const CELL_COUNT = ROWS * COLS;
  const WILD_ID = 'wild';

  const MULTIPLIER_LADDER = [1, 2, 4, 8, 16, 32];

  /* Cap di sicurezza sulle cascate (anti run-away). Le cascate reali
     raramente superano 16 step; 64 è una rete di protezione. */
  const MAX_CASCADE_STEPS = 64;

  /* Paytable: multipli della puntata totale (vincita per linea). */
  const PAYTABLE = {
    gold:   { 3: 0.5, 4: 0.9, 5: 2.5 },
    pink:   { 3: 0.4, 4: 0.7, 5: 1.4 },
    green:  { 3: 0.3, 4: 0.6, 5: 1.2 },
    blue:   { 3: 0.3, 4: 0.5, 5: 0.9 },
    orange: { 3: 0.2, 4: 0.4, 5: 0.7 },
  };

  /* Pesi simboli — CALIBRATI con tools/simulate.js (RTP ~96%).
     gold/pink/green/blue/orange quasi uniformi, wild raro. */
  const SYMBOLS = [
    { id: 'gold',   weight: 16 },
    { id: 'pink',   weight: 17 },
    { id: 'green',  weight: 18 },
    { id: 'blue',   weight: 19 },
    { id: 'orange', weight: 20 },
    { id: 'wild',   weight: 0.481 },
  ];

  /* 17 linee fisse (cella = riga*5 + colonna).
     Sequenza righe per rullo (sinistra→destra):
     01 00000 02 11111 03 22222 04 01010 05 10101
     06 12121 07 21212 08 00100 09 00200 10 22122
     11 22022 12 10001 13 12221 14 01210 15 21012
     16 02020 17 20202                              */
  const LINES = [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [0, 6, 2, 8, 4],
    [5, 1, 7, 3, 9],
    [5, 11, 7, 13, 9],
    [10, 6, 12, 8, 14],
    [0, 1, 7, 3, 4],
    [0, 1, 12, 3, 4],
    [10, 11, 7, 13, 14],
    [10, 11, 2, 13, 14],
    [5, 1, 2, 3, 9],
    [5, 11, 12, 13, 9],
    [0, 6, 12, 8, 4],
    [10, 6, 2, 8, 14],
    [0, 11, 2, 13, 4],
    [10, 1, 12, 3, 14],
  ];

  const BET_LEVELS = [10, 20, 50, 100, 200, 500];
  const STARTING_BALANCE = 1000;

  /* Metadati per il client (UI). */
  const SYMBOL_META = {
    gold:   { name: 'Calavera d\'Oro',  emoji: '💀', color: '#ffd700', tint: 'gold' },
    pink:   { name: 'Calavera Rosa',    emoji: '💀', color: '#ff5ea8', tint: 'pink' },
    green:  { name: 'Calavera Verde',   emoji: '💀', color: '#3ddc84', tint: 'green' },
    blue:   { name: 'Calavera Azul',    emoji: '💀', color: '#4d9fff', tint: 'blue' },
    orange: { name: 'Calavera Arancia', emoji: '💀', color: '#ff8c42', tint: 'orange' },
    wild:   { name: 'Explosivo Wild',   emoji: '☠️', color: '#ffffff', tint: 'wild' },
  };

  const CONFIG = {
    name: 'Esqueleto Explosivo Clone',
    rows: ROWS,
    cols: COLS,
    cellCount: CELL_COUNT,
    wildId: WILD_ID,
    multiplierLadder: MULTIPLIER_LADDER,
    paytable: PAYTABLE,
    symbols: SYMBOLS,
    lines: LINES,
    betLevels: BET_LEVELS,
    minBet: BET_LEVELS[0],
    maxBet: BET_LEVELS[BET_LEVELS.length - 1],
    startingBalance: STARTING_BALANCE,
    rtpTarget: 0.96,
    rtpMeasured: 0.960897,
    hitFrequency: 0.4446,
    rtpSimSpins: 10000000,
  };

  /* ==============================
     RNG crittografico (iniettabile)
     ============================== */
  function getCrypto() {
    return typeof crypto !== 'undefined' ? crypto : globalThis.crypto;
  }

  function createRng() {
    const buf = new Uint32Array(1);
    return function () {
      getCrypto().getRandomValues(buf);
      return buf[0] / 4294967296;
    };
  }

  /* ==============================
     GENERAZIONE SIMBOLI (pesata)
     ============================== */
  function totalWeight() {
    return SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  }

  function weightedPick(rng) {
    const total = totalWeight();
    let r = rng() * total;
    for (const sym of SYMBOLS) {
      r -= sym.weight;
      if (r <= 0) return sym.id;
    }
    return SYMBOLS[SYMBOLS.length - 1].id;
  }

  function fillGrid(rng) {
    const grid = new Array(CELL_COUNT);
    for (let i = 0; i < CELL_COUNT; i++) grid[i] = weightedPick(rng);
    return grid;
  }

  /* ==============================
     VALUTAZIONE LINEA (da sinistra)
     ============================== */
  function evaluateLine(grid, lineCells, lineIndex) {
    let anchor = null;
    for (const cell of lineCells) {
      const s = grid[cell];
      if (s !== WILD_ID) { anchor = s; break; }
    }
    if (anchor === null) return null;

    let count = 0;
    for (const cell of lineCells) {
      const s = grid[cell];
      if (s === anchor || s === WILD_ID) count++;
      else break;
    }
    if (count < 3) return null;

    return {
      line: lineIndex,
      cells: lineCells.slice(0, count),
      count,
      symbolId: anchor,
      payout: PAYTABLE[anchor][count],
    };
  }

  function evaluateLines(grid) {
    const wins = [];
    for (let i = 0; i < LINES.length; i++) {
      const w = evaluateLine(grid, LINES[i], i);
      if (w) wins.push(w);
    }
    return wins;
  }

  /* ==============================
     EXPLOSIVO WILD (blast 3x3, no wrap)
     ============================== */
  function findWilds(grid) {
    const wilds = [];
    for (let i = 0; i < CELL_COUNT; i++) if (grid[i] === WILD_ID) wilds.push(i);
    return wilds;
  }

  function wildBlastCells(grid) {
    const blasted = [];
    for (const idx of findWilds(grid)) {
      const r = Math.floor(idx / COLS);
      const c = idx % COLS;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            blasted.push(nr * COLS + nc);
          }
        }
      }
    }
    return Array.from(new Set(blasted));
  }

  /* ==============================
     CASCATA: caduta + riempimento
     ============================== */
  function cascade(grid, removedSet, rng) {
    for (let c = 0; c < COLS; c++) {
      let target = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const idx = r * COLS + c;
        if (!removedSet.has(idx)) {
          if (target !== r) {
            grid[target * COLS + c] = grid[idx];
            grid[idx] = null;
          }
          target--;
        }
      }
      for (let r = target; r >= 0; r--) {
        grid[r * COLS + c] = weightedPick(rng);
      }
    }
  }

  /* ==============================
     ROUND COMPLETO (timeline)
     ============================== */
  function runRound(bet, rng) {
    const timeline = [];
    let grid = fillGrid(rng);
    let multiplier = MULTIPLIER_LADDER[0];
    let roundTotal = 0;
    let step = 0;

    while (true) {
      const wins = evaluateLines(grid);
      const wilds = findWilds(grid);
      const blastCells = wildBlastCells(grid);

      const removedSet = new Set(blastCells);
      for (const w of wins) for (const cell of w.cells) removedSet.add(cell);

      const hasWin = wins.length > 0;
      const hasWild = wilds.length > 0;

      let baseWin = 0;
      for (const w of wins) baseWin += Math.round(w.payout * bet);
      const stepWin = baseWin * multiplier;
      roundTotal += stepWin;

      timeline.push({
        step,
        type: step === 0 ? 'initial' : 'cascade',
        grid: grid.slice(),
        wins: wins.map(w => ({
          line: w.line,
          cells: w.cells,
          count: w.count,
          symbolId: w.symbolId,
          payout: w.payout,
          win: Math.round(w.payout * bet),
        })),
        wilds: wilds.slice(),
        blastCells: blastCells.slice(),
        removedCells: Array.from(removedSet),
        multiplier,
        stepWin,
        roundTotal,
        ended: !hasWin && !hasWild || step >= MAX_CASCADE_STEPS - 1,
      });

      if (!hasWin && !hasWild) break;
      if (removedSet.size === 0) break;
      if (step >= MAX_CASCADE_STEPS - 1) break;

      const ladderIdx = MULTIPLIER_LADDER.indexOf(multiplier);
      if (ladderIdx >= 0 && ladderIdx < MULTIPLIER_LADDER.length - 1) {
        multiplier = MULTIPLIER_LADDER[ladderIdx + 1];
      }

      cascade(grid, removedSet, rng);
      step++;
    }

    return timeline;
  }

  /* ==============================
     API PUBBLICA
     ============================== */
  return {
    CONFIG,
    SYMBOL_META,
    createRng,
    weightedPick,
    fillGrid,
    evaluateLines,
    findWilds,
    wildBlastCells,
    cascade,
    runRound,
  };
});
