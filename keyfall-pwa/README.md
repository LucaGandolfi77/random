# Keyfall — MIDI falling keys (PWA)

Carica un file **`.mid` / `.midi`** e guarda le note cadere come tasti luminosi su un
pianoforte orizzontale — stile Synthesia / Piano Tiles — con audio sintetizzato incluso.
PWA: funziona **offline**, installabile, 100% nel browser (nessun file MIDI lascia il tuo
dispositivo).

![stack](icons/icon-192.png)

## Avvio

```bash
node serve.js            # poi apri http://localhost:4173
PORT=8080 node serve.js  # porta custom
```

> I service worker richiedono un contesto sicuro: apri sempre via `http://localhost`,
> mai `file://`.

Prova subito senza un file: premi **Demo** (un'étude originale generata al volo dal codice).

## Funzionalità

- **Parser MIDI proprio** (formati 0 e 1): note, velocity, canali, nomi traccia, tempo
  (mappa dei cambi BPM), signature, **pedale sustain (CC64)**.
- **Renderer Canvas DPI-aware**: barre che cadono sincronizzate al tempo, tasti che si
  illuminano alla pressione, burst di particelle all'impatto, etichette C, adattamento
  tastiera al range del brano.
- **Pianoforte Web Audio** senza campioni: oscillatori a strati + inviluppo
  velocity-sensitive + riverbero generato + limiter.
- **Trasporto**: play/pausa (spazio), stop, scrub temporale, **tempo 0.4×–2×**,
  volume, loop, riverbero on/off.
- **Impostazioni**: 3 temi colore (Aurora / Ember / Ice), trasposizione ±1 ottava,
  tastiera aderente, etichette — salvate in `localStorage`.
- **UX**: drag & drop, click sui tasti per provare una nota (quando è in pausa),
  pannello dettagli con legenda canali, toast, dark theme, `prefers-reduced-motion`.
- **PWA**: `manifest.webmanifest` + service worker (cache-first) + icone generate
  (192/512/maskable).

## Struttura

```
keyfall-pwa/
├── index.html            # shell app
├── css/style.css         # tema
├── js/
│   ├── midi.js           # parser + builder MIDI (UMD, testabile in Node)
│   ├── audio.js          # engine Web Audio
│   ├── renderer.js       # canvas: tasti + barre cadenti + FX base
│   └── app.js            # controller: load, scheduler, transport, settings
├── manifest.webmanifest
├── sw.js                 # service worker
├── icons/                # icone PWA (generate)
├── tools/gen-icons.js    # rigenera le icone (PNG encoder puro)
├── test/engine.test.js   # round-trip parser/builder
└── serve.js              # server statico di preview
```

## Test

```bash
node test/engine.test.js   # 20 check sul motore MIDI
```

## Limiti e note

- Il suono è un pianoforte *sintetizzato*: timbro gradevole ma non campionato. Per un
  suono realistico si può collegare un soundfont esterno.
- I cambi di tempo (tempo map) sono rispettati nella timeline; i pitch bend non sono
  riprodotti (il visual segue le note nominali).
- Le icone e la demo sono generate localmente: nessuna risorsa remota.

## Installazione PWA

- **Desktop**: icona installa nella barra degli indirizzi (Chrome/Edge).
- **Android**: menu → "Aggiungi a schermata Home".
- **iOS Safari**: Condividi → "Aggiungi a Home" (l'audio parte da un gesto utente, come da
  policy del browser).
