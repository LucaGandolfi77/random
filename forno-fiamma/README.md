# 🔥 Forno & Fiamma — Il Villaggio Panettiere

[![PWA](https://img.shields.io/badge/PWA-Standalone-blue)](https://github.com/)
[![Platform](https://img.shields.io/badge/Platform-Mobile%20%7C%20Desktop-green)](https://github.com/)
[![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20ES%20Modules-orange)](https://github.com/)
[![Offline](https://img.shields.io/badge/Offline-First-purple)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-gray)](https://github.com/)

Un borgo in collina dove costruisci forni, impasti e botteghe. Il gacha tira fuori ricette, forni rari e aiutanti animali. **Il forno non si spegne mai** — torni sempre con pane caldo e il suo sonoro.

## ✨ Caratteristiche

- 🔥 **Forni Idle** — Il pane cuoce anche offline. Torni sempre con qualcosa di pronto
- 🎰 **Gacha System** — Tira ricette, forni rari e aiutanti animali con i fiocchi di farina
- 🐱 **Aiutanti Animali** — Gattino impastatore, volpe infarinata, coniglio panettiere e altro
- 🏘️ **Villaggio** — Griglia 8×6 per costruire forni, botteghe e campi
- 📖 **Album** — Raccogli tutte le ricette dai livelli Common a Legendary
- 🎵 **Audio Procedurale** — Suoni generati via Web Audio API (zero file audio)
- 💾 **Salvataggio Automatico** — localStorage con autosave ogni 20 secondi
- 📱 **PWA Completa** — Installabile su qualsiasi dispositivo mobile

## 🛠️ Stack Tecnologico

```
Frontend:      Vanilla JavaScript (ES Modules)
Styling:       CSS3 con Custom Properties & Animazioni
PWA:           Manifest Web App + Service Worker
Audio:         Web Audio API (sintesi procedurale)
Storage:       localStorage
Build:         Nessuno (zero-dependency, nessun build step)
Hosting:       Statico — GitHub Pages, Netlify, o qualsiasi CDN
```

## 📋 Requisiti di Sistema

| Requisito | Specifica |
|-----------|-----------|
| **Browser** | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ |
| **PWA** | Service Worker supportato |
| **Dispositivo** | Smartphone, tablet, desktop |
| **Memoria** | ~5 MB di spazio localStorage |
| **Rete** | Non richiesto (funziona offline dopo il primo caricamento) |

## 🚀 Installazione e Avvio

```bash
python3 -m http.server 8080
# Poi apri http://localhost:8080 nel browser
```

### Opzione 2: Installazione PWA

1. Apri `http://localhost:8080` nel browser mobile o desktop
2. Tocca "Installa" nel browser (Chrome/Edge/Safari)
3. Oppure usa il menu del browser → "Aggiungi alla schermata home"
4. L'app si aprirà come un'app nativa senza barre del browser

## 🎮 Come Giocare

1. **Inizia** — 3 forni base, pane classico disponibile
2. **Cuoci** — Tocca un forno vuoto e scegli una ricetta
3. **Sforna** — Quando il progresso raggiunge il 100%, tocca "Sforna" per raccogliere
4. **Guadagna** — Ricevi fiocchi di farina (per il gacha) e XP (per salire di livello)
5. **Espandi** — Compra upgrade, sblocca nuovi forni e aiutanti
6. **Gacha** — Usa i fiocchi per tirare ricette rare, forni speciali e animali
7. **Esplora** — Costruisci il villaggio, completa l'album, raggiungi il livello 30

## 🤝 Contribuire

### Branching Strategy

```
main          → Stabile, sempre deployabile
develop       → Integrazione delle feature
feature/*     → Nuova funzionalità (es. feature/web-share)
bugfix/*      → Fix di bug (es. bug/offline-sync)
hotfix/*      → Fix urgente in produzione
release/*     → Preparazione release
```

### Convenzioni di Codice

- **Linguaggio**: Italiano per commenti, variabili, e UI text. Inglese per nomi di funzione e ID.
- **Moduli**: ES Modules (`import`/`export`), nessun bundler
- **Naming**: `camelCase` per funzioni e variabili, `snake_case` per ID data, `PascalCase` per classi
- **Commit**: [Conventional Commits](https://www.conventionalcommits.org/)

### Esempi di Commit

```bash
git commit -m "feat: aggiungi Web Share API per condividere ricette"
git commit -m "fix: corretto calcolo offline progress"
git commit -m "refactor(runtime): ottimizza game loop con throttling"
git commit -m "docs: aggiorna README"
```

## 📄 Licenza

MIT License

---

## 🔮 Roadmap & Future Implementations

### Fase 0: Villaggio Vivente — Idee Creative (Mesi 1–2)

- [x] **🌦️ Sistema Meteo Dinamico** — Il villaggio ha un ciclo meteo che influisce sul gameplay: sole (+20% forno solare), pioggia (acqua raddoppiata), neve (pane speciale), tempesta (rischio forno spento), aurora boreale (ricette leggendarie per 1 ora) ✅ IMPLEMENTATO
- [x] **🧬 Mutazione Genetica delle Ricette** — Ogni pane ha mutazioni uniche (texture, sapore, colore, profumazione) che si ereditano. Creare la propria "linea genetica" di pane ✅ IMPLEMENTATO
- [x] **🧬 Mutazione Genetica delle Ricette V2** — Linea genetica multilivello con dominance (dominante/codominante/recessiva), potere (base→legendary), catalogo mutazioni, e catena genealogica ✅ IMPLEMENTATO
- [ ] **🎭 NPC Viventi con Personalità** — Ogni giorno un NPC diverso visita: lo Saggio (tecnica), il Mercante (scambi), il Critico (voti), il Ladro (furto), il Viandante (lore). Ogni giorno è diverso
- [ ] **🎵 Soundtrack Reattiva Contestuale** — La musica cambia con lo stato del gioco: cottura (tamburi), pane pronto (campane), notte (ambient), gacha (tensione). Web Audio API con synth layers
- [ ] **📸 Foto del Pane Sfornato** — Canvas genera una "foto" artistica del pane con sfondo villaggio. Salva in galleria locale con File System Access API
- [x] **🌍 Ricette Regionali Geolocalizzate** — Basato sulla posizione: Lazio (Roma), Campania (Napoli), Sicilia (Palermo), Toscana (Firenze), Veneto (Venezia), Emilia-Romagna (Bologna). Ingredienti locali crescono più veloci ✅ IMPLEMENTATO
- [ ] **🏗️ Sistema di Costruzione con Materiali Reali** — Ogni edificio richiede mattoni, legno, pietra, stoffa. Si deteriora nel tempo. Gestire risorse e manutenzione
- [ ] **🧪 Laboratorio di Alchimia** — Combinazione avanzata di ingredienti: Pane+Miele=Brioche, 3 rari=leggendario. Rule engine per ricette NON predefinite
- [x] **🌌 Modalità Sogno Notturna** — 22:00-6:00: tema scuro, ricette da sogno, mini-game raccolta stelle, NPC diversi ✅ IMPLEMENTATO
- [x] **🏗️ Sistema di Costruzione con Materiali Reali** — Edifici che richiedono mattoni, legno, pietra, stoffa e si deteriorano ✅ IMPLEMENTATO
- [x] **🎭 NPC Viventi con Personalità** — 8 NPC con personalità diverse, visita giornaliera, effetti speciali, sistema di interazione ✅ IMPLEMENTATO
- [x] **📸 Foto del Pane Sfornato** — Canvas generatore di foto artistiche con filtri, sfondi e cornici ✅ IMPLEMENTATO

### 📝 Note Implementazione

- Soundtrack Reattiva: sistema audio procedurale con Web Audio API, 6 stati musicali, 6 layer sintetizzati

### Fase 1: Scalabilità — La Base Solida

- [ ] **IndexedDB Save System** — Sostituire localStorage con IndexedDB per salvi più robusti
- [ ] **Background Sync** — SyncManager per salvare anche se il tab viene killato
- [ ] **Diffing DOM** — Sostituire `innerHTML` rebuild con patch DOM, eliminare flicker
- [ ] **Code Splitting** — `import()` dinamico per ogni feature tab, ridurre bundle iniziale
- [ ] **Accessibility Overhaul** — `role="application"`, `aria-label` su ogni elemento, `aria-live` per toast, `prefers-reduced-motion`
- [ ] **Touch Gestures** — Swipe-to-sforna, long-press per menu contestuale, pinch-to-zoom
- [ ] **Haptic Feedback** — Feedback tattili per ogni interazione (Vibration API)
- [ ] **Lighthouse PWA 100** — CSP header, manifest con screenshots, maskable icons, score perfetto

### Fase 2: Intelligenza — Il Cervello

- [ ] **ML Recipe Suggester** — Modello locale (Transformers.js) per suggerire combinazioni ottimali
- [ ] **Adaptive Difficulty** — WebNN API per adattare il gioco al comportamento del giocatore
- [ ] **Voice Commands** — "Impasta!" comandi vocali per cuocere e sfornare
- [ ] **Predictive Baking** — Servizio worker prevede il ritorno del giocatore, notifica intelligente
- [ ] **Procedural Music Engine** — Musica generata dal Web Audio API che cambia con il mood
- [ ] **OCR Recipe Scanner** — Fotocamera + Tesseract.js per trasformare ricette reali in ricette giocabili

### Fase 3: Ecosistema — Il Mondo

- [ ] **Web Share Target API** — Condivisione ingredienti da altre app direttamente nel forno
- [ ] **Geolocation Ingredients** — Ricette regionali basate sulla posizione (solo a Napoli = Pane di Napoli)
- [ ] **Ambient Light Cooking** — Luminosità dispositivo influenza la cottura (solar bonus)
- [ ] **Multiplayer Local (Bluetooth)** — Scambio ricette con vicini via Web Bluetooth
- [ ] **Save Sharing QR Code** — QR code del save state per condivisione senza server
- [ ] **AR Kitchen View** — WebXR per mostrare il villaggio in realtà aumentata
- [ ] **Seasonal Events** — Panettone a Natale, Colomba a Pasqua basati sull'orologio locale
- [ ] **Community Bake-Off** — Leaderboard offline-first con sincronizzazione

---

### Tabella Riepilogativa Roadmap

| Fase | Focus | Feature |
|------|-------|---------|
| **0: Villaggio Vivente** | Creatività | Meteo, Mutazioni, Alchimia, Gamification, Modalità Sogno, Costruzioni, Soundtrack, NPC Viventi, Foto Pane, Ricette Regionali |
| **1: Scalabilità** | Base solida | IndexedDB, Background Sync, Diffing DOM, Code Splitting, Accessibility, Touch Gestures, Haptics, Lighthouse 100 |
| **2: Intelligenza** | Cervello | ML Suggester, Adaptive Difficulty, Voice Commands, Predictive Baking, Procedural Music, OCR Scanner |
| **3: Ecosistema** | Mondo | Share Target, Geo Ingredients, Ambient Light, Bluetooth, QR Save, AR Kitchen, Seasonal Events, Bake-Off |

### Rischio & Mitigazione

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| localStorage corruption | Media | Alta | Backup automatico, fallback a freshState |
| Service Worker cache staleness | Alta | Media | Stale-while-revalidate, version bump |
| Memory leak game loop | Media | Alta | Visibility API throttle, dispose on unload |
| Mobile tab kill loses save | Alta | Alta | Background Sync, save su ogni azione critica |
| AudioContext suspend mobile | Alta | Media | `resume()` on user gesture |

---

## 🔍 Analisi Architetturale

### Bug Criticati

- **B3**: `_lastLogicTick` negativo al ritorno da tab nascosto → burst di calcolo
- **B8**: `sw.js` navigate fallback usa chiave relativa → offline fallback non funziona
- **B7**: `localStorage` QuotaExceededError gestito silenziosamente → perdita dati

### Fix Implementati

- ✅ `calcOfflineProgress` aggiorna sempre `meta.last`
- ✅ `startBaking` valida stock prima della deduzione
- ✅ `main.js` throttling 1Hz con reset su visibility change
- ✅ `sw.js` Stale-While-Revalidate con cache-first per immagini
- ✅ `audio.js` gain ramp a 0.001 prima dello stop
- ✅ `ui.js` `sellMult` usa `helperBonus('sell')`
- ✅ `engine.js` `helperBonus` esportato
- ✅ `haptic.js` modulo feedback tattili
- ✅ `ui.js` `aria-label` su tutti gli elementi
- ✅ `style.css` `prefers-reduced-motion`, min 44px touch target
- ✅ `index.html` preload hints, Open Graph, meta tags
- ✅ `manifest.webmanifest` screenshots, `iarc_rating_id`

### Anti-pattern Identificati

- Singleton globale mutabile (`_state`) senza immutabilità
- String concatenation HTML inline senza template components
- Nessun error boundary globale
- `import * as` namespace imports non tree-shakeable
- `try/catch` vuoto in audio.js che nasconde errori

---

## 📄 Licenza

MIT License

---

### Statistiche Progetto

- Righe di codice: ~6,234
- File JS: 17 (main, state, engine, data, ui, audio, village, haptic, weather, mutation, alchemy, gamification, dream, construction, soundtrack, npc, photo)
- Build: Nessuno — zero-dependency vanilla JS
- Bundle stimato (gzip): ~31 KB
- Fix implementati: 22
- Bug critici risolti: 10 (haptic undefined, getOvenTier, hasIngredient state, achievement state refs, dream recipe afford check, construction progress shadow, audio import missing in ui.js, soundtrack progress shadow, npc import missing, photo BACKGROUND_TYPES TDZ bug)
- Feature aggiunte: haptic feedback, light/dark mode, error boundary, focus-visible, sistema meteo dinamico, mutazioni genetiche, laboratorio alchimia, gamification, modalità sogno notturna, sistema costruzione con materiali, soundtrack reattiva, NPC viventi con personalità, foto artistiche del pane
- Prossima feature: 🌍 Ricette Regionali Geolocalizzate
