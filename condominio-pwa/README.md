# 🏢 Scala B, Civico 0

### *Il Condominio dei Fenomeni Impossibili*

**Un condominio tranquillo, se non conti le leggi della fisica.**
Cozy gacha PWA mobile-first: raccogli inquilini impossibili, arredi assurdi ed episodi di vita condominiale. Niente acquisti, niente conti alla rovescia punitivi, niente account.

---

## 🎮 Il loop

1. **Fai un giro di palazzo.** Ogni finestra con la spilla `✦` ha un favore pronto.
2. **Aiuta gli inquilini.** Ritrova il tuono di Nuvola, spegni la call di Bruno, rimetti il martedì al suo posto.
3. **Guadagni briciole** 🌰 (e ogni 5° favore anche un frammento 🧩).
4. **Apri una bustina** nella *Cassetta delle Lettere Impossibili*: nuovi inquilini o arredi.
5. **Sistema la gente** negli appartamenti: due inquilini sullo stesso piano possono scatenare un **episodio** con ricompensa.
6. **Apri nuovi piani** con briciole + frammenti, fino all'attico.

I **doppioni** non spariscono: gli inquilini doppioni diventano **ricordi** (spendibili per salire di livello e sbloccare battute nuove), gli arredi doppioni diventano **frammenti** (servono per i piani).

## 📦 Contenuti

| | |
|---|---|
| Inquilini | **10** — Nuvola, Mimì, Dott.ssa Spina, Bruno, Nerone, Beppe, Lasagna, Il Martedì, Sbirulino, Topolino Freccia |
| Arredi | **12** — dall'Acquario Galassia al Rotolo Temporale |
| Episodi | **8** — combinazioni improbabili fra inquilini e arredi |
| Piani | **6** + portineria con Gris il gatto |
| Battute | **5 per inquilino**, sbloccabili salendo di livello |

## 📊 Gacha onesto

| Rarità | Probabilità |
|---|---|
| Comune | 60% |
| Raro | 27% |
| Epico | 11% |
| Leggendario | 2% |

- **1 bustina = 60 🌰** · **10 = 540 🌰** (risparmio 10%)
- **Sicurezza dell'epico**: al 30° tiro di fila non può che uscire epico o leggendario
- **Decina**: almeno un raro o meglio
- Probabilità scritte a schermo, nella sezione «Probabilità e promesse oneste»
- **Zero acquisti a pagamento**: tutto si guadagna giocando

## 📱 PWA

Installabile sulla home screen, funziona **offline** (service worker con app shell precacheata), salvataggio in `localStorage`, safe-area per notch, layout ottimizzato per una sola mano.

## 🚀 Avvio

```bash
cd condominio-pwa
python3 -m http.server 8090
# apri http://localhost:8090
```

oppure `npm start`.

## 🧪 Test

```bash
npm install      # jsdom + playwright + lighthouse (solo dev)
npm test         # logica + verifica statica + UI
npm run test:browser  # su Chromium reale (serve `npx playwright install chromium`)
npm run test:all      # tutto
npm run audit         # Lighthouse (perf/a11y/best-practices/seo)
```

| Suite | Cosa verifica |
|---|---|
| `test/logic.test.js` | economia, pity, doppioni, episodi, piani, salvataggio + migrazioni (34 test, PRNG con seme) |
| `test/static.test.js` | id HTML/JS, attributi `data-*`, classi CSS, asset del service worker, assenza di dipendenze di rete |
| `test/ui.test.js` | avvia l'app in jsdom e simula i tocchi: sheet, favori, bustine, album, sblocco piani, reset (PRNG con seme) |
| `test/browser.test.js` | shell, service worker attivo, favore/Escape/gacha da tastiera, localStorage, funzionamento offline, zero `pageerror` (Playwright) |

## 🗂 Struttura

```
condominio-pwa/
├── index.html          # shell: palazzo, cassetta, album, sheet, reveal
├── style.css           # tema cozy mobile-first (crema, prugna, salvia, terracotta)
├── manifest.json       # PWA it-IT, standalone, portrait
├── sw.js               # service worker: stale-while-revalidate + shell offline
├── package.json        # scripts (start/test/icons/audit)
├── package-lock.json   # installazioni riproducibili (jsdom, playwright, lighthouse — solo dev)
├── icons/              # icone generate (qualsuali + maskable + apple-touch)
├── js/
│   ├── data.js         # catalogo: inquilini, arredi, episodi, piani, tariffe
│   ├── game.js         # logica pura, nessun DOM (tutto testato)
│   ├── ui.js           # rendering e interazioni
│   ├── save.js         # persistenza localStorage
│   ├── audio.js        # suoni procedurali Web Audio + vibrazione
│   └── main.js         # bootstrap, install prompt, service worker
├── tools/make_icons.py # genera le icone PNG con Pillow
├── tools/lighthouse.mjs# avvia server + Lighthouse e stampa i punteggi
└── test/               # logica, statica, UI, browser reale
```

## 🎨 Direzione artistica

Un libro illustrato che ha preso in gestione un condominio: carta crema, cielo di prugna con le finestre accese, salvia e terracotta per i pulsanti, oro per il regalo del portiere. Emoji usate come illustrazioni leggere: zero richieste di rete, caricamento istantaneo.

## 🧾 Note di design

- **Niente perdite di progresso**: se non entri per giorni, il palazzo aspetta. Il portiere si limita a fare commenti.
- **I favori richiedono una casa**: per guadagnare devi sistemare l'inquilino in un appartamento.
- **Gli episodi si scatenano una sola volta** e non si riscuotono due volte.
- **Reset esplicito** nelle impostazioni, con conferma.

---

## ✅ TODOs — fasi di implementazione

Roadmap operativa: le checkbox vengono spuntate man mano che la fase viene completata.

### 🔧 Fase 1 — Scalabilità

Fondamenta solide: niente più bug noti, salvataggi resilienti, Service Worker prevedibile, accessibilità di base.

- [x] **Timer sheet appartamento**: correggere la riapertura a loop quando il favore è pronto e il countdown fermo quando è in cooldown (`js/ui.js`)
- [x] **Service Worker**: cache con prefisso proprio (niente cancellazione di cache altrui), precache che non fallisce in silenzio, fallback offline corretto per le navigazioni (stale-while-revalidate)
- [x] **`loadState()`**: validare ogni campo (righe appartamento `null`, inquilini non-oggetto, cooldown, episodi, impostazioni booleane)
- [x] **Validazione indici**: `placeTenant` / `placeFurniture` / `removeFurnitureAt` devono rifiutare piano, appartamento e nicchia fuori range
- [x] **`pull()`**: conteggi ammessi solo `1` o `10`; azzerare il pity quando la garanzia della decina promuove un epico
- [x] **Persistenza**: avvisare quando il salvataggio fallisce (quota piena / modalità privata) e sincronizzare tra schede con l'evento `storage`
- [x] **Accessibilità**: rimuovere `maximum-scale=1`, aggiungere `:focus-visible`, gestire focus ed `Escape` negli sheet, far avanzare il reveal da tastiera, area touch ≥ 44 px per il pulsante impostazioni
- [x] **Test deterministici**: PRNG con seme fisso nei test statistici del gacha + nuovi test di robustezza del salvataggio
- [x] **`package-lock.json`**: installazioni e CI riproducibili
- [x] **Migrazioni versionate dello schema salvataggio** (campo `v`, `migrateSave()` + `MIGRATIONS` in `js/game.js`)
- [x] **Test su browser reale** (Playwright/Chromium, `test/browser.test.js`) **e audit Lighthouse / WCAG** (A11y 100, contratto colore `--ink-soft` corretto)

### ⚙️ Fase 2 — Intelligenza

- [x] **Gris IA offline opzionale**: compositore locale di battute (template + PRNG, zero rete) con fallback alle battute scritte; toggle in Impostazioni — niente Transformers.js/modello pesante per restare PWA offline-first
- [x] **Verbali assurdi dell'assemblea**: micro-contenuti generati in locale da inquilini ed episodi noti (`assemblyMinutes` in `js/game.js`)
- [x] **Obiettivi gentili non punitivi**: legami fra vicini, album di ricordi, traguardi di buon vicinato (mai streak punitivi) — 14 goal in tab Album → Obiettivi, schema `v2`
- [x] Timer e animazioni sospesi quando `document.hidden` (`body.anim-paused` + pause/resume dei timer)

### 🌍 Fase 3 — Ecosistema

- [x] **Cartoline condominiali**: esporta la tua scala come PNG e condividila con la Web Share API (`js/postcard.js`, canvas locale, fallback download)
- [x] **Web Share Target**: ricevi cartoline/salvataggi da altre app (`share_target` GET nel manifest + handler in `js/main.js`)
- [x] **Eventi contestuali stagionali** basati su giorno/mese/stagione locali (`Intl.DateTimeFormat` in `seasonEvent`); sensore di inclinazione **solo opt-in** (toggle spento di default)
- [x] Esportazione / importazione del salvataggio JSON (`exportSave` / `importSave` in `js/save.js`)
- [x] Notifiche push opzionali **locali** (promemoria regalo, solo con consenso) e condivisione multi-dispositivo **senza backend** (esporta/importa salvataggio, storage event tra schede)

### 🧠 Fase 4 — Il palazzo ha memoria

Il palazzo si ricorda di te: cronache locali, combinazioni speciali e storie degli oggetti. Niente streak, niente scadenze, niente contenuti da perdere.

- [x] **Diario delle scale**: cronache quotidiane generate in locale da inquilini, arredi, episodi e stagione (`ensureDiary` + tab Album → Diario); archivio rileggibile, al massimo una voce al giorno, nessuna penalità se mancano giorni
- [x] **Combinazioni impossibili**: scene speciali inquilino+arredo (stessa casa o stesso piano), distinte dagli episodi (es. Nuvola+Acquario Galassia); scoperte permanenti in Album → Ricordi
- [x] **Vita precedente degli arredi**: retroscena che si sblocca collocando l'arredo con l'inquilino giusto (Album → Ricordi, fogli dedicati)
- [x] **Migrazione schema `v3`**: `diary`, `combos`, `furnPast`, `boardReactions`, `stamps`, `elevator`, `tour` con validazione in `loadState`

### 🏗️ Fase 5 — Vita di palazzo

- [x] **Bacheca condominiale**: avvisi generati dagli inquilini + reazioni a timbro (Approvato / Ne riparliamo / Dragon-reply), salvate solo sul dispositivo
- [x] **Ascensore fuori dalla geometria**: destinazioni narrative segrete (pianerottoli impossibili, assemblea dei fantasmi…), visite brevi non missabili, nessuna penalità
- [x] **Cartoline con francobolli**: francobolli sbloccati da scoperte/combinate; scelta del francobollo prima di esportare/condividere la PNG
- [x] **Visita guidata dagli inquilini**: tappa per tappa la torre raccontata da chi ci abita, basata sullo stato attuale del palazzo
- [x] **Test + SW**: logic (determinismo, migrazioni, rilettura), UI (nuove sezioni), static (id/data-*/classi), precache `postcard.js` già in CORE, browser verdi
