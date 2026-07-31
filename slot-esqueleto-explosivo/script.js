/* ===================================================
   💀 Esqueleto Explosivo Clone — Client
   UI, animazioni e replay del round dal motore.
   La matematica/RNG vivono in engine.js.
   =================================================== */
(function () {
  'use strict';

  const E = window.EsqueletoEngine;
  const CONFIG = E.CONFIG;
  const META = E.SYMBOL_META;
  const ROWS = CONFIG.rows;
  const COLS = CONFIG.cols;
  const SKULLS = window.SkullSymbols.SKULLS;

  /* ==============================
     🎵 AUDIO (Web Audio)
     ============================== */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(freq, duration, type, vol) {
    try {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* audio non disponibile */ }
  }

  function playSpinSound() {
    playTone(440, 0.08, 'triangle', 0.08);
    setTimeout(() => playTone(550, 0.08, 'triangle', 0.08), 60);
    setTimeout(() => playTone(660, 0.08, 'triangle', 0.08), 120);
  }

  function playDropSound() {
    playTone(220 + Math.random() * 60, 0.09, 'sawtooth', 0.05);
  }

  function playWinSound(big) {
    const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'triangle', 0.12), i * 110));
  }

  function playExplosionSound() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playTone(100 + Math.random() * 200, 0.1, 'sawtooth', 0.1), i * 28);
    }
  }

  function playWildSound() {
    const melody = [784, 1047, 1319, 1568];
    melody.forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'square', 0.08), i * 70));
  }

  /* ==============================
     🎉 PARTICELLE
     ============================== */
  const particleContainer = document.getElementById('particleContainer');

  function spawnParticles(emoji, count, explode) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = emoji;
      const x = 15 + Math.random() * 70;
      p.style.left = `${x}vw`;
      p.style.top = explode ? `${25 + Math.random() * 40}vh` : `${-10 + Math.random() * 10}vh`;
      p.style.fontSize = `${1 + Math.random() * 1.4}rem`;
      p.style.setProperty('--fall-duration', `${1.4 + Math.random() * 2}s`);
      if (explode) {
        p.classList.add('explode');
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 320}px`);
        p.style.setProperty('--dy', `${(Math.random() - 0.5) * 320}px`);
        p.style.setProperty('--explode-duration', `${0.7 + Math.random() * 0.7}s`);
      }
      particleContainer.appendChild(p);
      setTimeout(() => p.remove(), 3000);
    }
  }

  function spawnCellExplosion(cellEl, big) {
    const rect = cellEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const emojis = ['💀', '☠️', '🌺', '🎭', '⚔️', '⭐', '✨', '🔥', '🎺', '🦴'];
    const count = big ? 14 : 7;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle explode';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.position = 'fixed';
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.fontSize = `${1.1 + Math.random() * 1}rem`;
      p.style.setProperty('--dx', `${(Math.random() - 0.5) * 380}px`);
      p.style.setProperty('--dy', `${(Math.random() - 0.5) * 380}px`);
      p.style.setProperty('--explode-duration', `${0.6 + Math.random() * 0.6}s`);
      particleContainer.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  /* ==============================
     🎰 STATO
     ============================== */
  let balance = CONFIG.startingBalance;
  let bet = CONFIG.betLevels[2];
  let currency = '€';
  let spinning = false;
  let autoMode = false;
  let autoRemaining = 0;
  let pendingBet = false;

  /* ==============================
     DOM REFS
     ============================== */
  const grid = document.getElementById('slotGrid');
  const balanceEl = document.getElementById('balanceDisplay');
  const betEl = document.getElementById('betDisplay');
  const winDisplayEl = document.getElementById('winDisplay');
  const betAmountEl = document.getElementById('betAmount');
  const spinBtn = document.getElementById('spinBtn');
  const autoBtn = document.getElementById('autoBtn');
  const betUp = document.getElementById('betUp');
  const betDown = document.getElementById('betDown');
  const currencySelect = document.getElementById('currencySelect');
  const multiplierTrack = document.getElementById('multiplierTrack');
  const paytableGrid = document.getElementById('paytableGrid');
  const winMessage = document.getElementById('winMessage');
  const autoplayPanel = document.getElementById('autoplayPanel');
  const autoplayStatus = document.getElementById('autoplayStatus');
  const autoplayOptions = document.getElementById('autoplayOptions');
  const errorOverlay = document.getElementById('errorOverlay');
  const errorDetail = document.getElementById('errorDetail');

  const cells = [];

  /* ==============================
     ✨ SETUP
     ============================== */
  function buildGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < CONFIG.cellCount; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = i;
      const span = document.createElement('span');
      span.className = 'cell-symbol';
      cell.appendChild(span);
      grid.appendChild(cell);
      cells.push(cell);
    }
  }

  function setCellSymbol(cellEl, symbolId) {
    const meta = META[symbolId];
    const span = cellEl.querySelector('.cell-symbol');
    span.innerHTML = SKULLS[symbolId] || meta.emoji;
    span.className = `cell-symbol${symbolId === CONFIG.wildId ? ' sym-wild' : ''}`;
    cellEl.dataset.symbolId = symbolId;
  }

  function buildMultiplierLadder() {
    multiplierTrack.innerHTML = '';
    CONFIG.multiplierLadder.forEach(v => {
      const node = document.createElement('div');
      node.className = 'mult-node';
      node.dataset.value = v;
      node.textContent = `×${v}`;
      multiplierTrack.appendChild(node);
    });
  }

  function updateLadder(value) {
    const nodes = multiplierTrack.querySelectorAll('.mult-node');
    for (const n of nodes) {
      n.classList.toggle('active', Number(n.dataset.value) === value);
    }
  }

  function buildPaytable() {
    paytableGrid.innerHTML = '';
    const paying = CONFIG.symbols.filter(s => s.id !== CONFIG.wildId);
    paying.forEach(sym => {
      const meta = META[sym.id];
      const row = document.createElement('div');
      row.className = 'pay-row';
      if (sym.id === 'gold') row.classList.add('top-row');
      const left = document.createElement('span');
      left.innerHTML = `<span class="pay-sym">${SKULLS[sym.id]}</span><span class="pay-name">${meta.name}</span>`;
      const vals = document.createElement('span');
      const p = CONFIG.paytable[sym.id];
      vals.innerHTML = `<span class="pay-val">3× ${p[3]}×</span><span class="pay-val">4× ${p[4]}×</span><span class="pay-val">5× ${p[5]}×</span>`;
      row.appendChild(left);
      row.appendChild(vals);
      paytableGrid.appendChild(row);
    });
    const wildRow = document.createElement('div');
    wildRow.className = 'pay-row wild-row';
    wildRow.innerHTML = `<span><span class="pay-sym sym-wild">${SKULLS[CONFIG.wildId]}</span><span class="pay-name">Explosivo Wild</span></span><span class="pay-val">sostituisce + esplode 3×3</span>`;
    paytableGrid.appendChild(wildRow);
  }

  function formatMoney(v) {
    return currency + v.toLocaleString('it-IT');
  }

  function updateUI() {
    balanceEl.textContent = formatMoney(balance);
    betEl.textContent = formatMoney(bet);
    betAmountEl.textContent = formatMoney(bet);
    const rtp = ((CONFIG.rtpMeasured || CONFIG.rtpTarget) * 100).toFixed(2);
    const badge = document.querySelector('.rtp-badge');
    if (badge) badge.textContent = `RTP ${rtp}%`;
  }

  function popEl(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  function showWinMessage(text, big) {
    winMessage.textContent = text;
    winMessage.classList.remove('show', 'big-win');
    if (big) winMessage.classList.add('big-win');
    winMessage.classList.add('show');
  }

  function clearWinMessage() {
    winMessage.classList.remove('show', 'big-win');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /* ==============================
     💥 ANIMAZIONI GRIGLIA
     ============================== */
  function renderGridState(symbolIds) {
    for (let i = 0; i < cells.length; i++) {
      setCellSymbol(cells[i], symbolIds[i]);
      cells[i].classList.remove('blank', 'win-highlight', 'skull-explode', 'cascade-fall', 'landing');
    }
  }

  function animateInitialDrop(symbolIds) {
    return new Promise(resolve => {
      renderGridState(symbolIds);
      cells.forEach((cell, i) => {
        const col = i % COLS;
        cell.classList.add('landing');
        cell.style.animationDelay = `${col * 60}ms`;
        if (i < COLS) playDropSound();
      });
      const duration = 700 + COLS * 60;
      setTimeout(() => {
        cells.forEach(cell => {
          cell.classList.remove('landing');
          cell.style.animationDelay = '';
        });
        resolve();
      }, duration);
    });
  }

  function animateCascade(prevGrid, newGrid, removedSet) {
    return new Promise(resolve => {
      const pending = [];
      for (let c = 0; c < COLS; c++) {
        const removedInCol = new Set();
        for (let r = 0; r < ROWS; r++) {
          const idx = r * COLS + c;
          if (removedSet.has(idx)) removedInCol.add(idx);
        }
        const survivors = [];
        for (let r = 0; r < ROWS; r++) {
          const idx = r * COLS + c;
          if (!removedInCol.has(idx)) survivors.push({ idx, sym: prevGrid[idx], oldRow: r });
        }
        const survivorCount = survivors.length;
        for (let r = 0; r < ROWS; r++) {
          const idx = r * COLS + c;
          const cell = cells[idx];
          cell.classList.remove('blank');
          if (r >= ROWS - survivorCount) {
            const s = survivors[r - (ROWS - survivorCount)];
            setCellSymbol(cell, newGrid[idx]);
            const dist = r - s.oldRow;
            if (dist > 0) {
              cell.classList.add('cascade-fall');
              cell.style.setProperty('--fall-from', `-${dist * 100}%`);
              cell.style.animationDelay = `${c * 25}ms`;
              pending.push(cell);
            }
          } else {
            setCellSymbol(cell, newGrid[idx]);
            cell.classList.add('cascade-fall');
            cell.style.setProperty('--fall-from', `-${(r + 1) * 100}%`);
            cell.style.animationDelay = `${c * 25}ms`;
            pending.push(cell);
          }
        }
      }
      setTimeout(() => {
        pending.forEach(cell => {
          cell.classList.remove('cascade-fall');
          cell.style.removeProperty('--fall-from');
          cell.style.removeProperty('animation-delay');
        });
        resolve();
      }, 600 + COLS * 25);
    });
  }

  function highlightWins(wins) {
    const seen = new Set();
    for (const w of wins) {
      for (const idx of w.cells) {
        if (seen.has(idx)) continue;
        seen.add(idx);
        cells[idx].classList.add('win-highlight');
      }
    }
  }

  function explodeCells(removedCells, wilds) {
    return new Promise(resolve => {
      const wildSet = new Set(wilds);
      removedCells.forEach((idx, i) => {
        const cell = cells[idx];
        const span = cell.querySelector('.cell-symbol');
        span.classList.add('skull-explode');
        const isWild = wildSet.has(idx);
        spawnCellExplosion(cell, isWild);
        if (isWild) playWildSound();
        else if (i % 3 === 0) playExplosionSound();
      });
      setTimeout(() => {
        for (const idx of removedCells) {
          const cell = cells[idx];
          cell.classList.add('blank');
          cell.classList.remove('win-highlight');
          const span = cell.querySelector('.cell-symbol');
          span.classList.remove('skull-explode');
        }
        resolve();
      }, 750);
    });
  }

  /* ==============================
     🎰 FLUSSO SPIN
     ============================== */
  async function spin() {
    if (spinning) return;
    if (balance < bet) {
      showWinMessage('😅 Saldo insufficiente!');
      return;
    }

    clearWinMessage();
    spinning = true;
    spinBtn.disabled = true;
    betUp.disabled = true;
    betDown.disabled = true;
    winDisplayEl.textContent = formatMoney(0);
    initAudio();
    playSpinSound();

    balance -= bet;
    pendingBet = true;
    updateUI();
    popEl(balanceEl);

    const rng = E.createRng();
    let timeline;
    try {
      timeline = E.runRound(bet, rng);
    } catch (err) {
      handleMalfunction(err);
      return;
    }

    try {
      const steps = timeline;
      await animateInitialDrop(steps[0].grid);
      updateLadder(steps[0].multiplier);

      for (let k = 0; k < steps.length; k++) {
        const step = steps[k];

        highlightWins(step.wins);

        if (step.stepWin > 0) {
          winDisplayEl.textContent = formatMoney(step.roundTotal);
          popEl(winDisplayEl);
          playWinSound(step.stepWin >= bet * 3);
          showWinMessage(`+${formatMoney(step.stepWin)} (×${step.multiplier})`);
        }

        if (step.wilds.length > 0) {
          showWinMessage(`💥 ¡EXPLOSIVO WILD! ×${step.multiplier}`);
          playWildSound();
        }

        if (step.removedCells.length > 0) {
          await explodeCells(step.removedCells, step.wilds);
        }

        if (step.ended) {
          updateLadder(CONFIG.multiplierLadder[0]);
          if (step.removedCells.length > 0) {
            for (const idx of step.removedCells) {
              const cell = cells[idx];
              cell.classList.remove('blank');
              setCellSymbol(cell, step.grid[idx]);
            }
            await sleep(150);
          }
          break;
        }

        updateLadder(steps[k + 1].multiplier);
        await sleep(150);
        await animateCascade(step.grid, steps[k + 1].grid, new Set(step.removedCells));
      }

      const roundWin = steps[steps.length - 1].roundTotal;
      balance += roundWin;
      pendingBet = false;
      updateUI();
      popEl(balanceEl);

      if (roundWin > 0) {
        const big = roundWin >= bet * 5;
        showWinMessage(`💀 ¡Felicidades! +${formatMoney(roundWin)} ${big ? '🔥' : '🎉'}`, big);
        spawnParticles(big ? '💀' : '✨', big ? 25 : 10, true);
        playWinSound(big);
      }
    } catch (err) {
      handleMalfunction(err);
      return;
    } finally {
      spinning = false;
      spinBtn.disabled = false;
      betUp.disabled = false;
      betDown.disabled = false;
    }

    /* Autoplay chain */
    if (autoMode) {
      if (autoRemaining > 0 && balance >= bet) {
        autoRemaining--;
        autoplayStatus.textContent = `⚡ Round automatici rimasti: ${autoRemaining}`;
        setTimeout(spin, 700);
      } else {
        stopAuto(true);
      }
    }
  }

  /* ==============================
     ⚠️ MALFUNZIONAMENTO
     ============================== */
  function handleMalfunction(err) {
    spinning = false;
    autoMode = false;
    autoRemaining = 0;
    spinBtn.disabled = false;
    betUp.disabled = false;
    betDown.disabled = false;
    autoBtn.classList.remove('active');
    autoBtn.textContent = '🔄 Auto';

    if (pendingBet) {
      balance += bet;
      pendingBet = false;
    }
    updateUI();

    errorDetail.textContent = (err && err.message) ? err.message : String(err);
    errorOverlay.classList.add('active');
    playTone(220, 0.5, 'sawtooth', 0.15);
  }

  /* ==============================
     🎛 CONTROLLI
     ============================== */
  function changeBet(dir) {
    if (spinning) return;
    const idx = CONFIG.betLevels.indexOf(bet);
    const next = dir > 0 ? Math.min(idx + 1, CONFIG.betLevels.length - 1) : Math.max(idx - 1, 0);
    if (idx !== next) {
      bet = CONFIG.betLevels[next];
      updateUI();
      popEl(betAmountEl);
    }
  }

  betUp.addEventListener('click', () => changeBet(1));
  betDown.addEventListener('click', () => changeBet(-1));

  spinBtn.addEventListener('click', () => {
    if (!spinning) spin();
  });

  currencySelect.addEventListener('change', () => {
    currency = currencySelect.value;
    updateUI();
  });

  /* --- Autoplay --- */
  autoBtn.addEventListener('click', () => {
    if (autoMode) {
      stopAuto(false);
      return;
    }
    autoplayPanel.classList.toggle('open');
  });

  autoplayOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.auto-opt');
    if (!btn || spinning || autoMode) return;
    autoRemaining = Number(btn.dataset.rounds);
    autoMode = true;
    autoBtn.classList.add('active');
    autoBtn.textContent = '⏹ Stop';
    autoplayPanel.classList.remove('open');
    autoplayStatus.textContent = `⚡ Round automatici rimasti: ${autoRemaining}`;
    spin();
  });

  function stopAuto(insufficient) {
    autoMode = false;
    autoRemaining = 0;
    autoBtn.classList.remove('active');
    autoBtn.textContent = '🔄 Auto';
    if (insufficient) {
      autoplayStatus.textContent = '⛔ Auto fermo — saldo insufficiente';
      showWinMessage('😅 Saldo insufficiente');
    } else {
      autoplayStatus.textContent = '⏹ Auto fermo';
    }
  }

  errorOverlay.addEventListener('click', (e) => {
    if (e.target.id === 'errorRestartBtn' || e.target === errorOverlay) {
      location.reload();
    }
  });

  /* --- Swipe to spin (mobile) --- */
  let touchStartY = 0;
  document.addEventListener('touchstart', (e) => {
    if (spinning) return;
    if (e.target.closest('.btn') || e.target.closest('.paytable') || e.target.closest('.currency-select')) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (spinning) return;
    if (e.target.closest('.btn') || e.target.closest('.paytable') || e.target.closest('.currency-select')) return;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dy < 10) spin();
  }, { passive: true });

  /* ==============================
     ⚡ INIT
     ============================== */
  function init() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    buildGrid();
    buildMultiplierLadder();
    buildPaytable();
    updateUI();
    updateLadder(CONFIG.multiplierLadder[0]);
    renderGridState(
      Array.from({ length: CONFIG.cellCount }, () => E.weightedPick(E.createRng()))
    );
    cells.forEach(cell => cell.classList.remove('cascade-fall', 'landing'));
  }

  init();
})();
