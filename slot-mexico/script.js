/* ===================================================
   🌮 Lotería Mexicana — Slot Machine 5×5
   JavaScript — Ottimizzato per iPhone
   =================================================== */

/* --- SYMBOLS --- */
const SYMBOLS = [
  { id: 'parrot',   emoji: '🦜', name: 'Pappagallo',  payout5: 500, weight: 5  },
  { id: 'calavera', emoji: '💀', name: 'Calavera',    payout5: 300, weight: 8  },
  { id: 'flag',     emoji: '🇲🇽', name: 'Bandiera',    payout5: 200, weight: 12 },
  { id: 'guitar',   emoji: '🎸', name: 'Chitarra',    payout5: 150, weight: 16 },
  { id: 'taco',     emoji: '🌮', name: 'Taco',        payout5: 100, weight: 20 },
  { id: 'chili',    emoji: '🌶️', name: 'Peperoncino', payout5: 80,  weight: 25 },
];

/* --- WIN LINES (15 lines) --- */
const WIN_LINES = [
  // Rows (5)
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns (5)
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals (5)
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

  // remove old value span if any
  const oldVal = cell.querySelector('.cell-value');
  if (oldVal) oldVal.remove();

  const val = document.createElement('span');
  val.className = 'cell-value';
  val.textContent = symbol.payout5;
  cell.appendChild(val);

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

  for (const line of WIN_LINES) {
    // Get symbols on this line
    const symbols = line.map(idx => {
      const cell = grid.children[idx];
      return SYMBOLS.find(s => s.id === cell.dataset.symbolId);
    });

    // Check for 5 of a kind
    const firstId = symbols[0]?.id;
    if (!firstId) continue;

    const count = symbols.filter(s => s && s.id === firstId).length;

    if (count >= 5) {
      const payout = symbols[0].payout5;
      totalWin += payout;
      line.forEach(idx => winningCells.add(idx));
    } else if (count >= 4) {
      totalWin += 100; // ×1 bet
      line.forEach(idx => winningCells.add(idx));
    } else if (count >= 3) {
      totalWin += 15; // ×0.15 bet
      line.forEach(idx => winningCells.add(idx));
    }
  }

  return { totalWin, winningCells };
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
    cell.classList.remove('win-highlight');
  }
}

/* --- UPDATE UI --- */
function updateUI() {
  creditsEl.textContent = credits;
  betEl.textContent = bet;
  betAmountEl.textContent = bet;
  if (win > 0) {
    winDisplayEl.textContent = `+${win}`;
  } else {
    winDisplayEl.textContent = '0';
  }
}

/* --- SHOW WIN MESSAGE --- */
function showWinMessage(text) {
  winMessage.textContent = text;
  winMessage.classList.add('show');
  setTimeout(() => winMessage.classList.remove('show'), 2000);
}

/* --- SPIN ANIMATION (staggered) --- */
async function animateSpin() {
  const cells = grid.children;

  // Add spinning class to each cell with staggering
  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.add('spinning');
    // Stagger: groups of 5 every 30ms
    await new Promise(r => setTimeout(r, i % 5 === 0 ? 15 : 5));
  }

  // "Stop" cells in groups with stagger
  const finalSymbols = [];
  for (let i = 0; i < 25; i++) {
    finalSymbols.push(randomSymbol());
  }

  for (let col = 0; col < 5; col++) {
    await new Promise(r => setTimeout(r, 60));
    for (let row = 0; row < 5; row++) {
      const idx = row * 5 + col;
      cells[idx].classList.remove('spinning');
      setCell(idx, finalSymbols[idx]);
    }
  }
}

/* --- MAIN SPIN --- */
function spin() {
  if (isSpinning) return;
  if (credits < bet) {
    showWinMessage('😅 Crediti insufficienti!');
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  clearHighlights();
  win = 0;
  updateUI();
  winMessage.classList.remove('show');

  // Deduct bet
  credits -= bet;
  updateUI();

  // Animate and compute result
  animateSpin().then(() => {
    const result = checkWinLines();
    win = result.totalWin;
    credits += win;
    updateUI();

    if (win > 0) {
      highlightWinning(result.winningCells);
      const lineCount = [...new Set(
        WIN_LINES.filter(line => line.some(idx => result.winningCells.has(idx)))
          .map(l => l.join(','))
      )].length;
      showWinMessage(`🎉 ¡Felicidades! +${win} crediti su ${lineCount} linee!`);
    }

    isSpinning = false;
    spinBtn.disabled = false;

    // Auto-spin chain
    if (autoMode && credits >= bet) {
      autoTimer = setTimeout(spin, 600);
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

/* --- SWIPE TO SPIN (mobile-friendly) --- */
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (isSpinning) return;
  // Only register on the main area, not on buttons
  if (e.target.closest('.btn') || e.target.closest('.paytable') || e.target.closest('.bet-controls')) return;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (isSpinning) return;
  if (e.target.closest('.btn') || e.target.closest('.paytable') || e.target.closest('.bet-controls')) return;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
  if (dy < 10) spin(); // tap (not swipe)
}, { passive: true });
