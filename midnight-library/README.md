# Lumina — La Biblioteca di Mezzanotte

**Midnight Library** — cozy game mobile installabile come PWA. HTML + CSS + JavaScript vanilla, nessun framework, nessun backend.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-offline--first-blueviolet)](#pwa)
[![Tests](https://img.shields.io/badge/tests-522%20assertions-brightgreen)](#test)
[![i18n](https://img.shields.io/badge/i18n-IT%2FEN-lightgrey)](#accessibilità)

> *Ogni libro attende il suo lettore.* / *Every book awaits its reader.*

---

## Concept

Sei il Custode di una biblioteca che esiste solo da mezzanotte all'alba. Accendi lanterne, riponi libri sul tavolo, prepara il tè e accogli lettori-spettro. Con l'Inchiostro guadagnato cataloghi volumi rari nello Scaffale delle Curiosità. Un gatto-ombra si siede dove agisci: interagisci lì e ottieni un piccolo bonus. Nessuna penalità, nessun timer stressante, sessioni da 3-8 minuti.

---

## Esecuzione

Serve la cartella con un qualsiasi server HTTP locale (i moduli ES6 richiedono `http://`, non `file://`):

```bash
cd midnight-library
python3 -m http.server 8080
# apri http://localhost:8080
```

oppure

```bash
npx serve .
# oppure, dopo npm install:
npm start
```

> **Nota MIME:** `python3 -m http.server` serve il manifest come `application/octet-stream`. Per un comportamento PWA completo usa `npx serve .` (che mappa correttamente `.webmanifest`) oppure qualsiasi server che rispetti `application/manifest+json`.

---

## Struttura dei file

```
midnight-library/
├── index.html              # Markup semantico: welcome, stanze, pannelli, lettere, editor
├── styles.css              # Design system, stanze, animazioni, responsive
├── content.json            # Contenuto di gioco versionato (Fase 1 · config-driven)
├── manifest.webmanifest    # Manifest PWA (id, share_target, icone PNG)
├── service-worker.js       # Strategia mista: Network-First + Stale-While-Revalidate (v5)
├── offline.html            # Fallback di navigazione offline
├── package.json            # Scripts (start/check/test/icons) + devDep jsdom
├── LICENSE                 # MIT
├── README.md               # Questo file (con TODO del piano e roadmap)
│
├── src/
│   ├── app.js              # Bootstrap (unico entry)
│   ├── controller.js       # Input → Model → View; loop, autosave, editor save, stanze
│   ├── view.js             # Rendering DOM puro (nessuna regola di gioco)
│   ├── i18n.js             # Catalogo stringhe UNICO IT/EN
│   ├── config.js           # Costanti di gioco, timing, SAVE_KEY, IDB
│   ├── model/
│   │   ├── content.js      # Loader + validazione di content.json (embedded + fetch)
│   │   ├── data.js         # Re-export del content (libri, messaggi, milestone, stanze)
│   │   ├── state.js        # defaultState, validateAndMigrate, tick, moon, isRoomUnlocked
│   │   └── actions.js      # Azioni pure con parametro `now` (+ switchRoom/attività)
│   └── services/
│       ├── storage.js      # localStorage + diff + fallback IDB + subscribe cross-tab
│       ├── idb.js          # IndexedDB KV (archivio lettere, fallback quota)
│       ├── audio.js        # Web Audio synth (nessun asset esterno)
│       ├── pwa.js          # SW registration, install prompt, File System Access, share
│       ├── share.js        # Web Share · cartolina PNG canvas (Fase 3)
│       ├── zip.js          # ZIP minimo (store/deflate) per *.luminapack (Fase 3)
│       ├── mods.js         # Validate/load/persist/apply pack mod, no eval (Fase 3)
│       ├── multiplayer.js  # WebRTC signaling manuale + DataChannel (Fase 3)
│       └── a11y.js         # describeRoom SR + Web Speech commands (Fase 3)
│
├── icons/
│   ├── icon.svg, maskable.svg
│   ├── icon-180.png, icon-192.png, icon-512.png, maskable-512.png
│
├── tests/
│   ├── model.test.mjs      # 198 asserzioni sul Model puro (+ Fase 3 services)
│   ├── migration.test.mjs  # 223 asserzioni migration harness + parità content.json
│   └── integration.test.mjs# 101 asserzioni View+Controller+storage (jsdom) + Fase 3 UI
│
└── tools/
    ├── gen-icons.mjs       # Genera i 4 PNG da zero (zlib nativo, zero dipendenze)
    ├── check-syntax.mjs    # node --check su tutti i .js/.mjs
    └── http-check.mjs      # Serve staticamente e verifica 33 path HTTP 200
```

---

## Architettura MVC

### Diagramma del flusso

```
CARICAMENTO INIZIALE
────────────────────
Storage Service (src/services/storage.js)
  → JSON.parse + try/catch
  → validazione e migrazione (model/state.js: validateAndMigrate)
  → Model (state)
  → Controller (src/controller.js: start → bind listeners)
  → View (src/view.js: cacheElements + render*)
  → DOM aggiornato

INTERAZIONE (ciclo continuo)
────────────────────────────
input utente (click/tap/tastiera/swipe)
  → Controller (delega data-action, chiama Model.<azione>(state, now))
  → Model (muta lo stato, applica le regole, restituisce un risultato)
  → stato aggiornato
  → View.render*(state)  →  DOM aggiornato
  → Controller salva (storage) + riproduce audio (audio) + haptics

LOOP DEL MONDO (ogni 5s)
─────────────────────────
Controller.onTick (fermato se document.hidden — B9)
  → Model.tick (rigenerazione passiva, cap 1h — B19)
  → Model.worldTick (spawn libri/lettori/eventi, spegnimento lanterne)
  → handleWorldEvents (toast + sfx)
  → View.renderDynamic
```

### Responsabilità

| Modulo | Cosa fa | Cosa NON fa |
|---|---|---|
| **Model** (`src/model/*`) | Stato serializzabile, regole di gameplay, inventario, risorse, sblocchi, milestone, validazione/migrazione del salvataggio, dati (libri rari, messaggi, tutorial, lettere) | Non accede al DOM, non parla con localStorage, non emette suoni, non chiama `Date.now()` in modo nascosto (il tempo entra come parametro `now`) |
| **View** (`src/view.js`) | Rendering del DOM, pannelli, toast, particelle, dialoghi, i18n dinamico (`data-i18n`), luna, lettere | Non contiene regole di gioco, non muta lo stato, non usa `innerHTML` con dati dinamici |
| **Controller** (`src/controller.js`) | Registra gli event listener (delegati su `data-action`), interpreta la tastiera, invoca il Model, chiede alla View di aggiornarsi, coordina audio/haptics/wake-lock/parallasse, loop del mondo e autosave, flusso install/update SW | Non modifica direttamente lo stato (solo tramite le azioni del Model), non scrive HTML insicuro |
| **Services** | `storage.js` persistenza + subscribe cross-tab · `audio.js` Web Audio · `pwa.js` SW + install + File System Access + share target | Il service worker resta indipendente dall'MVC |
| **i18n** (`src/i18n.js`) | Unico catalogo `{ it, en }` + `t(lang, key, vars)` | Nessuna logica, nessun DOM |

### Verifiche architetturali

- ✅ Il Model non accede al DOM (nessuna reference a `document`/`window` nel gameplay)
- ✅ La View non contiene regole di gioco (solo rendering + stringhe i18n)
- ✅ Il Controller non modifica lo stato direttamente: chiama `Model.lightLantern`, `Model.shelveBook`, ecc.
- ✅ Il salvataggio è gestito solo da `src/services/storage.js`
- ✅ Nessuna dipendenza circolare: `model ← storage/view/controller`, `view ← controller`, nessun back-edge
- ✅ Il tempo è esplicito: ogni azione/tick accetta `now` (purezza testabile)

---

## Gameplay

| Elemento | Dettaglio |
|---|---|
| **Risorse** | Luce (dalle lanterne) · Calma (dal tè) · Inchiostro (dai libri riposti) |
| **Attività** | Accendere lanterne · Riporre libri (tap o swipe) · Preparare il tè · Accogliere lettori · Catalogare rari |
| **Collezionabili** | 8 volumi rari con copertina colorata, glifo e testi bilingue |
| **Traguardi** | Prima Luce (**4** lanterne) · Primo Ospite (1 lettore) · Alba (8/8 rari) |
| **Sblocchi** | Scaffale delle Curiosità · Lucernario (+Luce passiva) · Sala del Pozzo (tè più ricco) |
| **Eventi casuali** | Gatto-ombra · Pioggia alla finestra · Libro caduto · Lettore in attesa |
| **Meccanica emergente** | Il gatto-ombra si siede dove agisci: interagire dove siede dà +1 bonus |
| **Salvataggio** | Automatico ogni 15s + al nascondimento (`pagehide`/`beforeunload`), `localStorage` con fallback IndexedDB, validazione e migrazione versione (`SAVE_VERSION = 6`) |
| **Reset** | Solo volontario, con barra di conferma (`#confirmBar`) |
| **Lettere (G1)** | Web Share Target + incolla dagli appunti → massimo 20, 280 char, dedup 5s |
| **Export/Import (G2)** | File System Access API con fallback Blob download/upload |
| **Luna (G3)** | Fase calcolata offline (algoritmo date-only), parallasse `DeviceOrientation`/pointer opzionale |

### Scorciatoie tastiera

| Tasto | Azione |
|---|---|
| `1`–`4` | Lanterne |
| `T` | Tè |
| `R` | Lettore |
| `F` | Libro caduto |
| `B` | Riponi libro |
| `S` | Salva |
| `?` | Aiuto |
| `Esc` | Chiudi pannello / conferma |

---

## PWA

- `manifest.webmanifest`: `id: "./"`, nome, start_url, `display: standalone`, `orientation: portrait`, icone SVG + PNG (180/192/512/maskable), **`share_target`** (GET, param `text`).
- `service-worker.js` **v5 — strategia mista**:
  - **Network-First** per le navigazioni (HTML) → sempre fresco online, `offline.html` offline.
  - **Stale-While-Revalidate** per gli statici (css/js/png/svg/webmanifest) → immediati dalla cache, aggiornati in background.
  - Precache con `Promise.allSettled` (un file mancante non blocca l'install).
  - `cache.put` sempre dentro `event.waitUntil`.
  - Nessun `skipWaiting()` automatico dopo l'install iniziale: l'utente accetta l'aggiornamento (`SKIP_WAITING` + banner `#updateHint`).
- Offline completo dopo il primo caricamento; badge "Offline" visibile quando la rete manca.
- Install: `beforeinstallprompt` (Android/desktop) + hint manuale iOS (`Share → Add to Home Screen`).

---

## Accessibilità

- HTML semantico (`main`, `header`, `nav`, `section`, `ol`, `ul`, `noscript`)
- Pulsanti reali (`<button>`), label associate (`<label for>`)
- `aria-live` per toast, ambient, eventi, lettere
- `role="progressbar"` + `aria-valuenow/min/max` su tutte le barre risorse e progresso collezione
- `aria-pressed` sulle lanterne e sul lettore, `aria-label` descrittivi
- Focus visibile (`:focus-visible` con outline ambra), skip-link, **focus trap** sui pannelli (`role="dialog"`, `aria-modal`), Escape chiude
- Contrasto: testo crema (#f5ead7) su notte (#141834) ≥ 12:1
- Nessun'informazione comunicata solo con il colore (icone testuali + testo)
- `prefers-reduced-motion` + interruttore "Riduci movimento" (`html[data-motion="reduced"]`)
- Testi ridimensionabili (`clamp`/`rem`), nessun `white-space: nowrap` critico
- `[hidden] { display: none !important }` per garantire la coerenza hidden/layout (B4)

---

## Sicurezza e robustezza

- Nessun `eval`, nessun `innerHTML` con dati dinamici (DOM costruito con `createElement`/`textContent`)
- Salvataggio validato e migrato (`validateAndMigrate`), dati corrotti → stato di default con messaggio
- `localStorage` in try/catch con feedback all'utente se la scrittura fallisce (quota piena)
- Cross-tab: listener `storage` → re-render + toast (B7)
- Nessun tracking, nessuna analytics, nessun dato personale, nessuna richiesta di rete durante il gioco
- Wake Lock e parallasse disattivabili dalle impostazioni (rispetto dell'utente)

---

## Test

```bash
npm install          # solo devDependency: jsdom
npm run check        # node --check su tests/ e tools/
npm test             # 198 model + 223 migration + 101 integration = 522 asserzioni
npm run http         # server statico one-shot: 33 path → 200 (manifest application/manifest+json)
npm run icons        # rigenera i 4 PNG (zero dipendenze, zlib nativo)
```

- `tests/model.test.mjs` — regole pure: risorse, milestone, sblocchi, lettere, migrazione v1→v6, tick con cap, worldTick, luna, i18n parità chiavi IT/EN, lettori procedurali, almanacco, cat AI, daily seed, ZIP/mod pack/voice/signal codec (Fase 3).
- `tests/migration.test.mjs` — fixture v1→v6, invarianti "non perde mai progressi" + parità `content.json` IT/EN
- `tests/integration.test.mjs` — jsdom: welcome→gioco, tutorial, lanterne+milestone, tavolo, tè, lettore, collezione+catalogo, Escape, scorciatoie, cambio lingua, toggle settings, storage-event cross-tab, reset, recupero save corrotto, destroy idempotente, UI Fase 3 (share/mods/multi/contrast/roomDesc).

---

## Contribuzione

### Branching

```
main        ← rilasci stabili
  └── feat/… / fix/… / chore/…
```

### Conventional Commits

```
feat: aggiunge lettere sotto la porta (G1)
fix:  stopPropagation su fallenBook (B1)
chore: migra view in src/ con i18n unico
docs: aggiorna roadmap README
test: estende integrazione a storage-event
```

### PR checklist

- [ ] `npm run check` e `npm test` verdi
- [ ] Nessuna regressione MVC (Model puro, View senza regole, Controller senza scrittura diretta stato)
- [ ] Nuove stringhe aggiunte in **entrambi** i blocchi `it` e `en` di `src/i18n.js`
- [ ] Se cambia lo schema di salvataggio: bump `SAVE_VERSION` + migrazione in `validateAndMigrate`
- [ ] Se cambia la shell PWA: bump `CACHE` in `service-worker.js`
- [ ] Accessibilità: `aria-*` aggiornati, focus visibile, testi leggibili

---

## Come estendere il gioco

### Aggiungere una nuova attività

1. **Model** — scrivi una funzione pura in `src/model/actions.js`:
   ```js
   export function myActivity(state, now) {
     if (<condizione non soddisfatta>) return { ok: false, reason: 'x' };
     state.resources.<risorsa> = clamp(state.resources.<risorsa> + n, 0, MAX.<risorsa>);
     return { ok: true, /* campi per la View */ };
   }
   ```
2. **View** — aggiungi il pulsante/area in `index.html` con `data-action="myAction"` e lo stile in `styles.css`.
3. **Controller** — in `onClick` aggiungi il case:
   ```js
   case 'myAction': actMyActivity(); break;
   ```
   e la funzione `actMyActivity` che chiama `M.myActivity(state, Date.now())`, play sfx, `afterAction()`.
4. Se deve entrare nel tutorial, aggiungi un passo in `TUTORIAL_STEPS` (`src/model/data.js`).

### Aggiungere una nuova risorsa

1. **Model** — `MAX` in `src/config.js`, `defaultState().resources` e clamp in `validateAndMigrate` (`src/model/state.js`).
2. **View** — aggiungi un blocco `.res` in `index.html` con `id` della barra e `…Val`, registra in `cacheElements()` e aggiorna in `renderResources`.
3. **i18n** — aggiungi la label in `STR.it` e `STR.en` (`src/i18n.js`).

### Aggiungere una nuova schermata (pannello)

1. **HTML** — blocco con `class="panel"`, `hidden`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
2. **Controller** — aggiungi il pulsante di apertura/chiusura e la Escape nell'handler `onKeydown`.
3. **View** — renderizza il contenuto in `renderPanels(state)` se dipende dallo stato; altrimenti markup statico + `data-i18n`.

---

## TODO — Piano di implementazione (Fasi A→H)

> Ogni voce è stata implementata e verificata in questa sessione.
> `[x]` = fatto · `[ ]` = non previsto in questo giro.

### Fase A — Bug critici (B1–B22)

- [x] **B1** `stopPropagation` su `fallenBook` / delega `data-action` (niente doppio trigger)
- [x] **B2** SW install: precache con `Promise.allSettled` (un 404 non blocca)
- [x] **B3** `cache.put` sempre dentro `event.waitUntil`
- [x] **B4** `[hidden] { display: none !important }` in coda a `styles.css`
- [x] **B5** `role="progressbar"` + `aria-valuenow/min/max` su tutte le barre
- [x] **B6** `destroy()` completo (timer, listener document/window, focus trap, parallax, wake lock, SW)
- [x] **B7** sync multi-scheda via listener `storage` + toast
- [x] **B8** `renderPanels` solo su cambio lingua/azione, non ogni 5s
- [x] **B9** pausa loop se `document.hidden`
- [x] **B10** flusso aggiornamento SW esplicito (banner `#updateHint` + `SKIP_WAITING`)
- [x] **B11** focus trap sui pannelli + Escape + `aria-modal`
- [x] **B12** icone PNG 180/192/512/maskable + meta iOS
- [x] **B13** toast d'errore se `localStorage.setItem` fallisce
- [x] **B14** i18n unico (`src/i18n.js`), rimosso codice morto `STR_FEED`
- [x] **B15** Model puro: `now` passato come parametro, niente `Date.now()` nascosto
- [x] **B16** toast si nasconde da solo dopo 4s
- [x] **B17** registrazione SW dopo `load` (niente race col primo paint)
- [x] **B18** reset → `S.clear()` senza save successivo immediato + barra conferma
- [x] **B19** rigenerazione passiva con cap 1h per ciclo (niente gate opaco `now % 1000`)
- [x] **B20** `<noscript>`, meta `color-scheme`/`apple-*`, manifest `id: "./"`
- [x] **B21** nota MIME manifest nel README (`npx serve` vs `python -m http.server`)
- [x] **B22** titoli/label accessibili anche senza hover (`aria-label`, testo always-on)

### Fase B — Refactoring / architettura

- [x] Split `model.js` → `src/model/{data,state,actions}.js`
- [x] Estrazione i18n → `src/i18n.js` (catalogo unico IT/EN)
- [x] `src/config.js` per costanti condivise
- [x] Controller: azioni `act*` + `afterAction`, delega globale `data-action`
- [x] View: `cacheElements` + `render*` granulari, niente `innerHTML` dinamico
- [x] Services spostati in `src/services/`

### Fase C — Struttura repository

- [x] `src/` + `tests/` + `tools/`
- [x] `package.json` (type: module, scripts, devDep jsdom)
- [x] `.editorconfig`
- [x] `.gitignore` (node_modules, .DS_Store, log)
- [x] Rimossi i vecchi file JS piatti dalla root

### Fase D — Tooling e licenza

- [x] `tools/gen-icons.mjs` — 4 PNG da zero con `zlib` nativo (zero dipendenze)
- [x] `tools/check-syntax.mjs` — `node --check` ricorsivo
- [x] `LICENSE` MIT
- [x] Badge licenza nel README

### Fase E — UX / features

- [x] Toast auto-hide + annunci `aria-live`
- [x] Tutorial con dots + evidenziazione zona target
- [x] Swipe orizzontale sul tavolo per riporre un libro
- [x] Scorciatoie tastiera complete
- [x] Feedback aptico (`navigator.vibrate`) con toggle
- [x] Wake Lock con toggle
- [x] Parallasse finestra (`DeviceOrientation` + pointer) con toggle
- [x] Export/Import salvataggio (File System Access + fallback Blob)
- [x] Lettere sotto la porta (paste clipboard + share target)
- [x] Luna reale offline (algoritmo date-only, nessuna rete)
- [x] Banner install iOS + beforeinstallprompt

### Fase F — PWA / Service Worker

- [x] Strategia mista v5: Network-First navigazioni + Stale-While-Revalidate statici (precaching `content.json`, `idb.js`, share/mods/multiplayer/a11y)
- [x] Precache `allSettled`, `waitUntil` sui put, update esplicito
- [x] `manifest.webmanifest`: `id`, `share_target`, icone PNG
- [x] `offline.html` con CTA di ritorno

### Fase G — 3 Features innovative

- [x] **G1** Web Share Target → lettere sotto la porta
- [x] **G2** File System Access esporta/importa salvataggio
- [x] **G3** Luna reale offline + parallasse opzionale + Ambient Light-ready (nessun sensore obbligatorio)

### Fase H — Verifica e documentazione

- [x] `npm run check` — sintassi OK (25 file)
- [x] `npm test` — **522 asserzioni** (198 model + 223 migration + 101 integration)
- [x] `npm run http` — 33 path locali rispondono **200**, manifest `application/manifest+json`
- [x] README: quickstart, MVC, contribuzione, TODO del piano, roadmap
- [x] LICENSE MIT + badge

---

## 🔮 Roadmap — prossime 3 fasi

### Fase 1 · Scalabilità (fondamenta per contenuti senza toccare il codice)

- [x] **Editor di salvataggio in-game** (pannello Impostazioni → JSON + anteprima diff prima di applicare; import file usa lo stesso flusso)
- [x] **Sistema di "stanze"**: Aula Centrale + Soppalco (sblocco `wellRoom`) + Giardino d'Inverno (sblocco `curiosityShelf`), attività pure `switchRoom`/`sortArchive`/`tendPlants`, stesso loop MVC
- [x] **Config-driven content**: `content.json` versionato (milestone/sblocchi/libri rari/messaggi/stanze/attività) caricato da `src/model/content.js` con embedded fallback; `data.js` re-export
- [x] **Migration harness**: `tests/migration.test.mjs` con fixture v1→v6, invarianti "non perde mai progressi" + parità `content.json` IT/EN
- [x] **IndexedDB opzionale**: `src/services/idb.js` — fallback automatico su quota `localStorage` piena + archivio lettere esteso (`settings.archiveIdb`, cap 200)

### Fase 2 · Intelligenza (profondità di gioco)

- [x] **Lettori procedurali**: ogni ospite ha un mini-personaggio (nome, umore, libro preferito) generato seeded dal `readerDue`, con dialogo a scelta multipla che influenza la probabilità di trovarne di rari
- [x] **Metereologia dinamica**: la pioggia/la luna reale influenzano i pesi degli eventi (pioggia vera → più eventi `rain`, luna piena → più lettori)
- [x] **Almanacco delle lune**: achievement legati a fasi lunari reali viste nella sessione (es. "hai visto 3 lune piene")
- [x] **Cat AI leggero**: il gatto-ombra impara le zone preferite dall'utente e ci si siede più spesso (niente ML, solo pesi esponenziali decay)
- [x] **Daily seed**: evento/lettera del giorno derivata da `hash(YYYY-MM-DD)`, per condividere "la lettera di oggi" senza backend

### Fase 3 · Ecosistema (distribuzione e community)

- [x] **Web Share API** per condividere una "cartolina" PNG della stanza (canvas, nessun server) — `src/services/share.js`
- [x] **Mod support**: pacchetti `*.luminapack` (zip JSON+SVG) caricabili dall'utente, con sandbox senza `eval` — `src/services/zip.js` + `src/services/mods.js`
- [x] **Local-first multiplayer leggero**: due dispositivi nella stessa LAN si scambiano lettere/status via WebRTC (signaling manuale, zero server) — `src/services/multiplayer.js`
- [x] **Progressive install campaign**: deep-link `?install=1` / `#install` che aprono il prompt nativo
- [x] **Accessibilità avanzata**: modalità "alto contrasto" dedicata, lettura screen-reader dell'intera stanza come descrizione navigabile, comandi vocali Web Speech API — `src/services/a11y.js`
- [x] **Audit Lighthouse/axe** automatizzato in CI (GitHub Actions, solo accesso statico) — `.github/workflows/audit.yml`

---

## Note tecniche

- Niente dipendenze di runtime: tutto locale, zero asset remoti obbligatori.
- Audio avviato solo dopo un'interazione utente; pausa/riprendi su `visibilitychange`.
- Timer limitati e cancellabili (`destroy()` in `controller.js` + `TIMERS` nella View), listener non duplicati.
- Animazioni basate su `transform`/`opacity`, `will-change` dove serve.
- `SAVE_VERSION = 6` (ecosistema: alto contrasto, comandi vocali, peer/mods); migrazioni backward-compatible in `validateAndMigrate` (v1→v2 timer, v2→v3 letters/settings, v3→v4 rooms, v4→v5 intelligence, v5→v6 ecosystem).
- Contenuto giocabile in `content.json` (`version`): bump `content.version` quando cambi milestone/libri/stanze; il loader scarta remote non validi o più vecchi.

---

© 2026 Lumina contributors · [MIT](LICENSE)
