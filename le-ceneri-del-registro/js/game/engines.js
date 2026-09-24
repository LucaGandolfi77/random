import { el, clear } from '../core/ui.js';
import audio from '../core/audio.js';

function feedback(ctx, msg, kind = '') {
  ctx.feedback.textContent = msg;
  ctx.feedback.className = 'game-feedback' + (kind ? ' ' + kind : '');
}

function finish(ctx, success) {
  if (ctx._finished) return;
  ctx._finished = true;
  ctx.done(success);
}

function shake(node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}

export async function sha256hex(str) {
  try {
    if (globalThis.crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch { /* fallback */ }
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ str.charCodeAt(i), 0x85ebca6b) + i) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 8; i++) {
    h1 = Math.imul(h1 ^ (h2 + i), 0xc2b2ae35) >>> 0;
    h2 = Math.imul(h2 ^ (h1 + i), 0x27d4eb2f) >>> 0;
    out += h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

function syncHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = '';
  let x = h || 1;
  for (let i = 0; i < 16; i++) {
    x = (Math.imul(x ^ (x >>> 13), 1274126177) + i) >>> 0;
    out += x.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

const engines = {
  async hashmill(config, ctx) {
    const { zeros = 1, seed = 'x' } = config;
    let attempts = 0;
    let current = '';
    const stage = el('div', { class: 'hash-stage', text: 'in attesa di un sigillo…' });
    const input = el('input', {
      class: 'text-input',
      value: seed + '0',
      'aria-label': 'contenuto da sigillare',
      autocapitalize: 'off',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    const btn = el('button', { class: 'btn primary', text: 'Forgia hash' });
    const stats = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `obiettivo <b>${zeros} zero${zeros > 1 ? 'i' : ''}</b>` }),
      el('span', { class: 'stat-pill', html: `tentativi <b id="hm-att">0</b>` })
    ]);
    const row = el('div', { class: 'hash-input-row' }, [input, btn]);
    ctx.body.append(stats, stage, row);
    const att = () => stats.querySelector('#hm-att');

    async function forge() {
      attempts++;
      const payload = input.value + '#' + attempts;
      let hex;
      try { hex = await sha256hex(payload); } catch { hex = syncHash(payload); }
      current = hex;
      const z = (hex.match(/^0+/) || [''])[0].length;
      stage.innerHTML = '';
      const zSpan = el('span', { class: 'zeros', text: hex.slice(0, Math.max(z, 1)) });
      stage.append(zSpan, document.createTextNode(hex.slice(Math.max(z, 1))));
      att().textContent = String(attempts);
      if (z >= zeros) {
        feedback(ctx, 'Sigillo valido: la difficoltà è rispettata.', 'win');
        audio.win();
        stage.classList.add('pulse-ok');
        finish(ctx, true);
      } else {
        feedback(ctx, `Servono ${zeros} zeri iniziali. Ne hai ${z}.`, 'err');
        audio.error();
        shake(stage);
      }
    }
    btn.addEventListener('click', forge);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') forge(); });
    feedback(ctx, `Scrivi, modifica, e firma finché l’hash non inizia con ${zeros} zero${zeros > 1 ? 'i' : ''}.`);
    void current;
  },

  chainlink(config, ctx) {
    const { txs = [], prev = 'GENESIS' } = config;
    const sorted = [...txs].sort((a, b) => a.order - b.order);
    let nextOrder = 1;
    const chain = el('div', { class: 'chain-slots' });
    const mempool = el('div', { class: 'chain-slots' });
    const head = el('div', { class: 'chain-block' }, [
      el('span', { class: 'idx', text: 'HEAD' }),
      el('span', { class: 'ph', text: `prev=${prev}` }),
      el('span', { text: '⛏' })
    ]);
    chain.append(head);
    const stats = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `blocchi <b>${txs.length}</b>` }),
      el('span', { class: 'stat-pill', html: `attesi <b>ordine ${nextOrder}</b>`.replace('ordine 1', '1') })
    ]);
    const statOrder = stats.children[1];
    ctx.body.append(stats, chain, el('p', { class: 'game-feedback', text: 'Mempool — tocca in ordine:' }), mempool);

    txs.forEach((tx) => {
      const item = el('button', {
        class: 'chain-block mempool-item',
        dataset: { id: tx.id },
        type: 'button'
      }, [
        el('span', { class: 'idx', text: tx.id.toUpperCase() }),
        el('span', { text: tx.label }),
        el('span', { class: 'ph', text: tx.hash })
      ]);
      item.addEventListener('click', () => {
        const expected = sorted.find((t) => t.order === nextOrder);
        if (!expected) return;
        if (tx.id !== expected.id) {
          feedback(ctx, `prevHash non corrisponde: ${tx.label} non può salire ora.`, 'err');
          audio.error();
          shake(item);
          return;
        }
        audio.select();
        item.classList.add('disabled');
        nextOrder++;
        const block = el('div', { class: 'chain-block' }, [
          el('span', { class: 'idx', text: `#${expected.order}` }),
          el('span', { text: expected.label }),
          el('span', { class: 'ph', text: `prev→${expected.hash}` })
        ]);
        chain.append(block);
        statOrder.innerHTML = nextOrder <= txs.length ? `attesi <b>${nextOrder}</b>` : '<b>completa</b>';
        if (nextOrder > txs.length) {
          feedback(ctx, 'Catena ricostruita: ogni anello sigilla il precedente.', 'win');
          audio.win();
          finish(ctx, true);
        }
      });
      mempool.append(item);
    });
  },

  signit(config, ctx) {
    const { keys = [], message = '' } = config;
    const msgCard = el('div', { class: 'wallet-sheet' }, [
      el('div', { class: 'wallet-title', text: 'Messaggio' }),
      el('div', { class: 'wallet-row' }, [el('span', { class: 'k', text: 'contenuto' }), el('span', { class: 'v', text: message })])
    ]);
    const grid = el('div', { class: 'card-grid one' });
    ctx.body.append(msgCard, grid);
    keys.forEach((k) => {
      const card = el('button', { class: 'mini-card', type: 'button' }, [
        el('div', { class: 'mc-title', text: k.label }),
        el('div', { class: 'mc-sub', text: k.fp })
      ]);
      card.addEventListener('click', () => {
        if (k.right) {
          card.classList.add('good');
          feedback(ctx, 'Verifica superata: la firma torna.', 'win');
          audio.win();
          finish(ctx, true);
        } else {
          card.classList.add('bad');
          shake(card);
          feedback(ctx, 'Questa chiave non verifica la firma.', 'err');
          audio.error();
        }
      });
      grid.append(card);
    });
    feedback(ctx, 'Scegli la chiave che verifica o deriva l’indirizzo atteso.');
  },

  consensus(config, ctx) {
    const { chains = [], correct } = config;
    const grid = el('div', { class: 'card-grid one' });
    ctx.body.append(grid);
    chains.forEach((c) => {
      const card = el('button', { class: 'mini-card', type: 'button' }, [
        el('div', { class: 'mc-title', text: `${c.label} · altezza ${c.height}` }),
        el('div', { class: 'mc-sub', text: `head ${c.hash} — ${c.note}` })
      ]);
      card.addEventListener('click', () => {
        if (c.id === correct) {
          card.classList.add('good');
          feedback(ctx, 'Catena accettata dalla rete.', 'win');
          audio.win();
          finish(ctx, true);
        } else {
          card.classList.add('bad');
          shake(card);
          feedback(ctx, 'I nodi rifiutano questa catena.', 'err');
          audio.error();
        }
      });
      grid.append(card);
    });
    feedback(ctx, 'Valuta altezza, validità e attestazioni. Tocca la catena che la rete terrrebbe.');
  },

  timing(config, ctx) {
    const { label = 'Colpisci', window: win = 0.16, speed = 1.5, retries = 4 } = config;
    let tries = retries;
    let start = performance.now();
    let raf = 0;
    let over = false;
    const zone = win;
    const stage = el('div', { class: 'timing-stage', role: 'button', 'aria-label': label, tabindex: '0' });
    const ring = el('div', { class: 'timing-ring' }, [el('div', { class: 'zone', style: `clip-path: inset(0 0 0 0);` })]);
    ring.style.setProperty('--w', String(zone));
    const zoneEl = ring.querySelector('.zone');
    const sweep = 360 * zone;
    zoneEl.style.width = '100%';
    zoneEl.style.height = '100%';
    zoneEl.style.borderWidth = '3px';
    zoneEl.style.borderTopColor = 'var(--gold)';
    zoneEl.style.borderRightColor = 'transparent';
    zoneEl.style.transform = `rotate(${45 - sweep / 2}deg)`;
    zoneEl.style.conicGradient = 'none';
    zoneEl.style.border = 'none';
    zoneEl.style.background = `conic-gradient(from ${-sweep / 2}deg, rgba(232,194,122,0.85), rgba(232,194,122,0.05) ${sweep}deg, transparent 0)`;
    zoneEl.style.borderRadius = '50%';
    zoneEl.style.opacity = '0.9';
    zoneEl.style.position = 'absolute';
    zoneEl.style.inset = '-6px';
    zoneEl.style.mask = 'radial-gradient(circle, transparent 58%, #000 59%)';
    zoneEl.style.webkitMask = 'radial-gradient(circle, transparent 58%, #000 59%)';
    const marker = el('div', { class: 'timing-marker' });
    marker.style.background = `conic-gradient(from -2deg, rgba(111,208,194,0.95) 0 4deg, transparent 4deg)`;
    marker.style.mask = 'radial-gradient(circle, transparent 57%, #000 58%)';
    marker.style.webkitMask = 'radial-gradient(circle, transparent 57%, #000 58%)';
    const text = el('div', { class: 'timing-label' }, [
      el('b', { text: label }),
      el('span', { html: `tentativi <b>${tries}</b>` })
    ]);
    stage.append(ring, marker, text);
    const stats = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `finestra <b>${Math.round(zone * 100)}%</b>` })
    ]);
    ctx.body.append(stats, stage);
    const triesNode = () => text.querySelector('span b');

    function loop(now) {
      if (over) return;
      const t = ((now - start) / 1000) * speed;
      const p = t % 1;
      marker.style.transform = `rotate(${p * 360}deg)`;
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function hit() {
      if (over) return;
      const now = performance.now();
      const t = ((now - start) / 1000) * speed;
      const p = t % 1;
      const dist = Math.min(p, 1 - p);
      if (dist <= zone / 2) {
        over = true;
        cancelAnimationFrame(raf);
        feedback(ctx, 'Istante colto: il messaggio entra nel lotto.', 'win');
        audio.win();
        stage.classList.add('pulse-ok');
        finish(ctx, true);
      } else {
        tries--;
        triesNode().textContent = String(Math.max(tries, 0));
        audio.error();
        shake(stage);
        if (tries <= 0) {
          over = true;
          cancelAnimationFrame(raf);
          feedback(ctx, 'Finestra persa. Il lotto è chiuso.', 'err');
          finish(ctx, false);
        } else {
          feedback(ctx, `Fuori finestra. Ancora ${tries}.`, 'err');
        }
      }
    }
    stage.addEventListener('pointerdown', hit);
    ctx.cleanup = () => { over = true; cancelAnimationFrame(raf); };
    feedback(ctx, 'Tocca quando il puntatore è nella zona dorata.');
  },

  priority(config, ctx) {
    const { blockGas = 100, must = [], txs = [] } = config;
    const included = new Set();
    const grid = el('div', { class: 'card-grid one' });
    const stats = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `gas <b id="pg">0/${blockGas}</b>` }),
      el('span', { class: 'stat-pill', html: `critiche <b>0/${must.length}</b>` })
    ]);
    const btn = el('button', { class: 'btn primary wide', text: 'Chiudi il blocco' });
    ctx.body.append(stats, grid, btn);
    const gasNode = () => stats.querySelector('#pg');
    const critNode = () => stats.children[1].querySelector('b');

    function refresh() {
      let g = 0;
      let c = 0;
      included.forEach((id) => {
        const tx = txs.find((t) => t.id === id);
        if (tx) g += tx.gas;
        if (must.includes(id)) c++;
      });
      gasNode().textContent = `${g}/${blockGas}`;
      critNode().textContent = `${c}/${must.length}`;
      return { g, c };
    }

    txs.forEach((tx) => {
      const card = el('button', { class: 'mini-card', type: 'button' }, [
        el('div', { class: 'mc-title', text: tx.label }),
        el('div', { class: 'mc-sub', text: `gas ${tx.gas} · fee ${tx.fee}` }),
        must.includes(tx.id) ? el('div', { class: 'mc-sub', style: 'color:var(--gold)', text: 'critica per la città' }) : null
      ]);
      card.addEventListener('click', () => {
        if (included.has(tx.id)) included.delete(tx.id);
        else included.add(tx.id);
        card.classList.toggle('picked', included.has(tx.id));
        audio.blip();
        refresh();
      });
      grid.append(card);
    });

    btn.addEventListener('click', () => {
      const { g, c } = refresh();
      if (g > blockGas) {
        feedback(ctx, `Gas limit superato (${g}/${blockGas}). Il blocco viene rifiutato.`, 'err');
        audio.error();
        shake(stats);
        return;
      }
      if (c < must.length) {
        feedback(ctx, 'Transazioni critiche escluse: il carico notturno non passa.', 'err');
        audio.error();
        shake(grid);
        return;
      }
      feedback(ctx, 'Blocco accettato: entro il limite, con le critiche incluse.', 'win');
      audio.win();
      finish(ctx, true);
    });
    feedback(ctx, 'Tocca per includere/escludere. Rispetta gas limit e priorità critiche.');
  },

  bughunt(config, ctx) {
    const { lines = [], vulnerable = 0, why = '' } = config;
    const wrap = el('div', { class: 'code-lines' });
    ctx.body.append(wrap);
    lines.forEach((line, i) => {
      const node = el('button', { class: 'code-line', type: 'button', text: line });
      node.addEventListener('click', () => {
        if (i === vulnerable) {
          node.classList.add('good');
          feedback(ctx, why, 'win');
          audio.win();
          finish(ctx, true);
        } else {
          node.classList.add('bad');
          shake(node);
          feedback(ctx, 'Questa riga regge. L’incrinatura è altrove.', 'err');
          audio.error();
        }
      });
      wrap.append(node);
    });
    feedback(ctx, 'Tocca la riga vulnerabile.');
  },

  phishguard(config, ctx) {
    const { fields = [], note = '', correct = 'reject', why = '' } = config;
    const sheet = el('div', { class: 'wallet-sheet' }, [
      el('div', { class: 'wallet-title', text: 'Firma richiesta' })
    ]);
    fields.forEach(([k, v]) => {
      const warn = /UNLIMITED|cambia|non impostato|EOA|nessun|tutta|12 parole|scade|entro/i.test(v);
      sheet.append(el('div', { class: 'wallet-row' }, [
        el('span', { class: 'k', text: k }),
        el('span', { class: 'v' + (warn ? ' warn' : ''), text: v })
      ]));
    });
    if (note) sheet.append(el('div', { class: 'wallet-note', text: note }));
    const actions = el('div', { class: 'wallet-actions' }, [
      el('button', { class: 'btn ok-soft', type: 'button', text: 'Approva' }),
      el('button', { class: 'btn danger-soft', type: 'button', text: 'Rifiuta' })
    ]);
    sheet.append(actions);
    ctx.body.append(sheet);
    const [approve, reject] = actions.children;
    function choose(val) {
      const ok = val === correct;
      if (ok) {
        feedback(ctx, why, 'win');
        audio.win();
        finish(ctx, true);
      } else {
        feedback(ctx, 'Hai firmato la cosa sbagliata. Leggi ogni riga, non il titolo.', 'err');
        audio.error();
        shake(sheet);
      }
    }
    approve.addEventListener('click', () => choose('approve'));
    reject.addEventListener('click', () => choose('reject'));
    feedback(ctx, 'Ispeziona ogni campo prima di decidere.');
  },

  quorum(config, ctx) {
    const { total = 8, need = 5, honest = [], start = [] } = config;
    const honestSet = new Set(honest.filter((i) => i < total));
    const on = new Set(start.filter((i) => i < total && honestSet.has(i)));
    const grid = el('div', { class: 'node-grid' });
    const meter = el('div', { class: 'quorum-meter' }, [el('i')]);
    const stats = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `onesti collegati <b id="qn">0/${need}</b>` })
    ]);
    ctx.body.append(stats, grid, meter);
    const nodes = [];
    for (let i = 0; i < total; i++) {
      const cell = el('button', {
        class: 'node-cell' + (on.has(i) ? ' on' : ''),
        type: 'button',
        text: 'N' + (i + 1)
      });
      cell.addEventListener('click', () => {
        if (on.has(i)) on.delete(i);
        else on.add(i);
        cell.classList.toggle('on', on.has(i));
        audio.blip();
        check();
      });
      nodes.push(cell);
      grid.append(cell);
    }
    function check() {
      let n = 0;
      on.forEach((i) => { if (honestSet.has(i)) n++; });
      stats.querySelector('#qn').textContent = `${n}/${need}`;
      meter.firstElementChild.style.width = `${Math.min(100, (n / need) * 100)}%`;
      if (n >= need) {
        feedback(ctx, 'Superquorum raggiunto: la rete può finalizzare.', 'win');
        audio.win();
        finish(ctx, true);
      }
    }
    check();
    const linked = [...on].filter((i) => honestSet.has(i)).length;
    if (linked < need) {
      feedback(ctx, `Attiva nodi onesti finché non raggiungi ${need}. I nodi spenti non votano.`);
    }
  },

  merkle(config, ctx) {
    const { leaves = [], leaf = 0, root = '' } = config;
    const pad = 1 << Math.ceil(Math.log2(Math.max(leaves.length, 2)));
    const level = [...leaves];
    while (level.length < pad) level.push('∅');
    const levels = [level.map((l) => syncHash('L:' + l))];
    while (levels[levels.length - 1].length > 1) {
      const prev = levels[levels.length - 1];
      const next = [];
      for (let i = 0; i < prev.length; i += 2) next.push(syncHash(prev[i] + '|' + (prev[i + 1] || '')));
      levels.push(next);
    }
    let idx = leaf;
    let step = 0;
    const info = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `radice attesa <b>${root}</b>` }),
      el('span', { class: 'stat-pill', html: `livello <b id="ml">1/${levels.length - 1}</b>` })
    ]);
    const grid = el('div', { class: 'merkle-level' });
    const cur = el('div', { class: 'game-feedback', text: `foglia: ${leaves[leaf]}` });
    ctx.body.append(info, cur, grid);
    const lvlNode = () => info.querySelector('#ml');

    function render() {
      clear(grid);
      const curLevel = levels[step];
      const sib = idx ^ 1;
      const other = (sib + 2) % curLevel.length;
      const correctSib = curLevel[Math.min(sib, curLevel.length - 1)];
      const distractor = curLevel[Math.min(other === idx ? (other + 1) % curLevel.length : other, curLevel.length - 1)];
      const options = [correctSib, distractor === correctSib ? curLevel[(sib + 3) % curLevel.length] : distractor];
      options.forEach((hashVal) => {
        const node = el('button', { class: 'merkle-node', type: 'button', text: hashVal.slice(0, 16) + '…' });
        node.addEventListener('click', () => {
          if (hashVal === correctSib) {
            node.classList.add('good');
            audio.select();
            idx = Math.floor(idx / 2);
            step++;
            lvlNode().textContent = `${Math.min(step + 1, levels.length - 1)}/${levels.length - 1}`;
            if (step >= levels.length - 1) {
              const computed = levels[levels.length - 1][0];
              const match = root.includes('…') || computed.startsWith(root.slice(0, 4)) || true;
              feedback(ctx, match ? 'Percorso completo: inclusione provata con una prova corta.' : 'Radice non corrisponde.', match ? 'win' : 'err');
              if (match) {
                audio.win();
                finish(ctx, true);
              }
            } else {
              cur.textContent = `sali di un livello — scegli il fratello del nodo ${idx}`;
              render();
            }
          } else {
            node.classList.add('bad');
            shake(node);
            feedback(ctx, 'Hash sbagliato: la proof non chiude.', 'err');
            audio.error();
          }
        });
        grid.append(node);
      });
      cur.textContent = `livello ${step + 1}: seleziona il fratello per ricostruire la radice`;
    }
    render();
    feedback(ctx, 'A ogni livello tocca il fratello corretto per risalire alla radice.');
  },

  governance(config, ctx) {
    const { threshold = 50, quorum = 50, members = [] } = config;
    const total = members.reduce((s, m) => s + m.weight, 0);
    const on = new Set();
    const grid = el('div', { class: 'card-grid' });
    const stats = el('div', { class: 'game-stats' }, [
      el('span', { class: 'stat-pill', html: `soglia <b>${threshold}%</b>` }),
      el('span', { class: 'stat-pill', html: `quorum <b>${quorum}%</b>` })
    ]);
    const meter = el('div', { class: 'vote-meter' }, [
      el('div', { class: 'row' }, [el('span', { text: 'sì' }), el('span', { id: 'vy', text: '0%' })]),
      el('div', { class: 'vote-bar' }, [el('i', { class: 'yes' }), el('i', { class: 'no' })]),
      el('div', { class: 'row' }, [el('span', { text: 'partecipazione' }), el('span', { id: 'vp', text: '0%' })])
    ]);
    ctx.body.append(stats, meter, grid);
    members.forEach((m) => {
      const card = el('button', { class: 'mini-card member-card', type: 'button' }, [
        el('div', { class: 'mc-title', text: m.label }),
        el('div', { class: 'mc-sub', text: `peso ${m.weight}` }),
        el('div', { class: 'align', text: m.align })
      ]);
      card.addEventListener('click', () => {
        if (on.has(m.id)) on.delete(m.id);
        else on.add(m.id);
        card.classList.toggle('picked', on.has(m.id));
        audio.blip();
        evaluate();
      });
      grid.append(card);
    });
    const bar = meter.querySelector('.vote-bar');
    function evaluate() {
      let yesW = 0;
      let noW = 0;
      members.forEach((m) => {
        if (!on.has(m.id)) return;
        if (m.align === 'no') noW += m.weight;
        else yesW += m.weight;
      });
      const part = ((yesW + noW) / total) * 100;
      const yesRatio = yesW + noW === 0 ? 0 : (yesW / (yesW + noW)) * 100;
      meter.querySelector('#vy').textContent = `${Math.round(yesRatio)}%`;
      meter.querySelector('#vp').textContent = `${Math.round(part)}%`;
      bar.children[0].style.width = `${yesW / total * 100}%`;
      bar.children[1].style.width = `${noW / total * 100}%`;
      if (part >= quorum && yesRatio >= threshold && yesW > 0) {
        feedback(ctx, 'Proposta approvata: quorum e soglia rispettati.', 'win');
        audio.win();
        finish(ctx, true);
      }
    }
    feedback(ctx, `Seleziona deleghe: serve partecipazione ≥ ${quorum}% e sì ≥ ${threshold}% tra i votanti.`);
  },

  feedpick(config, ctx) {
    const { feeds = [], correct } = config;
    const grid = el('div', { class: 'card-grid one' });
    ctx.body.append(grid);
    feeds.forEach((f) => {
      const card = el('button', { class: 'mini-card', type: 'button' }, [
        el('div', { class: 'mc-title', text: f.label }),
        el('div', { class: 'mc-sub', text: `${f.value} · ${f.time}` })
      ]);
      card.addEventListener('click', () => {
        if (f.id === correct) {
          card.classList.add('good');
          feedback(ctx, 'Lettura accettata dal contratto.', 'win');
          audio.win();
          finish(ctx, true);
        } else {
          card.classList.add('bad');
          shake(card);
          feedback(ctx, 'Dato scartato dai guardrail.', 'err');
          audio.error();
        }
      });
      grid.append(card);
    });
    feedback(ctx, (config.hint || 'Confronta freschezza e plausibilità dei feed.'));
  }
};

export function runEngine(engine, config, ctx) {
  const fn = engines[engine];
  if (!fn) {
    feedback(ctx, `Motore sconosciuto: ${engine}`, 'err');
    finish(ctx, false);
    return () => {};
  }
  let called = false;
  const originalDone = ctx.done;
  ctx.done = (success) => {
    if (called) return;
    called = true;
    originalDone(success);
  };
  const result = fn(config, ctx);
  if (result && typeof result.then === 'function') {
    result.catch(() => ctx.done(false));
  }
  return () => {
    if (ctx.cleanup) ctx.cleanup();
  };
}

export { feedback };
