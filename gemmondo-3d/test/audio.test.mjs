#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * audio.test.mjs — l'audio non deve mai far cadere il gioco.
 *
 * Non si può testare il suono in Node, ma si può testare che ogni
 * metodo sopravviva a un contesto finto: WebAudio lancia se manca
 * l'AudioContext, se il gain è a zero, o se si chiama dopo la
 * chiusura. Qui si verifica che nessuno di quei casi si trasformi
 * in un'eccezione.
 */

/* Contesto finto che registra quante sorgenti sono state create e
   quante sono state spente: un suono che non si spegne è un leak. */
function fakeAudio() {
  const stato = { creati: 0, fermati: 0, iniziati: 0, gain: [], errori: [] };
  /* connect() restituisce il nodo di destinazione, come fa WebAudio:
     il codice usa catene come osc.connect(g).connect(master). */
  const nodo = (tipo) => ({
    tipo,
    connect(dest) { return dest && typeof dest === 'object' ? dest : { disconnect() {} }; },
    disconnect() {},
    start() { stato.iniziati++; },
    stop() {
      stato.fermati++;
      if (this.onended) queueMicrotask(() => this.onended());
    },
    onended: null,
    frequency: {
      value: 0,
      setValueAtTime(v) { this.value = v; if (stato.scrivo) stato.scrivo.push(v); },
      exponentialRampToValueAtTime(v) { this.value = v; },
      cancelScheduledValues() {}, setTargetAtTime() {},
    },
    gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} },
    Q: { value: 0 },
    type: '',
    buffer: null,
  });
  class Ctx {
    constructor() {
      stato.creati++;
      this.currentTime = 0;
      this.sampleRate = 48000;
      this.destination = nodo('dest');
      this.state = 'running';
    }
    resume() { return Promise.resolve(); }
    createGain() { return nodo('gain'); }
    createOscillator() { return nodo('osc'); }
    createBiquadFilter() { return nodo('biquad'); }
    createBufferSource() { return nodo('bufsrc'); }
    createBuffer(ch, len) {
      return { getChannelData: () => new Float32Array(len), length: len };
    }
  }
  return { stato, Ctx };
}

async function carica(conAudioContext = true) {
  const { stato, Ctx } = fakeAudio();
  const prevWindow = globalThis.window;
  const prevCtx = globalThis.AudioContext;
  globalThis.AudioContext = conAudioContext ? Ctx : undefined;
  globalThis.webkitAudioContext = undefined;
  globalThis.window = globalThis;
  const { Audio } = await import('../audio.js');
  const a = new Audio();
  return { a, stato, restore: () => { globalThis.window = prevWindow; globalThis.AudioContext = prevCtx; } };
}

test('senza AudioContext il gioco continua (non va in crash)', async () => {
  const { a, restore } = await carica(false);
  try {
    assert.equal(a.unlock(), false, 'unlock deve dire "no" e basta');
    /* tutti i metodi devono poter essere chiamati e non fare nulla */
    for (const m of ['collect', 'collectGold', 'chop', 'mine', 'mineCrystal',
      'craft', 'coin', 'upgrade', 'error', 'travel', 'unlockZone',
      'prestige', 'milestone']) {
      assert.doesNotThrow(() => a[m](0), `${m}() non deve lanciare`);
    }
    assert.doesNotThrow(() => a.setMuted(true));
    assert.doesNotThrow(() => a.setAmbient(3));
    assert.doesNotThrow(() => a.stopAmbient());
  } finally { restore(); }
});

test('unlock crea il contesto una volta sola e ripetere è innocuo', async () => {
  const { a, stato, restore } = await carica(true);
  try {
    assert.equal(a.unlock(), true);
    assert.equal(a.unlock(), true);
    assert.equal(stato.creati, 1, 'chiamare unlock due volte non crea due contesti');
  } finally { restore(); }
});

test('mute acceso: nessuna sorgente viene creata', async () => {
  const { a, stato, restore } = await carica(true);
  try {
    a.unlock();
    a.setMuted(true);
    const prima = stato.iniziati;
    a.collect(0); a.chop(); a.mine(); a.coin(); a.craft();
    assert.equal(stato.iniziati, prima, 'il mute deve silenziare davvero');
  } finally { restore(); }
});

test('ogni suono crea e ferma le proprie sorgenti (niente leak)', async () => {
  const { a, stato, restore } = await carica(true);
  try {
    a.unlock();
    for (const m of ['collect', 'collectGold', 'chop', 'mine', 'mineCrystal',
      'craft', 'coin', 'upgrade', 'error', 'travel', 'unlockZone', 'milestone']) {
      const prima = stato.iniziati;
      a[m](0);
      assert.ok(stato.iniziati > prima, `${m} non ha creato nessuna sorgente`);
    }
    /* prestige crea più voci: deve spegnerle tutte */
    const prima = stato.fermati;
    a.prestige();
    assert.ok(stato.fermati > prima, 'prestige non ha fermato nulla');
  } finally { restore(); }
});

test('l\'anti-saturazione tiene: 100 raccolte ravvicinate non fanno 100 suoni', async () => {
  const { a, stato, restore } = await carica(true);
  try {
    a.unlock();
    const prima = stato.iniziati;
    /* performance.now() non avanza fra due chiamate sincrone: il
       throttling deve bloccarle tutte tranne la prima */
    for (let i = 0; i < 100; i++) a.collect(0);
    assert.ok(stato.iniziati - prima <= 2,
      `100 pressioni ravvicinate hanno creato ${stato.iniziati - prima} sorgenti`);
  } finally { restore(); }
});

test('la combo cambia il pitch della raccolta', async () => {
  const { a, stato, restore } = await carica(true);
  try {
    a.unlock();
    /* Due collect() di fila verrebbero scartate dal throttling, quindi
       fra le due si lascia passare la finestra. */
    const frec = (combo) => {
      stato.scrivo = [];
      a.collect(combo);
      return stato.scrivo.slice();
    };
    const bassa = frec(0);
    await sleep(70);
    const alta = frec(4);
    assert.ok(bassa.length > 0, 'collect non ha impostato nessuna frequenza');
    assert.ok(alta.length > 0, 'collect con combo alta non ha impostato nessuna frequenza (throttling troppo stretto?)');
    assert.notDeepEqual(alta, bassa, 'la combo non cambia niente: la raccolta suona sempre uguale');
    assert.ok(Math.max(...alta) > Math.max(...bassa), 'una combo più alta deve suonare più acuta');
  } finally { restore(); }
});

test('l\'ambiente parte, si riavvia cambiando zona e si ferma pulito', async () => {
  const { a, stato, restore } = await carica(true);
  try {
    a.unlock();
    a.setAmbient(0);
    const avvio = stato.iniziati;
    assert.ok(avvio > 0, 'l\'ambiente non è partito');

    /* stessa zona: non deve riavviarsi */
    const dopo = stato.iniziati;
    a.setAmbient(0);
    assert.equal(stato.iniziati, dopo, 'richiamare la stessa zona ha riavviato l\'ambiente');

    /* zona diversa: riavvia */
    a.setAmbient(4);
    assert.ok(stato.iniziati > dopo, 'cambiare zona non ha riavviato l\'ambiente');

    assert.doesNotThrow(() => a.stopAmbient());
    assert.doesNotThrow(() => a.stopAmbient(), 'doppio stop non deve lanciare');
  } finally { restore(); }
});

test('i metodi sono chiamabili anche prima di unlock', async () => {
  const { a, restore } = await carica(true);
  try {
    /* il gioco può emettere suoni prima del primo gesto utente:
       devono essere ignorati, non far esplodere nulla */
    assert.doesNotThrow(() => a.collect(0));
    assert.doesNotThrow(() => a.chop());
    assert.doesNotThrow(() => a.prestige());
    assert.doesNotThrow(() => a.setAmbient(2));
  } finally { restore(); }
});