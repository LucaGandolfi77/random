# 🔥 Arena Royale 2 — Twin Stick Royale

La seconda arena: **mappa enorme** (260×260), **armi e munizioni da
raccogliere per terra**, **twin-stick shooter** e la **tempesta** che si
restringe. PWA per **iPhone** e **Android**, funziona anche su **PC**.

A differenza del primo Arena Royale **non c'è auto-fire**: miri e spari tu,
e devi gestire le **munizioni**.

## 🎮 Controlli

| Dispositivo | Movimento            | Mira / sparo                    | Cambio arma |
|-------------|----------------------|---------------------------------|-------------|
| 📱 iPhone/Android | joystick **sinistro** | joystick **destro** (tieni premuto per sparare) | tasto **PUGNI/ARMA** (in basso a destra) |
| 🖥️ PC       | WASD / frecce         | **mouse** per mirare, **click** (tieni) per sparare | tasto **Q** |

Si gioca in **modalità orizzontale (landscape)** su iPhone/Android: la PWA è
configurata per aprirsi in landscape. Due joystick: uno per muoversi, uno per
la direzione di tiro.

## 🔫 Armi (raccolte a terra)

Le armi sono sparse sulla mappa: **fermati sopra per 2 secondi** per
prenderle (barra di raccolta). Con il tasto **PUGNI/ARMA** (o **Q** su PC)
passi dai pugni all'arma e viceversa senza perdere le munizioni dell'arma.
Raccogliere la **stessa arma** ricarica le munizioni; cambiare arma fa cadere
quella vecchia a terra. Le **munizioni verdi** si raccolgono in 0,8 s e
**aggiungono solo una parte** dei colpi (non riempiono l'arma): devi
gestirle! Le armi possono essere **COMUNI** o **★ LEGGENDARIE** (danno maggiore).

| Arma            | Danno        | Gittata | Munizioni max | Ricarica munizioni |
|-----------------|--------------|---------|---------------|--------------------|
| PUGNI           | 15           | 4.2     | ∞             | — (attraversano i muri, arco ampio) |
| PEACEMAKER      | 7 (8 ★)      | 15      | 60            | +20 |
| ASSAULT RIFLE   | 6-9 (7-10 ★) | 19      | 60            | +20 |
| SMG             | 5-7 (6-8 ★)  | 22      | 90            | +30 |
| SHOTGUN         | 5-10 (6-12 ★)×4 | 9    | 30            | +10 |
| SNIPER          | 15-30        | 17      | 12            | +5  |
| D. SHOTGUN      | 7-14 ×2      | 17      | 20            | +8  |
| SCAR            | 9-15         | 15      | 60            | +20 |
| KAR99           | 25-50 (26-52 ★) | 17 | 12            | +5  |
| MINIGUN         | 9-15         | 16      | 300           | +100 |
| BAZOOKA         | 70 (75 ★)    | 18      | 6             | +3  |
| QUADZOOKA       | 20 (25 ★)×4  | 19      | 16            | +6  |

**📦 Supply drop**: ogni ~35 secondi una cassa cade dal cielo con un'arma
speciale (Minigun, Bazooka o Quadzooka) — tieni d'occhio l'avviso e la
minimappa.

## ⚔️ Dinamiche

- **9 nemici (bot)** con **munizioni limitate**: quando le finiscono passano
  ai **pugni** o **cercano munizioni** per terra (le raccolgono come te!).
  Alla morte droppano la loro arma.
- **Casse** distruttibili: possono contenere munizioni.
- **Tempesta**: 6 restringimenti (120 → 100 → 78 → 58 → 40 → 26 → 15 di
  raggio), 12 HP/s di danno fuori zona.
- **Headshot** (PEACEMAKER): colpisci la testa per il doppio del danno.
- **Pugni**: danno 15, gittata 4,2, arco ampio, **attraversano i muri**.
- **Minimappa**: tempesta, giocatore, nemici, armi (punti gialli) e munizioni
  (punti verdi).
- **Vittoria**: elimina tutti i nemici. **Sconfitta**: posizione finale ed
  eliminazioni.

## ▶️ Esecuzione

```sh
cd arena-royale-2
python3 -m http.server 8080      # PC: http://localhost:8080
```

Su **iPhone/Android** serve HTTPS: GitHub Pages, Netlify Drop o
`npx localtunnel --port 8080`. Poi **Condividi → Aggiungi a Home** per
installarla come app (offline dopo il primo caricamento).

## 🛠 Tecnica

- **Three.js 0.160**: mappa 260×260 con foresta (900 alberi InstancedMesh),
  rocce e casse, mura di confine, personaggi con arma, proiettili,
  esplosioni ad area (anelli che si espandono), supply drop animati.
- **Twin-stick**: due joystick touch (Pointer Events) + mouse con raycast sul
  terreno per la mira, crosshair CSS su PC.
- Loot con **barra di raccolta**, armi leggendarie ★, munizioni.
- HUD: HP, arma corrente con rarità e munizioni, timer tempesta, minimappa,
  barre HP fluttuanti dei nemici.
- Suoni WebAudio generati.
- PWA: manifest + service worker (app shell + Three.js in cache).

## 📁 File

```
arena-royale-2/
├── index.html        # canvas + HUD + overlay
├── style.css         # stile dark mobile-first, safe-area
├── js/main.js        # tutto il gioco (~950 righe)
├── manifest.json     # PWA
├── sw.js             # offline
└── icons/            # icone 192/512 + apple-touch-icon
```

## 💡 Idee future

- Multiplayer vero (server WebSocket)
- Eroi con abilità (stile Brawl Stars)
- Record e statistiche in localStorage
- Altri tipi di munizioni (colori diversi per calibro)
