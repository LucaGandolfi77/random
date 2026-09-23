# Bar Blu — Architettura

## Panoramica

Bar Blu segue un'architettura **MVC + Services** in JavaScript ES2022 vanilla, senza framework né build step.

```text
INPUT (tap/click/keyboard)
   └── Controller (controller.js)
        ├── Model (model.js) — stato, regole, validazione
        ├── View (view.js) — rendering DOM, animazioni UI
        ├── Services:
        │   ├── Storage (storage.js) — localStorage con validazione/migrazione
        │   ├── Audio (audio.js) — Web Audio API (SFX + musica)
        │   ├── Cartolina (cartolina.js) — canvas snapshot + Web Share
        │   └── PWA (app-utils.js) — Service Worker registration
        └── DOM aggiornato

BOOT
  Storage → Model → Controller → View
```

## Responsabilità dei layer

| Layer | Responsabilità | Non fa |
|-------|----------------|--------|
| **Model** | Stato del gioco, regole di gameplay, collezioni dati, serializzazione, validazione e migrazione salvataggi. | Non tocca il DOM. |
| **View** | Rendering dell'interfaccia, gestione schermate, animazioni, feedback visivi, a11y. | Non contiene regole di gameplay. |
| **Controller** | Registra eventi, interpreta input, invoca metodi Model, chiede View di aggiornarsi, coordina audio/SFX. Gestisce quips, sobering, ricordi e Web Share Target. | Non modifica direttamente lo stato; non accede a storage/audio direttamente (tramite funzioni pure). |
| **Storage** | Persistenza su localStorage: load/save/validate/migrate/reset. | Non contiene logica di gioco. |
| **Audio** | Genera SFX e musica tramite Web Audio API; gestisce preferenze utente. | Non si avvia prima di un gesto utente. |
| **Cartolina** | Genera immagini canvas dallo stato; condivide via Web Share API o scarica come PNG. | Non invia dati a server. |
| **Service Worker** | Cache versionata, precache asset, offline support, cleanup cache obsolete. | Indipendente dall'MVC. |

## Flusso principale

```text
input utente → Controller → Model (muta stato in-place) → View (render) → DOM
```

## Flusso di caricamento

```text
Storage Service (loadState) → validazione e migrazione → Model (defaultState se vuoto/corrotto) → Controller.init → View.renderHome
```

## Principi chiave

- **Single source of truth**: lo stato vive in un unico oggetto `state` gestito dal Controller.
- **Mutazioni in-place**: Model modifica lo stato direttamente (no spread/copy), Controller tiene un riferimento unico.
- **No global mutable**: ogni modulo ES ha il proprio scope; l'unica variabile globale implicita è `state` in controller.js (modulo).
- **Feature-detection**: audio, PWA, share API, navigator.vibrate — tutto con check di presenza.
- **Error containment**: ogni servizio (storage, audio, SW) ha try/catch interni; un fallimento non blocca il gioco.
- **Cast vivi**: ogni personaggio ha `rarity`, `drunkProne`, `tagline`, `quips`, `story`. Il bar è un teatro umano: empatia e humor affettuoso, mai derisione.

## Aggiungere una nuova attività

1. Aggiungere la logica in `model.js` (funzione pura che muta stato e restituisce risultato). Aggiungere `rarity` se nuovo personaggio.
2. Aggiungere il rendering in `view.js` (nuova sezione o pannello HTML).
3. Aggiungere l'event handler in `controller.js` (listener per l'interazione).
4. Aggiornare `index.html` con id univoco e classe `screen` se nuova schermata.
5. Aggiornare il tutorial in `view.js` se necessario.
6. Se il nuovo contenuto persiste, aggiungere campi a `createInitialState` e gestire la migrazione in `storage.js` (bump SAVE_VERSION).

## Meccaniche speciali

### Ubriachezza (drunk)
Alcuni personaggi hanno `drunkProne: true`. `generateCustomer` e `serveCustomer` assegnano `drunk` con probabilità 50%. Servire **caffè** a un ubriaco (`serveCustomer` con `isSobering`) dà bonus gettoni (+2) e affinità (+2), con toast empatico. Servire il loro desiderio dà ricompensa normale.

### Battute personalizzate (quips)
Ogni personaggio ha `quips: [...]`. Dopo un servizio riuscito, `controller` chiama `view.showCustomerSpeech(name, quip)` per mostrare una battuta del personaggio.

### Ricordi (memories)
Ogni personaggio con `story: [...]` ha frammenti sbloccabili ad affinità **1/3/5** (soglie in `MEMORY_THRESHOLDS`). `checkMemories` confronta affinità e ricordi già raccolti, restituisce i nuovi. `controller` mostra `view.showMemory(customer, text)` (overlay con focus trap). `renderInventory` elenca i ricordi raccolti per personaggio (bloccati come `???`). `state.memories` memorizza gli id (`customerId:index`).

## Aggiungere una nuova risorsa

1. Definire in `model.js` nella costante appropriata (ITEMS, COLLECTIBLES, ...).
2. Aggiungere regole di uso/conversione in `model.js`.
3. Aggiornare rendering in `view.js`.
4. Aggiornare Controller se necessita eventi speciali.

## Aggiungere una nuova schermata

1. Aggiungere markup HTML in `index.html` con id univoco e classe `screen`.
2. Aggiungere stile in `styles.css`.
3. Aggiungere funzione `showNome()` in `view.js`.
4. Aggiungere eventi di navigazione in `controller.js`.
