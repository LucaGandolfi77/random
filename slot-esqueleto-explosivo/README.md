# 💀 Esqueleto Explosivo Clone

Video slot a cascata "Día de los Muertos": 5×3, 17 linee fisse, Explosivo Wild con blast 3×3
e Mucho Multiplier ×1→×32. **PWA** (niente server): la matematica e il RNG vivono in
`engine.js` (modulo puro, trasferibile su un backend), il client in `script.js` gestisce UI e
animazioni.

RTP calibrato: **96.09%** (10M spin simulati, vedi `docs/PAYLINES.md`).

## Avvio

```bash
cd slot-esqueleto-explosivo
python3 -m http.server 8080
```

Apri `http://localhost:8080` (servono un host `localhost`/https per il Service Worker;
aprendo `index.html` via `file://` il gioco funziona comunque, senza caching offline).

## Struttura

- `engine.js` — motore puro (RNG crittografico, paylines, cascate, Wild, moltiplicatore)
- `script.js` — client: replay del round, animazioni, autoplay, paytable, gestione errori
- `index.html` / `style.css` — UI
- `manifest.webmanifest` / `sw.js` / `icons/` — PWA offline
- `tools/simulate.js` — calibratore RTP Monte Carlo
- `docs/PAYLINES.md` — allegato tecnico: schema 17 linee, paytable, report RTP

## Comandi utili

```bash
# RTP report (10M spin)
node tools/simulate.js --spins=10000000

# Prova pesi alternativi
node tools/simulate.js --gold=18 --pink=18 --wild=0.6 --spins=1000000
```
