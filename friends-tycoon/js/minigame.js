/* MINIGAME — motore dei minigiochi per attività. Tipi: dice, catch, double, scratch, sequence.
   Ogni tipo ha render(conf) → html, bind(conf, mod, done) → interazioni, resolve(conf, outcome) → risultato.
   resolve() è pura e testabile: i test passano l'esito direttamente. */
'use strict';

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

const MINIGAME = {
  has(activityId){ return !!MINIGAMES[activityId]; },
  conf(activityId){ return MINIGAMES[activityId]; },

  /* risolvi un esito (API pubblica, usata anche dai test) */
  resolve(activityId, outcome){
    const conf = this.conf(activityId);
    return this._engine[conf.type].resolve(conf, outcome);
  },

  /* avvia il minigioco: apre il modal, alla fine chiama onDone(mods) */
  play(activityId, onDone, ui){
    const conf = this.conf(activityId);
    const eng = this._engine[conf.type];
    const sheet = `
      <button class="close" data-mg-close>✕</button>
      <div class="result-hero">
        <div class="emoji">${conf.emoji}</div>
        <h2>🎮 ${esc(conf.name)}</h2>
        <p>${esc(conf.blurb)}</p>
      </div>
      <div id="mg-zone">${eng.render(conf)}</div>
      ${conf.gamble ? '<p class="sub mt">🎲 Gioco d\'azzardo: la posta è il divertimento (e i soldi).</p>' : ''}`;
    ui.openModal(sheet);
    const mod = $id('modal');
    mod.querySelector('[data-mg-close]').addEventListener('click', () => ui.closeModal());
    eng.bind(conf, mod, (outcome) => {
      const mods = this._finish(conf, outcome);
      ui.closeModal();
      onDone(mods);
    });
  },

  /* esito → modificatori per sim.run */
  _finish(conf, outcome){
    const r = this._engine[conf.type].resolve(conf, outcome);
    let moneyDelta = r.moneyDelta || 0;
    if (moneyDelta < 0) moneyDelta = Math.max(-G.money, moneyDelta);
    return {
      happyMul: r.happyMul != null ? r.happyMul : 1,
      repMul: r.repMul != null ? r.repMul : 1,
      moneyDelta,
      messages: r.messages || [],
      mini: { emoji: conf.emoji, label: r.label, moneyDelta }
    };
  },

  /* helper: fascia migliore tra i tier (per punteggio/somma) */
  _tier(conf, value){
    let t = conf.tiers[conf.tiers.length - 1];
    for (const x of conf.tiers) if (value >= x.at){ t = x; break; }
    return t;
  },

  _engine: {
    /* 🎲 dadi: somma dei dadi contro i tier */
    dice: {
      render(conf){
        const rolls = Array.from({ length: conf.dice }, () => (conf.sides <= 6 ? DICE_FACES[0] : '🎲'));
        return `<div class="mg-dice">${rolls.join(' ')}</div>
          <p class="sub">${conf.sides <= 6 ? 'Dado' : 'Dado da'} ${conf.dice}× ${conf.sides} facce. La sorte decide.</p>
          <button class="btn gold" data-roll>🎲 Lancia!</button>`;
      },
      bind(conf, mod, done){
        mod.querySelector('[data-roll]').addEventListener('click', () => {
          const roll = Array.from({ length: conf.dice }, () => 1 + Math.floor(rnd() * conf.sides));
          const faces = roll.map(v => (conf.sides <= 6 ? DICE_FACES[v - 1] : '<b>' + v + '</b>'));
          const sum = roll.reduce((a, b) => a + b, 0);
          const zone = mod.querySelector('#mg-zone');
          zone.innerHTML = `<div class="mg-dice big">${faces.join(' ')}</div>
            <p class="sub">Totale: <b>${sum}</b></p>`;
          audio.click();
          setTimeout(() => done({ roll, sum }), 650);
        });
      },
      resolve(conf, o){
        const sum = o.sum != null ? o.sum : (o.roll || []).reduce((a, b) => a + b, 0);
        const t = MINIGAME._tier(conf, sum);
        return {
          label: t.label, emoji: t.emoji,
          happyMul: t.mul, repMul: t.mul,
          messages: ['🎲 Dado' + (conf.dice > 1 ? 'i' : '') + ': ' + (o.roll ? o.roll.join(' + ') : sum) + ' = ' + sum + ' → ' + t.label + '!']
        };
      }
    },

    /* 🎯 reazione: ferma il cursore sul punto giusto */
    catch: {
      render(conf){
        return `<div class="mg-track">
            <div class="mg-sweet" style="left:${conf.target}%"></div>
            <div class="mg-marker" id="mg-mark" style="left:0%"></div>
          </div>
          <p class="sub">Il cursore va… e viene. Premete FERMA al momento giusto.</p>
          <button class="btn gold" data-stop>✋ FERMA!</button>`;
      },
      bind(conf, mod, done){
        const mark = mod.querySelector('#mg-mark');
        let pos = 0, dir = 1;
        const iv = setInterval(() => {
          pos += dir * 2.4;
          if (pos >= 100){ pos = 100; dir = -1; }
          if (pos <= 0){ pos = 0; dir = 1; }
          mark.style.left = pos + '%';
        }, 22);
        mod.querySelector('[data-stop]').addEventListener('click', () => {
          clearInterval(iv);
          audio.click();
          done({ pos: Math.round(pos) });
        });
      },
      resolve(conf, o){
        const score = Math.max(0, 100 - Math.round(Math.abs(o.pos - conf.target) * 1.6));
        const t = MINIGAME._tier(conf, score);
        return {
          label: t.label, emoji: t.emoji,
          happyMul: t.mul, repMul: t.mul,
          messages: ['🎯 Prestazione ' + score + '/100 → ' + t.label + '!']
        };
      }
    },

    /* 💰 raddoppia o niente (azzardo) */
    double: {
      render(conf){
        return `<div class="mg-pot">Pot: <b>€${conf.stake}</b></div>
          <div class="row mt" style="gap:8px">
            <button class="btn gold" data-double>🎲 Raddoppia!</button>
            <button class="btn green" data-cash>💰 Fermo, incasso!</button>
          </div>
          <p class="sub mt">Raddoppi: il dado vince al ${Math.round(conf.winOdds * 100)}%. Se perdi, perdi la posta.</p>`;
      },
      bind(conf, mod, done){
        const potEl = mod.querySelector('[data-pot]');
        let pot = conf.stake;
        const show = () => { potEl.innerHTML = 'Pot: <b>€' + pot + '</b>'; };
        mod.querySelector('[data-double]').addEventListener('click', () => {
          const win = rnd() < conf.winOdds;
          if (win){ pot *= 2; show(); audio.buy(); }
          else done({ finalPot: 0 });
        });
        mod.querySelector('[data-cash]').addEventListener('click', () => done({ finalPot: pot }));
      },
      resolve(conf, o){
        if (o.finalPot <= 0){
          return { label: 'AZZARDO FALLITO', emoji: '💸', happyMul: 0.7, repMul: 0.9, moneyDelta: -conf.stake,
            messages: ['💸 Il dado era contro: la posta è andata in fumo.'] };
        }
        return { label: 'BANCO INCASSATO', emoji: '💰', happyMul: 1.3, repMul: 1.1, moneyDelta: o.finalPot - conf.stake,
          messages: ['💰 Banco! Incassati €' + o.finalPot + ' (netto +€' + (o.finalPot - conf.stake) + ').'] };
      }
    },

    /* 🎟️ gratta e vinci (azzardo) */
    scratch: {
      render(conf){
        return `<div class="mg-grid">${conf.symbols.map((s, i) => `<button class="mg-cell" data-cell="${i}">🎴</button>`).join('')}</div>
          <p class="sub mt">Gratta 3 caselle: tre simboli uguali = vincita!</p>`;
      },
      bind(conf, mod, done){
        const win = rnd() < (conf.winOdds || 0.34);
        const base = conf.symbols[Math.floor(rnd() * conf.symbols.length)];
        let hidden;
        if (win){
          hidden = [base, base, base];
        }else{
          const other = conf.symbols.filter(s => s !== base);
          hidden = [base, other[Math.floor(rnd() * other.length)], other[Math.floor(rnd() * other.length)]];
        }
        const cells = mod.querySelectorAll('[data-cell]');
        let revealed = 0;
        cells.forEach((b, i) => b.addEventListener('click', () => {
          if (b.textContent !== '🎴') return;
          b.textContent = hidden[i];
          b.classList.add('revealed');
          revealed++;
          audio.click();
          if (revealed === 3) setTimeout(() => done({ win }), 550);
        }));
      },
      resolve(conf, o){
        if (o.win){
          return { label: 'JACKPOT!', emoji: '🤑', happyMul: 1.5, repMul: 1.1, moneyDelta: conf.prize - conf.stake,
            messages: ['🤑 Tre simboli uguali: la schedina ha ripagato tutto. +€' + (conf.prize - conf.stake) + '.'] };
        }
        return { label: 'RASOIO', emoji: '🍋', happyMul: 0.8, repMul: 0.95, moneyDelta: -conf.stake,
          messages: ['🍋 Niente tripletta: la schedina era truccata.'] };
      }
    },

    /* 🧠 memoria: ripeti la sequenza nell'ordine esatto */
    sequence: {
      render(conf){
        const seq = conf.items.slice(0, conf.length).map(s => `<span>${s}</span>`).join('');
        return `<div class="mg-seq">${seq}</div>
          <button class="btn mt" data-shuffle>🃏 Mischia! (ricorda l'ordine)</button>
          <div class="mg-choices" hidden></div>`;
      },
      bind(conf, mod, done){
        const seq = conf.items.slice(0, conf.length);
        const shuffle = [...conf.items];
        for (let i = shuffle.length - 1; i > 0; i--){
          const j = Math.floor(rnd() * (i + 1));
          const tmp = shuffle[i]; shuffle[i] = shuffle[j]; shuffle[j] = tmp;
        }
        mod.querySelector('[data-shuffle]').addEventListener('click', () => {
          mod.querySelector('.mg-seq').classList.add('blur');
          const box = mod.querySelector('.mg-choices');
          box.hidden = false;
          box.innerHTML = shuffle.map((s, i) => `<button class="mg-choice" data-i="${i}">${s}</button>`).join('');
          let correct = 0, over = false;
          mod.querySelectorAll('.mg-choice').forEach(b => b.addEventListener('click', () => {
            if (over) return;
            if (b.textContent === seq[correct]){
              correct++;
              b.classList.add('good');
              b.disabled = true;
              audio.tick();
              if (correct === seq.length){ over = true; setTimeout(() => done({ correct, total: seq.length }), 450); }
            }else{
              over = true;
              b.classList.add('bad');
              audio.sad();
              setTimeout(() => done({ correct, total: seq.length }), 450);
            }
          }));
        });
      },
      resolve(conf, o){
        const ratio = o.correct / o.total;
        if (ratio >= 1) return { label: 'PERFETTO!', emoji: '👨‍🍳', happyMul: 1.5, repMul: 1.1, messages: ['👨‍🍳 Ordine perfetto: nessun ingrediente fuori posto.'] };
        if (ratio >= 0.6) return { label: 'CI SIAMO QUASI', emoji: '😋', happyMul: 1.15, repMul: 1.0, messages: ['😋 Quasi: qualcuno ha messo il sale nel caffè.'] };
        return { label: 'CAOS!', emoji: '🔥', happyMul: 0.75, repMul: 0.9, messages: ['🔥 Ordine sbagliato: le costolette finiscono nel frullatore.'] };
      }
    }
  }
};