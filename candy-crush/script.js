const LEVELS = [
  { id:1,  goal:1000, moves:30, rows:8, cols:8, types:6, jelly:0 },
  { id:2,  goal:1500, moves:28, rows:8, cols:8, types:6, jelly:0 },
  { id:3,  goal:2000, moves:30, rows:8, cols:8, types:6, jelly:0 },
  { id:4,  goal:2500, moves:25, rows:8, cols:8, types:6, jelly:0 },
  { id:5,  goal:3000, moves:30, rows:9, cols:9, types:6, jelly:0 },
  { id:6,  goal:2000, moves:30, rows:8, cols:8, types:6, jelly:5 },
  { id:7,  goal:2500, moves:28, rows:8, cols:8, types:6, jelly:8 },
  { id:8,  goal:3000, moves:30, rows:8, cols:8, types:6, jelly:10 },
  { id:9,  goal:3500, moves:25, rows:8, cols:8, types:5, jelly:12 },
  { id:10, goal:3000, moves:30, rows:9, cols:9, types:6, jelly:15 },
  { id:11, goal:3500, moves:28, rows:8, cols:8, types:5, jelly:10 },
  { id:12, goal:4000, moves:30, rows:9, cols:9, types:5, jelly:12 },
  { id:13, goal:4500, moves:25, rows:8, cols:8, types:5, jelly:15 },
  { id:14, goal:4500, moves:28, rows:9, cols:9, types:5, jelly:18 },
  { id:15, goal:5000, moves:30, rows:10, cols:10, types:5, jelly:20 },
  { id:16, goal:4000, moves:25, rows:8, cols:8, types:4, jelly:12 },
  { id:17, goal:5000, moves:28, rows:9, cols:9, types:4, jelly:15 },
  { id:18, goal:5500, moves:25, rows:9, cols:9, types:4, jelly:18 },
  { id:19, goal:6000, moves:28, rows:10, cols:10, types:4, jelly:20 },
  { id:20, goal:8000, moves:35, rows:10, cols:10, types:4, jelly:25 },
];

const SPRITE_FILES = [
  'sprites/caramella1.svg', 'sprites/caramella2.svg',
  'sprites/caramella3.svg', 'sprites/caramella4.svg',
  'sprites/caramella5.svg', 'sprites/caramella6.svg',
];
const BOMB_SPRITE = 'sprites/bomba.svg';

let sprites = [];
let bombImg = null;

let grid = [];
let elements = [];
let state = 'IDLE';
let selectedCell = null;
let currentLevelIdx = 0;
let score = 0;
let movesLeft = 0;
let jellyRemaining = 0;
let jellyTotal = 0;
let comboCount = 0;
let canInteract = true;
let gameOver = false;
let levelProgress = {};

const $ = id => document.getElementById(id);

const dom = {
  menuView: $('menu-view'),
  gameView: $('game-view'),
  levelGrid: $('level-grid'),
  board: $('board'),
  levelLabel: $('level-label'),
  movesLabel: $('moves-label'),
  scoreLabel: $('score-label'),
  targetLabel: $('target-label'),
  jellyCounter: $('jelly-counter'),
  jellyCount: $('jelly-count'),
  btnBack: $('btn-back'),
  overlay: $('overlay'),
  overlayTitle: $('overlay-title'),
  overlayText: $('overlay-text'),
  starsContainer: $('stars-container'),
  btnRetry: $('btn-retry'),
  btnNext: $('btn-next'),
  btnMenu: $('btn-menu'),
};

function getCellSize(lvl) {
  const max = lvl.rows || lvl.cols;
  if (max <= 8) return 64;
  if (max <= 9) return 58;
  return 52;
}

function loadProgress() {
  try {
    const data = localStorage.getItem('candy_crush_progress');
    if (data) levelProgress = JSON.parse(data);
  } catch {}
  if (!levelProgress.unlocked) levelProgress.unlocked = 1;
  if (!levelProgress.stars) levelProgress.stars = {};
}
function saveProgress() {
  localStorage.setItem('candy_crush_progress', JSON.stringify(levelProgress));
}

function getRandomType(lvl) {
  return Math.floor(Math.random() * lvl.types);
}

function createCell( type, jelly=false ) {
  return { type, jelly, special: null, element: null };
}

function initGrid(lvl) {
  const R = lvl.rows, C = lvl.cols;
  grid = [];
  elements = [];
  for (let r = 0; r < R; r++) {
    grid[r] = [];
    elements[r] = [];
    for (let c = 0; c < C; c++) {
      let type;
      let attempts = 0;
      do {
        type = getRandomType(lvl);
        attempts++;
      } while (attempts < 50 && wouldMatch(r, c, type));
      grid[r][c] = createCell(type);
    }
  }

  if (lvl.jelly > 0) {
    let placed = 0;
    const positions = [];
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++)
        positions.push({ r, c });
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (const p of positions) {
      if (placed >= lvl.jelly) break;
      grid[p.r][p.c].jelly = true;
      placed++;
    }
  }

  while (true) {
    const m = findAllMatches();
    if (m.length === 0) break;
    for (const [r, c] of m) {
      grid[r][c].type = getRandomType(lvl);
    }
  }

  jellyTotal = lvl.jelly;
  jellyRemaining = lvl.jelly;
}

function wouldMatch(r, c, type) {
  if (c >= 2 && grid[r][c-1].type === type && grid[r][c-2].type === type) return true;
  if (r >= 2 && grid[r-1][c].type === type && grid[r-2][c].type === type) return true;
  return false;
}

function findAllMatches() {
  const matched = [];
  const R = grid.length, C = grid[0].length;
  for (let r = 0; r < R; r++) {
    let start = 0;
    for (let c = 1; c <= C; c++) {
      if (c < C && grid[r][c].type === grid[r][start].type && grid[r][c].type !== -1) continue;
      const len = c - start;
      if (len >= 3 && grid[r][start].type !== -1) {
        for (let i = start; i < c; i++) matched.push([r, i]);
      }
      start = c;
    }
  }
  for (let c = 0; c < C; c++) {
    let start = 0;
    for (let r = 1; r <= R; r++) {
      if (r < R && grid[r][c].type === grid[start][c].type && grid[r][c].type !== -1) continue;
      const len = r - start;
      if (len >= 3 && grid[start][c].type !== -1) {
        for (let i = start; i < r; i++) matched.push([i, c]);
      }
      start = r;
    }
  }
  return matched;
}

function findNewMatches() {
  const hMatched = new Set();
  const vMatched = new Set();
  const hRuns = [];
  const vRuns = [];
  const R = grid.length, C = grid[0].length;

  for (let r = 0; r < R; r++) {
    let start = 0;
    for (let c = 1; c <= C; c++) {
      if (c < C && grid[r][c].type === grid[r][start].type && grid[r][c].type !== -1) continue;
      const len = c - start;
      if (len >= 3 && grid[r][start].type !== -1) {
        hRuns.push({ r, start, end: c - 1, len });
        for (let i = start; i < c; i++) hMatched.add(`${r},${i}`);
      }
      start = c;
    }
  }
  for (let c = 0; c < C; c++) {
    let start = 0;
    for (let r = 1; r <= R; r++) {
      if (r < R && grid[r][c].type === grid[start][c].type && grid[r][c].type !== -1) continue;
      const len = r - start;
      if (len >= 3 && grid[start][c].type !== -1) {
        vRuns.push({ c, start, end: r - 1, len });
        for (let i = start; i < r; i++) vMatched.add(`${i},${c}`);
      }
      start = r;
    }
  }

  const matchedSet = new Set([...hMatched, ...vMatched]);
  const matched = [...matchedSet].map(s => { const [r,c]=s.split(','); return [parseInt(r),parseInt(c)]; });

  const specials = [];
  for (const run of hRuns) {
    if (run.len === 4) {
      specials.push({ r: run.r, c: run.end, type: 'striped-h' });
    }
  }
  for (const run of vRuns) {
    if (run.len === 4) {
      specials.push({ r: run.end, c: run.c, type: 'striped-v' });
    }
  }
  for (const key of hMatched) {
    if (vMatched.has(key)) {
      const [r,c] = key.split(',').map(Number);
      specials.push({ r, c, type: 'bomb' });
    }
  }

  return { matched, specials };
}

function swapData(r1,c1,r2,c2) {
  const tmp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = tmp;
}

function renderBoard() {
  const lvl = LEVELS[currentLevelIdx];
  const CS = getCellSize(lvl);
  const boardW = lvl.cols * CS;
  const boardH = lvl.rows * CS;
  dom.board.innerHTML = '';
  dom.board.style.width = boardW + 'px';
  dom.board.style.height = boardH + 'px';

  for (let r = 0; r < lvl.rows; r++) {
    for (let c = 0; c < lvl.cols; c++) {
      const cell = grid[r][c];
      const el = document.createElement('div');
      el.className = 'board-cell';
      el.style.width = CS + 'px';
      el.style.height = CS + 'px';
      el.style.top = (r * CS) + 'px';
      el.style.left = (c * CS) + 'px';
      el.dataset.row = r;
      el.dataset.col = c;

      if (cell.jelly) {
        const jellyEl = document.createElement('div');
        jellyEl.className = 'jelly-bg';
        el.appendChild(jellyEl);
      }

      const img = document.createElement('img');
      img.draggable = false;
      setCellImage(img, cell);
      el.appendChild(img);

      if (cell.special) {
        const ov = document.createElement('div');
        ov.className = 'special-overlay ' + cell.special;
        el.appendChild(ov);
      }

      el.addEventListener('click', () => onCellClick(r, c));
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onCellClick(r, c);
      });

      dom.board.appendChild(el);
      cell.element = el;
      elements[r][c] = el;
    }
  }
  updateUI();
}

function setCellImage(img, cell) {
  if (cell.type === -1 || cell.type === undefined) {
    img.style.display = 'none';
    return;
  }
  img.style.display = '';
  if (cell.special === 'bomb') {
    img.src = BOMB_SPRITE;
  } else {
    img.src = SPRITE_FILES[cell.type];
  }
}

function updateUI() {
  const lvl = LEVELS[currentLevelIdx];
  dom.levelLabel.textContent = 'Livello ' + lvl.id;
  dom.movesLabel.textContent = movesLeft + ' mosse';
  dom.scoreLabel.textContent = 'Punteggio: ' + score;
  dom.targetLabel.textContent = 'Obiettivo: ' + lvl.goal;
  if (lvl.jelly > 0) {
    dom.jellyCounter.classList.remove('hidden');
    dom.jellyCount.textContent = jellyRemaining;
  } else {
    dom.jellyCounter.classList.add('hidden');
  }
}

function onCellClick(r, c) {
  if (!canInteract || gameOver) return;

  if (selectedCell === null) {
    selectedCell = { r, c };
    grid[r][c].element.classList.add('selected');
    return;
  }

  const prev = selectedCell;
  grid[prev.r][prev.c].element.classList.remove('selected');

  if (prev.r === r && prev.c === c) {
    selectedCell = null;
    return;
  }

  const dr = Math.abs(prev.r - r);
  const dc = Math.abs(prev.c - c);
  if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
    selectedCell = null;
    trySwap(prev.r, prev.c, r, c);
  } else {
    selectedCell = { r, c };
    grid[r][c].element.classList.add('selected');
  }
}

async function trySwap(r1, c1, r2, c2) {
  canInteract = false;
  comboCount = 0;
  const CS = getCellSize(LEVELS[currentLevelIdx]);

  const el1 = elements[r1][c1];
  const el2 = elements[r2][c2];
  el1.style.transition = 'left 0.2s ease, top 0.2s ease';
  el2.style.transition = 'left 0.2s ease, top 0.2s ease';
  el1.style.left = (c2 * CS) + 'px';
  el1.style.top = (r2 * CS) + 'px';
  el2.style.left = (c1 * CS) + 'px';
  el2.style.top = (r1 * CS) + 'px';

  await sleep(220);

  swapData(r1, c1, r2, c2);
  [elements[r1][c1], elements[r2][c2]] = [elements[r2][c2], elements[r1][c1]];
  el1.style.transition = '';
  el2.style.transition = '';
  el1.style.left = (c1 * CS) + 'px';
  el1.style.top = (r1 * CS) + 'px';
  el2.style.left = (c2 * CS) + 'px';
  el2.style.top = (r2 * CS) + 'px';
  el1.dataset.row = r1; el1.dataset.col = c1;
  el2.dataset.row = r2; el2.dataset.col = c2;

  const { matched, specials } = findNewMatches();
  if (matched.length === 0) {
    await sleep(50);
    el1.style.transition = 'left 0.2s ease, top 0.2s ease';
    el2.style.transition = 'left 0.2s ease, top 0.2s ease';
    el1.style.left = (c2 * CS) + 'px';
    el1.style.top = (r2 * CS) + 'px';
    el2.style.left = (c1 * CS) + 'px';
    el2.style.top = (r1 * CS) + 'px';
    await sleep(220);
    swapData(r1, c1, r2, c2);
    [elements[r1][c1], elements[r2][c2]] = [elements[r2][c2], elements[r1][c1]];
    el1.style.transition = '';
    el2.style.transition = '';
    el1.style.left = (c1 * CS) + 'px';
    el1.style.top = (r1 * CS) + 'px';
    el2.style.left = (c2 * CS) + 'px';
    el2.style.top = (r2 * CS) + 'px';
    el1.dataset.row = r1; el1.dataset.col = c1;
    el2.dataset.row = r2; el2.dataset.col = c2;
    canInteract = true;
    return;
  }

  movesLeft--;
  comboCount = 1;
  await processMatches(matched, specials);
  updateUI();
  checkWinLose();
  canInteract = true;
}

async function processMatches(matched, specials) {
  const lvl = LEVELS[currentLevelIdx];
  const expandAll = new Set();

  for (const [r, c] of matched) {
    const cell = grid[r][c];
    expandAll.add(`${r},${c}`);
    if (cell.special === 'striped-h') {
      for (let cc = 0; cc < lvl.cols; cc++) {
        if (grid[r][cc] && grid[r][cc].type !== -1) expandAll.add(`${r},${cc}`);
      }
    } else if (cell.special === 'striped-v') {
      for (let rr = 0; rr < lvl.rows; rr++) {
        if (grid[rr][c] && grid[rr][c].type !== -1) expandAll.add(`${rr},${c}`);
      }
    } else if (cell.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < lvl.rows && nc >= 0 && nc < lvl.cols && grid[nr][nc].type !== -1) {
            expandAll.add(`${nr},${nc}`);
          }
        }
      }
    }
  }

  const specialPositions = new Set(specials.map(s => `${s.r},${s.c}`));
  const toRemove = new Set();
  for (const key of expandAll) {
    if (!specialPositions.has(key)) toRemove.add(key);
  }

  for (const key of toRemove) {
    const [r, c] = key.split(',').map(Number);
    const cell = grid[r][c];
    if (cell.type === -1) continue;
    const pts = cell.special === 'striped-h' || cell.special === 'striped-v' ? 80 :
               cell.special === 'bomb' ? 100 : 30;
    score += pts * comboCount;
    if (cell.jelly) {
      jellyRemaining = Math.max(0, jellyRemaining - 1);
      cell.jelly = false;
      score += 200 * comboCount;
    }
    cell.type = -1;
    cell.special = null;
  }

  for (const key of toRemove) {
    const [r, c] = key.split(',').map(Number);
    const el = elements[r][c];
    if (el) {
      el.style.transition = 'opacity 0.15s, transform 0.15s';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.5)';
    }
  }
  await sleep(180);

  for (const key of toRemove) {
    const [r, c] = key.split(',').map(Number);
    const el = elements[r][c];
    if (el) {
      el.innerHTML = '';
      el.style.opacity = '1';
      el.style.transform = '';
      el.style.transition = '';
    }
  }

  for (const sp of specials) {
    const cell = grid[sp.r][sp.c];
    if (cell && cell.type !== -1) {
      cell.special = sp.type;
      const el = elements[sp.r][sp.c];
      if (el) {
        el.innerHTML = '';
        if (cell.jelly) {
          const jellyEl = document.createElement('div');
          jellyEl.className = 'jelly-bg';
          el.appendChild(jellyEl);
        }
        const img = document.createElement('img');
        img.draggable = false;
        setCellImage(img, cell);
        el.appendChild(img);
        const ov = document.createElement('div');
        ov.className = 'special-overlay ' + sp.type;
        el.appendChild(ov);
      }
    }
  }

  await sleep(50);
  await applyGravity();
  await fillEmpty();
  updateUI();

  const { matched: newMatches, specials: newSpecials } = findNewMatches();
  if (newMatches.length > 0) {
    comboCount++;
    await processMatches(newMatches, newSpecials);
  }
}

async function applyGravity() {
  const lvl = LEVELS[currentLevelIdx];
  const CS = getCellSize(lvl);
  let moved = false;

  for (let c = 0; c < lvl.cols; c++) {
    let writeRow = lvl.rows - 1;
    for (let r = lvl.rows - 1; r >= 0; r--) {
      if (grid[r][c].type !== -1) {
        if (r !== writeRow) {
          grid[writeRow][c] = grid[r][c];
          grid[r][c] = createCell(-1);

          const el = elements[r][c];
          el.style.transition = 'top 0.25s ease';
          el.style.top = (writeRow * CS) + 'px';
          el.dataset.row = writeRow;

          elements[writeRow][c] = el;
          elements[r][c] = null;
          moved = true;
        }
        writeRow--;
      }
    }
  }

  if (moved) await sleep(260);
}

async function fillEmpty() {
  const lvl = LEVELS[currentLevelIdx];
  const CS = getCellSize(lvl);
  let filled = false;

  for (let c = 0; c < lvl.cols; c++) {
    let emptyCount = 0;
    for (let r = 0; r < lvl.rows; r++) {
      if (grid[r][c].type === -1) emptyCount++;
    }
    let fillIdx = 0;
    for (let r = 0; r < lvl.rows; r++) {
      if (grid[r][c].type === -1) {
        grid[r][c].type = getRandomType(lvl);
        grid[r][c].special = null;

        const el = document.createElement('div');
        el.className = 'board-cell';
        el.style.width = CS + 'px';
        el.style.height = CS + 'px';
        el.style.top = (r * CS) + 'px';
        el.style.left = (c * CS) + 'px';
        el.dataset.row = r;
        el.dataset.col = c;

        if (grid[r][c].jelly) {
          const jellyEl = document.createElement('div');
          jellyEl.className = 'jelly-bg';
          el.appendChild(jellyEl);
        }

        const img = document.createElement('img');
        img.draggable = false;
        img.classList.add('dropping');
        setCellImage(img, grid[r][c]);
        el.appendChild(img);

        el.style.opacity = '0';
        el.style.transform = 'translateY(-' + (CS * (emptyCount - fillIdx)) + 'px)';

        el.addEventListener('click', () => onCellClick(r, c));
        el.addEventListener('touchstart', (e) => {
          e.preventDefault();
          onCellClick(r, c);
        });

        if (elements[r][c]) elements[r][c].remove();
        dom.board.appendChild(el);
        elements[r][c] = el;
        grid[r][c].element = el;

        requestAnimationFrame(() => {
          el.style.transition = 'opacity 0.2s ease, transform 0.25s ease';
          el.style.opacity = '1';
          el.style.transform = '';
        });

        fillIdx++;
        filled = true;
      }
    }
  }

  if (filled) await sleep(280);
}

function checkWinLose() {
  const lvl = LEVELS[currentLevelIdx];
  if (score >= lvl.goal && jellyRemaining === 0) {
    gameOver = true;
    setTimeout(() => showWin(), 500);
    return;
  }
  if (movesLeft <= 0) {
    gameOver = true;
    setTimeout(() => showLose(), 500);
    return;
  }
  if (score >= lvl.goal && jellyRemaining > 0) return;
}

function calcStars() {
  const lvl = LEVELS[currentLevelIdx];
  const ratio = score / lvl.goal;
  if (ratio >= 2) return 3;
  if (ratio >= 1.5) return 2;
  return 1;
}

function showWin() {
  const stars = calcStars();
  dom.overlayTitle.className = 'win';
  dom.overlayTitle.textContent = '🎉 Vittoria!';
  dom.overlayText.textContent = 'Hai completato il livello ' + LEVELS[currentLevelIdx].id + ' con ' + score + ' punti!';

  dom.starsContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = 'star ' + (i < stars ? 'active' : 'inactive');
    span.textContent = '⭐';
    if (i < stars) span.style.animationDelay = (i * 0.2) + 's';
    dom.starsContainer.appendChild(span);
  }

  const lvlId = LEVELS[currentLevelIdx].id;
  if (!levelProgress.stars[lvlId] || levelProgress.stars[lvlId] < stars) {
    levelProgress.stars[lvlId] = stars;
  }
  if (lvlId >= levelProgress.unlocked && lvlId < LEVELS.length) {
    levelProgress.unlocked = Math.max(levelProgress.unlocked, lvlId + 1);
  }
  saveProgress();

  dom.btnNext.classList.toggle('hidden', currentLevelIdx >= LEVELS.length - 1);
  dom.overlay.classList.remove('hidden');
}

function showLose() {
  dom.overlayTitle.className = 'lose';
  dom.overlayTitle.textContent = '😔 Sconfitta';
  dom.overlayText.textContent = 'Mosse finite! Hai totalizzato ' + score + ' punti.';
  dom.starsContainer.innerHTML = '';
  dom.btnNext.classList.add('hidden');
  dom.overlay.classList.remove('hidden');
}

function buildMenu() {
  dom.levelGrid.innerHTML = '';
  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    const card = document.createElement('div');
    const unlocked = i + 1 <= levelProgress.unlocked;
    card.className = 'level-card' + (unlocked ? '' : ' locked');
    const starCount = levelProgress.stars[lvl.id] || 0;

    card.innerHTML = `
      <div class="level-num">${lvl.id}</div>
      <div class="level-stars">${'⭐'.repeat(starCount)}${'☆'.repeat(3 - starCount)}</div>
      <div class="level-obiettivo">${lvl.goal} pt · ${lvl.moves} mosse${lvl.jelly > 0 ? ' · 🧊' + lvl.jelly : ''}</div>
    `;

    if (unlocked) {
      card.addEventListener('click', () => startLevel(i));
    }
    dom.levelGrid.appendChild(card);
  }
}

function startLevel(idx) {
  currentLevelIdx = idx;
  const lvl = LEVELS[idx];
  score = 0;
  movesLeft = lvl.moves;
  gameOver = false;
  canInteract = true;
  selectedCell = null;
  comboCount = 0;

  initGrid(lvl);
  dom.menuView.classList.remove('active');
  dom.gameView.classList.add('active');
  dom.overlay.classList.add('hidden');
  renderBoard();
}

function goToMenu() {
  dom.gameView.classList.remove('active');
  dom.menuView.classList.add('active');
  dom.overlay.classList.add('hidden');
  buildMenu();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

dom.btnBack.addEventListener('click', goToMenu);
dom.btnRetry.addEventListener('click', () => startLevel(currentLevelIdx));
dom.btnNext.addEventListener('click', () => startLevel(currentLevelIdx + 1));
dom.btnMenu.addEventListener('click', goToMenu);

loadProgress();
buildMenu();
