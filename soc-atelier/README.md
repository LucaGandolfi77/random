# SoC Atelier — La Fonderia dei Cristalli

> Costruisci piccoli cervelli di cristallo (SoC) per aiutare gli abitanti di una fonderia notturna. Impara *giocando* come CPU, cache, RAM, bus, GPU e NPU collaborano.

![PWA](https://img.shields.io/badge/PWA-installable-0f0a26?logo=googlechrome&logoColor=white)
![Lighthouse](https://img.shields.io/badge/Lighthouse-target%3A%2095-blue)
![Vanilla](https://img.shields.io/badge/JS-vanilla%20ESM-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**SoC Atelier** è una Progressive Web App installabile, utilizzabile offline e pensata per sessioni brevi (3–5 minuti). Avvolge un'esperienza didattica precisa — Amdahl, banda di memoria, hit-rate della cache, P∝V²f, colli di bottiglia — dentro un'atmosfera notturna e rilassante, senza stress né penalità.

## Funzionalità

- **Campagna didattica** di 8 capitoli (dal singolo core al SoC completo con budget) + **modalità sandbox** a difficoltà crescente.
- **Simulazione onesta**: legge di Amdahl, banda memoria, cache hit-rate, P∝V²f, indicatore di collo di bottiglia.
- **6 personaggi** con personalità e dialoghi, **8 Sigilli** collezionabili, **3 traguardi**, **3 sbloccabili**, ciclo notte (4 fasi), meteo estetico.
- **Bilingue IT/EN** con selettore lingua.
- **Audio generato** via Web Audio API (musica + effetti), preferenze salvate.
- **PWA completa**: manifest, service worker con cache versionata, offline.html, icone PNG/SVG locali.
- Accessibilità (HTML semantico, `aria-live`, focus visibile, `prefers-reduced-motion`), mobile-first portrait, touch ≥44px.
- Condivisione cristallo (Web Share), vibrazioni di feedback dove supportato.

## Stack

- **HTML5 + CSS3** — design system notturno, tutto locale (nessun asset remoto).
- **JavaScript vanilla (ESM)** — architettura MVC + Services, `js/sim.js` come motore di dominio puro.
- **Web Audio API** — suoni generati, nessun file audio.
- **Service Worker + manifest** — PWA offline-first.
- **localStorage** con validazione e migrazione versione.
- Tool di verifica: `jsdom` + `canvas` (dev).

## Requisiti

- Un browser moderno (Chrome/Edge/Firefox/Safari ≥ 115).
- Un server HTTP locale per servire la cartella (ES modules non funzionano via `file://`).
- Node.js ≥ 18 **solo per i tool di verifica**.

## Installazione e avvio

```bash
cd soc-atelier
python3 -m http.server 9876
# aprire http://localhost:9876
```

Strumenti:

```bash
npm test        # check-syntax + smoke-import + boot test
npm run check   # controlli sintattici + assenza di eval
npm run smoke   # importa tutti i moduli in jsdom
npm run boot    # boot reale dell'app (tutorial → gioco)
npm run icons   # rigenera icone PNG/SVG (richiede canvas)
```

## Architettura

```text
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  View    │◄────│ Controller   │►────│  Model   │
│ (render) │     │ (eventi)     │     │ (stato)  │
└──────────┘     └──────┬───────┘     └─────┬────┘
                        │                   │
                        ▼                   ▼
                   Services            sim.js
                 (storage,audio,       (dominio puro:
                  pwa)                 formule SoC)
```

- **Model** (`js/model.js`): stato, regole, progressione, serializzazione. Nessun DOM.
- **sim.js**: formule pure (Amdahl, banda, cache, potenza, collo di bottiglia). Nessun stato globale.
- **View** (`js/view.js`): rendering, animazioni, a11y. Nessuna regola di gioco.
- **Controller** (`js/controller.js`): eventi, orchestrazione, feedback audio. Non muta lo stato direttamente.
- **Services** (`js/services/*`): persistenza, audio, PWA. Nessuna logica di gioco.

Flusso: `input utente → Controller → Model (+ sim.js) → stato aggiornato → View → DOM`.
Caricamento: `Storage Service → validazione/migrazione → Model → Controller → View`.

## Contribuzione

- **Branching**: trunk-based su `main`; feature branch `feat/<nome>` con merge tramite PR.
- **Commit convenzionali**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`. Esempio: `fix: if (!m) era invertito nel modale reset`.
- **Stile**: Prettier (tab 2, semafori, trailing comma), ESLint (`no-eval`, `no-undef`). `npm run check` obbligatorio prima di ogni merge.
- **Test**: ogni commit deve superare `npm test` (check-syntax, smoke-import, boot).
- **PWA**: nessun asset remoto obbligatorio; icone in `icons/`; manifest sempre aggiornato.

## 🔮 Roadmap & Future Implementations

**Fase 1 — Scalabilità**
- Lazy loading dei moduli e code splitting per schermate (sandbox/settings).
- Service Worker con strategie differenziate: *Stale-While-Revalidate* per JS/CSS, *Cache-First* per icone, *Network-First* per navigazione.
- Web Share Target maturo: poster in canvas del SoC condivisibile, seed di workload dai dati condivisi.
- Code-splitting e `modulepreload`; CSS critico inline; batching metriche con `requestAnimationFrame`.
- Aggiornamento SW con toast "Nuova versione disponibile" + `skipWaiting` guidato.

**Fase 2 — Intelligenza**
- **Consigliere di cristallo (WebNN / Transformers.js, offline)**: micro-modello locale che, letto il brief, suggerisce i moduli e **spiega il collo di bottiglia**, rendendo la didattica adattiva al livello dell'utente.
- Riconoscimento vocale delle istruzioni (SpeechRecognition) per comandi hands-free ("aggiungi GPU").
- Micro-modelli di persona dei personaggi: preferenze che evolvono con lo storico del giocatore.

**Fase 3 — Ecosistema**
- **Presenza ambientale nativa**: vibrazioni aptiche su posa/finitura (F3 già base), tema adattivo a luce ambientale (AmbientLightSensor) e batteria (Battery API), Wake Lock durante sandbox, notifiche Web Push opt-in e non manipolatorie (max 1/giorno).
- **File System Access API + OPFS**: backup automatico del salvataggio e "esporta progetto" con persistenza locale profonda.
- **Periodic Background Sync** per aggiornare contenuti ambientali dove supportato.
- **Gamification leggera**: streak giornalieri (non penalizzanti), badge contestuali, sfide cooperative via WebRTC (locale).
- **Autenticazione locale** (WebAuthn) per proteggere profili multipli sullo stesso dispositivo.

---

Licenza **MIT** — vedi `LICENSE`. Nessun dato raccolto, nessun analytics.
