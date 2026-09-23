# Caffè Sospeso

**Un caffè caldo, una storia in più.** — una Progressive Web App installabile da bar di quartiere, cozy e giocabile offline, bilingue italiano/inglese.

Il giocatore è il barista di fiducia di una piccola comunità: accoglie clienti abituali, **componi** le bevande scegliendo origine × latte × dolcezza, macina e versa, scopre **8 aromi**, lascia **caffè sospesi** per chi verrà dopo e arreda il locale. Zero energia, zero penalità, zero stress — sessioni da 3–5 minuti.

## Stack tecnologico

| Ambito | Scelta |
|--------|--------|
| Linguaggio | **JavaScript ES2022** (moduli ES nativi, zero build step) |
| UI | **HTML5 semantico + CSS3** (custom properties, transform/opacity) |
| Architettura | **MVC + Services** (model.js · view.js · controller.js · services/*) |
| Offline | **Service Worker** v3 con precache tollerante e strategie differenziate |
| Audio | **Web Audio API** (SFX + musica generati, avvio post-gesto) |
| Persistenza | **localStorage** con versioning, validazione e migrazione |
| Grafica | **PNG/SVG inline** + CSS (nessuna immagine remota) |
| Dipendenze | **0 runtime** · Nessun backend · Nessun tracking |

## Requisiti di sistema

- Browser moderno: Chrome/Edge ≥ 90, Safari ≥ 15, Firefox ≥ 90.
- Node.js ≥ 18 (solo per strumenti e server locale).
- Per l'installazione PWA: servire via **HTTPS** o **localhost**.

## Avvio rapido

```bash
cd caffe-sospeso
python3 -m http.server 8000
# oppure
npm start
# oppure
npx serve .
```

> I moduli ES nativi **non funzionano con `file://`**: è necessario un server HTTP.

Verifica sintassi e import:

```bash
node tools/check-syntax.mjs
node tools/smoke-import.mjs
```

## Installazione come app

Apri su mobile → menu del browser → **"Aggiungi a schermata Home"** (o il banner in-app). Dopo il primo caricamento l'app funziona **offline**.

## Architettura

```text
INPUT (tap/click/keyboard)
   └── Controller (controller.js)
        ├── Model (model.js) — stato, regole, validazione, serializzazione
        ├── View (view.js) — rendering, animazioni, a11y
        └── Services:
            ├── Storage (services/storage.js) — localStorage + export/import
            ├── Audio (services/audio.js) — SFX + musica generati
            ├── PWA (services/pwa.js) — Service Worker + install prompt
            ├── Share (services/share.js) — poster + Web Share + share target
            ├── Ambient (services/ambient.js) — sensori, batteria, notifiche
            └── AI (services/ai.js) — storie procedurali offline
        └── DOM aggiornato

BOOT:  Storage → Model → Controller → View
```

Vedi `README.md` completo per le procedure di contribuzione.

## Contribuire

### Branching strategy (GitHub Flow)

- `main` sempre stabile e pubblicabile.
- `feat/<scope>` · `fix/<scope>` · `docs/<scope>` · `refactor/<scope>` · `chore/<scope>`.
- PR piccole e focalizzate, con **1 reviewer** e CI verde.
- Rebase su `main` prima del merge (no merge commit).

### Commit convenzionali (Conventional Commits)

```text
feat(coffee): aggiungere nuovo aroma
fix(audio): sblocco AudioContext dopo gesto
docs(readme): guida al contributo
refactor(view): estrae template in <template>
test(model): copre newCustomer e migrazioni
chore(deps): bump eslint
```

### Linee guida

- Nessun framework né build step.
- Nessuna dipendenza esterna obbligatoria.
- Nessun tracking né invio di dati a server.
- Accessibilità: HTML semantico, focus visibile, `aria-live`, `prefers-reduced-motion`.
- Test locali: `npm run check`.

## Licenza

MIT — vedi [LICENSE](LICENSE).
