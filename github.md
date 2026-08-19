# Pubblicare i tuoi progetti su GitHub Pages (sito statico)

> Guida pratica per mostrare gli 80+ progetti del catalogo su una GitHub Page statica, gratuita e hostata direttamente dal tuo account GitHub.

---

## 1. Due approcci possibili

### Approccio A — User page (`LucaGandolfi77.github.io`)

Un repository dedicato, chiamato **esattamente** `LucaGandolfi77.github.io`, che diventa il tuo **portfolio centrale**.

- URL: `https://lucagandolfi77.github.io`
- Vantaggi: URL pulita, un solo sito "vetrina" per tutto, controllo totale del layout, nessun path nel mezzo
- Svantaggi: devi creare un repo separato (puoi linkare i progetti al repo `random` via link)

### Approccio B — Project page dal repo `random`

Attivi GitHub Pages **dentro il repo esistente `random`**, servendo una cartella dedicata.

- URL: `https://lucagandolfi77.github.io/random/`
- Vantaggi: nessun nuovo repo, tutto in un unico posto, puoi anche servire direttamente i progetti statici (giochi, demo) come sotto-cartelle di `/random/...`
- Svantaggi: URL più lunga, il sito convive con tutto il resto del repo

### Raccomandazione

**Usa l'Approccio A (user page) come "hub" del portfolio** e in più **attiva l'Approccio B** nel repo `random` per i singoli demo giocabili. Così hai:

```
LucaGandolfi77.github.io/            ← portfolio centrale (griglia filtrabile)
LucaGandolfi77.github.io/random/due-lumi/          ← demo giocabile
LucaGandolfi77.github.io/random/candy-crush/       ← demo giocabile
LucaGandolfi77.github.io/random/quotesmith/        ← demo giocabile
```

Molti progetti del catalogo sono già **HTML/CSS/JS statici** (due-lumi, candy-crush, slot-\*, quotesmith, shotmind, expedition33_game, coop-game, card-games demo client) e possono essere serviti **così come sono** da GitHub Pages, senza alcuna build.

---

## 2. Cosa SI può e cosa NON si può hostare su Pages

GitHub Pages è **statico** (solo file HTML/CSS/JS). Non esegue codice lato server.

| Progetto / tipo | Su Pages? | Come presentarlo |
|---|---|---|
| Giochi statici (due-lumi, candy-crush, quotesmith, slot-\*, expedition33) | ✅ Sì, subito | Copia la build nella cartella servita e linka la demo |
| PWA offline (audio-editor, shhh-reader, ev-personale, tailssh) | ✅ Sì (con attenzione a Service Worker, vedi §6) | Demo + QR code di installazione |
| Frontend React/Next buildato statico | ✅ Sì (dopo `next export` o build statica) | Screenshot + demo se fattibile |
| Backend FastAPI/Flask/Express, Socket.IO, DB, WebRTC server | ❌ No | Link al codice + screenshot/video |
| Firmware ESP32, desktop (Qt6, Pygame), Python CLI | ❌ No | Screenshot, GIF, wiring diagram, link al repo |

**Regola pratica:** se il progetto gira solo nel browser senza server → hostalo. Se serve un backend → mostra codice, screenshot e video.

---

## 3. Setup passo-passo

### Approccio A — user page

1. Crea un nuovo repo pubblico: `LucaGandolfi77.github.io`
2. `git clone` il repo in locale, aggiungi `index.html` (o un generatore statico, vedi §5)
3. Attiva Pages: **Settings → Pages → Source: Deploy from a branch → branch `main` → `/ (root)`** → Save
4. Dopo il push, il sito è live su `https://lucagandolfi77.github.io` (deploy automatico)

### Approccio B — project page nel repo `random`

1. Nel repo `random`, crea la cartella `docs/` con dentro `index.html` (o usa il branch `gh-pages`)
2. Attiva Pages: **Settings → Pages → Source: Deploy from a branch → branch `main` → `/docs`** → Save
3. Il sito è live su `https://lucagandolfi77.github.io/random/`

> Nota: i progetti statici (giochi) possono stare in sotto-cartelle di `docs/`, es. `docs/due-lumi/index.html`. Inseriscili con `git submodule` (link al progetto nel repo `random` o in repo separati) oppure copiando la build.

---

## 4. Struttura consigliata del sito portfolio

Suggerita per l'user page (Approccio A):

```
LucaGandolfi77.github.io/
├── index.html            ← hero + griglia progetti filtrabile
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   └── img/              ← screenshot/GIF dei progetti
├── projects/
│   ├── atlas-editorial-house/index.html
│   ├── echoes-of-the-last-dawn/index.html
│   └── ...               ← una pagina di dettaglio per progetto
└── data/
    └── projects.json     ← dati generati da PROJECTS-CATALOG.md
```

**`projects.json` generato da `PROJECTS-CATALOG.md`** — ogni progetto diventa un oggetto:

```json
{
  "title": "Atlas Editorial House",
  "category": "ai-agents",
  "tags": ["Python", "OpenRouter", "Hermes", "Multi-Agent"],
  "description": "37 AI personalities for editorial production",
  "featured": true,
  "demoUrl": "https://lucagandolfi77.github.io/random/atlas-demo/",
  "githubUrl": "https://github.com/LucaGandolfi77/random/tree/main/atlas-editorial-house",
  "image": "/assets/img/atlas-1.png"
}
```

**`index.html`** con:
- **Hero**: "Luca Gandolfi — AI Engineer & Full-Stack Developer", sottotitolo con le 6 categorie (AI & Multi-Agent, Games, Web/SaaS, PWA, Embedded, Desktop/Scientific)
- **Griglia filtrabile**: filtri per categoria (via parametro URL `?category=games` per SEO)
- **Card progetto**: screenshot, 1 riga di descrizione, badge tech-stack, 2-3 bullet, pulsanti "Live Demo" e "GitHub"
- **Embed demo giocabili** in `<iframe loading="lazy">` con pulsante fullscreen

---

## 5. Come generare il sito

| Opzione | Pro | Contro | Quando |
|---|---|---|---|
| **HTML/CSS/JS puro** | Zero build, zero dipendenze, deploy istantaneo | Più manuale da aggiornare | Consigliata: semplice e coerente con il tuo stile zero-dependency |
| **Jekyll** (nativo di GitHub Pages) | Rende Markdown automaticamente, temi inclusi | Ruby, layout limitati | Se vuoi blog + portfolio in markdown |
| **Astro / Hugo** | Fast, template moderni | Richiede build locale/CI | Se vuoi un sito più ricco |
| **Next.js statico** (`next export`) | Stesso stack dei tuoi SaaS | Build più complessa su Pages | Se poi migri a Vercel |

**Raccomandazione:** parti con **HTML/CSS/JS puro** (un solo file `index.html` + un `projects.json`). Se in futuro vuoi i post del blog, passa a **Jekyll**.

---

## 6. Dettagli pratici

- **Service Worker / PWA**: i Service Worker funzionano ma lo **scope** è il path del sito. Per una PWA servita da `/random/audio-editor/` il manifest e lo SW devono usare path **relativi** a quel path (es. `./sw.js`, `./` come scope). Testa sempre da `lucagandolfi77.github.io/random/...` (HTTPS) perché SW funzionano solo in HTTPS.
- **Screenshot e GIF**: screenshot dei 10 progetti principali (già indicati in `WEBSITE-CV-STRATEGY.md` §Part 3). GIF da 15s più leggere di video.
- **Custom domain** (opzionale): Settings → Pages → Custom domain, poi DNS CNAME sul tuo dominio.
- **SEO/social**: `<meta description>`, `og:image` con uno screenshot del sito, `og:title`.
- **README del repo**: aggiungi il link al sito in cima al README di `random` e di ogni progetto importante.
- **GitHub Action opzionale**: uno script che rigenera `data/projects.json` dal `PROJECTS-CATALOG.md` a ogni push (workflow `.github/workflows/update-catalog.yml`).

---

## 7. Checklist azioni

1. [ ] Attiva GitHub Pages sul repo `random` (cartella `/docs`) — progetto demo live
2. [ ] Crea il repo `LucaGandolfi77.github.io` con `index.html` + `projects.json`
3. [ ] Copia o collega (submodule) i giochi statici: due-lumi, candy-crush, quotesmith, shotmind, expedition33_game, slot-\*
4. [ ] Genera `data/projects.json` da `PROJECTS-CATALOG.md`
5. [ ] Aggiungi screenshot/GIF dei 10 progetti top
6. [ ] Aggiungi meta tag SEO/social
7. [ ] Aggiorna il README di `random` con il link al portfolio
8. [ ] (Facoltativo) blog in Jekyll + custom domain
