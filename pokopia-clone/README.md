# DITTOPIA — clone web di Pokémon Pokopia

Fan game **non ufficiale** ispirato a *Pokémon Pokopia* (Nintendo Switch 2, 2026). Un omaggio creato con amore per i nostalgici del Pokémon. Giocabile da browser, con salvataggi in `localStorage`, installabile come PWA e con controlli touch per mobile.

> Fan game non ufficiale. Non affiliato e non approvato da Nintendo / Game Freak / The Pokémon Company. I nomi "Pokémon" e i relativi personaggi sono marchi dei rispettivi proprietari. Il codice, le sprite (disegnate a mano) e le musiche (originali) sono proprie.

## Come giocare

Apri `index.html` in un browser moderno (Chrome/Edge/Firefox), oppure servi la cartella via http per abilitare la PWA offline:

```bash
cd pokopia-clone
python3 -m http.server 8099
# poi apri http://localhost:8099/
```

Su Android/Chrome o desktop Chrome puoi usare "Installa app". Con un server attivo, il service worker `sw.js` rende il gioco giocabile offline.

### Controlli

- **WASD / Frecce** — muovi il tuo Ditto in forma umana
- **E / Spazio** — interagisci (raccogli, parla, dai acqua, piazza)
- **1-9** — seleziona una mossa nell'hotbar
- **Mouse** — clicca un tile per interagire/piazzare lì
- **C** — menu Craft (richiede un Banco da lavoro in inventario)
- **T** — Pokédex
- **P / Esc / Tab** — menu principale (salva, importa/esporta, modalità GB, audio)
- **Touch** — D-pad virtuale + pulsanti A/B (mostrati su dispositivi touch)

### obiettivo

Sei un Ditto che si è svegliato in una Kanto post-apocalittica, abbandonata dagli umani. Guidato dal Professor Tangrowth, raccogli risorse, costruisci habitat, fai amicizia con i Pokémon di Gen 1 e impara da loro nuove mosse per riportare la vita nel mondo. Raggiungi 12 amici, sveglia Mosslax col Poké Flauto, esplora la grotta segreta e... incontrerai chi sa.

## Caratteristiche

- ~16 specie Pokémon di Gen 1 con sprite pixel-art 16×16 disegnate a mano
- Mosse imparate dagli amici: Pistolacqua, Fogliame, Taglio, Spaccaroccia, Braciere, Energia, Scava, Splash
- Habitat engine data-driven: combina arredi/terreno/ora del giorno per attrarre specie diverse
- Ciclo giorno/notte accelerato (~24 min/giorno) con palette, stelle e Pokémon notturni
- Chiptune originale via WebAudio (giorno/notte), SFX, versi Pokémon e minigioco del Poké Flauto (Simon musicale)
- Sprite con modalità GBC a colori e **modalità Game Boy** 4 toni di verde (toggle dal menu)
- **Shiny** rari (1/128), **MissingNo.** easter egg, citazioni della localizzazione IT ("È superefficace!", pantaloncini comodi, Team Rocket...)
- Customizzazione personaggio (pelle/capelli/maglietta)
- Salvataggio in `localStorage`: autosave, save-on-exit, esporta/importa codice base64, reset

## Struttura

```
index.html · style.css · manifest.webmanifest · sw.js · icons/
js/data.js     — tiles, oggetti, ricette, mosse, specie, habitat, missioni, dialoghi
js/sprites.js  — pixel-art 16×16, palette GBC/GB/shiny, disegno procedurale dei tile
js/audio.js    — chiptune WebAudio: musica giorno/notte, SFX, versi, fanfare, note flauto
js/world.js    — mappa procedurale (seed), oggetti, scanner habitat, serializzazione
js/pokemon.js  — spawn, IA vagabondaggio, amicizia, mosse, shiny, Pokédex
js/save.js     — localStorage, save/load/reset, export/import base64
js/ui.js       — HUD, dialoghi typewriter, menu, craft, Pokédex, flauto, customizzazione, touch
js/game.js     — loop, input, camera, render, ciclo giorno/notte, logica missioni
```

Buon divertimento, e che la Kanto torni a fiorire. 🌸