# 🭐 StarDock - Parcheggio Astronavi ⭐

Simulatore di parcheggio per astronavi con fisica realistica, inerzia, particelle, suoni, e editor di livelli.

## 🎮 Caratteristiche
- **12 livelli** con difficoltà crescente
- **4 tipi di astronavi** (4 taglie diverse)
- **Fisica avanzata**: inerzia, attrito, collisioni, pozzi gravitazionali, ostacoli mobili
- **Vista 2D** (top-down) + **Vista 3D** (Three.js) + **Cockpit View**
- **Particelle** (thrust, collisioni, parcheggio)
- **Motore audio** Web Audio (engine, collisioni, boost, park, gameover)
- **Boost/Afterburner** con barra carburante
- **Screen shake** + effetti visivi
- **Level Editor** integrato
- **Sistema Credits** per upgrade
- **Ostacoli mobili** (conveyor, asteroidi rotanti)
- **PWA offline-capabile** con service worker
- **Supporto Mobile** completo

## 📋 Roadmap / TODO

### ✅ Fase 1: Core Mechanics (COMPLETATA)
- [x] Fisica con inerzia, attrito, rotazione
- [x] 12 livelli con difficoltà crescente
- [x] 4 tipi di astronavi (Falco, Cobra, Titan, Ghost)
- [x] 2D view + 3D view toggle
- [x] Cockpit View (V key)
- [x] Mobile controls
- [x] PWA manifest + service worker
- [x] Game flow completo (menu, pause, victory, game over)

### ✅ Fase 2: Gameplay Enhancement (COMPLETATA)
- [x] Moving obstacles (conveyor belts, rotating asteroids, patrol patterns)
- [x] Boost/Afterburner mechanic
- [x] Particle engine (thrust, collision sparks, parking sparkles)
- [x] Cockpit View (3D inside cabin with dashboard)
- [x] Sound engine (Web Audio API: engine hum, collisions, boost, park, gameover)
- [x] Screen shake effects on collision
- [x] Combo multiplier system
- [x] Gravity wells

### ✅ Fase 3: Level & Editor (COMPLETATA)
- [x] Level Editor integrato (E key from menu)
- [x] Place obstacles, circles, moving obstacles
- [x] Save levels to localStorage
- [x] Share Level Codes
- [ ] Procedural levels (endless mode) ⏳
- [ ] Boss levels with security drones ⏳
- [ ] Zero-G spacewalk levels ⏳

### 🔜 Fase 4: Economy & Progression
- [ ] Currency/Credits system (base ready)
- [ ] Ship upgrades (paint, hull, engines)
- [ ] Star rating (1-3 stars)
- [ ] Daily challenge + leaderboard
- [ ] Achievements
- [ ] Unlockable ships

### 🔜 Fase 5: Polish & Social
- [ ] Dynamic lighting (headlights, neon)
- [ ] Parallax starfield background
- [ ] Push notifications
- [ ] Install prompt

## 🚀 Comandi di Avvio
```bash
cd spaceship-park-2d-3d
python3 -m http.server 8765
# Apri http://localhost:8765
```

## 🎯 Controlli
| Tasto | Azione |
|-------|--------|
| W / ↑ | Spingi avanti |
| S / ↓ | Retromarcia |
| A / ◀ | Ruota sinistra |
| D / ▶ | Ruota destra |
| SPAZIO | Frenata |
| SHIFT | Boost/Afterburner |
| C | Cambia visuale (2D/3D) |
| V | Cockpit View |
| R | Riposiziona |
| P / ESC | Pausa |
| E | Level Editor (da menu) |

## 📁 Struttura del Progetto
```
spaceship-park-2d-3d/
├── index.html          (Main entry + Three.js CDN)
├── manifest.json       (PWA manifest)
├── sw.js               (Service worker)
├── README.md           (Questo file)
├── css/style.css       (Stili completi con editor/cockpit)
├── js/
│   ├── game.js         (Game engine - 350 lines)
│   ├── levels.js       (12 livelli + moving obstacles)
│   ├── physics.js      (Fisica avanzata + screen shake)
│   ├── particles.js    (Particle engine - 116 lines)
│   ├── sound.js        (Web Audio sound engine - 185 lines)
│   ├── renderer2d.js   (Canvas 2D top-down)
│   ├── renderer3d.js   (Three.js 3D)
│   ├── editor.js       (Level editor - 89 lines)
│   └── ui.js           (UI utilities)
├── icons/              (PWA icons 72-512px)
└── levels/             (Level data)
```

## 🎨 Licenza
MIT License - libero per uso personale e commerciale.
