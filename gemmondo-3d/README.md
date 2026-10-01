# 💠 GEMMONDO — Raccolta Incrementale 3D (folle, geniale, simpatico)

Sei **Cubetto**, un cubo con un sogno: diventare il raccoglitore di gemme più ricco del multiverso.
Muoviti in un mondo 3D low-poly, raccogli gemme 💠, **taglia alberi** 🪵, **spacca sassi** 🪨,
**crafta attrezzi e oggetti**, **commercia con i mercanti** 🤝, potenzia i tuoi **droni**,
sblocca **7 dimensioni** e fai **esplodere l'universo** per ottenere **Stelle** permanenti. ♻️

Funziona offline, installabile come app, **zero dipendenze runtime** oltre a Three.js.

## Come si gioca

| Azione | Tasto / gesto |
| --- | --- |
| Muoversi | `WASD` / frecce, oppure joystick touch (mobile) |
| Tagliare / minare / parlare | `E` oppure il **pulsante azione a schermo** |
| Negozio | pulsante 🛒 (o `B`) |
| Zone / viaggiare | pulsante 🗺️ (o `E` vicino al portale 🌀) |
| Craft | pulsante 🧰 (o `C`) |
| Mercante | pulsante 💰 (o `M`) |
| Muto | pulsante 🔊 (o `X`) |
| Chiudere i pannelli | ✕ o `Esc` |

Su iPhone/touch: **joystick** + **tasti a schermo** (azione, 🧰 Craft, 💰 Mercante).
L'istruzione contestuale sopra il mondo dice sempre cosa fare con il tasto `E`.

## Meccaniche

### Gemme ed Energia (base incrementale)
- Le gemme crescono nel mondo. Magnete 🧲, gemme d'oro 🍀 (×12), droni 🛸 a reddito passivo.
- Combo: più gemme raccogli in sequenza rapida, più alto è il tono del suono e più ti spingono gli avvisi.
- 7 potenziamenti nel 🛒 Negozio · 7 biomi sbloccabili · **Rinascita** per le Stelle (+10% ciascuna).

### Risorse e raccolta
- **🪵 Legno** dagli alberi · **🪨 Pietra** dai sassi · **🔮 Cristallo** dai cristalli (Caverna+).
- I nodi hanno un **anello colorato** e un'**icona disegnata su canvas** (non dipende dal font
  emoji del sistema, quindi non sparisce su Linux o su un browser minimale).
- Ogni nodo ha 4 colpi, poi si esaurisce e **ricresce** dopo 20-30s. Durante il recupero il
  pulsante resta visibile e mostra i puntini: non sparisce sotto il naso del giocatore.

### Attrezzi
- **🪓 Ascia** e **⛏️ Piccone**, fino al **Lv 3** (Ascia del Multiverso, Piccone Stellare).
- Più alto il livello, più risorse per colpo e più veloce la raccolta.
- A mani nude si raccoglie pochissimo: crafta subito **Ascia di Pietra** e **Piccone di Legno**!

### Craft
- 📦 **Tavole** (3 🪵), 🧱 **Mattoni** (3 🪨), ⚙️ **Ingranaggi** (2 📦 + 2 🧱 + 50 💠).
- Attrezzi migliori richiedono risorse avanzate e zone sbloccate.

### Mercante Sgobbo 🤝
- **Vendi** risorse per **💰 Oro**, **compri** risorse con l'Oro, e cambi **Energia ↔ Oro**
  (100 💠 per 25 💰 e viceversa).
- Le zone avanzate pagano di più, **sia in vendita sia in acquisto**: il gioco non premia
  l'acquisto e la rivendita a ciclo chiuso (`test/economy.test.mjs` blocca quella regressione).
- Lo trovi nel mondo, vicino al portale: avvicinati e premi E / pulsante azione.

### Ritorni e rinascita
- Chiudi il gioco e torni? Ti accolgono con un riepilogo di cosa hai accumulato in assenza
  (fino a 8 ore di recupero, metà velocità). Il riepilogo resta finché non lo chiudi tu.
- **Rinascita:** azzera tutto tranne le Stelle — anche attrezzi, risorse e Oro. Il pannello
  te lo dice prima di confermare.

## Grafica

- **Sette biomi davvero diversi**: cielo a gradiente, nebbia e luci per zona, più un elemento
  che identifica ciascuno — tetto e stalattiti nella caverna, acqua con onde nell'oceano,
  lava con la crosta che si spacca nel vulcano, nebulose nello spazio.
- **Post-processing**: `UnrealBloomPass` + tonemapping ACES, con esposizione per zona.
- **Cubetto vive**: gambe e braccia che si muovono camminando, sciarpa che svolazza,
  antenna con gemma che pulsa, occhi e bocca.
- **Ombre che seguono il giocatore**: la finestra della shadow map è stretta (52 unità invece
  delle 120 di prima), quindi l'ombra è nitida anche nelle zone da raggio 68.
- **Qualità adattiva**: sotto i 45 fps medi il gioco toglie prima il bagliore e poi le ombre,
  e avvisa. Sale di nuovo se la situazione migliora.

## Audio

Suoni **generati al volo** con WebAudio: nessun file, nessun costo di download.
Oscillatori e rumore filtrato per raccolta, taglio, miniera, cristallo, craft, moneta,
potenziamento, errore, viaggio, sblocco e rinascita. Un drone continuo cambia carattere
con il bioma. Il contesto audio nasce solo al primo gesto (autoplay policy) e il mute
si ricorda fra una sessione e l'altra.

## PWA

Installabile e funzionante **offline** (`manifest.json` + `sw.js` + icone generate, incluse
*maskable* con safe zone). Il service worker usa **rete-prima** per la shell: gli aggiornamenti
arrivano davvero, e la cache versionata tiene gli asset di Three.js.

## Come eseguire

```bash
cd gemmondo-3d
npm start          # serve su http://127.0.0.1:8333 (nessuna dipendenza)
```

Oppure con qualunque altro server statico: `python3 -m http.server 8333`.
Serve un server, non `file://`: il gioco usa i moduli ES e la import map.

## Verifiche

```bash
npm test           # 52 test: economia, salvataggio, migrazione, audio
npm run check      # gate unico: statica + test
npm run icons      # rigenera le icone PNG (verifica anche la maskable)
```

`npm test` non richiede un browser: `core.js` e `audio.js` sono puri e girano sotto Node.
Il test `test/smoke.test.mjs` avvia invece il gioco in Chrome e **si salta da solo** se
Puppeteer non è installato (`npm i -D puppeteer` per abilitarlo).

`npm run check` verifica anche le cose che il browser non segnala: id del DOM che il JS cerca
e l'HTML non ha, file che `sw.js` promette ma non esistono, `CACHE_VERSION` dimenticata dopo un
deploy, icone maskable che non sono piene, import non coperti dalla import map, API di Three.js
rimosse da r152 in poi.

## File

| File | Cosa fa |
| --- | --- |
| `core.js` | Dati di gioco, economia, artigianato, mercante, rinascita, salvataggio. **Puro**: nessun import di three, nessun DOM. È il posto unico dove riequilibrare il gioco. |
| `game.js` | Three.js, HUD, pannelli, input, ciclo di gioco, mondo |
| `audio.js` | Sintesi WebAudio: nessun file audio |
| `index.html` | Struttura, HUD, pannelli, splash, import map |
| `style.css` | Stile glassmorphism dark/cosmico, responsive, safe-area |
| `serve.js` | Server statico per lo sviluppo, senza dipendenze |
| `sw.js` | Service worker: shell rete-prima, asset Three in cache |
| `vendor/three/` | Three.js **r0.185.0** + addon post-processing, serviti in locale |
| `manifest.json` | PWA installabile e offline |
| `gen-icons.cjs` | Icone PNG senza dipendenze (e controllo sulla maskable) |
| `test/` | `node --test`: economia, migrazione dei save, audio |
| `tools/check.mjs` | Gate di qualità unico |

## Note tecniche

- **Three.js r185** (locale, offline). Dal r171 il build è un modulo ES diviso in
  `three.module.min.js` + `three.core.min.js`: l'import map in `index.html` risolve `three` e
  `three/addons/` senza bundler, quindi restano zero dipendenze e zero build.
- **Salvataggio** in `localStorage` (`gemmondo_save_v1`) con **numero di versione**: un save
  vecchio viene migrato, uno sabotato non blocca l'avvio, e un JSON corrotto riparte pulito.
- **Il ciclo è diviso** in `simulate(dt)` e render: la simulazione non disegna e il disegno non
  decide nulla. È il motivo per cui i test possono far girare il mondo a passo fisso senza
  dipendere dalla GPU.
- **Risorse condivise** (geometrie, materiali, texture dei nodi e delle decorazioni) sono in
  cache e in una lista `SHARED`: `disposeGroup` non le tocca, o il cambio zona le distruggerebbe.