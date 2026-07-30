/* ===================================================
   💀 Calaveras Slot — Día de los Muertos 5×5
   JavaScript — Teschi, esplosioni, bonus, audio
   =================================================== */

/* ==============================
   🎵 AUDIO ENGINE (Web Audio)
   ============================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playTone(freq, duration, type = 'sine', vol = 0.15) {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function playReelSound() {
  playTone(300 + Math.random() * 200, 0.06, 'sawtooth', 0.06);
}

function playWinSound(big = false) {
  const notes = big ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.12), i * 120);
  });
}

function playBonusSound() {
  const melody = [523, 587, 659, 784, 880, 1047, 1175, 1319];
  melody.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.15, 'sine', 0.1), i * 80);
  });
}

function playSuperBonusSound() {
  const melody = [523, 659, 784, 1047, 784, 1047, 1319, 1568, 1047, 1319, 1568, 2093];
  melody.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, 'square', 0.08), i * 100);
  });
}

function playExplosionSound() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      playTone(100 + Math.random() * 200, 0.1, 'sawtooth', 0.1);
    }, i * 30);
  }
}

function playSpinSound() {
  playTone(440, 0.08, 'triangle', 0.08);
  setTimeout(() => playTone(550, 0.08, 'triangle', 0.08), 60);
  setTimeout(() => playTone(660, 0.08, 'triangle', 0.08), 120);
}

/* ==============================
   💀 8 SKULL SYMBOLS (Día de los Muertos)
   ============================== */
const SYMBOLS = [
  { id: 'skull-gold',   emoji: '💀', name: 'Calavera d\'Oro',    payout5: 500, weight: 4  },
  { id: 'skull-bones',  emoji: '☠️', name: 'Calavera con Ossa',  payout5: 300, weight: 6  },
  { id: 'skull-mask',   emoji: '🎭', name: 'Calavera Mascherata', payout5: 200, weight: 8  },
  { id: 'skull-candy',  emoji: '🍬', name: 'Calavera di Zucchero', payout5: 180, weight: 10 },
  { id: 'skull-cat',    emoji: '🐱', name: 'Calavera Gatto',     payout5: 160, weight: 12 },
  { id: 'skull-rose',   emoji: '🌹', name: 'Calavera Rosa',      payout5: 140, weight: 14 },
  { id: 'bones',        emoji: '🦴', name: 'Ossa Incrociate',    payout5: 120, weight: 16 },
  { id: 'candle',       emoji: '🕯️', name: 'Candela',           payout5: 80,  weight: 20 },
  // Bonus symbol (special)
  { id: 'flower',       emoji: '🌺', name: 'Cempasúchil',        payout5: 0,   weight: 8  },
];

/* --- WIN LINES (15 lines) --- */
const WIN_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
  [0, 4, 10, 16, 22],
  [2, 8, 14, 20, 24],
  [1, 7, 13, 19, 23],
];

/* --- STATE --- */
let credits = 1000;
let bet = 100;
let win = 0;
let isSpinning = false;
let autoMode = false;
let autoTimer = null;
let bonusMeter = 0;
let bonusActive = false;
const BONUS_METER_MAX = 3;

const MIN_BET = 50;
const MAX_BET = 500;
const BET_STEP = 50;

/* --- DOM REFS --- */
const grid = document.getElementById('slotGrid');
const creditsEl = document.getElementById('credits');
const betEl = document.getElementById('bet');
const winDisplayEl = document.getElementById('winDisplay');
const betAmountEl = document.getElementById('betAmount');
const spinBtn = document.getElementById('spinBtn');
const autoBtn = document.getElementById('autoBtn');
const winMessage = document.getElementById('winMessage');
const linesOverlay = document.getElementById('linesOverlay');
const betUp = document.getElementById('betUp');
const betDown = document.getElementById('betDown');
const bonusMeterFill = document.getElementById('bonusMeterFill');
const bonusMeterProgress = document.getElementById('bonusMeterProgress');
const bonusOverlay = document.getElementById('bonusOverlay');
const bonusTitle = document.getElementById('bonusTitle');
const bonusSubtitle = document.getElementById('bonusSubtitle');
const bonusAmount = document.getElementById('bonusAmount');
const bonusClaimBtn = document.getElementById('bonusClaimBtn');
const particleContainer = document.getElementById('particleContainer');

/* --- WEIGHTED SYMBOL PICKER --- */
function randomSymbol() {
  const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let r = Math.random() * totalWeight;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[0];
}

/* --- GENERATE GRID 5×5 --- */
function generateGrid() {
  grid.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    const span = document.createElement('span');
    span.className = 'cell-symbol';
    cell.appendChild(span);
    grid.appendChild(cell);
  }
}

/* --- SET SYMBOL ON CELL --- */
function setCell(index, symbol) {
  const cell = grid.children[index];
  const span = cell.querySelector('.cell-symbol');
  span.textContent = symbol.emoji;
  const oldVal = cell.querySelector('.cell-value');
  if (oldVal) oldVal.remove();
  if (symbol.payout5 > 0) {
    const val = document.createElement('span');
    val.className = 'cell-value';
    val.textContent = symbol.payout5;
    cell.appendChild(val);
  }
  cell.dataset.symbolId = symbol.id;
}

/* --- RANDOMIZE ALL CELLS --- */
function randomizeAll() {
  for (let i = 0; i < 25; i++) {
    setCell(i, randomSymbol());
  }
}

/* --- CHECK WIN LINES --- */
function checkWinLines() {
  let totalWin = 0;
  const winningCells = new Set();
  let flowerCount = 0;

  for (const line of WIN_LINES) {
    const symbols = line.map(idx => {
      const cell = grid.children[idx];
      return SYMBOLS.find(s => s.id === cell.dataset.symbolId);
    });

    // Count flowers for bonus meter
    line.forEach(idx => {
      if (grid.children[idx].dataset.symbolId === 'flower') flowerCount++;
    });

    const firstId = symbols[0]?.id;
    if (!firstId || firstId === 'flower') continue;

    const count = symbols.filter(s => s && s.id === firstId).length;

    // Check for skull symbols only (non-flower)
    if (count >= 5) {
      const payout = symbols[0].payout5 * bet / 100;
      totalWin += Math.max(1, Math.floor(payout));
      line.forEach(idx => winningCells.add(idx));
    } else if (count >= 4) {
      const payout = 100 * bet / 100;
      totalWin += Math.max(1, Math.floor(payout));
      line.forEach(idx => winningCells.add(idx));
    } else if (count >= 3) {
      const payout = 15 * bet / 100;
      totalWin += Math.max(1, Math.floor(payout));
      line.forEach(idx => winningCells.add(idx));
    }
  }

  return { totalWin, winningCells, flowerCount };
}

/* --- BONUS METER --- */
function updateBonusMeter() {
  const pct = (bonusMeter / BONUS_METER_MAX) * 100;
  bonusMeterFill.style.width = `${Math.min(pct, 100)}%`;
  bonusMeterProgress.textContent = `${bonusMeter}/${BONUS_METER_MAX}`;
  if (bonusMeter >= BONUS_METER_MAX) {
    bonusMeterFill.style.background = 'linear-gradient(90deg, var(--orange), var(--gold), var(--pink), var(--purple))';
    bonusMeterFill.style.animation = 'meterShine 0.5s ease-in-out infinite';
  }
}

/* --- HIGHLIGHT WINNING CELLS --- */
function highlightWinning(cells) {
  clearHighlights();
  for (const idx of cells) {
    grid.children[idx].classList.add('win-highlight');
  }
}

function clearHighlights() {
  for (const cell of grid.children) {
    cell.classList.remove('win-highlight', 'skull-explode', 'landing');
  }
}

/* --- UPDATE UI --- */
function updateUI() {
  creditsEl.textContent = credits;
  betEl.textContent = bet;
  betAmountEl.textContent = bet;
  winDisplayEl.textContent = win > 0 ? `+${win}` : '0';
}

/* --- SHOW WIN MESSAGE --- */
function showWinMessage(text, isBig = false) {
  winMessage.textContent = text;
  winMessage.className = 'win-message';
  if (isBig) winMessage.classList.add('big-win');
  winMessage.classList.add('show');
  setTimeout(() => {
    winMessage.classList.remove('show', 'big-win');
  }, 2500);
}

/* ==============================
   🎉 PARTICLE EFFECTS
   ============================== */
function spawnParticles(emoji, count = 12, explode = false) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emoji;
    const x = 20 + Math.random() * 60;
    p.style.left = `${x}vw`;
    p.style.top = explode ? `${30 + Math.random() * 30}vh` : `${-10 + Math.random() * 10}vh`;
    p.style.fontSize = `${1 + Math.random() * 1.5}rem`;
    p.style.setProperty('--fall-duration', `${1.5 + Math.random() * 2}s`);
    if (explode) {
      p.classList.add('explode');
      p.style.setProperty('--dx', `${(Math.random() - 0.5) * 300}px`);
      p.style.setProperty('--dy', `${(Math.random() - 0.5) * 300}px`);
      p.style.setProperty('--explode-duration', `${0.8 + Math.random() * 0.8}s`);
    }
    particleContainer.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

function spawnSkullExplosion(cellEl) {
  const rect = cellEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const emojis = ['💀', '☠️', '🌺', '🎭', '✨', '🔥'];
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle explode';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.position = 'fixed';
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.fontSize = `${1.2 + Math.random() * 1}rem`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 400}px`);
    p.style.setProperty('--dy', `${(Math.random() - 0.5) * 400}px`);
    p.style.setProperty('--explode-duration', `${0.6 + Math.random() * 0.6}s`);
    particleContainer.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

/* ==============================
   🎰 SPIN ANIMATION (Candy Crush style)
   ============================== */
async function animateSpin() {
  const cells = grid.children;

  // Populate final symbols first
  const finalSymbols = [];
  for (let i = 0; i < 25; i++) {
    finalSymbols.push(randomSymbol());
  }

  // Phase 1: Quick blur spin all cells
  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.add('spinning');
    playReelSound();
    setCell(i, randomSymbol());
    await new Promise(r => setTimeout(r, 15));
  }

  await new Promise(r => setTimeout(r, 200));

  // Phase 2: Stop cells column by column with land animation
  for (let col = 0; col < 5; col++) {
    await new Promise(r => setTimeout(r, 80));
    for (let row = 0; row < 5; row++) {
      const idx = row * 5 + col;
      cells[idx].classList.remove('spinning');
      cells[idx].classList.add('landing');
      setCell(idx, finalSymbols[idx]);
      playReelSound();
    }
  }

  // Remove landing class after animation
  await new Promise(r => setTimeout(r, 500));
  for (const cell of cells) cell.classList.remove('landing');
}

/* ==============================
   💥 EXPLODE WINNING CELLS
   ============================== */
async function animateExplodeWinning(cells) {
  const cellArray = Array.from(cells);
  for (let i = 0; i < cellArray.length; i++) {
    const idx = cellArray[i];
    const cell = grid.children[idx];
    cell.classList.add('skull-explode');
    spawnSkullExplosion(cell);
    playExplosionSound();
    await new Promise(r => setTimeout(r, 80));
  }
  await new Promise(r => setTimeout(r, 500));
  // Replace exploded cells with new random ones
  for (const idx of cells) {
    setCell(idx, randomSymbol());
  }
}

/* ==============================
   🌺 BONUS GAME - LOTERÍA DE CALAVERAS
   ============================== */
function showBonus() {
  if (bonusActive) return;
  bonusActive = true;
  const bonusMultiplier = 5 + Math.floor(Math.random() * 6); // 5x-10x
  const bonusWin = bet * bonusMultiplier;
  const extraFreeSpins = 1 + Math.floor(Math.random() * 3); // 1-3 free spins

  bonusTitle.textContent = '🌺 BONUS FIORI!';
  bonusSubtitle.textContent = `Hai raccolto ${BONUS_METER_MAX} cempasúchil!`;
  bonusAmount.textContent = `+${bonusWin} crediti`;
  bonusOverlay.classList.add('active');
  playBonusSound();

  bonusClaimBtn.onclick = () => {
    bonusOverlay.classList.remove('active');
    bonusActive = false;
    credits += bonusWin;
    bonusMeter = 0;
    updateBonusMeter();
    updateUI();
    showWinMessage(`🌺 Bonus Fiori! +${bonusWin} crediti!`, true);
    spawnParticles('🌺', 20, true);
    spawnParticles('💀', 10, true);
    playWinSound(true);
    // Free spins
    if (extraFreeSpins > 0) {
      showWinMessage(`🎁 +${extraFreeSpins} giro gratis!`, true);
      setTimeout(() => {
        for (let i = 0; i < extraFreeSpins; i++) {
          setTimeout(() => {
            if (!autoMode && !isSpinning) spin();
          }, i * 800);
        }
      }, 500);
    }
  };
}

/* ==============================
   🔥 SUPER BONUS - DANZA DE CALAVERAS
   ============================== */
function showSuperBonus() {
  if (bonusActive) return;
  bonusActive = true;
  const superMultiplier = 15 + Math.floor(Math.random() * 16); // 15x-30x
  const superWin = bet * superMultiplier;

  bonusTitle.textContent = '🔥 SUPER BONUS! 💀';
  bonusSubtitle.textContent = '¡Danza de las Calaveras!';
  bonusAmount.textContent = `+${superWin} crediti`;
  bonusOverlay.classList.add('active');
  playSuperBonusSound();
  spawnParticles('💀', 30, true);
  spawnParticles('🔥', 20, true);
  spawnParticles('✨', 15, true);

  bonusClaimBtn.onclick = () => {
    bonusOverlay.classList.remove('active');
    bonusActive = false;
    credits += superWin;
    updateUI();
    showWinMessage(`🔥 SUPER BONUS! +${superWin} crediti! 🔥`, true);
    spawnParticles('💀', 40, true);
    spawnParticles('🌺', 30, true);
    spawnParticles('🎉', 20, true);
    playWinSound(true);
  };
}

/* ==============================
   🎰 MAIN SPIN
   ============================== */
function spin() {
  if (isSpinning || bonusActive) return;
  if (credits < bet) {
    showWinMessage('😅 Crediti insufficienti!');
    return;
  }

  // Check if bonus is ready
  if (bonusMeter >= BONUS_METER_MAX) {
    showBonus();
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  clearHighlights();
  win = 0;
  updateUI();
  winMessage.classList.remove('show');
  initAudio();

  // Deduct bet
  credits -= bet;
  updateUI();

  playSpinSound();

  // Animate and compute result
  animateSpin().then(() => {
    const result = checkWinLines();
    win = result.totalWin;
    const flowerCount = result.flowerCount;

    // Add to bonus meter
    if (flowerCount > 0) {
      bonusMeter = Math.min(bonusMeter + 1, BONUS_METER_MAX);
      updateBonusMeter();
    }

    // Check super bonus (4+ skull symbols of same type)
    let superBonusTriggered = false;
    for (const sym of SYMBOLS) {
      if (sym.id === 'flower') continue;
      let count = 0;
      for (let i = 0; i < 25; i++) {
        if (grid.children[i].dataset.symbolId === sym.id) count++;
      }
      if (count >= 4) {
        superBonusTriggered = true;
        break;
      }
    }

    if (superBonusTriggered) {
      playSuperBonusSound();
      showSuperBonus();
      credits += win;
      updateUI();
      // Still highlight and animate
      highlightWinning(result.winningCells);
      if (result.winningCells.size > 0) {
        animateExplodeWinning(result.winningCells);
      }
      isSpinning = false;
      spinBtn.disabled = false;
      if (autoMode) {
        autoTimer = setTimeout(spin, 800);
      }
      return;
    }

    credits += win;
    updateUI();

    if (win > 0) {
      highlightWinning(result.winningCells);
      const lineCount = [...new Set(
        WIN_LINES.filter(line => line.some(idx => result.winningCells.has(idx)))
          .map(l => l.join(','))
      )].length;

      if (win >= bet * 5) {
        showWinMessage(`💀 ¡Felicidades! +${win} crediti su ${lineCount} linee! 💀`, true);
        spawnParticles('💀', 15, true);
        spawnParticles('🌺', 10, true);
        playWinSound(true);
      } else {
        showWinMessage(`🎉 +${win} crediti su ${lineCount} linee!`);
        spawnParticles('✨', 6, true);
        playWinSound(false);
      }

      // Explode winning cells animation
      animateExplodeWinning(result.winningCells);
    } else {
      // No win, still show some small particles for flower
      if (flowerCount > 0) {
        spawnParticles('🌺', 4, false);
      }
    }

    isSpinning = false;
    spinBtn.disabled = false;

    // Auto-spin chain
    if (autoMode && credits >= bet) {
      // Check bonus meter before next auto spin
      if (bonusMeter >= BONUS_METER_MAX) {
        autoTimer = setTimeout(spin, 300);
      } else {
        autoTimer = setTimeout(spin, 600);
      }
    } else if (autoMode) {
      autoMode = false;
      autoBtn.classList.remove('active');
      autoBtn.textContent = '🔄 Auto';
      showWinMessage('⛔ Auto fermo — credito insufficiente');
    }
  });
}

/* --- BET CONTROLS --- */
betUp.addEventListener('click', () => {
  if (isSpinning) return;
  bet = Math.min(bet + BET_STEP, MAX_BET);
  updateUI();
});

betDown.addEventListener('click', () => {
  if (isSpinning) return;
  bet = Math.max(bet - BET_STEP, MIN_BET);
  updateUI();
});

/* --- SPIN BUTTON --- */
spinBtn.addEventListener('click', spin);

/* --- AUTO BUTTON --- */
autoBtn.addEventListener('click', () => {
  if (isSpinning) return;
  if (autoMode) {
    autoMode = false;
    autoBtn.classList.remove('active');
    autoBtn.textContent = '🔄 Auto';
    if (autoTimer) clearTimeout(autoTimer);
  } else {
    if (credits < bet) {
      showWinMessage('😅 Crediti insufficienti!');
      return;
    }
    autoMode = true;
    autoBtn.classList.add('active');
    autoBtn.textContent = '⏹ Stop';
    spin();
  }
});

/* --- INIT --- */
generateGrid();
randomizeAll();
updateUI();
updateBonusMeter();

/* --- SWIPE TO SPIN (mobile-friendly) --- */
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (isSpinning) return;
  if (e.target.closest('.btn') || e.target.closest('.paytable') || e.target.closest('.bet-controls')) return;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (isSpinning) return;
  if (e.target.closest('.btn') || e.target.closest('.paytable') || e.target.closest('.bet-controls')) return;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
  if (dy < 10) spin();
}, { passive: true });
