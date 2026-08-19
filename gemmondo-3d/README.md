# 💠 GEMMONDO — Raccolta Incrementale 3D (folle, geniale, simpatico)

Sei **Cubetto**, un cubo con un sogno: diventare il raccoglitore di gemme più ricco del multiverso.
Muoviti in un mondo 3D low-poly, raccogli gemme 💠, **taglia alberi** 🪵, **spacca sassi** 🪨,
**crafta attrezzi e oggetti**, **commercia con i mercanti** 🤝, potenzia i tuoi **droni**,
sblocca **7 dimensioni** e fai **esplodere l'universo** per ottenere **Stelle** permanenti. ♻️

## Come si gioca

| Azione | Tasto / gesto |
| --- | --- |
| Muoversi | `WASD` / frecce, oppure joystick touch (mobile) |
| Tagliare / minare / parlare | `E` oppure il **pulsante azione a schermo** (iPhone) |
| Negozio | pulsante 🛒 (o `B`) |
| Zone / viaggiare | pulsante 🗺️ (o `E` vicino al portale 🌀) |
| Craft | pulsante 🧰 (o `C`) |
| Mercante | pulsante 💰 (o `M`) |
| Chiudere i pannelli | ✕ o `Esc` |

Su iPhone/touch: **joystick** + **tasti a schermo** (azione, 🧰 Craft, 💰 Mercante).

## Meccaniche

### Gemme ed Energia (base incrementale)
- Le gemme crescono nel mondo. Magnete 🧲, gemme d'oro 🍀 (×12), droni 🛸 a reddito passivo.
- 7 potenziamenti nel 🛒 Negozio · 7 biomi sbloccabili · **Rinascita** per le Stelle (+10% ciascuna).

### Risorse e raccolta (nuovo!)
- **🪵 Legno** dagli alberi · **🪨 Pietra** dai sassi · **🔮 Cristallo** dai cristalli (Caverna+).
- I nodi hanno un **anello colorato** e l'icona della risorsa: avvicinati e premi il pulsante azione.
- Ogni nodo ha 4 colpi, poi si esaurisce e **ricresce** dopo ~20-30s.

### Attrezzi (nuovo!)
- **🪓 Ascia** e **⛏️ Piccone**, fino al **Lv 3** (Ascia del Multiverso, Piccone Stellare).
- Più alto il livello, più risorse per colpo e più veloce la raccolta.
- A mani nude si raccoglie pochissimo: crafta subito **Ascia di Pietra** e **Piccone di Legno**!

### Craft (nuovo!)
- 📦 **Tavole** (3 🪵), 🧱 **Mattoni** (3 🪨), ⚙️ **Ingranaggi** (2 📦 + 2 🧱 + 50 💠).
- Attrezzi migliori richiedono risorse avanzate e zone sbloccate.

### Mercante Sgobbo 🤝 (nuovo!)
- **Vendi** risorse per **💰 Oro** (le zone avanzate pagano di più!).
- **Compra** risorse con l'Oro.
- **Cambio** Energia ↔ Oro (100 💠 per 25 💰 e viceversa).
- Lo trovi nel mondo, vicino al portale: avvicinati e premi E / pulsante azione.

## PWA

Installabile e funzionante **offline** (`manifest.json` + `sw.js` + icone generate, incluse *maskable*).
Per installarla: apri il gioco → "Aggiungi a schermata Home" / pulsante 📲.

## Come eseguire

```bash
cd gemmondo-3d
python3 -m http.server 8333
# apri http://127.0.0.1:8333
```

Oppure con Node: `npx serve .` — **Nota**: è già in esecuzione su http://127.0.0.1:8333.

## File

| File | Cosa fa |
| --- | --- |
| `index.html` | Struttura, HUD, pannelli, splash, tasti a schermo |
| `style.css` | Stile glassmorphism dark/cosmico, responsive |
| `game.js` | Tutta la logica: Three.js, mondi, nodi, craft, mercante, economia |
| `three.min.js` | Three.js r149 (locale, offline) |
| `manifest.json` + `sw.js` | PWA installabile e offline |
| `icon-*.png` | Icone generate (vedi `gen-icons.cjs`) |
| `gen-icons.cjs` | Generatore di icone PNG senza dipendenze |

## Note tecniche

- Salvataggio in `localStorage` (`gemmondo_save_v1`, retrocompatibile: i vecchi salvataggi vengono migrati).
- Niente dipendenze esterne oltre a Three.js.
- Testato headless: acquisti, droni, **craft attrezzi**, **vendita al mercante**, **taglio alberi**,
  **azione contestuale**, sblocco zone, rinascita. 🧪
