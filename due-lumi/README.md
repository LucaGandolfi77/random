# I DUE LUMI — un piccolo viaggio caldo

Un piccolo gioco d'avventura **cozy** in pixel art a risoluzione Game Boy Advance (240×160),
dove due fratelli, Milo e Tito, attraversano una valle che la **Nebbia** sta spegnendo
colore dopo colore, memoria dopo memoria.

> Una storia su trattenere e lasciare andare.

Nessun asset esterno: sprite, tile e musica sono tutti **generati proceduralmente in
codice**, e il testo (HUD, dialoghi, menu) è renderizzato in un **overlay DOM** con font
normale. Un solo file HTML e file JS vanilla, senza librerie, senza build step.

---

## Sommario

- [Come si gioca](#come-si-gioca)
- [Manuale di gioco](#manuale-di-gioco)
  - [Controlli](#controlli)
  - [Esplorazione](#esplorazione)
  - [Combattimento](#combattimento)
  - [Oggetti e negozio](#oggetti-e-negozio)
  - [Equipaggiamento](#equipaggiamento)
  - [Le mosse del cuore](#le-mosse-del-cuore)
  - [Le memorie](#le-memorie)
  - [I finali](#i-finali)
- [Easter egg e segreti](#easter-egg-e-segreti)
- [Architettura](#architettura)
- [Tecnologie usate e perché](#tecnologie-usate-e-perché)
- [Sviluppo](#sviluppo)

---

## Come si gioca

Il gioco è 100% client-side: basta servire la cartella da un server statico e aprire `index.html`.

```bash
# dalla cartella del progetto
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Oppure apri `index.html` direttamente dal file system. Non richiede installazioni,
pacchetti o connessione.

---

## Manuale di gioco

### Controlli

| Azione | Tastiera | Touch |
| --- | --- | --- |
| Muoversi in 4 direzioni | Frecce / WASD | D-pad a schermo |
| **A** — parla, usa, conferma | `Z` / `Spazio` / `Invio` | Pulsante **A** |
| **B** — martello, annulla | `X` / `Maiusc` | Pulsante **B** |
| **START** — menu pausa | `P` / `Esc` | Pulsante **☰** |

I controlli touch (multi-touch) compaiono automaticamente solo su dispositivi touch.

### Esplorazione

- La mappa è **top-down a 4 direzioni**: il mondo si cammina in profondità, senza salti.
- Con **A** accanto a un personaggio parli; davanti a una **porta** la usi; sopra una
  **memoria** la raccogli.
- Con **B** usi il **martello** sul tile di fronte a te e rompi i blocchi di pietra (**X**).
- Parla con i personaggi premendo **A** accanto a loro: i loro dialoghi **cambiano** con
  l'avanzare della storia.
- **Porte** con lucchetto richiedono un interruttore (tile **S** lampeggiante): camminaci
  sopra per attivarlo.
- I **ponti** (tile **B**) sono percorribili.
- I **baratri** (tile **G**) sono solidi: in questo mondo non si cade, ma non si passa
  nemmeno. (Sicurezza: se per qualche motivo finisci fuori mappa torni allo spawn.)
- Le **zone** hanno una "nebbia" visiva che si dirada quanto più memorie recuperi e boss
  sconfiggi in quella zona (il "calore" della zona).

### Combattimento

Sistema a turni con **action-commands** (stile *Mario & Luigi*).

**Comandi disponibili:** `SALTO`, `MARTELLO`, le mosse speciali (se sbloccate), `OGGETTI`,
`INCORAGGIA`.

- **SALTO / MARTELLO** — barra che oscilla: premi **A** al momento giusto.
  - zona verde = **buono** (×2 danni)
  - zona dorata = **PERFETTO** (×3 danni, +1 Vicinanza)
- **Mosse speciali** — sequenza di tasti `A`/`B` a tempo (più lunga salendo di livello).
- **Difesa** — quando il nemico attacca:
  - attacco ad **anello**: premi un tasto quando il cerchio si restringe nel punto dorato
    (**PERFETTO = 0 danni + contrattacco**);
  - attacco a **onda**: **tieni premuto A** durante il passaggio dell'onda (rilasciare = preso).
- **Vicinanza (CUORE, 0–3):** i gesti perfetti avvicinano i fratelli, subire colpi li
  allontana. Le mosse del cuore la consumano.
- **INCORAGGIA** aumenta la Vicinanza di 1 senza attaccare.
- I **boss** a metà PV entrano in **fase 2**: nuovo dialogo e attacco più forte.
- Sconfiggendo nemici guadagni **Briciole** (valuta) ed **esperienza** (PV e statistiche
  crescono automaticamente al salire di livello).

Se entrambi i fratelli cadono si torna al focolare spento: puoi riprovare dall'ultimo
passaggio con metà PV.

### Oggetti e negozio

La **Cesta di Nonna** (nel Borgo) vende in cambio di Briciole:

| Oggetto | Effetto | Prezzo |
| --- | --- | --- |
| **Pane al Miele** | Ridà 12 PV a un fratello | 4 |
| **Tè Caldo** | Ridà 30 PV e calma la Nebbia | 10 |
| **Marmellata** | Risveglia un fratello a terra a metà PV | 18 |
| **Conchiglia** | +2 Difesa per lo scontro | 14 |
| **Incenso** | +3 Potenza per lo scontro | 16 |

Alcuni oggetti hanno un uso solo narrativo (**Stellina**, **Tè della Madre**).

### Equipaggiamento

Indossabili dal menu `EQUIP` (il Foulard è già equipaggiato):

| Oggetto | Bonus | Chi |
| --- | --- | --- |
| **Foulard di Milo** | Difesa +2 | Milo |
| **Lanterna di Tito** | Potenza +2 | Tito |
| **Stivali del Vento** | Velocità +2 | Tito (ricompensa boss) |
| **Cappotto di Nonna** | Difesa +2 | Milo |

### Le mosse del cuore

Mosse speciali che si sbloccano nel corso della storia:

| Mossa | Come si ottiene | Effetto |
| --- | --- | --- |
| **ABBRACCIO** | Disponibile da subito | Colpisce e cura entrambi |
| **SALT.ELLO ROTANTE** | Dal Falco nel Borgo | Vortice di salti, alto danno |
| **NINNA NANNA** | *…non ancora nel gioco* | Culla il nemico (salta il turno) |
| **ABBRACCIO DI CENERE** | Boss la Foca della Costa | Danno alto e cura |

### Le memorie

Nel mondo sono disperse **12 memorie** (indicatori rosa lampeggianti). Ognuna è un
ricordo di qualcuno che la Nebbia stava spegnendo. Recuperarle tutte è la chiave per
il finale migliore — e per vedere la scena di **Elide** prendere forma.

### I finali

Al termine del viaggio ti verrà posta **la domanda**: cosa deve diventare tutto ciò che finisce?

| Finale | Condizione | Titolo |
| --- | --- | --- |
| **A** — Lasciala andare | ≥ 4 memorie | *Il Paese che Respira* |
| **B** — Trattienila qui | sempre disponibile | *La Luce Ferma* |
| **C** — Camminaci accanto | **12/12 memorie** (opzione extra) | *Le Stelle Camminano* |
| **D** | < 4 memorie | *Il Borgo Senza Voci* |

---

## Easter egg e segreti

- **F1, F2, F3** (tastiera): cheat di debug.
  - `F1` → +999 Briciole e PV pieni. *"Debug: briciole e salute piene."*
  - `F2` → sblocca Salt.Ello Rotante e Abbraccio di Cenere.
  - `F3` → suona la fanfara di vittoria.
- **Il boss nascosto:** in `finalB` c'è una seconda porta oltre lo Specchio richiede l'interruttore
  **sw2**; dietro si nasconde **Lo Specchio**, un nemico che *non è un nemico*: riflette la scelta
  che stai per fare. Sconfiggerlo incrina lo specchio: **+99 Briciole**, cura totale e
  un sorriso.
- **Elide:** mai incontrata di persona, ma citata nelle memorie 10 e 11, nelle tazze in più
  del portico e in un rumore di risata quando il vento gira verso il borgo. La frase di
  Nonna — *"io ricordo quello che non è mai successo"* — è la chiave del **finale C**.
- **La scelta segreta:** l'opzione *"Camminaci accanto"* compare solo con tutte le 12 memorie.
  È l'unico finale non promesso da nessuna voce: Ramenta impara a camminare e le stelle,
  d'ora in poi, camminano.
- **Tostino** viene citato alla fontana ("una volta qui sotto c'era una stella") ma non appare:
  è la testimonianza di un borgo più pieno di prima della Nebbia.
- **Bastianino:** il nome del cerbiatto del Custode del Bosco. Ripeterlo ad alta voce — non
  custodirlo stretto — è il modo in cui il dolore impara a camminare. Dopo il boss, il
  Custodeeco lo ripete come "una campana piccola".
- Il titolo stesso è un indizio: i **due lumi** sono Milo e Tito, due luci che viaggiano
  insieme perché "i ricordi che viaggiano in due non si spengono facilmente".

---

## Architettura

Nessun framework, nessun bundler: **14 file JS** caricati in ordine preciso in `index.html`,
ciascuno con un singolo compito. Lo stato globale vive sull'oggetto `G`.

```
index.html              # canvas 240×160 + overlay testo/controlli touch + ordine dei <script>
style.css               # look GBA "warm", vignetta, overlay #overlay, controlli touch responsive
js/
  palette.js            # oggetto globale G, palette PAL (GBA warm), helper hex()/fadeHex()
  sprites.js            # pixel art procedurale: defSprite() con legenda colori + ritratti PORT
  audio.js              # motore WebAudio: SFX + canzoni sequenziate, zero file audio
  input.js              # input tastiera + touch multi-touch; semantica pressed/held
  engine.js             # canvas, scala fitCanvas, registry scene, loop rAF, fade, camera
  textui.js             # testo in overlay DOM (#overlay, font normale serif): txt(), show/hide
  tiles.js              # tile procedurali 16×16 (PRNG seedato), MAPLEGEND, ZONES, ROOMS
  items.js              # oggetti, negozio, equipaggiamento, curve di crescita
  dialogue.js           # sistema dialoghi: typewriter, ritratti, scelte, skip, auto-wrap
  ui.js                 # HUD, MENU (pausa/oggetti/equip/stato/diario/negozio)
  overworld.js          # scena esplorazione: fisica, collisioni, interazioni, puzzle, nebbia
  battle.js             # battaglia a turni: ENEMIES, mosse, action-commands (Bar/Seq/Ring)
  story.js              # stato di gioco, salvataggi, tutti i dialoghi (SCRIPT) e i finali
  main.js               # scene titolo/gameover/finale, avvio, cheat F1–F3
tools/
  check.js              # valida larghezze sprite + mappe e sintassi di tutti i file
  smoke.js              # smoke test headless: stuba DOM/Canvas/Audio e simula l'intera partita
```

**Diagramma dei flussi principali:**

```
input.js ──> engine.js (loop rAF + fade) ──> scena attiva
                                  │
        ┌─────────────────────────┼──────────────────────────┐
   overworld.js             battle.js                    main.js
   (esplorazione)          (turni + minigiochi)      (titolo/finali)
        │                       │                          │
   dialogue.js ── scelte ──> story.js ── resolveEnding ──> ending
   ui.js (menu/HUD)        SCRIPT / ENDINGS / salvataggi
```

**Lo scambio di scene** avviene tramite `setScene()` con dissolvenze gestite dal motore
(`fadeTo`); l'input usa la semantica `pressed`/`held` calcolata a fine frame perché i
"press" valgano solo nel frame in cui avvengono.

## Tecnologie usate e perché

**Zero librerie esterne** è la scelta fondante. Motivi:

1. **Footprint minimo e avvio istantaneo** — il gioco è un paio di centinaia di KB di testo,
   nessun download di runtime/framework, niente node_modules, funziona anche offline.
2. **Estetica pixel art coerente** — tutto (sprites, tile, font, musica) nasce in codice con
   la stessa palette `PAL`, quindi l'identità visiva resta omogenea senza ritocco manuale.
3. **Assenza di build step** — modifichi, ricarichi, provi. Iterazione veloce.

Le tecnologie *del browser* usate e il perché:

| Tecnologia | Dove | Perché |
| --- | --- | --- |
| **Canvas 2D** | engine, tiles, sprites | Rendering bitmap esatto a 1 px, `imageSmoothingEnabled=false` per la pixel art, `drawImage` per sprite pre-renderizzati in `<canvas>` offscreen (tile e sprite renderizzati una sola volta e poi blittati: veloce). |
| **Overlay DOM** | textui.js | Tutto il testo (HUD, dialoghi, menu, battaglia, titolo, finali) vive su un `<div id="overlay">` sopra il canvas, in **font serif normale** e non pixel: leggibile, nativo, ridimensionato con `fitCanvas` tramite `scale`. |
| **Web Audio API** | audio.js | Musica e SFX **generati al volo** con oscillatori e rumore: nessun file audio, la "colonna sonora" resta compressa nel codice; scheduler a step (semi di 16esimi) con `setInterval` e campionamento lookahead. |
| **localStorage** | story.js | Salvataggio (`duelumi_save`): partita, inventario, memorie, flag, equipaggiamento. |
| **Pointer Events + multi-touch** | input.js | Un'unica API per mouse/pennino/touch; `setPointerCapture` per controlli a schermo robusti, D-pad multi-touch. |
| **requestAnimationFrame** | engine.js | Loop sincronizzato col display, `dt` clampato per evitare salti dopo tab inattiva. |
| **CSS moderno** | style.css | Variabili per la palette, `flexbox` centraggio, `media (pointer:fine)` per nascondere i controlli touch, `radial-gradient` per la vignetta, `image-rendering:pixelated`. |
| **Node.js + modulo `vm`** | tools/smoke.js | **Smoke test senza browser**: stuba `document`/`window`/`AudioContext`/`localStorage`, esegue i file in una sandbox `vm` e simula un percorso completo di gioco (intro, negozio, memorie, battaglie, tutti i boss, i puzzle e i 4 finali) cercando errori runtime. |
| **`fs`/regex** | tools/check.js | Validazione statica: larghezze uniformi per righe di sprite e mappe, sintassi di ogni file. |

**Perché Canvas e non il DOM?** Per la resa pixel-perfect, la trasparenza nei tile
(come i ponti) e il fatto che l'intero schermo viene ridisegnato a ogni frame in modo
prevedibile: è il modello naturale per un gioco retro. Le **due eccezioni** sono il testo
e i controlli touch: il primo vive in un overlay DOM (font serif normale, leggibile e
nitido a ogni scala), i secondi sono pulsanti HTML assolutamente posizionati.

**Perché Web Audio e non file MP3/OGG?** Coerenza con il resto (tutto procedurale),
dimensione del progetto, e perché permette di ri-accordare o cambiare il "timbro" di una
canzone modificando poche righe (es. `o.detune.value = -4` sui triangoli, i volumi per
traccia, la personalizzazione per ogni zona).

---

## Sviluppo

```bash
# validazione statica (sprite, mappe, sintassi)
node tools/check.js

# smoke test completo del gioco in Node (stub DOM/Canvas/Audio)
node tools/smoke.js
```

Entrambi devono terminare con messaggio di successo prima di una modifica: `check.js`
garantisce che ogni sprite e ogni mappa abbiano righe di larghezza uniforme, e `smoke.js`
riproduce l'intero cammino di gioco per scovare errori runtime.