# ✦ Stellaria — La Piazza dei Riflessi

> Un gioco cozy mobile PWA dove la fama è la moneta e il riflesso è la verità.

[![PWA](https://img.shields.io/badge/PWA-installable-6a4fbf?logo=googlechrome&logoColor=white)](#)
[![Vanilla JS](https://img.shields.io/badge/JS-vanilla%20ESM-f7df1e?logo=javascript&logoColor=black)](#)
[![Zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)](#)
[![Offline](https://img.shields.io/badge/offline%20first-blue)](#)
[![A11y](https://img.shields.io/badge/accessibility-A11y%20first-informational)](#)
[![License MIT](https://img.shields.io/badge/license-MIT-lightgrey)](#)

**Stellaria** è una Progressive Web App cozy, mobile-first e offline-first.
Esplori una piccola piazza sospesa, ti esibisci davanti ai cittadini, guadagni
**Stelle**, arredi la tua stanza e collezioni **Riflessi**. Ma il gioco ha una
seconda lettura: in un mondo che misura le persone in applausi, conta anche ciò
che resti quando nessuno guarda.

Nessuna energia, nessuna pubblicità, nessun tracking, nessun backend obbligatorio.

## Stack tecnologico

| Ambito | Scelta |
|---|---|
| UI | HTML5 semantico + CSS3 (nessun framework) |
| Logica | JavaScript vanilla ESM — architettura MVC + Services |
| Audio | Web Audio API (suoni e musica generati, nessun file audio) |
| Persistenza | `localStorage` con validazione, migrazione e serializzazione a whitelist |
| PWA | Web App Manifest v3 + Service Worker (SWR/Cache-First) |
| Feature | Web Share, File System Access / OPFS, WebAuthn locale, sensori ambientali |
| Tooling | Node.js (script di verifica), Python/PIL (icone), jsdom opzionale |

## Requisiti

- Browser moderno (Chrome/Edge/Firefox/Safari ≥ 115).
- Un server HTTP locale (i moduli ESM non funzionano via `file://`).
- Node.js ≥ 18 **solo** per gli script di verifica e la generazione delle icone.

## Installazione e avvio

```bash
git clone <repo> && cd stellaria
python3 -m http.server 9876
# apri http://localhost:9876
```

Oppure con Node: `npx serve .`

### Script

| Script | Descrizione |
|---|---|
| `npm run check` | Controllo sintattico + assenza di `eval`, importa tutti i moduli |
| `npm run smoke` | Importa ed esegue un smoke test della logica di gioco |
| `npm run boot` | Smoke completo (logica, salvataggio, migrazione) |
| `npm test` | `check` + `smoke` + `boot` |
| `npm run icons` | Rigenera icone SVG/PNG locali |

## Architettura (MVC + Services)

Flusso principale:

```text
input utente
  → Controller (js/ui/controller.js)
  → Model (js/domain/model.js) + Domain (js/domain/world.js, scoring.js)
  → stato aggiornato
  → View (js/ui/view.js) + Components
  → DOM aggiornato
```

Caricamento iniziale:

```text
Storage Service (js/services/storage.js)
  → validazione e migrazione (js/core/state.js)
  → Model → Controller → View
```

```text
js/
├── app.js                    # bootstrap
├── core/                     # infrastruttura pura
│   ├── config.js             # costanti
│   ├── i18n.js               # dizionario IT/EN
│   ├── utils.js              # helper (storage safe, dom, math)
│   ├── state.js              # serializzazione, validazione, migrazione
│   └── bus.js                # eventi applicativi
├── domain/                   # regole pure
│   ├── world.js              # flussi di gioco (azioni sullo stato)
│   ├── scoring.js            # formule voto/vibe/fama
│   ├── model.js              # regole e stato (buy, unlock, achieve)
│   └── data/                 # cittadini, stanze, oggetti, eventi…
├── ui/
│   ├── view.js               # rendering DOM, animazioni, a11y
│   ├── controller.js         # eventi, orchestrazione, azioni
│   └── components/           # (future: card, modal, shop)
└── services/
    ├── storage.js            # persistenza (localStorage)
    ├── audio.js              # Web Audio generato
    ├── pwa.js                # install prompt + SW
    ├── share.js              # Web Share API + Share Target
    ├── backup.js             # File System Access + OPFS
    ├── ambient.js            # sensori + oracolo locale
    └── auth.js               # WebAuthn locale (PIN biometrico)
```

### Responsabilità

- **Model/View**: separazione rigorosa — la View non contiene regole; il Model non tocca il DOM.
- **Controller**: registra eventi, invoca il Model, chiede alla View di aggiornarsi, coordina audio/feedback. Non muta lo stato direttamente.
- **Services**: persistenza, audio, PWA, feature avanzate. Indipendenti dalla logica di gioco.
- **core/state.js**: unica responsabilità di serializzazione/validazione/migrazione; la whitelist esclude i riferimenti interni (`_citizensRef`, `_roomsRef`, `currentRoom`) dall'export.

### Aggiungere una nuova attività

1. Aggiungi la stringa in `js/core/i18n.js`.
2. Se richiede un gesto, aggiungilo a `GESTURES` in `js/domain/data/items.js`.
3. Aggiungi un handler nel Controller che invochi un metodo del Model e poi `render(state, api())`.
4. Aggiungi il bottone nella View (`renderActionBar` o `npcCard`).

### Aggiungere una nuova risorsa

1. Aggiungi il campo in `model.defaultState()` e in `core/state.js` (whitelist `ALLOWED_TOP`).
2. Aggiungi le chiavi i18n e il rendering in `view.renderResources()`.
3. Aggiorna `validate()` di `core/state.js`.

### Aggiungere una nuova schermata

1. Aggiungi `<section id="screen-nome">` in `view.initView()`.
2. Aggiungi `renderNome(state)` in `view.js`.
3. Esponi l'azione nel Controller e collega un tasto con `data-action`.

## Funzionalità

- **6 stanze + 1 segreta**, **8 cittadini** con gusti, memoria e gossip, sistema di voto "vibe" (`outfit × arredo × gesto × gusto × ora`).
- Doppia risorsa (**Stelle** e **Riflesso**), **Fama** a 6 livelli; **8 collezionabili**, **3 traguardi**, **3 sbloccabili**, **4 eventi casuali**, **5 messaggi ambientali**.
- Tutorial, inventario, impostazioni (lingua, audio, modalità ambiente), come-si-gioca, reset con conferma.
- **Web Share**: condividi la tua cartella Riflesso come immagine; **Share Target** riceve messaggi condivisi.
- **File System Access / OPFS**: backup e ripristino del salvataggio su file scelto dall'utente.
- **WebAuthn**: PIN biometrico opzionale per bloccare il profilo (nessun server).
- **Sensori ambientali + oracolo locale**: luce, batteria, tema di sistema influenzano l'atmosfera e generano versi contestuali offline.
- Audio generato via Web Audio (musica/SFX separati, volume, avvio dopo gesto).
- Salvataggio automatico silenzioso con validazione e migrazione versione; export/import JSON.
- PWA installabile: manifest, service worker con strategie differenziate, offline.html, icone locali SVG+PNG.
- Accessibilità: HTML semantico, `aria-live`, focus visibile, focus-trap nei modali con rimozione listener (nessun leak), `prefers-reduced-motion`, controllo volume, testo ridimensionabile, informazioni non solo cromatiche (tag con icona+testo), inert del background su pannelli.
- Touch mobile-first: target ≥44px, swipe tra stanze, anti-tap accidentale, safe-area per notch, supporto mouse/tastiera.
- Robustezza: nessun `eval`, nessun `innerHTML` su input utente, timer cancellati, error boundary sul rendering, degradazione graceful dove un'API non è supportata.

## Contribuzione

- **Nessun dato raccolto**, nessun analytics, nessun tracking.
- JavaScript vanilla ESM, nessuna dipendenza esterna.

### Branching e stile

- **Branching**: trunk-based su `main`; feature branch `feat/<nome>`; merge tramite PR con review.
- **Commit convenzionali**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- **Stile**: 2 spazi, semicolon, single quote, nessun `eval`, nessun `innerHTML` con input utente, nessun `var`.
- **Qualità**: `npm test` verde prima di ogni merge; aggiornare `CACHE` del Service Worker a ogni rilascio; aggiornare `version` in `config.js` su cambi di salvataggio.
- **PWA**: nessun asset remoto obbligatorio; icone locali; manifest sempre allineato alle icone reali.

Licenza MIT — vedi `LICENSE`.

---

## 🔮 Roadmap & TODO — Stato Implementato

> ✅ = implementato | ⬜ = da fare | 🔴 = ambizioso | 🟡 = consigliato | 🟢 = quick win

### ✅ Fatto — Stabilità e core
- ✅ **Fix P0**: `controller.js` — aggiunte `openDecorate`, `openOutfit`, `openInventory`, `openAchievements`, `openFeatures`, `openMirror`; import `qsa`/`PENDING_KEY`/`ITEMS`/`ROOMS`/`avatarSVG`/`speak`/`extractPalette`/`safeLocalStorage`
- ✅ **Fix P0**: `view.js` — listener non più ri-aggiunti ad ogni render (delega unica in `setupViewDelegation`)
- ✅ **Fix P0**: `share.js` — `canShare` corretto (async fix), `navigator.canShare` safe-check, QR disegnato sulla carta condivisa
- ✅ **Fix P0**: `auth.js` — credential WebAuthn ora **persistita** in localStorage (rawId + allowCredentials)
- ✅ **Fix P0**: `service-worker.js` — `shareTargetHandler` ritorna `Response`; GET `/share-target` → redirect alla home (testo salvato in cache); `CACHE` bump v3; precache include `./js/ui/avatar.js` e `./js/features/index.js`
- ✅ **Fix P0**: `manifest.webmanifest` — `share_target.action` relativo (`./share-target`)
- ✅ **Fix P1**: Event delegation (view.js) — zero leak listener
- ✅ **Fix P1**: Boot flow — start screen sempre mostrata, "Continua" abilitato se save esiste
- ✅ **Fix P1**: Ciclo vita save — salvataggio su `visibilitychange`, clock pausato quando hidden, notifica giornaliera triggerata al rientro
- ✅ **Fix P2**: `i18n.js` — 7 chiavi aggiunte (mirror, mood, diary, upgrades, notification, gentleNotif, shared); stringhe hardcoded residue hanno fallback
- ✅ **Versioning**: `config.js` 1.1.0, `storageVersion` 2, `migrate()` per `avatarPos`/`mood`/`gentleNotif`
- ✅ **Storage robusto**: `persistState` con try/catch `QuotaExceededError`, `requestPersistent()`, `saveQuotaEstimate()` con `navigator.storage.estimate()`
- ✅ **Test**: check-syntax, smoke-import, boot → tutti OK (`npm test` verde)

### ✅ Fatto — Feature
- ✅ **Avatar SVG componibile** (`js/ui/avatar.js`) — outfit → SVG, palette da foto (`extractPalette`)
- ✅ **Lo Specchio di Stellaria** (`controller.js:openMirror`) — doppio ritratto (fama vs riflesso), mode autentico/fama, oracolo, stagione
- ✅ **Pannello Feature** (`controller.js:openFeatures`) — specchio, rituale serale, diario (copy/export), mood-sync, ripristina tema
- ✅ **Stagioni reali** (`services/ambient.js`) — `getSeason()` da calendario reale (equinozi/solstizi), `getSeasonalItems()`
- ✅ **Colonna sonora adattiva** (`services/audio.js`) — `setMusicMode(autentico|fama)` con melodie major/minor
- ✅ **Generatore procedurale** (`js/services/oracle.js`) — template pesati su stato; hook WebNN no-op (futuro)
- ✅ **Vibe Meter** — tag visibili in pannelli arreda/outfit (helper in controller)
- ✅ **Coreografia aptica** (`js/features/index.js`) — `haptic()` con pattern, HAPTICS config
- ✅ **Rituale serale** — "Cerchio della Sera" (1/giorno, +2 Riflesso, no streak)
- ✅ **Badging API + notifiche** (`features/index.js`) — `requestBadge`, `sendGentleNotification` (max 1/giorno, opt-in), toggle in impostazioni
- ✅ **Diario di Stellaria** — `generateDiary()` markdown auto-generato, copia/esporta
- ✅ **Mood-sync da foto** — input file → palette → contrast-checked CSS vars → `state.mood`
- ✅ **QR encoder zero-dep** (`js/core/qr.js`) — byte mode v1-4, EC=M, auto-mask; disegnato sulla carta condivisa
- ✅ **WebRTC P2P** — `PlazaChannel` classe, data channel offrono/rispondi/ice, con bus events
- ✅ **Web Speech** (`services/audio.js:speak`) — TTS dialoghi con lang it-IT/en-US, mai autoplay; pulsante 🔊 su NPC
- ✅ **Free-walk Hybrid** — avatar trascinabile (`state.avatarPos`), token NPC posizionati, highlight prossimità `.near` (soglia 22), lista azioni mantenuta
- ✅ **NPC agenda circadiana** — `roomOfCitizen()` con `agenda` (Mira/Orso/Zefiro), zero storage
- ✅ **Oracolo in UI** — `oracleForUI()` + `ambientProfileText()` in specchio e status
- ✅ **Oracolo ambientale** — `ambientProfile`, `ambientTint`, `oracleLine`, `ambientProfileText`
- ✅ **A11y**: HTML semantico, aria-live, focus-trap, prefers-reduced-motion, inert su pannelli, tap target ≥44px
- ✅ **PWA**: manifest, SW con strategie, offline.html, icone locali SVG+PNG (192/512/180)

### ⬜ Da fare
- 🔴 **Mercato del Riflesso** — economia dinamica: fama gonfia prezzi, autenticità sblocca oggetti rari (cambiata priorità)
- 🟡 **i18n cleanup** — stringhe IT hardcoded residue nel controller → `t()` (tutte hanno fallback)
- 🟡 **storage.persist()** — funzione `requestPersistent()` esiste, va chiamata al boot
- 🟡 **Audit Lighthouse** (PWA, Performance, Accessibility ≥ 95) — richiede browser headless
- ⬜ **Housekeeping** — `CACHE` bump a ogni rilascio; `version` in config.js su cambi significativi

### Come si gioca
- Tutorial a 4 step per nuovi giocatori
- 6 stanze + 1 segreta (Sala dei Riflessi, sbloccabile con Fama 3 + Riflesso 12)
- 8 cittadini con agenda circadiana, gusti, memoria e gossip; sistema voto "vibe"
- Doppia risorsa (Stelle + Riflesso), Fama a 6 livelli
- Web Share + QR, File System Access/OPFS, WebAuthn locale, sensori ambientali, P2P, Speech
- Tutto offline-first, zero backend, zero dipendenze

## Contribuzione

- **Nessun dato raccolto**, nessun analytics, nessun tracking.
- JavaScript vanilla ESM, nessuna dipendenza esterna.
