# 🔥 Arena Royale — Storm Battle

Un **arena shooter** in stile **Brawl Stars** (visuale dall'alto 3D, personaggi
con barra HP, proiettili, casse con potenziamenti) con la **modalità battle
royale di Fortnite**: un **cerchio di fuoco** che si restringe a ondate e
danneggia chi resta fuori. **Ultimo in piedi vince.**

**PWA** compatibile con **iPhone** e **Android** (browser + installabile,
funziona offline dopo il primo caricamento) e con **PC** (WASD/frecce).

## 🎮 Come si gioca

| Comando                  | Azione                                   |
|--------------------------|------------------------------------------|
| 🕹️ Trascina il dito      | muovi (joystick virtuale ovunque)        |
| WASD / frecce (PC)       | muovi                                     |
| —                        | il tuo eroe **spara da solo** al nemico più vicino |
| 📦 Distruggi le casse    | drop **power-up** (+2 danno) o **medikit** (+25 HP) |
| 🔥 Stai dentro il cerchio| fuori perdi 12 HP al secondo             |

## ⚔️ Dinamiche

- **7 nemici (bot)** con IA: vagano, ti attaccano nel raggio, scappano dentro
  la tempesta e raccolgono i potenziamenti.
- **Tempesta**: 5 restringimenti a ondate (24 → 17 → 11 → 7 → 5 di raggio),
  con preavviso e cerchio target blu. Il cerchio rosso mostra la zona sicura.
- **Minimappa** in alto a destra: arena, tempesta, giocatore e nemici.
- **Vittoria**: elimina tutti i nemici. **Sconfitta**: posizione finale ed
  eliminazioni.

## ▶️ Esecuzione

```sh
cd arena-royale
python3 -m http.server 8080      # PC: http://localhost:8080
```

Su **iPhone/Android** serve HTTPS (Safari/Chrome richiedono HTTPS per
l'installazione e alcune funzioni): GitHub Pages, Netlify Drop o
`npx localtunnel --port 8080`. Poi **Aggiungi a Home** per installarla.

## 🛠 Tecnica

- **Three.js 0.160** (import map): arena circolare low-poly con muro di
  confine, ostacoli (rocce e casse), personaggi con arma, proiettili,
  anelli della tempesta (linea rossa + zona di pericolo + cerchio target).
- Fisica: collisioni cerchio-vs-AABB, spinta fuori dagli ostacoli,
  proiettili con danno, power-up animati.
- HUD: barra HP, statistiche, timer tempesta, barre HP fluttuanti dei nemici
  (proiezione 3D→schermo), minimappa canvas 2D.
- Input: **joystick touch** flottante (Pointer Events) + tastiera.
- Suoni WebAudio generati (colpi, colpi subiti, tempesta, pickup).
- PWA: manifest + service worker (app shell + Three.js in cache).

## 📁 File

```
arena-royale/
├── index.html        # canvas + HUD + overlay
├── style.css         # stile dark mobile-first, safe-area
├── js/main.js        # tutto il gioco (~700 righe)
├── manifest.json     # PWA
├── sw.js             # offline
└── icons/            # icone 192/512 + apple-touch-icon
```

## 💡 Idee future

- Multiplayer vero (server WebSocket)
- Più eroi con abilità speciali (stile Brawl Stars)
- Cure/armi da raccogliere, classifica record (localStorage)
- Suoni con campioni reali
