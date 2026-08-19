# 🕊️ VOLA! 3D — uccello a braccia libere (PWA)

Una **PWA** che trasforma la **videocamera interna** (frontale) in un
controller per un **mondo 3D**: in alto vedi te stesso, in basso un
**uccello 3D** che vola **liberamente in tutte le direzioni** con la
**telecamera dietro di lui** (terza persona). Il sistema di tracking delle
**braccia** (MediaPipe Pose, non le mani) traduce i movimenti in volo.
Funziona su **iPhone** (Safari, anche installata come app) e su **PC**.

## 🎮 Come si controlla l'uccello

| Gesto (con le braccia)       | Effetto                                |
|------------------------------|----------------------------------------|
| 🙌 **Su / giù**              | salita / discesa (quota)               |
| ↔️ **Spostale di lato**       | gira a destra / sinistra (yaw)         |
| ↗️ **Una su e una giù**       | virata (roll + bank-to-turn)           |
| 🤝 **Braccia vicine**         | **picchiata** (becco in giù, velocità) |

Il volo è libero in 3D: quota, direzione e inclinazione si combinano; la
**camera insegue l'uccello** da dietro inclinandosi leggermente in virata.
Vedi lo **scheletro di spalle/gomiti/polsi** come feedback sulla videocamera.
Una sola braccia visibile è sufficiente per quota e direzione.

## 💥 Game over

Se l'uccello tocca il **suolo** (colline, montagne o acqua) è **GAME OVER**:
l'uccello rotola al suolo e compare il tempo di volo, il **punteggio** e il
**record**. Premi **RIGIOCA** per ripartire subito (non serve riavviare la
pagina).

## ⭕ Punteggio e anelli

Nel mondo fluttuano **anelli dorati** (14, che respawnano dopo la raccolta):
attraversali per guadagnare **100 punti** ciascuno, con un effetto luminoso.
All'avvio 4 anelli aspettano vicino al punto di partenza. Il punteggio della
partita e gli anelli raccolti sono sempre visibili in alto a sinistra.

**🔥 Bonus combo**: raccogli anelli entro 4 secondi l'uno dall'altro per
aumentare il moltiplicatore — il badge `x2`, `x3`... appare nel punteggio.
Ogni anello vale `100 × combo`: 100, 200, 300... Se perdi il ritmo la combo
si azzera.

## 🏆 Trofei

Raccogli **trofei** in base a quello che fai (il bottone 🏆 in alto a destra
mostra la lista completa):

| Trofeo                | Come ottenerlo              |
|-----------------------|-----------------------------|
| 🕊️ PRIMO VOLO         | vola per 30 secondi         |
| ⭕ CACCIATORE          | raccogli 5 anelli           |
| 👑 MAESTRO DEGLI ANELLI | raccogli 20 anelli          |
| ⬇️ PICCHIATORE         | esegui 5 picchiate          |
| 🏔️ ALTA QUOTA          | raggiungi 150 m di quota    |
| 🧭 ESPLORATORE         | percorri 3000 m             |
| 💪 SOPRAVVISSUTO        | vola 90 s in una partita    |
| 🔁 PERSEVERANTE         | gioca 5 partite             |

I trofei sbloccati e il record vengono **salvati** (localStorage) e restano
anche chiudendo la PWA.

## 🐣 Avvio sicuro

L'uccello **spawna molto in alto** (160 m) con un breve periodo di
protezione: niente schianti appena aperto il gioco, anche se il terreno è
accidentato.

## 🗺️ Il mondo

Mappa grande (2400×2400) con **colline dolci**, una **catena montuosa**
diagonale con creste e vette innevate, laghi, foreste di abeti e nuvole alla
deriva. Vola in quota fino a 190 m: le montagne non sono solo scenografia,
sono anche un pericolo!

---

## 🖥️ Provare su PC

La videocamera funziona solo in **contesto sicuro**: `localhost` va bene.

```sh
cd vola-pwa
python3 -m http.server 8080
# oppure: npx serve .
```

Apri **http://localhost:8080** → tocca *"TOCCA PER INIZIARE"* → consenti la
webcam. La prima volta scarica il modello AI delle pose (~7 MB) e il motore 3D
(Three.js), poi il service worker li tiene in cache (funziona offline).

## 📱 Provare su iPhone

Su iPhone **Safari richiede HTTPS** per la videocamera. Tre strade:

**1. GitHub Pages (consigliata)** — crea un repo, carica i file di `vola-pwa`,
attiva Pages, apri l'URL `https://tuo-utente.github.io/nome-repo/`.

**2. Netlify Drop** — trascina la cartella su https://app.netlify.com/drop.

**3. Tunnel dal Mac (prova veloce)** — con un server locale attivo:

```sh
npx localtunnel --port 8080
# oppure: cloudflared tunnel --url http://localhost:8080
```

Apri l'URL `https://...` su iPhone → consenti la videocamera → *"TOCCA PER
INIZIARE"*.

> ⚠️ Sul tunnel la prima connessione chiede di inserire l'IP pubblico. Il
> caricamento di modello e motore 3D richiede internet alla prima visita.

## 📲 Installare come app su iPhone

1. Apri la PWA in **Safari** · 2. **Condividi** · 3. **Aggiungi a Home**
4. Apri dall'icona "Vola!": gira a schermo intero come una app nativa.

> Nota: se in modalità standalone la videocamera non parte su iOS molto
> vecchi, apri la PWA direttamente in Safari.

## 🐛 Risoluzione problemi

- **"Serve HTTPS o localhost"** → stai usando HTTP su IP remoto; usa una
  delle opzioni HTTPS sopra.
- **"Videocamera negata"** → Safari: Impostazioni → Safari → Videocamera →
  Consenti, oppure "Consenti" nel prompt.
- **Braccia non rilevate** → inquadra busto e braccia, evita controluce,
  distanza 60–200 cm. Il modello tenta GPU, altrimenti passa a CPU.
- **Lento** → su dispositivi più vecchi usa il modello `pose_landmarker_lite`
  (sostituisci `pose_landmarker_full` con `pose_landmarker_lite` nell'URL di
  `POSE_MODEL_URL` in `js/main.js`).
- **WebGL non disponibile** → aggiorna Safari/Chrome.

## 🛠 Tecnica

- **MediaPipe PoseLandmarker** (`@mediapipe/tasks-vision` da CDN) con modello
  `pose_landmarker_full`, 1 persona, modalità VIDEO, fallback GPU→CPU.
- **Controllo braccia**: alzata = spalla→polso (Y, specchiato); yaw = offset
  laterale dei polsi; roll = differenza di altezza tra braccio sinistro e
  destro; picchiata = polsi vicini tra loro.
- **Three.js 0.160** (import map, da CDN): mondo low-poly grande — terreno
  2400×2400 a colline + **catena montuosa** diagonale e vette (colori per
  altezza: sabbia→erba→roccia→neve), laghi, 240 abeti (InstancedMesh), rocce,
  nuvole alla deriva, cielo shader al tramonto con sole e nebbia.
- **Uccello**: gruppo di primitive (corpo, pancia, testa, becco, occhi, ali a
  trapezio spazzate che sbattono su perni, coda), rotazione YXZ
  (yaw/pitch/roll), volo con molla e bank-to-turn, **game over** al contatto
  col suolo e riavvio immediato.
- **Camera**: inseguimento dietro l'uccello con smoothing esponenziale, clamp
  anticollisione col terreno e leggero roll immersivo.
- **PWA**: `manifest.json` (standalone, portrait), `sw.js` (cache app shell +
  modello AI + Three.js offline), icone generate, `apple-touch-icon` per iOS.

## 📁 File

```
vola-pwa/
├── index.html        # videocamera sopra, mondo 3D sotto + import map
├── style.css         # stile cozy scuro, HUD
├── js/main.js        # PoseLandmarker + Three.js + fisica + camera
├── manifest.json     # PWA manifest
├── sw.js             # service worker (offline)
└── icons/            # icone 192/512 + apple-touch-icon
```

## ☕ Tenere sveglio il Mac durante i test

```sh
caffeinate -dimsu -w $(pgrep -x python3)   # sveglio finché il server è attivo
# oppure
caffeinate -dimsu -t 3600                   # sveglio per 1 ora
```
