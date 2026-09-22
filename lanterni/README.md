# 🏮 Lanterni — La Città delle Lettere di Carta

> *Costruisci una città sospesa tra le nuvole, fatta solo di lanterne di carta. Lanci una rete nel cielo notturno e catturi lanterne erranti — dentro c'è un arredo o un abitante. Ogni lanterna catturata aggiunge una luce alla tua città. All'alba, tutte le luci diventano stelle.*

---

## 🎮 Il Gioco

**Lanterni** è una PWA mobile-first che combina un **catcher fisico** con un **city-builder minimalista** in un'atmosfera poetica e rilassante.

### Meccaniche Principali

| Meccanica | Descrizione |
|-----------|-------------|
| **Lancio Rete** | Touch-and-hold per caricare la forza, swipe per direzionare. La rete segue una traiettoria parabolica con gravità e drag |
| **Cattura Lanterne** | Le lanterne errano nel cielo notturno. La rete le cattura e le porta giù |
| **Costruzione Città** | Snap-and-go: ogni lanterna si aggancia automaticamente alla posizione più vicina nella griglia |
| **Ciclo Giorno/Notte** | Ogni sessione dura 2-3 minuti. Di notte catturi, all'alba le luci diventano stelle |
| **Il Twist** | Il cielo sopra la tua città riflette esattamente cosa hai costruito. Più costruisci, più il cielo è pieno di stelle |
| **Pinch-to-Zoom** | Zoom sulla città con gesture nativa (0.5x - 3x) |
| **Haptic Feedback** | Vibrazioni su cattura, posizionamento, alba e livello su |

### Abitanti e Contenuti

| Tipo | Emoji | Effetto |
|------|-------|---------|
| Gatto di Nuvola | 🐱 | Cammina tra le lanterne, lascia scia di nuvole, può addormentarsi con "zzz" fluttuanti |
| Falene Luminosa | 🦋 | Volano in cerchio attorno alla lanterna, ali battenti, glow dorato |
| Topo Cartaio | 🐭 | Scrive lettere dell'alfabeto che fluttuano via con la gravità |
| Gru di Carta | 🕊️ | Vola sopra la città lasciando una scia di petali di carta |
| Stella di Mare | ⭐ | Si muove lentamente, brilla di luce bioluminescente |
| Medusa di Vetro | 🪼 | Fluttua nell'aria con movimenti ondulati, trasparente |

### Mobili di Carta

| Tipo | Emoji | Rarità |
|------|-------|--------|
| Tavolo di Carta | 🪑 | Comune |
| Lampada di Carta | 💡 | Comune |
| Libro Volante | 📖 | Medio |
| Fiori di Carta | 🌸 | Raro |
| Stella di Carta | ⭐ | Raro |
| Libreria di Carta | 📚 | Epico |
| Orologio di Carta | 🕰️ | Epico |
| Specchio di Carta | 🪞 | Leggendario |

### Progressione (20 Livelli)

| Lv. | Lanterne | Sblocco |
|-----|----------|---------|
| 1 | 0 | Tutorial |
| 2 | 3 | Lanterne basi |
| 3 | 6 | 🐱 Gatto di Nuvola |
| 4 | 10 | Lanterne colorate |
| 5 | 15 | 🦋 Falene Luminosa |
| 6 | 21 | 🪑 Mobili di Carta |
| 7 | 28 | 🐭 Topo Cartaio |
| 8 | 36 | Lanterne giganti |
| 9 | 45 | Notti speciali |
| 10 | 55 | Modalità libera |
| 11 | 65 | 🟣 Lanterne viola |
| 12 | 78 | 🕊️ Gru di Carta |
| 13 | 92 | 🌿 Ninfee bioluminescenti |
| 14 | 108 | 🔵 Lanterne blu |
| 15 | 125 | ⭐ Stella di Mare |
| 16 | 145 | 📚 Mobili avanzati |
| 17 | 168 | 🪼 Medusa di Vetro |
| 18 | 195 | 🌈 Lanterne arcobaleno |
| 19 | 225 | 🏗️ Maestro Costruttore |
| 20 | 260 | ✨ Leggenda |

### Modalità Speciali

| Modalità | Descrizione |
|----------|-------------|
| **Meditazione** | Suoni zen drone + movimento lento, senza cattura |
| **Editor Lanterne** | Disegna design personalizzati con strumenti pencil/eraser/fill |
| **Modalità Ambiente** | Ciclo giorno/notte reale: di notte catturi, di giorno costruisci |

---

## 🚀 Quick Start

### Requisiti

- Qualsiasi browser moderno (Chrome 80+, Safari 14+, Firefox 78+, Edge 80+)
- Nessuna dipendenza esterna, nessun build step
- Funziona offline dopo il primo caricamento (PWA)

### Avvio Locale

```bash
# Naviga nella cartella del progetto
cd lanterni

# Opzione 1: Python (consigliato)
python3 -m http.server 8080

# Opzione 2: Node.js
npx serve .

# Opzione 3: PHP
php -S localhost:8080
```

Poi apri `http://localhost:8080` nel browser.

### Test

```bash
# Installa dipendenze dev
npm install

# Esegui test
npm test

# Watch mode
npm run test:watch
```

### Installazione PWA su Mobile

1. Apri l'URL su Chrome (Android) o Safari (iOS)
2. Chrome: tocca "Installa app" nella barra degli indirizzi
3. Safari (iOS): tocca il pulsante Condivisione → "Aggiungi alla schermata Home"
4. L'app funzionerà offline e in modalità standalone

### Test con DevTools Mobile

1. Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
2. Seleziona un dispositivo mobile (iPhone 12, Pixel 5, ecc.)
3. Ricarica la pagina per attivare il service worker

---

## 🏗️ Architettura

### Tech Stack

| Componente | Tecnologia |
|------------|------------|
| Rendering | HTML5 Canvas 2D |
| Audio | Web Audio API (sintesi oscillatori, nessun sample) |
| Struttura | Vanilla JS + ES Modules |
| PWA | Service Worker + Web App Manifest |
| Persistenza | IndexedDB (con fallback localStorage) |
| Input | Pointer Events API |
| CSS | Vanilla CSS con safe-area insets |
| Test | Vitest + Canvas mocking |
| Condivisione | Web Share API + canvas.toBlob() |
| Notifiche | Push API + Notification API |
| Feedback | navigator.vibrate() |

### Princìpi Architetturali

- **Zero Dependencies**: Nessun framework, nessun bundler, nessun build step (tranne Vitest per i test)
- **ES Modules nativi**: Import/export nativi del browser
- **Single Responsibility**: Ogni file gestisce un aspetto del gioco
- **Game Loop centralizzato**: `main.js` orchestra update/render con `requestAnimationFrame`
- **State Machine**: Lo stato del gioco è esplicito e tracciabile
- **Lazy Loading**: Audio e abitanti caricati on-demand per ridurre il bundle iniziale

### Diagramma Moduli

```
┌──────────────────────────────────────────────────────────────────────┐
│                             main.js                                  │
│                  (Game Loop & State Machine)                         │
├─────────┬─────────┬─────────┬──────────┬──────────┬─────────────────┤
│renderer │  sky    │lanterns │   net    │   city   │    weather      │
│ (2D)    │ (stars) │(float)  │(physics) │ (grid)   │(rain/snow/fog) │
├─────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│particles│inhabit. │  audio  │    ui    │   save   │    seasons     │
│ (fx)    │(AI)     │(WebAudio│ (HUD)    │(IndexedDB│(halloween etc) │
├─────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│lilyPad  │skyEffects│trails  │ ambient  │notific.  │  leaderboard   │
│ (glow)  │(aurora) │(fx)    │ (mode)   │(push)    │  (stars)       │
├─────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤
│marketpl.│ editor  │  collab │ gesture  │   ar     │                │
│ (share) │(lantern)│(webrtc) │(webnn)   │ (webxr)  │                │
└─────────┴─────────┴─────────┴──────────┴──────────┴─────────────────┘
                             │
                         data.js
                    (constants & types)
```

---

## 📁 File Structure

```
lanterni/
├── index.html              # Entry point con meta PWA, noscript, error overlay
├── manifest.json           # Web App Manifest (installabilità)
├── sw.js                   # Service Worker (caching stale-while-revalidate v7)
├── style.css               # Dark theme, HUD, menu overlay, safe-area
├── package.json            # Config npm (Vitest per test)
├── vitest.config.js        # Configurazione Vitest
├── icons/
│   ├── icon-192.png        # Icona PWA 192x192 (generata con Pillow)
│   └── icon-512.png        # Icona PWA 512x512 (maskable)
├── test/
│   ├── setup.js            # Canvas/Audio/IndexedDB mocks per test
│   ├── data.test.js        # Test costanti di gioco
│   ├── lantern.test.js     # Test lanterne
│   ├── city.test.js        # Test griglia città
│   ├── particles.test.js   # Test sistema particelle
│   ├── lilyPad.test.js     # Test ninfee bioluminescenti
│   ├── seasons.test.js     # Test eventi stagionali
│   ├── weather.test.js     # Test sistema meteo
│   ├── skyEffects.test.js  # Test effetti cielo
│   └── lanternTrails.test.js # Test scie lanterne
└── js/
    ├── main.js             # Game orchestrator, state machine, input, error handling
    ├── renderer.js         # Canvas 2D rendering engine (zoom support)
    ├── data.js             # Costanti: colori, tipi lanterne, abitanti, progressione
    ├── net.js              # Fisica rete: caricamento, traiettoria parabolica, cattura
    ├── lantern.js          # Classe Lantern + LanternManager (movimento sinusoidale)
    ├── city.js             # Griglia snap-and-go, connessioni, serializzazione
    ├── sky.js              # Cielo notturno, stelle twinkle, transizione alba
    ├── particles.js        # Sistema particelle: burst, sparkles, dust (object pool)
    ├── inhabitants.js      # AI gatti/falene/topi/gru/stelle/meduse con stati
    ├── audio.js            # Web Audio engine: suoni sintetizzati, weather, zen drone
    ├── ui.js               # HUD, menu, schermata alba, share button, keyboard nav
    ├── save.js             # Persistenza IndexedDB con screenshots, fallback localStorage
    ├── lilyPad.js          # Ninfee bioluminescenti con glow e particelle
    ├── seasons.js          # Eventi stagionali: Halloween, Natale, Carnevale, Estate, Inverno
    ├── weather.js          # Sistema meteo: pioggia, neve, nebbia, vento, tempesta
    ├── skyEffects.js       # Effetti cielo: aurora borealis, pioggia di stelle, fasi lunari
    ├── lanternTrails.js    # Scie particelle dietro lanterne lanciate
    ├── ambientMode.js      # Modalità ambiente: ciclo giorno/notte reale
    ├── notifications.js    # Notifiche push: promemoria notturni
    ├── lanternEditor.js    # Editor lanterne: disegno personalizzato
    ├── leaderboard.js      # Classifica stelle: locale + stub backend
    ├── marketplace.js      # Condivisione città: export/import JSON
    ├── collaborative.js    # Modalità collaborativa: stub WebRTC
    ├── gestureRecognition.js # Riconoscimento gesti: stub WebNN/MediaPipe
    └── arMode.js           # Modalità AR: stub WebXR
```

---

## 🎯 Gameplay Details

### Game Loop

```
MENU → Gioca/Continua → PLAYING (notte, 2-3 min)
                              │
                    ┌─────────┴─────────┐
                    │  CHARGING (hold)   │
                    │  THROWING (swipe)  │
                    │  CATCHING (hit)    │
                    │  PLACING (tap)     │
                    └─────────┬─────────┘
                              │
                         DAWN (alba)
                              │
                    luci → stelle nel cielo
                              │
                         Nuovo Giorno
```

### Stati del Gioco

| Stato | Descrizione |
|-------|-------------|
| `MENU` | Schermata principale |
| `PLAYING` | Notte attiva, lanterne fluttuano |
| `CHARGING` | Touch-and-hold, indicatore di potenza |
| `THROWING` | Rete in volo con traiettoria parabolica |
| `CATCHING` | Rete ha colpito una lanterna |
| `PLACING` | Giocatore posiziona la lanterna nella città |
| `DAWN` | Transizione alba, luci → stelle |
| `PAUSED` | Pausa dal menu |
| `MEDITATION` | Modalità zen: suoni drone, nessuna cattura |

### Fisica della Rete

```
Velocità iniziale:
  vx = cos(angolo) × potenza × 800
  vy = sin(angolo) × potenza × 800 - 200

Ogni frame:
  vy += gravità × dt  (600 px/s²)
  vx *= drag          (0.98)
  x += vx × dt
  y += vy × dt

Cattura: raggio 35px dalla posizione della rete
```

### Sistema Griglia Città

- Origine: centro schermo, 65% dall'alto
- Cella: 70×70px
- Connessioni: 4 direzioni (su, giù, sinistra, destra)
- Snap range: 40px dalla posizione target
- Ropes: curve di Bézier quadratiche con sag
- Zoom: 0.5x - 3x con pinch-to-zoom

---

## 🔧 Tecnologie & Tecniche

### Canvas 2D Rendering

- **Lanterne origami**: forma a diamante con fold lines e tassels
- **Glow effects**: Offscreen canvas cache per glow (fallback shadowBlur)
- **Particelle**: sistema particle pool con recycle (pre-allocated 500)
- **Gradienti**: sky gradient dinamico per la transizione alba
- **Ninfee**: glow bioluminescente con attrazione particelle
- **Zoom**: transform scale con pinch gesture (0.5x - 3x)

### Web Audio API (Sintesi)

Tutti i suoni sono generati in tempo reale con oscillatori e filtri:

| Suono | Tecnica |
|-------|---------|
| Lancio rete | Noise buffer + bandpass filter sweep |
| Cattura | Chord magico (3 sine a 523/659/784 Hz) |
| Posizionamento | Sine bassa (200→80 Hz) + paper noise |
| Apertura lanterna | 3 triangle waves in sequenza |
| Alba | Pad chord crescente (261/329/392/523 Hz) |
| Livello su | Arpeggio ascendente 4 note |
| Ambient | Drone basso a 55 Hz + lowpass |
| Pioggia/Tempesta | White noise + lowpass filter |
| Neve | Sine 4kHz + LFO modulation |
| Nebbia | Lowpass noise (200Hz cutoff) |
| Vento | Bandpass noise (400Hz) |
| Zen Drone | 4 sine oscillators (110/165/220/330 Hz) |

### Sistema Meteo

| Tipo | Effetto Audio | Effetto Visivo |
|------|--------------|----------------|
| Pioggia | White noise + lowpass | Gocce blu con vento leggero |
| Neve | Sine 4kHz + LFO | Fiocchi bianchi con caduta lenta |
| Nebbia | Lowpass noise | Overlay grigio con visibilità ridotta |
| Vento | Bandpass noise | Particelle orizzontali |
| Tempesta | White noise + thunder | Pioggia forte + fulmini |

### Eventi Stagionali

| Stagione | Periodo | Lanterne Speciali |
|----------|---------|-------------------|
| Halloween | 25-31 Ottobre | 🎃 🦇 👻 |
| Natale | 20-26 Dicembre | 🎄 ⭐ 🎁 |
| Carnevale | 10-17 Febbraio | 🎭 🎊 🃏 |
| Estate | Giugno-Agosto | ✨ ☀️ 🌊 |
| Inverno | Dicembre-Febbraio | ❄️ 🧊 🌌 |

### PWA Features

- **Service Worker**: Stale-while-revalidate per JS/CSS, cache-first per static assets
- **Manifest**: `display: standalone`, `orientation: portrait-primary`
- **Offline**: Tutti gli asset sono cachati al primo caricamento
- **Install prompt**: Gestito via `beforeinstallprompt` event
- **Icons**: Generate con Pillow, maskable 512px
- **Background Sync**: Coda salvataggi offline
- **IndexedDB**: Persistenza con fallback localStorage, screenshots

### Input Handling

- **Pointer Events API**: tracking per-pointer con `pointerId`
- **Multi-touch protection**: ignora touch secondari
- **pointerleave**: cancella il caricamento se il dito esce dal canvas
- **Touch-and-hold + swipe**: meccanica physics-based per il lancio
- **Pinch-to-Zoom**: gesture nativa per zoom città (0.5x - 3x)
- **Keyboard**: Spazio per controllare la rete
- **Focus trap**: Navigazione accessibile nei menu

### Haptic Feedback

| Azione | Pattern |
|--------|---------|
| Lancio rete | `[30]` buzz breve |
| Posizionamento | `[50, 30, 50]` doppio pulse |
| Alba | `[100]` buzz lungo |
| Livello su | `[30, 50, 30, 50, 30]` celebrativo |

### Condivisione & Notifiche

- **Web Share API**: Condividi screenshot PNG della città
- **Screenshot automatico**: Salva PNG al tramonto in IndexedDB
- **Notifiche Push**: Promemoria notturni "Le tue lanterne ti aspettano"
- **Marketplace**: Export/import città come JSON

---

## 🐛 Fixes Applicati

### Critici (Gioco non funzionava)

| Fix | Problema | Soluzione |
|-----|----------|-----------|
| BUG-1 | `City.deserialize()` vuota | Implementata ricostruzione città da save data |
| BUG-2 | "Continua" non ripristinava la città | `startGame(isContinue)` con distinzione new/continue |
| BUG-3 | `CloudCat.update()` manca parametro | Passato `cityLanterns` come secondo argomento |

### Alti (Comportamenti inaspettati)

| Fix | Problema | Soluzione |
|-----|----------|-----------|
| BUG-4 | Kill threshold hardcoded 800px | `window.innerHeight + 50` dinamico |
| BUG-5 | `setTimeout` corrompe stato | Timer basato su `dt` con guard di stato |
| BUG-7 | Mobili senza level-gating | Filtro livelli: cloud_cat lv.3, moth lv.5, paper_mouse lv.7, furniture lv.6 |
| ICONE | Icone mancanti | Generate con Python Pillow |

### Architettura & Sicurezza

| Fix | Problema | Soluzione |
|-----|----------|-----------|
| MEM-1 | rAF loop non cancellabile | `this.rafId` salvato + `cancelAnimationFrame` |
| MOB-2 | Multi-touch corrompe stato | `pointerId` tracking, ignora touch secondari |
| SW | Cache stale senza update | Stale-while-revalidate + v7 cache busting |
| XSS | `innerHTML` con dati | DOM construction con `textContent` |
| A11y | Nessun fallback JS | `<noscript>` + SW error logging + ARIA labels |
| ERR | Crash senza recovery | Error boundary con `window.onerror` + retry |

---

## 🔮 Roadmap & Future Implementations

### Fase 1 — Scalabilità & Fondamenta ✅

| # | Task | Stato |
|---|------|-------|
| 1.1 | Offscreen canvas per glow effects | ✅ |
| 1.2 | Particle pool con recycle | ✅ |
| 1.3 | Audio buffer cache per noise sounds | ✅ |
| 1.4 | IndexedDB per save data | ✅ |
| 1.5 | Background Sync per salvataggio offline | ✅ |
| 1.6 | Code splitting lazy-load audio/inhabitants | ✅ |
| 1.7 | Accessibility: ARIA labels, keyboard navigation | ✅ |
| 1.8 | Test suite con Vitest + Canvas mocking | ✅ |

### Fase 2 — Intelligenza & Esperienza ✅

| # | Feature | API | Stato |
|---|---------|-----|-------|
| 2.1 | **Web Share API** — Condividi screenshot della città | `navigator.share()` + `canvas.toBlob()` | ✅ |
| 2.2 | **Notifiche Push** — "Le tue lanterne ti aspettano" | `Push API` + `Notification API` | ✅ |
| 2.3 | **Modalità Ambiente** — Cambio con ora reale | `Intl.DateTimeFormat` + `Geolocation` | ✅ |
| 2.4 | **Haptic Feedback** — Vibrazioni su azioni | `navigator.vibrate()` | ✅ |
| 2.5 | **Pinch-to-Zoom** — Zoom sulla città | `Pointer Events` | ✅ |
| 2.6 | **Audio Ambientale Contextual** | `Web Audio API` + weather sounds | ✅ |
| 2.7 | **Screenshot automatico** — Salva PNG al tramonto | `canvas.toBlob()` + IndexedDB | ✅ |
| 2.8 | **Gestione errori globale** — Crash recovery | `window.onerror` + retry UI | ✅ |

### Fase 3 — Ecosistema & Comunità ✅

| # | Feature | Descrizione | Stato |
|---|---------|-------------|-------|
| 3.1 | **Leaderboard Stelle** | Classifica locale + stub backend | ✅ |
| 3.2 | **Modalità Collaborativa** | Stub WebRTC (richiede signaling server) | ✅ |
| 3.3 | **Eventi Stagionali** | Halloween, Natale, Carnevale, Estate, Inverno | ✅ |
| 3.4 | **Editor di Lanterne** | Canvas drawing con pencil/eraser/fill | ✅ |
| 3.5 | **WebNN Integration** | Stub MediaPipe/TensorFlow.js | ✅ |
| 3.6 | **Marketplace** | Export/import città JSON + Web Share | ✅ |
| 3.7 | **Modalità Meditazione** | Zen drone sounds (4 sine oscillators) | ✅ |
| 3.8 | **AR Mode** | Stub WebXR immersive-ar | ✅ |

---

## 🤝 Contribuzione

### Branching Strategy

```
main (production)
  └── develop (integration)
       ├── feature/nuova-feature
       ├── fix/bug-fix
       └── refactor/miglioramento
```

### Code Style

- **JavaScript**: ES Modules, `const/let` (no `var`), template literals
- **Naming**: camelCase per variabili/funzioni, PascalCase per classi
- **Comments**: Solo per complessità non ovvia (il codice deve essere auto-documentante)
- **Indentation**: 2 spazi
- **Line length**: Max 100 caratteri

### Commit Conventions

```
tipo(ambito): descrizione

Tipi:
  feat     — Nuova funzionalità
  fix      — Bug fix
  refactor — Ristrutturazione senza cambio comportamento
  style    — Formattazione, spazi, no change semantico
  docs     — Documentazione
  test     — Aggiunta/Modifica test
  perf     — Miglioramento performance
  chore    — Build, CI, tooling

Esempio:
  feat(inhabitants): aggiungi AI gatto di nuvola con stati idle/walking/sleeping
```

### Prerequisiti

- Nessun build step richiesto (tranne `npm install` per i test)
- Solo un browser moderno per testare
- `python3` o `npx serve` per il server locale

---

## 📄 License

MIT — Usa, modifica, distribuisci liberamente.

---

<div align="center">

**Fatto con 🏮 e ☁️**

*Costruisci la tua città. Riempi il tuo cielo.*

</div>
