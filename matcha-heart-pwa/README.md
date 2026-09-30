<div align="center">

# 🍵 Matcha Heart

### Un cozy matcha match-3 che vive nella tua tasca, anche senza rete.

**100 tazze · 4 mondi · 9 finali · 21 personaggi · zero dipendenze**

[![PWA installabile](https://img.shields.io/badge/PWA-installabile-7a9e7e?style=flat-square&logo=googlechrome)](https://developer.mozilla.org/docs/Web/Progressive_web_apps)
[![100% offline](https://img.shields.io/badge/100%25%20offline-4a6b4f?style=flat-square&logo=offline)](sw.js)
[![zero dipendenze](https://img.shields.io/badge/zero%20dipendenze-555?style=flat-square&logo=npm)](package.json)
[![zero build](https://img.shields.io/badge/zero%20build-555?style=flat-square&logo=vite&logoColor=ffd43b)](package.json)
[![contrasti WCAG AA](https://img.shields.io/badge/contrasti-WCAG%20AA-7a9e7e?style=flat-square&logo=w3c)](tools/contrast.mjs)
[![test](https://img.shields.io/badge/test-151%20verdi-2f9e44?style=flat-square&logo=node.js)](test/)
[![licenza MIT](https://img.shields.io/badge/licenza-MIT-e9c46a?style=flat-square)](LICENSE)

</div>

---

> Sei **Aoi**, ventiseienne con mani che tremano, erede dell'ultimo chashitsu di Kyoto.
> Tua nonna **Hana** ti ha lasciato 25 lettere, un chasen consumato e un debito d'affitto.
> Ogni tazza che servi bene riapre una memoria. Ogni tazza fredda la chiude.
> *Cozy fuori, ansia dentro.*

<div align="center">
  <img src="icons/icon-192.png" width="96" alt="Matcha Heart">
  <img src="icons/maskable-192.png" width="96" alt="Matcha Heart maskable">
</div>

---

## Indice

1. [Requisiti di sistema](#1-requisiti-di-sistema)
2. [Installazione e avvio](#2-installazione-e-avvio)
3. [Come si gioca](#3-come-si-gioca)
4. [I quattro mondi](#4-i-quattro-mondi)
5. [Stack tecnologico](#5-stack-tecnologico)
6. [Struttura del progetto](#6-struttura-del-progetto)
7. [Architettura](#7-architettura)
8. [Accessibilità](#8-accessibilità)
9. [Privacy](#9-privacy)
10. [Contribuire](#10-contribuire)
11. [Strumenti di sviluppo](#11-strumenti-di-sviluppo)
12. [Deploy](#12-deploy)
13. [Changelog](#13-changelog)
14. [🔮 Roadmap & Future Implementations](#14-🔮--roadmap--future-implementations)

---

## 1. Requisiti di sistema

Per **giocare** (l'app è statica, non serve nulla di installato):

| Piattaforma | Versione minima | Note |
|---|---|---|
| iOS / iPadOS Safari | 15.4 | `Add to Home Screen` per il standalone; la TTS italiana funziona da iOS 14.5 |
| Android Chrome | 90+ | Installazione e prompt `beforeinstallprompt` |
| Desktop Chrome / Edge | 90+ | Il gioco è pensato per il telefono: da tastiera si gioca comunque |
| Desktop Firefox | 115+ | Supporto completo, installazione manuale |
| Qualsiasi altro | — | Funziona in modalità browser, senza installare |

> **I service worker richiedono un contesto sicuro**: `https://` oppure `http://localhost`.
> Aprire `index.html` con `file://` **non funziona** e non funzionerà: niente cache, niente SW, niente TTS.

Per **sviluppare**:

| Strumento | Versione | Serve per |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 (testato su 24) | server di preview, test, generatore di icone |
| Un browser moderno | come sopra | sviluppo e QA |
| Git | qualsiasi | contribution workflow |

**Non servono**: npm install, bundler, transpiler, framework, database, account, chiavi API.
`node_modules/` non esiste e non verrà mai creato: le dipendenze del progetto sono **zero**.

---

## 2. Installazione e avvio

```bash
git clone <url-del-repo> matcha-heart-pwa
cd matcha-heart-pwa

node serve.js          # → http://localhost:4173
```

Oppure, senza Node:

```bash
python3 -m http.server 4173
```

### Dal telefono, in rete locale

```bash
npm run dev            # HOST=0.0.0.0 node serve.js
```

Trova il tuo IP (`ip addr` / `ipconfig`) e apri `http://<tuo-ip>:4173`.
Il badge 📲 in home usa `beforeinstallprompt` dove esiste.

> Su iOS non compare: Apple non espone quella API. Usa **Condividi → Aggiungi alla schermata Home**.

### Installazione come app

| Piattaforma | Come |
|---|---|
| **Android / Chrome** | ⋮ → *Installa app*, oppure il bottone 📲 in home |
| **iOS / Safari** | Condividi ⬆️ → *Aggiungi alla schermata Home* |
| **Desktop** | icona di installazione nella barra degli indirizzi |

Una volta installata: standalone, portrait, icona dedicata, **funzionante a.zero rete**,
con tre scorciatoie (Gioca · Diario · Respiro 4-7-8) nel menu di sistema.

---

## 3. Come si gioca

### La tavola matcha

Board **8×8**, swap con **tap** (seleziona → seleziona) o **swipe**, anche da **tastiera**
(frecce per muoverti, `Invio` per selezionare, `Esc` per annullare).

Sei **sei** tazze-tessere: 🍵 Usucha · 🍃 Koicha · 🌸 Sakura · 🍋 Yuzu · 🖤 Kurogoma · 🤍 Mochi.

Ogni episodio chiede **N tessere-target in M mosse**. Le catene valgono:

| Combo | | Combo | |
|---|---|---|---|
| ×2 | doppio sorso 🍵 | ×4 | matcha in fiamme 🔥 |
| ×3 | battito 💓 | ×5+ | **eterno** ✨ |

### Le quattro meccaniche

| Meccanica | Mondo | Come funziona |
|---|---|---|
| — | Pioggia | il canone: tessere semplici, scelte che cambiano il vassoio |
| 🌱 **Boccioli** | Sakura Eterna | i boccioli **non** fanno match: un match adiacente li fa sbocciare, e valgono **doppio** |
| 🧊 **Gelo** | Marea d'Estate | il gelo **non si sposta**: si scioglie con un match vicino |
| ⬛ **Inchiostro** | Notte Yokai | si espande di una tessera ogni 3 mosse (max 12); i match vicini lo puliscono |
| 🌱🧊 **Mix** | Estate · Cap.8-9 | tutto insieme |

### Cuori, stelle, lettere

- **5 ♥**, un cuore ogni 5 minuti. Zero cuori? Il **Respiro 4-7-8** ne ricarica uno (+2 mosse).
- **3★** con `schiuma ≥ 60` **e** ≥ 15% di mosse rimaste. **2★** di solito. **1★** sempre.
- Ogni tazza vinta **sblocca una lettera** nel Diario di Hana, con lettura ad alta voce
  (`speechSynthesis`, italiano, evidenziazione parola per parola). Solo su tap: mai autoplay.
- **Bersaglio centrato ma schiuma sotto quota** → non è una sconfitta secca: tieni **1★ e la lettera**.
  La progresse non si perde mai.
- **60★** totali → il finale segreto **MATCHA ETERNO ✨**

### I tre riti (minigiochi che danno mosse vere)

| Rito | Gesto | Durata | S = |
|---|---|---|---|
| 🌀 **Awa** | ruota il dito in cerchio a velocità media | 12s | +4 mosse |
| 🌸 **Latte-Art** | disegna un cuore dentro la tazza senza uscirne (doppio-tap = fine) | 20s | +4 mosse |
| 🌊 **Respiro 4-7-8** | inspira 4s · trattieni 7s · espira 8s | 19s | +2 mosse **+1 ♥** |

> Chiudere il rito a metà **non regala nulla**: i riti sono cancellabili e ripulire
> il `requestAnimationFrame` quando esci. Se premi Inizia e cambi vista, il rito si annulla.

### Lo stato emotivo è un bonus, mai una punizione

Il check-in in home (😰 🥺 🌸) **non può mai peggiorare** la partita:

- 😰 **ansiosa** → +Yuzu sul vassoio e il Respiro ti viene offerto
- 🥺 **malinconica** → +Mochi nel prossimo vassoio
- 🌸 **bene** → festa di petali, e sette giorni di fila 💐 regalano il disegno di Yuki

### Mugi 🐾

Il tuo frullino-cucciolo. Non muore mai, al massimo dorme.

| Fase | xp | Bonus |
|---|---|---|
| 🌱 Germoglio | 0 | nessuno, solo amore |
| 🎋 Bamboo | 80 | +5% schiuma a fine livello |
| ✨🥢 Lacca oro | 200 | 1 Chasen gratis al giorno |

5 coccole al giorno (+2 xp ciascuna). Rinominabile (max 12 caratteri, sanitizzato).
Chiamarlo **Hana** fa parlare Takeshi. Toccargi 100 volte la pioggia gli mette un ombrello.

### I dieci easter egg

1. 🌈 *Il tè arcobaleno obbedisce alle frecce, ma solo sulla mappa, una volta al giorno.*
2. 🌙 *Hana scrive haiku per chi non dorme (00:00–04:00).*
3. 💌 *La settima lettera vibra, se la tocchi con pazienza. Sette volte.*
4. 🌧️ *Cento gocce fanno un ombrello per Mugi.*
5. 🌧️ *Chiama il cucciolo come la nonna e la pioggia parlerà.*
6. 🌸 *Sette soli rosa di fila e Yuki disegna per te.*
7. 👵 *Perdi tre volte nello stesso posto e la rivale si intenerisce.*
8. 🎂 *Il locale compie gli anni quando li compi tu… quasi.*
9. 🌙 *Vola senza rete e diventi Eremita.*
10. ✨ *Venticinque schiume perfette e il cerchio si completa.*

> La pioggia è **tappabile**: tocca lo sfondo nei vuoti, o usa il bottone 🌧️ in home.
> (Le gocce sul canvas non sono cliccabili su schermi stretti: il bottone esiste per quello.)

---

## 4. I quattro mondi

La catena di sblocco è lineare e ogni mondo cambia tema, tessere, meccanica e **musica di scena** del canvas di sfondo.

| Mondo | Capitoli | Tazze | Meccanica | Fili 🧵 | Finali |
|---|---|---|---|---|---|
| 🌧️ **Pioggia** | 9 | **45** | — | 2 | 5 |
| 🌸 **Sakura Eterna** | 5 | **25** | 🌱 boccioli | 3 | 2 |
| 🌙 **Notte Yokai** | 3 | **15** | ⬛ inchiostro | 3 | 2 |
| 🌊 **Marea d'Estate** | 3 | **15** | 🧊 gelo (+ mix) | 3 | 2 |
| | **20** | **100** | | **11** | **11** |

> **Sakura Eterna** è un *what-if*: in quel mondo Hana non è mai morta. Tu ti svegli in un
> chashitsu Perfetto e nessuno ti riconosce. Solo Mugi.

**I finali**

| Finale | Come si sblocca |
|---|---|
| 🌿 **RESTO** | Cap.5-5, scelta A |
| 🕊️ **LASCIO ANDARE** | Cap.5-5, scelta B |
| 🌳 **RADICI E ALI** | Cap.6-5, scelta A |
| 🌳 **RADICI E ALI (da sola)** | Cap.6-5, scelta B |
| ✨ **MATCHA ETERNO** *(segreto)* | 60★ totali |
| 🌸 **RADICE SOGNATA** | Sak.2-5, scelta A |
| 🌧️ **PIOGGIA VERA** | Sak.2-5, scelta B *(regala +3 mosse al canone, una volta sola)* |
| 🏮 **MASCHERA** | Yok.3-5, scelta A |
| 🌅 **ALBA** | Yok.3-5, scelta B |
| 🌊 **MAREA** | Est.3-5, scelta A |
| 🗼 **FARO** | Est.3-5, scelta B |

I **Fili** 🧵 sono sottotrami con progresso visibile nel Diario: ogni tazza servita li
avanza di un passo, e ogni filo ha cinque indizi che si svelano uno alla volta.
I Mondi, l'♥, Mugi, l'umore, i riti e i distintivi sono **condivisi** fra tutti e quattro.

**Bilanciamento** — ratio `target/mosse` da 0.46 a 0.93; 39 episodi hanno una **quota di
schiuma** (55% → 90%) che ritarda la vittoria. Il 92% circa dei livelli si vince; la
filosofia è *mai punire*, sempre accogliere.

---

## 5. Stack tecnologico

```
HTML5 semantico · CSS custom properties · JavaScript ES2020 vanilla
Service Worker · Web App Manifest · Web Audio API · Canvas 2D
SpeechSynthesis API · Vibration API · AbortSignal · Node.js test runner
```

| Livello | Scelta | Perché |
|---|---|---|
| **UI** | HTML + CSS, nessun framework | 100 tazze non hanno bisogno di un virtual DOM: il collo di bottiglia è il giocatore, non il rendering |
| **Grafica** | Canvas 2D per pioggia/petali/riti, CSS per il resto | 60 particelle a 30fps costano meno di un'immagine |
| **Audio** | **Web Audio API** — zero file | 6 suoni sintetizzati con oscilatori: 1.4 kB di codice invece di ~250 kB di sample WAV |
| **Tipografia** | `system-ui` / `Hiragino Maru Gothic ProN` | zero webfont, zero FOUT, resa nativa su ogni piattaforma |
| **Illustrazioni** | **emoji** come sprite | 6 "sprite" da 0 byte. Decisione deliberata, documentata in `tools/gen-icons.mjs` |
| **Persistenza** | `localStorage` + deep-merge versionato | nessun server, nessun account, export/import possibile |
| **Offline** | Service Worker: network-first sui document, **stale-while-revalidate** sugli asset | nessun utente vede una versione vecchia, nessuno aspetta la rete |
| **Test** | `node:test` + micro-DOM in `test/harness.mjs` | 151 test che esercitano **il codice vero** dentro un `vm`, non una copia |
| **CI** | `tools/check.mjs` | un comando: sintassi, manifest, contrasti, budget di peso, test |
| **Dipendenze** | **zero** | `dependencies: {}` e `devDependencies: {}`. Non è un fiore: è un requisito |

---

## 6. Struttura del progetto

```
matcha-heart-pwa/
├── index.html                  # shell: 4 view + 4 modali + tabbar + noscript
├── offline.html                # fallback del service worker
├── manifest.webmanifest        # standalone, portrait, shortcuts, screenshots
├── sw.js                       # app shell offline
├── serve.js                    # server statico di preview
├── package.json                # script, zero dipendenze
│
├── css/style.css               # 8 temi (4 mondi × giorno/notte) + a11y
│
├── js/                         # script classici, ognuno incapsulato in una IIFE
│   ├── save.js                 # persistenza: deep-merge, saveVersion, quota
│   ├── tiles.js                # 6 tessere + 4 skin
│   ├── audio.js                # synth Web Audio
│   ├── board.js                # motore match-3: categorie, gravità, booster
│   ├── story.js                # canone: 9 capitoli, 45 episodi, 5 finali
│   ├── universes.js            # registro multiverso: Sakura, Yokai, Estate
│   ├── quaderno.js             # risoluzione delle lettere + indice delle scelte
│   ├── minigames.js            # awa / latte / respiro, cancellabili
│   ├── tama.js                 # il cucciolo, le sue fasi
│   ├── eggs.js                 # 10 easter egg
│   ├── app.js                  # router, livelli, diario, TTS, umore, oracolo
│   └── pwa.js                  # SW, installazione, aggiornamenti, storage
│
├── icons/                      # 12 PNG + 2 mockup, generati
├── data/story.json             # indice narrativo, validato dai test
│
├── test/                       # 151 test, node:test
│   ├── harness.mjs             # micro-DOM + caricamento script in vm
│   ├── load.test.mjs           # gli script si caricano davvero
│   ├── flow.test.mjs           # integrazione: avvio e giocata
│   ├── board.test.mjs          # motore, categorie, teardown
│   ├── progress.test.mjs       # multiverso, unlock, NaN sugli id
│   ├── save.test.mjs           # merge, migrazioni, quota
│   ├── pwa.test.mjs            # invarianti del SW e del manifest
│   ├── quaderno.test.mjs       # il Quaderno: risoluzione, indice, interfaccia
│   ├── a11y.test.mjs           # ARIA, riferimenti rotti, contrasti
│   └── minigames.test.mjs      # cancellabilità dei riti
│
└── tools/
    ├── check.mjs               # gate unico di qualità
    ├── contrast.mjs            # calcolo WCAG AA sui token reali
    ├── content-lint.mjs         # 7 gate sul contenuto dei postscript
    └── gen-icons.mjs           # encoder PNG puro + generatore
```

---

## 7. Architettura

### Il flusso

```
index.html ──defer──▶ save.js  →  window.MH.save
                                    │
       tiles.js ──▶ audio.js ──▶ board.js ──▶ story.js ──▶ universes.js
                                    │            │              │
                                    ▼            ▼              ▼
                                minigames     tama.js        eggs.js
                                    └────────────┴──────────────┘
                                                 ▼
                                             app.js  (router)
                                                 ▼
                                              pwa.js  (SW)
```

Ogni modulo espone **un solo global** (`window.MHBoard`, `window.MHU`, …) ed è
incapsulato in una IIFE. I suoi interni restano privati.

> **Perché le IIFE, e non ES modules?**
> Perché gli script classici condividono il *global lexical scope*: due `const` con lo
> stesso nome in due file diversi fanno fallire **il secondo script con un `SyntaxError`**.
> È successo davvero in questo progetto — `story.js` e `universes.js` dichiaravano entrambi
> `const T`, `universes.js` non veniva mai eseguito, `window.MHU` non esisteva e **l'app non
> partiva**. Oggi `test/load.test.mjs` lo impedisce di tornare.

### Lo stato

Un solo oggetto `window.MH.save`, serializzato in `localStorage` sotto
`matcha-heart-save-v1`. Ogni modulo ci parla attraverso i getter di `universes.js`:

```js
const P = (uid) => window.MHU.prog(uid);   // progress dell'universo attivo
```

La progressione è **per universo**, ognuno con `{stars, unlocked, choices, endings, letters, threads}`.
Gli id dei mondi non canonici sono stringhe (`'y1'`, `'e1'`): per questo `unlocked` si
confronta **per posizione nella saga** e mai per valore grezzo.

### Il Service Worker

| Tipo di richiesta | Strategia | Perché |
|---|---|---|
| Navigazioni | **network-first** → `./index.html` → `./offline.html` | l'HTML deve essere fresco; offline deve comunque funzionare |
| JS / CSS / JSON | **stale-while-revalidate** | risposta immediata, aggiornamento silenzioso alla visita dopo |
| Icone e font | **cache-first** | immutabili per versione |
| Altro same-origin | stale-while-revalidate | — |
| Cross-origin | ignorata | niente cache di terzi |

Invarianti garantite da `test/pwa.test.mjs`:

- il precache usa `Promise.allSettled` — **un 404 non può più spegnere l'offline**;
- `activate` cancella **solo** le cache con prefisso `matcha-heart-`, mai le altre app dell'origin;
- `cache.put` è awaitato e gestisce `QuotaExceededError`;
- `navigationPreload` è abilitato e consumato;
- `register('./sw.js', { updateViaCache: 'none' })` + flusso **"C'è una tazza più calda. Aggiornare?"**.

Il gioco non fa **mai** una richiesta di rete in gameplay: oracolo, meteo e haiku sono
deterministici e calcolati localmente.

### Il ciclo di vita del board

`startLevel()` chiama `board.destroy()` prima di costruire la nuova istanza. `destroy()`
rimuove i listener registrati sulla `#board` — un nodo che sopravvive a tutti i livelli.
Senza questo, un singolo swipe lanciava una `trySwap()` per ogni livello giocato, e le
copie eccedenti annullavano lo swap valido. Oggi è un test.

---

## 8. Accessibilità

Non è un extra: è un gate di build (`tools/contrast.mjs --check` fallisce la PR).

- **Contrasti WCAG AA verificati sui valori reali del CSS** per tutte le **24 combinazioni**
  di tema (4 mondi × giorno/notte): `--muted` ≥ 4.5:1, `--ink` ≥ 7:1, testo bianco sul
  bottone primario ≥ 4.5:1. I valori corretti sono calcolati, non indovinati.
- **Tastiera completa sul board**: la griglia ha `role="grid"` con **righe reali**
  (`role="row"` + `role="gridcell"`), navigazione a frecce, `Invio` per lo swap,
  `Esc` per annullare, roving `tabindex`.
- **Nessun controllo interattivo annidato**: `role="button"` e `<button>` non si contengono
  mai (è un test, non una buona intenzione).
- **Dialoghi veri**: `role="dialog"`, `aria-modal`, `aria-labelledby`, **focus trap**,
  `Esc` per chiudere, focus restituito all'elemento di partenza.
- **Annunci**: una regione `role="status"` per gli esiti di livello; cuori, stelle e
  progresso hanno `aria-live="polite"`.
- **Tap target ≥ 44px** ovunque (è un test).
- **`prefers-reduced-motion`** spento davvero: i canvas di sfondo vengono **nascosti**,
  non solo rallentati.
- **`:focus-visible`** visibile ovunque, mai `outline: none` senza sostituto.
- `<noscript>` con un messaggio utile.

---

## 9. Privacy

- **Nessun account.** Nessun server. Nessun analytics. Nessun cookie.
- **Nessuna richiesta di rete in gameplay.** Tutto in `localStorage`.
- Il gioco chiede `navigator.storage.persist()` solo quando la scheda diventa nascosta,
  per evitare che il browser evitti i tuoi progressi. Non chiede mai permessi invasivi
  (nessuna posizione, nessuna telecamera, nessun microfono).
- L'unica "personalizzazione" è il nome del tuo cucciolo, che resta sul dispositivo e
  viene sanitizzato (max 12 caratteri, senza `< > & "`).
- **Export / import del save** è in roadmap: quando arriverà, sarà un file JSON locale,
  mai un upload.

---

## 10. Contribuire

Le regole sono **stringenti**. Una PR che le viola non viene mergiata.

### Strategia di branching

```
main          ← protetta. Nessun push diretto, mai.
  └─ feat/<scope>-<cosa>       nuova funzionalità
  └─ fix/<scope>-<cosa>        correzione di bug
  └─ docs/<scope>              solo documentazione
  └─ refactor/<scope>          cambiamento di struttura senza behaviour change
  └─ perf/<scope>              solo prestazioni
  └─ content/<scope>           solo contenuti narrativi (episodi, personaggi)
```

Regole ferree:

1. **Mai** push diretto su `main`. **Mai** force-push su un branch condiviso.
2. Una PR = **un** argomento. "Aggiungo il boss Ink + sistemo il CSS + riscrivo
   l'audio" è tre PR.
3. Prima di aprire la PR: `npm run check` deve essere verde in locale.
4. Servono **2 review** per merge, di cui una deve essere di chi non ha scritto il codice.
5. Merge **squash** con il titolo del commit come subject: `feat(board): … (#123)`.
6. Il branch si cancella al merge. Nessun `develop`, nessun `staging`.
7. `main` deve essere sempre installabile: **zero test rossi, zero `check` rosso**.

### Commit convenzionali

```
<tipo>(<scope>): <subject>

[corpo opzionale — cosa e perché, non il come già evidente dal diff]

[footer opzionale — BREAKING CHANGE:, Refs:, Closes #]
```

**Tipi ammessi** (null'altro viene accettato):

| Tipo | Quando |
|---|---|
| `feat` | funzionalità nuova e visibile |
| `fix` | correzione di bug (collega l'issue: `Closes #42`) |
| `docs` | solo documentazione |
| `style` | formattazione, nessun cambiamento di comportamento |
| `refactor` | struttura, nessun cambiamento di comportamento |
| `perf` | prestazioni |
| `test` | solo test |
| `build` | `package.json`, `sw.js`, `manifest` |
| `ci` | automazione |
| `chore` | manutenzione minuta |

**Scope ammessi:** `board` · `story` · `universes` · `diary` · `minigames` · `audio` ·
`ui` · `pwa` · `sw` · `save` · `tama` · `eggs` · `content` · `tools` · `test` · `docs` · `deps`

Regole sul messaggio:

- subject in **minuscolo**, senza punto finale, max 72 caratteri;
- **imperativo** ("aggiungi", non "aggiunto" / "aggiunge");
- un `!` dopo il tipo segnala un breaking change: `refactor(save)!: …`;
- niente "fix vari", niente "wip", niente "stuff" — un commit, una cosa.

```
feat(board): aggiungi la meccanica gelo alle celle non movibili
fix(universes): non resettare più yokai ed estate al reload
perf(sw): passa da cache-first a stale-while-revalidate sugli asset
test(save): copri il deep-merge delle sottochiavi di stats
docs(readme): rivedi la guida alla contribuzione
```

### Stile del codice

Regole ferree, verificate dal `check`:

- **`const` di default, `let` solo se la variabile cambia, `var` mai.**
- **Ogni file in una IIFE.** Un solo global esposto per modulo. Niente Pollution.
- **`'use strict'`** in ogni file.
- **Niente `innerHTML` con dati utente.** Solo `textContent` o `createElement`.
  I test lo verificano sui riferimenti e sugli id.
- **Niente magic number** per le categorie di tessere: usa i predicati
  (`isBloom` / `isFrozen` / `isInk`) e `window.MHTiles.TILE_COUNT`.
- **Funzioni sotto ~40 righe.** Se serve di più, si divide.
- **Un id DOM per riga**, dichiarato una volta sola in `index.html`.
  `$('foo')` deve sempre trovare qualcosa: un test lo verifica.
- `camelCase` per variabili, `kebab-case` per i file, `UPPER_SNAKE` per le costanti.
- Commenti **in italiano**, e solo per il **perché**: il *cosa* si legge nel codice.
  ```js
  // ❌ nasconde l'implementazione, invecchia subito
  // it = 10
  // ✅ spiega la decisione, resta vero anche se il codice cambia
  // I boccioli non producono match: sboccano per adiacenza, così da non
  // regalare match gratuiti a chi ha la sfortuna di toccarli.
  ```
- **Nessun `alert`/`confirm`/`prompt` nel flusso di gioco.** Solo nei riti e nell'installazione,
  dove un blocco modale è accettabile.
- **Budget di peso**: `index.html` ≤ 30 kB, `css/style.css` ≤ 16 kB, `sw.js` ≤ 12 kB.
  Verificato dal `check`.
- **Zero dipendenze.** Se serve una libreria, la PR deve argomentare perché 200 righe
  di codice nostro non bastano.

### Checklist prima della PR

```bash
npm run check        # sintassi · manifest · contrasti · contenuto · budget · 151 test
npm test             # solo i test, più verboso
```

- [ ] `npm run check` verde
- [ ] Il diff non contiene segreti, log, `console.log` di debug, file generati per errore
- [ ] Se hai toccato `sw.js`: bump di `VERSION` **e** changelog aggiornato
- [ ] Se hai toccato il CSS: `npm run contrast` verde
- [ ] Se hai aggiunto un episodio: `data/story.json` aggiornato e validato
- [ ] Test che coprono il comportamento nuovo **o** la non-regressione
- [ ] Titolo della PR in italiano, in una riga, che spiega il *perché*

### Aggiungere contenuti

**Un episodio** (1) 2) 3) 4):

1. `{id, chap, ep, kicker, title, text, cliff, choiceA, choiceB, level: T(t, c, m, mini, bias, mech, quota), letter}`
   in `STORY` (canone) o in `SSTORY` / `YSTORY` / `ESTORY` (mondi non canonici, id stringa `'sN'`).
2. Tieni `targetCount / moves` nel range **0.46 – 0.93**. La quota di schiuma, se presente, sta fra 55 e 90.
3. Se `choice.effect` inizia con `finale-`, aggiungi il finale a `endings` dell'universo.
4. Aggiorna `data/story.json`: i conteggi vengono **validati** da `test/load.test.mjs`.

`T(targetTile, targetCount, moves, mini, biasTile, mechanic, quota)` — `targetTile` deve
essere `0..5` (`test/load.test.mjs` lo controlla: fuori range il `render` va in crash).

**Il postscript di una lettera** (opzionale). `letter` resta una stringa: `ps` è un
postscript che si **appende**, e la scelta lo rende diverso. Non serve migrare nulla.

```js
{ id: 7, letter: `Lettera 7 — "Il sale nel tè è un errore."`,
  ps: { coraggio: `H. Quella notte gli hai chiesto perché se n'era andato.`,
        dolcezza: `H. Quella notte l'hai fatto entrare bagnato, senza chiedere niente.` } }
```

Regole di scrittura, in ordine di importanza:

1. **La base è l'aforisma, il postscript è il dettaglio.** La base dice una verità
   generale; il postscript dice *quella* sera, con i nomi e gli oggetti della scena.
   Se il postscript potrebbe stare su un altro episodio, è sbagliato.
2. **Deve parlare della strada scelta**, non dell'altra. `tools/content-lint.mjs` lo
   controlla confrontandolo con l'etichetta della scelta.
3. **Non moralizza.** Nessun rimprovero, nessun "avresti dovuto". Una scelta ostile
   riceve un postscript caldo, non una lezione.
4. **40–110 caratteri**, il registro delle lettere base (47–92).
5. **Una variante per strada**, e le chiavi sono gli effetti reali dell'episodio.
   I finali non si toccano: aprono finali diversi, già gestiti da `unlockEnding`.

#### La voce cambia da mondo a mondo

I gate controllano la struttura, non il registro: una voce sbagliata li passa tutti. La
differenza si legge nelle lettere base di ciascun universo, e i postscript la seguono.

| Mondo | Chi scrive | Come si riconosce |
|---|---|---|
| **canone** | Hana, morta | Firma `H.` e **passato**. Sa già com'è finita: il postscript è un ricordo che non si complaint, ma una constatazione con un amo. Aggancia sempre un oggetto fisico della scena. |
| **sakura** | Hana, viva, 70 anni | **Niente firma.** Prima persona, **presente**. È la nonna: parla di sé accanto a te (*"vegliavamo in due"*, *"frulla come me"*), mai di te come di una da sorvegliare. Canzonatoria e sospettosa. |
| **yokai** | La Padrona Senza Volto | **Non dice "io".** Le basi sono maschere e macchie definite per **simile** (*"liscia come un 'ciao' non detto"*, *"sa di sampietrini bagnati"*). Anche il postscript definisce per analogia invece di raccontare. Durezza fuori, tenerezza dentro: presta volti a chi ha dimenticato il proprio. |
| **estate** | Voce neutra del mondo | Terza persona, **presente**, oggetti e registri (*Data incisa*, *Mappa delle rotte*). Frasi brevi e dichiarative, economia da marinaio. Non è un personaggio: Ondina e Gin hanno la loro voce dentro le citazioni delle basi. |

L'errore da evitare è il **clone**: scrivere le 46 varianti di Sakura con la voce del
canone è il fallimento più probabile di questo rollout, perché il meccanismo è identico e
la differenza è invisibile ai gate. Quando due mondi hanno lo stesso effetto
(`coraggio` / `dolcezza` ovunque), le parole devono cambiare anche loro.

Prima di aprire la PR:

```bash
npm run check          # il gate di contenuto è tra i sei
node tools/content-lint.mjs
```

**Un mondo nuovo**: una voce in `UNIVERSES` con `id`, `theme`, `skin`, `mechanic`,
`chapters`, `story`, `endings`, `unlock`, `threads`; il tema CSS `body[data-universe="…"]`
con i suoi 8 token verificati; gli id dei suoi episodi come stringhe. Il resto è già pronto.

**Una skin**: un array di 6 in `window.MHTiles.SKINS` con lo stesso ordine di `TILES`.

---

## 11. Strumenti di sviluppo

```bash
node serve.js              # server statico → http://localhost:4173
npm run dev                # idem, in ascolto sulla rete locale
npm test                   # 151 test (node:test)
npm run check              # TUTTO: sintassi, manifest, contrasti, budget, test
npm run check:fast         # come sopra, salta i test
npm run icons              # rigenera le 12 icone + 2 mockup
npm run icons:preview      # anteprima ASCII del marchio, senza scrivere file
npm run contrast           # verifica WCAG AA sui token reali
npm run contrast:fix       # calcola i valori corretti
```

**`tools/check.mjs`** è il gate di CI. Fallisce se:

- un file JS non fa il parse;
- un postscript viola i gate di contenuto (divergenza, lunghezza, colpa, coerenza);
- il manifest dichiara una risorsa inesistente, o le dimensioni di un'icona non tornano;
- un file precacato dal SW non esiste, o `offline.html` non è precacato;
- un contrasto scende sotto la soglia AA;
- un file supera il budget di peso;
- un test fallisce.

**Le icone** sono PNG veri generati da un encoder PNG scritto a mano
(`zlib` + CRC32, nessuna dipendenza). `npm run icons:preview` stampa il marchio in
ASCII: serve a controllare la geometria senza decodificare un PNG.

> Gli `icons/screenshot-*.png` del manifest sono **mockup generati**, non catture di
> dispositivo. Dichiaratelo se li sostituisci con screenshot veri.

**`tools/content-lint.mjs`** è il gate che rende il Quaderno scrivibile in volume. Sette
controlli automatici, perché il rischio di 190 varianti non è un bug: è scrivere la stessa
frase 190 volte, o sbagliare quale strada una lettera sta descrivendo.

| Gate | Cosa impedisce |
|---|---|
| divergenza | le due varianti che sono la stessa frase riscritta (Jaccard ≥ 60%) |
| lunghezza | 40–110 caratteri, il registro delle lettere base |
| colpa | parole di rimprovero: un postscript non moralizza |
| coerenza | **polarità invertita**: descrivere la strada che non hai preso |
| chiavi | una chiave che quell'episodio non offre, o un finale (`ps` non li tocca) |
| separatore | un a capo doppio dentro il postscript romperebbe l'origine della lettera |
| struttura | `ps` non oggetto di effetti, o variante vuota |

Il gate di **coerenza** è nato da un errore vero: nella prima stesura del pilota avevo
invertito i due postscript dell'ep.24, e il gate di divergenza lo aveva **lasciato passare**
— entrambi i testi erano validi, nello stesso registro, e diversi. L'ho trovato leggendo i
due lati della lettera, e ho poi automatizzato quella classe di errore.

**I test** esercitano il codice vero: `test/harness.mjs` costruisce un micro-DOM e carica
`js/*.js` dentro un contesto `node:vm`, che replica lo stesso *global lexical scope* del
browser. Questo è ciò che ha permesso di scovare il `SyntaxError` che impediva all'app di partire.

---

## 12. Deploy

Il progetto è **statico puro**: qualunque hosting va bene.

| Piattaforma | Istruzioni |
|---|---|
| **GitHub Pages** | Settings → Pages → branch `main`, cartella `/root`. Attenzione al path: `start_url` e `scope` sono `./`, quindi funziona anche in sottocartiera |
| **Netlify** | New site → drag & drop della cartella. Nessun build command |
| **Vercel** | Import → framework "Other". Nessun build |
| **Cloudflare Pages** | Build command *vuota*, output directory `/` |
| **Locale in rete** | `npm run dev` |

Requisiti non negoziabili del deploy:

- **HTTPS** (o `http://localhost`): senza, il service worker non si registra.
- `sw.js` servito dalla **root** dell'origine, o con `Service-Worker-Allowed: /`.
- `Cache-Control: no-cache` su `sw.js` (già impostato da `serve.js`): altrimenti il
  browser continua a usare il vecchio script del SW dalla HTTP cache.

**Prima del primo deploy, esegui `npm run check`.** Poi apri l'app, disconnettiti dalla rete,
ricarica: se funziona, sei a posto.

---

## 13. Changelog

| Versione | Cosa è cambiato |
|---|---|
| **v1.7.1** | **La seconda stesura è visibile nel Quaderno.** L'archivio elencava le strade percorse e non percorse, ma dichiarava i postscript senza lasciarli leggere: il badge `non l'hai scritta` diceva che la frase esisteva e non la mostrava, e una stesura non letta è una promessa a metà. Ora **ogni riga con un postscript apre il proprio testo**, in entrambe le strade: *la tua stesura* per la strada percorsa, *la seconda stesura* per quella non presa. Sono bottoni veri, con `aria-expanded` e focus visibile, chiusi all'apertura. Il nome è deliberato: una *stesura* è un testo che esisteva, non una strada che hai mancato — in un gioco sul lutto la parola giusta esiste e l'ho scritta in un test che vieta *rimpianto*, *peccato*, *colpa* ed *errore* in tutto il Quaderno. Rendo leggibile anche la stesura percorsa, che prima era un badge: lasciare leggibile solo l'altra rendeva l'archivio asimmetrico. Più un test d'integrazione sui **dati veri** (ep. 7, 24, 42): i test precedenti usavano postscript sintetici, e un rollout finito merita un test che legga il contenuto vero. |
| **v1.7.0** | **Il Quaderno è completo: 190 postscript in 95 episodi.** Tutti e 95 gli episodi non finali dei quattro mondi hanno il postscript per entrambe le strade: i 200 effetti che il gioco registrava e non usava sono tutti tornati dentro le lettere. Gli **5 episodi di finale** restano intatti (`unlockEnding` li gestisce già, e due fonti di verità sullo stesso momento sarebbero un bug): canone 25 e 30, sakura s10, yokai y15, estate e15. Aggiunti i mondi non canonici, ciascuno con una **voce strutturalmente diversa**, non solo un registro diverso: **sakura** scrive al presente e senza firma, con Hana *dentro* il testo accanto alla nipote; **yokai** non dice mai "io" e definisce per analogia, come le sue maschere; **estate** è una voce neutra di brevi dichiarativi, fatta di oggetti e registri. La guida è in `README.md` §Aggiungere contenuti, perché il rischio di questo rollout non era tecnico: era scrivere 102 varianti non canoniche con la voce del canone, cosa che nessun gate automatico distingue. |
| **v1.6.2** | **Sakura è completa.** Aggiunti i postscript dei 23 episodi mancanti di Sakura (Cap.S1-S5): **134 postscript in 68 episodi**. In Sakura Hana è **viva**, e questo cambia la voce in modo strutturale, non solo di registro: niente firma `H.`, **presente** invece del passato, e lei dentro il testo accanto alla nipote (*"Io c'ero"*, *"io guardavo dalla porta"*) invece che sopra di lei. Il pericolo di questo rollout era il clone — scrivere le varianti non canoniche con la voce del canone è indistinguibile ai gate automatici — quindi la differenza è ora scritta in `README.md` come **guida di voce per universo**, con la regola esplicita: quando due mondi hanno lo stesso effetto (`coraggio` / `dolcezza` ovunque), le parole devono cambiare anche loro. `s10` resta senza postscript: è una scelta di finale. |
| **v1.6.1** | **Il canone è completo.** Aggiunti i postscript degli episodi 31-45 (Cap.7-9: neve, festival, la tempesta e la ricostruzione): **88 postscript in 44 episodi**, il 44% del gioco. Qui la voce di Hana diventa fisica invece che verbale — la neve che gela sul bordo della tazza, la lana di Kiku cucita in un guanto, l'oro del kintsugi che tiene più della ceramica. Episodi 25 e 30 restano senza postscript: sono scelte di finale. Rimane il rollout dei tre mondi non canonici (Sakura, Yokai, Estate), che hanno bisogno di una voce propria. |
| **v1.6.0** | **Il Quaderno.** Le 200 scelte che il gioco registrava e non usava tornano dentro le lettere. `js/quaderno.js` risolve la lettera al momento dello sblocco e aggiunge un **postscript** per la strada scelta; il Diario mostra la scelta verbatim e, con un bottone, cosa Hana avrebbe scritto sull'altra strada. Nuovo archivio **Il Quaderno** con le strade percorse e non percorse per capitolo. **Nessuna migrazione**: `letter` resta una stringa, `letters` resta un array di stringhe. Rollout progressivo, cominciato da **60 postscript in 30 episodi**: pilota su 6 episodi scelti sui casi difficili, più i primi sei capitoli del canone (Cap.1-6, episodi 1-30). Gli episodi **25 e 30 sono scelte di finale** e non hanno postscript: le due strade aprono finali diversi, già gestiti da `unlockEnding`, e due fonti di verità sullo stesso momento sarebbero un bug. Le lettere-oggetto che non sono citazioni («Scatola di latta», «Lettera rivale — Kiku», «Biglietto di Yuki») funzionano perché l'indice è costruito sulle lettere base, non su un parsing di «Lettera N». Gli episodi ancora senza postscript vanno benissimo così: la base è condivisa e la risoluzione resta un no-op. Sette gate automatici sul contenuto in `tools/content-lint.mjs`, incluso quello di **coerenza** — nato perché il gate di divergenza ha lasciato passare una polarità invertita nell'ep.24, trovata a occhio. Il karaoke attraversa ora entrambi i blocchi della lettera. |
| **v1.5.0** | **Correzioni e accessibilità.** Riscritti il service worker (SWR, precache tollerante, cache namespace, `navigationPreload`, flusso di aggiornamento) e il manifest (`start_url`, `display_override`, 3 shortcut, screenshot, 10 icone + maskable dedicato). **Corretto un `SyntaxError` che impediva all'app di partire**: `story.js` e `universes.js` dichiaravano entrambi `const T` nel global scope, quindi il secondo script non veniva mai eseguito e `window.MHU` non esisteva. Corretti anche: il reset degli universi Yokai/Estate a ogni reload, il `NaN` che sbloccare l'intera saga sui mondi a id stringa, l'accumulo di listener del board (uno swipe lanciava N swap), il loop infinito del booster, i minigiochi non cancellabili, la pioggia irraggiungibile su mobile, i distintivi che non comparivano nel Diario, e la perdita di memoria e di `pendingMoves` al reload. Aggiunti `role="row"` reali, navigazione da tastiera, focus trap nei dialoghi, `aria-live`, 44px sui tap target, `prefers-reduced-motion` sui canvas, 24 combinazioni di tema portate a WCAG AA. Introdotto `serve.js`, `tools/check.mjs`, `tools/contrast.mjs`, `tools/gen-icons.mjs` e **105 test**. |
| v1.4.0 | 100 livelli: Cap.7-9, Sakura S3-S5, Notte Yokai (⬛), Marea d'Estate (🧊), 11 fili, unlock a catena |
| v1.3.0 | Multiverso: Fessura nel Vapore, Sakura Eterna, il Giardiniere, Moka, il nipote di Sōma |
| v1.2.0 | Cap.6, 6 personaggi, 4° finale, 10 easter egg, 9 oracoli |
| v1.1.0 | Mugi con nome personalizzabile, lettere lette ad alta voce, check-in dell'umore |
| v1.0.1 | Bilanciamento cozy, stelle più gentili |
| v1.0.0 | 25 episodi, 3 finali, 3 riti, oracolo, pioggia, modalità notte |

---

## 14. 🔮 Roadmap & Future Implementations

Dove questo progetto potrebbe andare. Tre fasi, in ordine di dipendenza.

### 🪜 Fase 1 · Scalabilità — *dal chashitsu al multiverso infinito*

> Obiettivo: che il mondo non finisca mai davvero, e che aggiungere contenuti costi minuti.

- **🌌 Generazione procedurale di universi.** Un seme (`matcha-seed-42`) genera un mondo
  completo: tema CSS derivato dalla sua palette, skin di tessere generate, meccanica
  composta da due primitive, capitoli e episodi scritti da un **grammar kit narrativo**
  (soggetto + conflitto + risoluzione + cliff) con 9 finali compositi. Target: **6 mondi
  nuovi**, 400 tazze. Il tutto offline, deterministico, con lo stesso motore di oggi.
- **🧩 `content/` come plugin.** Spostare la narrativa da `js/*.js` a `content/*.json`
  caricati **su richiesta**: i 106 kB di racconti escono dal critical path e si scaricano
  solo il mondo che stai giocando. `import()` dinamico o `fetch` + cache del SW.
- **💾 Save v2.** `saveVersion` già esiste: la prossima versione porta **export/import**
  come file JSON (con `File System Access API` dove c'è, download altrove), cifratura
  opzionale del diario con `WebCrypto`, e **reset selettivo** (solo stelle, solo Tama, solo
  un mondo) invece del pulsante unico.
- **🗄️ IndexedDB per le lettere.** Oltre 200 lettere il `localStorage` è il collo di
  bottiglia sbagliato: `IDB` con indici per mondo e per data, e ricerca full-text.
- **🧠 Drone di bilanciamento.** `tools/autoplay` simula 10.000 partite per ogni nuovo
  livello con una bot greedy; la PR non si mergia se il win-rate esce dalla **fascia cozy**
  (≥ 90%) o se il tempo medio supera 90 s.
- **🏆 Boss a catena.** Livelli speciali con ink che si espande *a ondate*, quote crescenti
  e un "capo" di schiuma da battere. Sbloccati al completamento di tutti i finali.
- **♾️ Modalità Zen.** Board senza mosse, senza cuori, senza timer: solo respiro e schiuma.
  Pensata per le notti in cui non si dorme.
- **📊 Telemetria locale e privata.** Un pannello "come gioco" con win-rate reali, tempi
  medi e la curva di difficoltà dei 100 livelli — tutto calcolato sul dispositivo, esportabile,
  **mai inviato**.

### 🧠 Fase 2 · Intelligenza — *il chashitsu che impara da te*

> Obiettivo: funzionalità intelligenti che girano **sul dispositivo**, anche in aereo.

- **🧠 Barista conversazionale offline.** Un modello **minuscolo** (embedding o LLM
  ≤ 30M parametri) caricato da `content/models/` con **Transformers.js** (WASM) e
  accelerato con **WebNN** quando disponibile. Scopo: tu scrivi a Hana, e il gioco ti
  risponde nel suo registro — riconoscendo umore, tratti di personalità e richiami
  alle lettere già sbloccate. **Il modello non lascia mai il dispositivo.**
  Fallback deterministico a `eggs.js` se WebNN non c'è: la funzionalità degrada, non sparisce.
- **🎨 CG generate in SVG.** Ogni episodio diventa un'illustrazione vettoriale composta a
  partire dal testo della lettera e dal profilo di scelte del giocatore. Nessun asset
  pre-generato: la scena è un parametro.
- **⚖️ Difficoltà adattiva.** Un modello leggero stima la tua destrezza reale (tempo per
  mossa, errori, uso dei booster) e regola **quota e mosse** entro la fascia cozy già
  esistente. Il gioco si adatta, ma **non ti traccia e non ti etichetta**.
- **🔤 TTS a voci distinte.** Hana (calda, lenta), Ren (asciutto), Takeshi (lento),
  Kiku (brusco). Oggi la voce italiana è unica: si può fare molto meglio con le voci
  di sistema, scegliendo profilo in base al personaggio che legge.
- **🖼️ Riconoscimento sul dispositivo.** `BarcodeDetector` e `ShapeDetection` (dove
  esistono) per trasformare una **foto della tua tazza** — o del menu del tuo bar — nel
  livello di oggi. Via Web Share Target, resta sul telefono.
- **✅ Verifica offline dei livelli con AI-assisted tooling.** Un LLM in locale che legge
  `story.json` e segnala incoerenze narrative (un personaggio che sparisce, una lettera
  che contraddice un finale, un filo che non si chiude) **prima** della review umana.

### 🌐 Fase 3 · Ecosistema — *la Rete del Vapore*

> Obiettivo: nessun server, ma tutti collegati.

- **🔗 Diario condiviso peer-to-peer.** Le lettere viaggiano fra telefoni con
  **WebRTC** (`RTCDataChannel`) e si scaricano come file con la **File System Access API**.
  Zero backend: nessun account, nessun server, nessuna conservazione. Chi decide cosa
  condividere è solo il giocatore.
- **🎫 Passaporto del giocatore.** Un QR firmato con `WebCrypto` che racconta il percorso:
  11 finali, 11 fili, 100 tazze, il nome del cucciolo. Non dimostra niente a nessuno se non
  lo mostri tu — ma è una medaglia che puoi portare.
- **📲 Home Screen widget.** Le **Web Widgets** (`manifest.widgets`) sulla home del
  telefono: tazza del giorno, prossimo obiettivo, un Respiro 4-7-8 a portata di pollice.
- **🔔 Lettere ritardate.** `PushManager` con VAPID per le lettere che "arrivano" nei
  momenti giusti (luna nuova, anniversario del locale, dopo N giorni di assenza).
  **Notification Triggers API** (`showTrigger`) per l'allarme serale del Respiro, che
  scatta **anche ad app chiusa**. `setAppBadge()` per le lettere non lette.
- **🌍 Ambientale e contestuale.** La Notte Yokai diventa un'esperienza **stagionale**:
  il tema segue la data reale, il meteo reale (Open-Meteo, con cache e fallback offline)
  cambia l'intensità della pioggia sullo sfondo, e il **geofence** opzionale — mai
  richiesto, mai obbligatorio, disattivabile in un tocco — apre il chashitsu solo quando
  sei vicino al "locale".
- **🌗 Modalità Sunrise/Sunset.** L'app cambia tema da sola con l'ora del dispositivo
  (calcolata con `Intl`, zero API), e può accendersi da sola all'alba come una sveglia gentile.
  `Screen Wake Lock` durante i riti, così lo schermo non si dorme mentre frulli.
- **🎞️ Editor's Cut.** Esporta le tue scelte — finale raggiunto, fili chiusi, lettere —
  come un link statico con frammento `#`, apribile da chiunque senza server. Il playthrough
  diventa condivisibile come una fotografia.
- **🌐 i18n.** Inglese e giapponese, con `lang`/`hreflang` corretti e TTS nella lingua
  dell'interfaccia. Per la Chrome Web Store è un requisito, non un extra.

---

<div align="center">

**🍵 Serve, bevi, leggi la lettera.**

<sub>100 tazze · 4 mondi · 11 finali · zero dipendenze · zero account · tutto sul tuo dispositivo</sub>

</div>
