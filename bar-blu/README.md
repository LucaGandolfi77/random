# Bar Blu

**Il cozy game PWA del bar di Luca Zheng.**
Turni brevi, nessuno stress, tanta fortuna.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#-stack-tecnologico)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](#-stack-tecnologico)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](#-stack-tecnologico)
[![PWA](https://img.shields.io/badge/PWA-offline--first-5A0FC8?logo=pwa&logoColor=white)](#-stack-tecnologico)
[![Zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)](#-stack-tecnologico)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

---

## ✨ Cos'è

**Bar Blu** è una **Progressive Web App installabile** e **funzionante offline** che trasforma un piccolo bar di quartiere in un cozy game mobile. Nei panni del braccio destro di **Luca Zheng** servi i clienti abituali, giochi alle **macchinette della fortuna** dietro la tenda, gratti i **grattacieli** e collezioni cimeli da mettere in vetrina.

Zero pubblicità, zero energia, zero penalità: solo sessioni da 3–8 minuti.

## 🎮 Funzionalità

- 👋 **Servizio clienti** con preferenze legate all'ora del giorno
- 🎺 **Saletta** con 3 macchinette della fortuna (gettoni guadagnati, mai denaro reale)
- 🎫 **Grattacieli** da grattare per collezionabili
- 🖼️ **Vetrina** con collezionabili che influenzano i visitatori
- 🕐 **Ciclo giorno/notte** in 4 fasi
- 🍺 **Clienti ubriachi**: servisci un caffè per aiutarli a riprendersi (bonus)
- 🗣 **Battute personalizzate**: ogni personaggio parla con le sue
- 📖 **Ricordi del Bancone**: raccogli frammenti di storia (affinità 1/3/5)
- 🏆 20 personaggi · 8+10 eventi · 16 messaggi ambientali · 3 traguardi · 4 sblocci · salvataggio con migrazione
- ⚙️ Impostazioni (musica, effetti, volume, riduzione movimento), reset con conferma, tutorial
- 📴 Offline dopo il primo caricamento · 🔊 Audio generato via Web Audio API
- ♿ Semantica, tastiera, focus, `aria-live`, `prefers-reduced-motion`

## 🧱 Stack tecnologico

| Ambito | Scelta |
|--------|--------|
| Linguaggio | **JavaScript ES2022** (moduli ES nativi, zero build step) |
| UI | **HTML5 semantico + CSS3** (custom properties, `transform/opacity`) |
| Architettura | **MVC + Services** (Model, View, Controller, Storage, Audio) |
| Offline | **Service Worker** con strategie di caching differenziate |
| Audio | **Web Audio API** (SFX e musica generati, nessun asset) |
| Persistenza | **localStorage** con versioning, validazione e migrazione |
| Grafica | **SVG inline originali + CSS** (nessuna immagine remota) |
| Dipendenze | **Nessuna** · Nessun backend · Nessun tracking |

## ✅ Requisiti di sistema

- **Node.js ≥ 18** *oppure* **Python ≥ 3.8** (solo per il server statico locale)
- Browser moderno: Chrome/Edge ≥ 90, Firefox ≥ 90, Safari ≥ 15
- Per l'installazione PWA: servire via **HTTPS** o **localhost**

## 🚀 Avvio rapido

```bash
# 1. Clona
git clone <repo-url>
cd bar-blu

# 2. Avvia un server statico (scegli uno)
npx serve .            # Node
python3 -m http.server 8000   # Python

# 3. Apri
# http://localhost:8000
```

> I moduli ES nativi **non funzionano con `file://`**: è necessario un server HTTP.

### Installazione come app

Apri su mobile → menu del browser → **"Aggiungi a schermata Home"** (o usa il banner in-app).
Dopo il primo caricamento l'app funziona **offline**.

### Build / verifica (consigliato)

```bash
npx serve .            # serve
npx lighthouse http://localhost:3000 --view   # audit PWA/a11y/perf
```

## 🏗 Architettura

```text
INPUT (tap/tastiera)
   └── Controller ──► Model ──► Store (stato) ──► View ──► DOM
                        │
                        └── Services: Storage · Audio · PWA
```

| Layer | Responsabilità |
|-------|----------------|
| **Model** | Stato, regole di gioco, validazione/migrazione. Nessun DOM. |
| **View** | Rendering, animazioni, a11y. Nessuna regola di gioco. |
| **Controller** | Eventi e orchestrazione. Nessun accesso diretto a storage/audio. |
| **Services** | Storage, Audio, PWA isolati e feature-detected. |

Vedi `docs/architecture.md` per i dettagli.

## 🤝 Contribuire

### Branching strategy (GitHub Flow)

- `main` sempre stabile e pubblicabile
- `feat/<scope>` · `fix/<scope>` · `docs/<scope>` · `refactor/<scope>` · `chore/<scope>`
- PR piccole e focalizzate, con **1 reviewer** e CI verde
- Rebase su `main` prima del merge (no merge commit)

### Commit convenzionali (**Conventional Commits**)

```text
feat(saletta): animazione reel con stagger
fix(audio): AudioContext condiviso per evitare leak
docs(readme): aggiungere guida al contributo
refactor(view): estrae template in <template>
test(model): copre spinMachine e migrazioni
```

Regole: messaggio in **imperativo**, scope tra parentesi, breaking change con `!` e nota `BREAKING CHANGE:`.

### Stile del codice

- **ESLint + Prettier** (config in repo), righe ≤ 100, `const` di default
- **Niente dipendenze runtime**, niente `eval`, niente `innerHTML` con input utente
- Un file = una responsabilità; nomi in inglese nel codice, UI in **italiano**
- Accessibilità e `prefers-reduced-motion` obbligatorie per ogni nuova animazione
- **Checklist PR**: funziona offline · navigabile da tastiera · test aggiunti · nessuna dipendenza nuova

## 📄 Licenza

MIT — vedi [LICENSE](./LICENSE).

---

## 🔮 Roadmap

> Visione a 3 fasi. Ogni voce indica impatto e se è **offline-safe**.

### 🎯 Fase 1 — Core game (P0-P3)
Tutte le funzionalità di base del gioco.
- [x] Schermata Home, Game, Saletta, Scratch, Inventario, Impostazioni, Tutorial, Riepilogo
- [x] Servizio clienti con preferenze legate all'ora del giorno
- [x] Saletta con 3 macchinette della fortuna (gettoni guadagnati, mai denaro reale)
- [x] Grattacieli da grattare per collezionabili
- [x] Vetrina con collezionabili che influenzano i visitatori
- [x] Ciclo giorno/notte in 4 fasi
- [x] Salvataggio localStorage con versioning, validazione e migrazione
- [x] Audio generato via Web Audio API (SFX + musica)
- [x] Service Worker offline-first con strategie di caching differenziate
- [x] Zero pubblicità, zero energia, zero penalità
- [x] Tutto il codice in file ES2022 vanilla, zero dipendenze

### 🧩 Fase 2 — Gameplay improvements (P4-P5)
Nuove meccaniche di gioco e interazioni.
- [x] Haptic feedback (`navigator.vibrate`) su serve, spin e raccolta
- [x] View Transitions API nelle transizioni tra schermate
- [x] Cartoline condivisibili via Web Share API + `share_target`
- [ ] Eventi dinamici contextuali (nuove meccaniche basate sullo stato)
- [ ] Varianti orarie del bar con clienti stagionali

### 🛠 Fase 3 — Quality (P6)
Documentazione, tooling e manutenibilità.
- [x] Documentazione architetturale (`docs/architecture.md`)
- [x] Configurazione tooling (`.eslintrc`, `.prettierrc`, `.editorconfig`)
- [x] `package.json` con npm scripts (`lint`, `format`, `serve`)
- [x] Licenza MIT (`LICENSE`)
- [ ] Pipeline CI/CD automatizzata (lint, typecheck, test)
- [ ] Test automatizzati (Vitest) su model e migrazioni con RNG seminabile

---

<div align="center"><sub>Fatto con ☕ per i cozy gamer. Bar Blu non è un gioco d'azzardo: le macchinette usano gettoni virtuali.</sub></div>
