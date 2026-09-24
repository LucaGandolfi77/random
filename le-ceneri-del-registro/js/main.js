import { loadState, saveState, clearState, loadSettings, saveSettings, defaultState, addOnce } from './core/state.js';
import audio from './core/audio.js';
import { el, clear, showScreen, toast, openSheet, closeSheet, typewriter } from './core/ui.js';
import { CHARACTERS } from './content/characters.js';
import { CHAPTERS, DIARY, countFragments, countQuizzes, countGamesInStory } from './content/story.js';
import { LESSONS, GLOSSARY } from './content/lessons.js';
import { GAMES, GAME_ORDER } from './content/minigames.js';
import { ACHIEVEMENTS } from './content/achievements.js';
import { runEngine } from './game/engines.js';

let state = loadState();
let settings = loadSettings();
window.__CDL_SETTINGS__ = settings;

const TOTALS = {
  chapters: CHAPTERS.length,
  fragments: countFragments(),
  quizzes: countQuizzes(),
  games: GAME_ORDER.length,
  glossary: GLOSSARY.length,
  storyGames: countGamesInStory()
};

const FRAGMENT_INDEX = (() => {
  const map = {};
  CHAPTERS.forEach((ch) => {
    ch.scenes.forEach((s, i) => {
      if (s.fragment) {
        map[s.fragment] = { text: s.text, chapter: ch.num, chapterId: ch.id, sceneIndex: i };
      }
    });
  });
  return map;
})();

const screenPlayer = {
  cleanup: null,
  typeWriter: null
};

function persist() {
  saveState(state);
}

function applySettingsToDom() {
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
  audio.setEnabled(settings.sound !== false);
  window.__CDL_SETTINGS__ = settings;
}

function greetingProgress() {
  const done = state.completed.length;
  const frag = state.fragments.length;
  const title = document.getElementById('title-progress');
  if (title) title.textContent = `${done} / ${TOTALS.chapters} capitoli · ${frag} frammenti`;
  const cont = document.getElementById('btn-continue');
  cont.hidden = !(done > 0 || state.scene > 0 || state.stats.plays > 0);
}

function checkAchievements() {
  const unlocked = (id) => state.achievements.includes(id);
  const grant = (id) => {
    if (unlocked(id)) return;
    state.achievements = addOnce(state.achievements, id);
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) toast(`<b>Successo</b> — ${a.title}: ${a.desc}`, 3400);
    audio.win();
  };
  if (state.completed.length >= 1) grant('first_step');
  if (state.gamesWon.length >= 1) grant('first_hash');
  if (state.gamesWon.includes('g04') || state.gamesWon.includes('g11') || state.gamesWon.includes('g28')) grant('first_sign');
  if (state.quizDone.length >= 1) grant('first_quiz');
  if (state.quizDone.length >= 6) grant('mid_story');
  if (state.quizDone.length >= 11) grant('almost_end');
  if (state.fragments.length >= 4) grant('frag_4');
  if (state.fragments.length >= 12) grant('frag_12');
  if (state.fragments.length >= TOTALS.fragments) grant('frag_all');
  if (state.gamesWon.length >= 10) grant('games_10');
  if (state.gamesWon.length >= TOTALS.games) grant('games_all');
  if (state.glossaryUnlocked.length >= 20) grant('glossary_20');
  if (state.flags.perfectChapterEver) grant('quiz_clean');
  if (state.completed.length >= TOTALS.chapters && !state.flags.darkMarked) grant('no_flags_dark');
  if (state.endings.includes('seed')) grant('ending_seed');
  if (state.endings.includes('glass')) grant('ending_glass');
  if (state.endings.includes('candle')) grant('ending_candle');
  persist();
}

function unlockTerms(terms) {
  (terms || []).forEach((t) => {
    state.glossaryUnlocked = addOnce(state.glossaryUnlocked, t);
  });
}

function avatarFor(who) {
  const c = CHARACTERS[who] || CHARACTERS.narrator;
  if (who === 'narrator' || !CHARACTERS[who]) {
    return el('div', { class: 'avatar narrator', text: '·', 'aria-hidden': 'true' });
  }
  return el('div', {
    class: 'avatar',
    text: c.initials,
    style: `background:${c.grad}`,
    'aria-hidden': 'true'
  });
}

function renderMap() {
  const chain = clear(document.getElementById('map-chain'));
  const highestUnlocked = Math.min(
    TOTALS.chapters - 1,
    state.completed.length + (state.completed.includes(CHAPTERS[state.chapter]?.id) ? 0 : 0)
  );
  CHAPTERS.forEach((ch, i) => {
    const done = state.completed.includes(ch.id);
    const prevDone = i === 0 || state.completed.includes(CHAPTERS[i - 1].id);
    const isCurrent = !done && prevDone;
    const locked = !done && !isCurrent;
    const card = el('button', {
      class: `chapter-card${done ? ' done' : ''}${isCurrent ? ' current' : ''}${locked ? ' locked' : ''}`,
      type: 'button',
      role: 'listitem'
    }, [
      el('div', { class: 'ch-index', text: done ? '✓' : ch.num }),
      el('div', { class: 'ch-body' }, [
        el('h3', { text: ch.title }),
        el('p', { text: ch.subtitle })
      ]),
      el('div', { class: 'ch-meta' }, [
        el('span', {
          class: 'ch-badge ' + (done ? 'ok' : isCurrent ? 'go' : ''),
          text: done ? 'chiuso' : isCurrent ? 'apri' : 'sigillato'
        })
      ])
    ]);
    card.addEventListener('click', () => {
      if (locked) {
        audio.error();
        toast('Questo blocco è ancora sigillato. Completa il capitolo precedente.');
        shakeEl(card);
        return;
      }
      audio.select();
      startChapter(i, done ? 0 : (state.chapter === i ? state.scene : 0));
    });
    chain.append(card);
  });

  document.getElementById('hud-fragments').textContent = `${state.fragments.length}/${TOTALS.fragments}`;
  document.getElementById('hud-quizzes').textContent = `${state.quizDone.length}/${TOTALS.quizzes}`;
  document.getElementById('hud-games').textContent = `${state.gamesWon.length}/${TOTALS.games}`;
  document.getElementById('hud-glossary').textContent = `${state.glossaryUnlocked.length}/${TOTALS.glossary}`;
  document.getElementById('map-subtitle').textContent =
    state.completed.length >= TOTALS.chapters ? 'la catena è completa — rileggi pure' : `${TOTALS.chapters} blocchi di memoria`;

  const note = document.getElementById('map-note') || document.getElementById('map-footer-note');
  const remaining = TOTALS.chapters - state.completed.length;
  note.textContent = remaining > 0
    ? `${remaining} capitoli da attraversare · ogni errore al quiz o alla sfida apre una spiegazione, non un muro.`
    : 'Hai attraversato tutta la catena. I tre finali restano nell\'archivio dei ricordi.';
  void highestUnlocked;
}

function shakeEl(node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}

function startChapter(index, sceneIndex = 0) {
  if (state.chapter !== index) {
    state.chapter = index;
    state.scene = 0;
  }
  state.scene = sceneIndex;
  state.stats.plays++;
  persist();
  showScreen('screen-story');
  playScene();
}

function chapter() {
  return CHAPTERS[state.chapter];
}

function updateProgress() {
  const ch = chapter();
  const pct = Math.min(100, ((state.scene + 1) / ch.scenes.length) * 100);
  document.getElementById('scene-progress-bar').style.width = `${pct}%`;
  document.getElementById('story-chapter-kicker').textContent = `Capitolo ${ch.num}`;
  document.getElementById('story-chapter-title').textContent = ch.title;
}

function goNext() {
  state.scene++;
  persist();
  playScene();
}

function cleanupScene() {
  if (screenPlayer.cleanup) {
    try { screenPlayer.cleanup(); } catch { /* noop */ }
  }
  screenPlayer.cleanup = null;
  screenPlayer.typeWriter = null;
}

function setAdvance(label, handler, show = true) {
  const btn = document.getElementById('btn-advance');
  clear(btn);
  btn.hidden = !show;
  btn.onclick = null;
  if (!show) return;
  btn.textContent = label;
  btn.onclick = () => {
    audio.blip();
    if (handler) handler();
  };
}

function playScene() {
  cleanupScene();
  updateProgress();
  const ch = chapter();
  const scene = ch.scenes[state.scene];
  if (!scene) {
    finishChapter();
    return;
  }
  const card = clear(document.getElementById('scene-card'));

  switch (scene.type) {
    case 'title': {
      state.flags.chapterQuizError = false;
      card.append(el('div', { class: 'chapter-title-card' }, [
        el('div', { class: 'num', text: `Capitolo ${ch.num}` }),
        el('h3', { text: ch.title }),
        el('p', { text: ch.subtitle })
      ]));
      setAdvance('Entra', () => { audio.select(); goNext(); });
      break;
    }
    case 'narr':
    case 'say': {
      const who = scene.type === 'narr' ? 'narrator' : scene.who;
      const c = CHARACTERS[who] || CHARACTERS.narrator;
      const textNode = el('p', {
        class: 'dialogue-text' + (who === 'narrator' ? ' narration' : '')
      });
      const headWho = who === 'narrator' ? { name: 'Vetrata', role: 'la città parla' } : { name: c.name, role: c.role };
      const box = el('div', { class: 'dialogue' }, [
        el('div', { class: 'dialogue-head' }, [
          avatarFor(who),
          el('div', {}, [
            el('div', { class: 'speaker-name', text: headWho.name }),
            el('div', { class: 'speaker-role', text: headWho.role })
          ])
        ]),
        textNode
      ]);
      card.append(box);
      if (scene.fragment) grantFragment(scene.fragment);
      const tw = typewriter(textNode, scene.text, { speed: settings.textSpeed });
      screenPlayer.typeWriter = tw;
      setAdvance('Continua', () => {
        if (!tw.done) tw.finish();
        else goNext();
      });
      box.addEventListener('click', () => {
        if (!tw.done) { tw.finish(); return; }
      });
      break;
    }
    case 'choice': {
      const textNode = el('p', { class: 'dialogue-text narration', text: scene.text });
      card.append(el('div', { class: 'dialogue' }, [
        el('div', { class: 'dialogue-head' }, [
          avatarFor('narrator'),
          el('div', {}, [
            el('div', { class: 'speaker-name', text: 'La notte chiede' }),
            el('div', { class: 'speaker-role', text: 'una risposta' })
          ])
        ]),
        textNode
      ]));
      const choices = el('div', { class: 'choices' });
      scene.options.forEach((opt) => {
        const btn = el('button', { class: 'choice', type: 'button' }, [
          document.createTextNode(opt.label),
          opt.hint ? el('small', { text: opt.hint }) : null
        ]);
        btn.addEventListener('click', () => {
          btn.classList.add('selected');
          audio.select();
          if (opt.flag) state.flags[opt.flag] = true;
          if (opt.markDark) state.flags.darkMarked = true;
          choices.querySelectorAll('.choice').forEach((b) => { if (b !== btn) b.style.opacity = '0.4'; });
          setTimeout(() => {
            if (opt.ending) {
              showEnding(opt.ending);
            } else {
              goNext();
            }
          }, 260);
        });
        choices.append(btn);
      });
      card.append(choices);
      setAdvance(null, null, false);
      break;
    }
    case 'lesson': {
      const L = LESSONS[scene.lesson];
      if (!L) { goNext(); return; }
      const box = el('div', { class: 'lesson-card' }, [
        el('div', { class: 'lesson-tag', text: 'concetto · registro' }),
        el('h3', { text: L.title }),
        el('p', { text: L.intro }),
        el('ul', {}, L.points.map((p) => el('li', { text: p }))),
        el('div', { class: 'deep', html: L.deep })
      ]);
      card.append(box);
      unlockTerms(L.terms);
      persist();
      setAdvance('Ho capito', goNext);
      break;
    }
    case 'quiz': {
      renderQuiz(card, scene);
      break;
    }
    case 'game': {
      renderGame(card, scene.game);
      break;
    }
    case 'checkpoint': {
      card.append(el('div', { class: 'chapter-title-card' }, [
        el('div', { class: 'num', text: 'capitolo chiuso' }),
        el('h3', { text: ch.title }),
        el('p', { text: 'Il blocco è stato aggiunto alla tua catena. Tocca per tornare alla mappa.' })
      ]));
      setAdvance('Torna alla mappa', finishChapter);
      break;
    }
    default:
      goNext();
  }
  checkAchievements();
}

function grantFragment(id) {
  if (!FRAGMENT_INDEX[id]) return;
  if (state.fragments.includes(id)) return;
  state.fragments = addOnce(state.fragments, id);
  persist();
  toast(`<b>Frammento</b> — ${id.toUpperCase()} recuperato dal taccuino`, 2800);
}

function renderQuiz(card, scene) {
  const already = state.quizDone.includes(scene.id);
  const box = el('div', { class: 'quiz-card' }, [
    el('h3', { text: 'Verifica di memoria' }),
    el('p', { class: 'quiz-sub', text: already ? 'già superato in precedenza' : 'una sola risposta regge il peso' }),
    el('p', { style: 'font-size:15.5px;line-height:1.5;margin:0 0 12px', text: scene.q })
  ]);
  const opts = el('div', { class: 'quiz-options' });
  const explain = el('div', { class: 'quiz-explain', text: scene.explain });
  box.append(opts, explain);
  card.append(box);

  let answered = false;
  scene.options.forEach((opt, i) => {
    const btn = el('button', { class: 'quiz-option', type: 'button', text: opt });
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const ok = i === scene.correct;
      opts.querySelectorAll('.quiz-option').forEach((b, bi) => {
        b.disabled = true;
        if (bi === scene.correct) b.classList.add('correct');
        if (bi === i && !ok) b.classList.add('wrong');
      });
      explain.classList.add('show');
      if (ok) {
        audio.win();
        if (!state.quizDone.includes(scene.id)) state.quizDone = addOnce(state.quizDone, scene.id);
        state.stats.quizStreak++;
        state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.quizStreak);
        toast('<b>Corretto</b> — il concetto è nel tuo archivio');
      } else {
        audio.error();
        state.stats.quizStreak = 0;
        state.flags.chapterQuizError = true;
      }
      persist();
      checkAchievements();
      setAdvance('Continua', goNext);
    });
    opts.append(btn);
  });
  if (already) setAdvance('Continua', goNext);
  else setAdvance(null, null, false);
}

function renderGame(card, gameId) {
  const def = GAMES[gameId];
  if (!def) { goNext(); return; }
  const head = el('div', { class: 'game-head' }, [
    el('div', { class: 'g-tag', text: 'sfida di protocollo' }),
    el('h3', { text: def.title }),
    el('p', { text: def.intro })
  ]);
  const body = el('div', { class: 'game-body' });
  const fb = el('div', { class: 'game-feedback', text: '' });
  body.append(fb);
  const result = el('div', { class: 'game-result' });
  const shell = el('div', { class: 'game-shell' }, [head, body, result]);
  card.append(shell);
  setAdvance(null, null, false);

  let finished = false;
  const cleanup = runEngine(def.engine, def.config, {
    body,
    feedback: fb,
    done(success) {
      if (finished) return;
      finished = true;
      if (screenPlayer.cleanup) { try { screenPlayer.cleanup(); } catch { /* noop */ } }
      if (success) {
        state.gamesWon = addOnce(state.gamesWon, gameId);
        unlockTerms(def.terms);
      }
      persist();
      renderResult(success);
      checkAchievements();
    }
  });
  screenPlayer.cleanup = typeof cleanup === 'function' ? cleanup : null;

  function renderResult(success) {
    clear(result);
    result.classList.add('show');
    result.classList.toggle('fail', !success);
    result.append(
      el('h4', { text: success ? 'Protocollo superato' : 'Il Registro ti lascia riprovare' }),
      el('p', { text: def.debrief })
    );
    const actions = el('div', { class: 'result-actions' });
    if (!success) {
      const retry = el('button', { class: 'btn ghost', type: 'button', text: 'Riprova' });
      retry.addEventListener('click', () => {
        audio.select();
        const cardNow = document.getElementById('scene-card');
        clear(cardNow);
        renderGame(cardNow, gameId);
      });
      actions.append(retry);
    }
    const next = el('button', {
      class: 'btn primary',
      type: 'button',
      text: success ? 'Continua' : 'Prosegui lo stesso'
    });
    next.addEventListener('click', () => { audio.blip(); goNext(); });
    actions.append(next);
    result.append(actions);
    if (success) {
      toast(`<b>Sfida</b> — ${def.title} completata`);
      unlockTerms(def.terms);
      persist();
    }
  }
}

function finishChapter() {
  const ch = chapter();
  const hadError = !!state.flags.chapterQuizError;
  state.flags.chapterQuizError = false;
  if (!hadError && ch.scenes.some((s) => s.type === 'quiz')) {
    const allDone = ch.scenes
      .filter((s) => s.type === 'quiz')
      .every((s) => state.quizDone.includes(s.id));
    if (allDone) state.flags.perfectChapterEver = true;
  }
  state.completed = addOnce(state.completed, ch.id);
  if (state.chapter < TOTALS.chapters - 1) {
    state.chapter = state.chapter + 1;
    state.scene = 0;
  } else {
    state.scene = 0;
  }
  persist();
  checkAchievements();
  audio.win();
  toast(`<b>Capitolo ${ch.num}</b> sigillato nella catena`);
  renderMap();
  showScreen('screen-map');
}

function showEnding(kind) {
  const meta = {
    seed: {
      tag: 'fine · seme',
      title: 'Il Seme',
      text: 'Firmi la proposta di Lina. Non salvano nessuno: aprono un percorso lento in cui il dolore resta leggibile, discutibile, vivo. Il Fornitore si dissolve non come nemico, ma come funzione non più necessaria. Sera resta archivista. Di notte legge, ancora, ad alta voce, le pagine che nessuno ha il coraggio di bruciare.'
    },
    glass: {
      tag: 'fine · vetro',
      title: 'Il Vetro',
      text: 'Accetti l’archiviazione gentile. La città dimentica insieme, e insieme finge che basti. Il giardino sopravvive, Sera dorme. Ma ogni anno, nello stesso blocco dell’allagamento, compare una riga vuota che i nodi non sanno interpretare — e qualcuno, sempre, finisce per chiedersi cosa manchi.'
    },
    candle: {
      tag: 'fine · candela',
      title: 'La Candela',
      text: 'Spegni il Fornitore e tieni tutto il peso. La catena non perdona, e non perdona nemmeno te: ogni notte rileggi, ogni notte reggi. Mila e Eidra vegliano a turno. Vetrata non guarisce — ma non mente più. A volte la verità è solo una candela in una stanza troppo grande.'
    }
  }[kind];

  state.endings = addOnce(state.endings, kind);
  const ch = chapter();
  state.completed = addOnce(state.completed, ch.id);
  persist();
  checkAchievements();

  const card = clear(document.getElementById('scene-card'));
  card.append(el('div', { class: 'end-card' }, [
    el('div', { class: 'e-tag', text: meta.tag }),
    el('h3', { text: meta.title }),
    el('p', { text: meta.text }),
    el('div', { class: 'stats' }, [
      el('span', { text: `frammenti ${state.fragments.length}/${TOTALS.fragments}` }),
      el('span', { text: `sfide ${state.gamesWon.length}/${TOTALS.games}` }),
      el('span', { text: `quiz ${state.quizDone.length}/${TOTALS.quizzes}` })
    ])
  ]));
  setAdvance('Torna alla catena', () => {
    if (state.chapter < TOTALS.chapters - 1) state.chapter = TOTALS.chapters - 1;
    state.scene = 0;
    persist();
    renderMap();
    showScreen('screen-map');
    toast('<b>Fine registrato.</b> Gli altri finali aspettano una rilettura.');
  });
  audio.win();
}

function openCodex(from = 'screen-map') {
  const root = document.getElementById('screen-codex');
  root.dataset.from = from;
  showScreen('screen-codex');
  renderCodex('glossary');
}

function renderCodex(tab) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  const body = clear(document.getElementById('codex-body'));
  if (tab === 'glossary') {
    GLOSSARY.forEach((g) => {
      const unlocked = state.glossaryUnlocked.includes(g.id);
      body.append(el('div', { class: 'codex-card' + (unlocked ? '' : ' locked') }, [
        el('span', { class: 'cat', text: g.cat }),
        el('h4', { text: unlocked ? g.term : 'termine sigillato' }),
        el('p', { text: unlocked ? g.def : 'Compara un concetto in storia o in una sfida per rivelarlo.' })
      ]));
    });
  } else if (tab === 'fragments') {
    Object.keys(FRAGMENT_INDEX).sort().forEach((id) => {
      const got = state.fragments.includes(id);
      const f = FRAGMENT_INDEX[id];
      body.append(el('div', { class: 'codex-card' + (got ? '' : ' locked') }, [
        el('span', { class: 'cat', text: got ? `cap. ${f.chapter}` : 'frammento perso' }),
        el('h4', { text: got ? id.toUpperCase() : '???' }),
        el('p', { text: got ? f.text : 'Ricordo non recuperato in questa lettura.' })
      ]));
    });
  } else if (tab === 'diary') {
    DIARY.forEach((d, i) => {
      const ch = CHAPTERS[i];
      const unlocked = ch ? state.completed.includes(ch.id) : false;
      body.append(el('div', { class: 'codex-card' + (unlocked ? '' : ' locked') }, [
        el('span', { class: 'cat', text: `taccuino · ${d.ch}` }),
        el('h4', { text: unlocked ? 'Lina' : 'pagina sigillata' }),
        el('p', { text: unlocked ? d.text : 'Si apre chiudendo il capitolo.' })
      ]));
    });
  } else if (tab === 'achievements') {
    ACHIEVEMENTS.forEach((a) => {
      const got = state.achievements.includes(a.id);
      body.append(el('div', { class: 'codex-card' + (got ? '' : ' locked') }, [
        el('div', { class: 'ach-row' + (got ? '' : ' locked') }, [
          el('div', { class: 'ach-icon', text: got ? a.icon : '?' }),
          el('div', {}, [
            el('h4', { text: got ? a.title : '—' }),
            el('p', { text: a.desc })
          ])
        ])
      ]));
    });
  }
}

function openSettings() {
  const body = el('div', {});
  const rows = [
    {
      key: 'sound',
      label: 'Suono ambientale',
      desc: 'Archivio sonoro procedurale — pioggia lontana e accordi lenti.',
      type: 'switch'
    },
    {
      key: 'haptics',
      label: 'Haptic',
      desc: 'Micro-vibrazioni su scelte e successi.',
      type: 'switch'
    },
    {
      key: 'reduceMotion',
      label: 'Riduci animazioni',
      desc: 'Disattiva transizioni e particelle.',
      type: 'switch'
    },
    {
      key: 'textSpeed',
      label: 'Velocità testo',
      desc: 'Quanto in fretta scrive la macchina da scrivere.',
      type: 'seg',
      options: [
        { v: 0.7, l: 'lenta' },
        { v: 1, l: 'media' },
        { v: 1.6, l: 'veloce' },
        { v: 4, l: 'subito' }
      ]
    }
  ];
  rows.forEach((r) => {
    const row = el('div', { class: 'setting-row' }, [
      el('div', {}, [
        el('div', { class: 's-label', text: r.label }),
        el('div', { class: 's-desc', text: r.desc })
      ])
    ]);
    if (r.type === 'switch') {
      const sw = el('button', {
        class: 'switch' + (settings[r.key] ? ' on' : ''),
        type: 'button',
        role: 'switch',
        'aria-checked': String(!!settings[r.key]),
        'aria-label': r.label
      });
      sw.addEventListener('click', () => {
        settings[r.key] = !settings[r.key];
        sw.classList.toggle('on', settings[r.key]);
        sw.setAttribute('aria-checked', String(settings[r.key]));
        saveSettings(settings);
        applySettingsToDom();
        audio.select();
      });
      row.append(sw);
    } else {
      const seg = el('div', { class: 'seg' });
      r.options.forEach((o) => {
        const b = el('button', {
          class: Number(settings[r.key]) === o.v ? 'on' : '',
          type: 'button',
          text: o.l
        });
        b.addEventListener('click', () => {
          settings[r.key] = o.v;
          saveSettings(settings);
          seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          audio.blip();
        });
        seg.append(b);
      });
      row.append(seg);
    }
    body.append(row);
  });

  const danger = el('button', {
    class: 'btn danger-soft wide',
    type: 'button',
    text: 'Azzerare la catena (nuova partita)',
    style: 'margin-top:16px'
  });
  danger.addEventListener('click', () => {
    clearState();
    state = defaultState();
    persist();
    closeSheet();
    greetingProgress();
    renderMap();
    showScreen('screen-title');
    toast('Catena azzerata. Il genesis ricomincia da te.');
  });
  body.append(danger);

  openSheet({
    title: 'Impostazioni',
    sub: 'Vetrata si adatta a come guardi la notte.',
    body
  });
}

function initFx() {
  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let raf = 0;
  const parts = [];
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 48; i++) {
    parts.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      s: 0.15 + Math.random() * 0.45,
      a: 0.15 + Math.random() * 0.4,
      drift: Math.random() * Math.PI * 2
    });
  }
  function frame() {
    if (settings.reduceMotion) {
      ctx.clearRect(0, 0, w, h);
      raf = requestAnimationFrame(frame);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y += p.s;
      p.x += Math.sin((p.y + p.drift * 40) / 60) * 0.22;
      if (p.y > h + 6) {
        p.y = -6;
        p.x = Math.random() * w;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(220, 190, 150, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  void raf;
}

function bindUI() {
  document.getElementById('btn-new').addEventListener('click', () => {
    audio.unlock();
    audio.select();
    if (state.stats.plays > 0 || state.completed.length > 0) {
      const sheet = openSheet({
        center: true,
        title: 'Ricominciare dalla genesis?',
        sub: 'La tua catena attuale verrà azzerata. Il registro non piange, ma tu forse sì.',
        body: el('div', { style: 'display:flex;gap:10px;flex-direction:column' }, [
          el('button', {
            class: 'btn primary wide',
            type: 'button',
            text: 'Sì, ricomincia',
            onclick: () => {
              clearState();
              state = defaultState();
              persist();
              closeSheet();
              startChapter(0, 0);
            }
          }),
          el('button', {
            class: 'btn ghost wide',
            type: 'button',
            text: 'No, mantieni la catena',
            onclick: () => closeSheet()
          })
        ])
      });
      void sheet;
      return;
    }
    startChapter(0, 0);
  });

  document.getElementById('btn-continue').addEventListener('click', () => {
    audio.unlock();
    audio.select();
    renderMap();
    showScreen('screen-map');
  });

  document.getElementById('btn-title-codex').addEventListener('click', () => openCodex('screen-title'));
  document.getElementById('btn-settings-title').addEventListener('click', openSettings);
  document.getElementById('btn-map-settings').addEventListener('click', openSettings);
  document.getElementById('btn-map-codex').addEventListener('click', () => openCodex('screen-map'));
  document.getElementById('btn-story-codex').addEventListener('click', () => openCodex('screen-story'));

  document.getElementById('btn-map-home').addEventListener('click', () => {
    showScreen('screen-title');
    greetingProgress();
  });

  document.getElementById('btn-story-back').addEventListener('click', () => {
    persist();
    renderMap();
    showScreen('screen-map');
  });

  document.getElementById('btn-codex-back').addEventListener('click', () => {
    const from = document.getElementById('screen-codex').dataset.from || 'screen-map';
    if (from === 'screen-title') {
      showScreen('screen-title');
      greetingProgress();
    } else if (from === 'screen-story') {
      showScreen('screen-story');
    } else {
      renderMap();
      showScreen('screen-map');
    }
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      audio.blip();
      renderCodex(tab.dataset.tab);
    });
  });

  const gesture = () => audio.unlock();
  window.addEventListener('pointerdown', gesture, { once: false });

  window.addEventListener('keydown', (e) => {
    if (!document.getElementById('screen-story').classList.contains('active')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      const btn = document.getElementById('btn-advance');
      if (!btn.hidden && btn.onclick) {
        e.preventDefault();
        btn.onclick();
      }
    }
  });
}

function handleHash() {
  const h = location.hash.replace('#', '');
  if (h === 'codex') openCodex('screen-map');
  else if (h === 'resume') {
    renderMap();
    showScreen('screen-map');
  }
}

async function boot() {
  applySettingsToDom();
  bindUI();
  initFx();
  greetingProgress();
  renderMap();

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch { /* offline still works via cache if prior */ }
  }

  setTimeout(() => {
    showScreen('screen-title');
    handleHash();
  }, 900);
}

boot();
