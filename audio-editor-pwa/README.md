# 🎚 Audio Editor PWA

Multi-track audio editor installabile come **PWA** (nessun server richiesto): carica audio,
taglia/sovrapponi clip su più tracce, applica effetti e **esporta solo la selezione** in
WAV 16/24-bit o MP3. Modello puro in `project.js` (trasferibile), motore audio Web Audio in
`audio.js`, client in `app.js`.

## Avvio

```bash
cd audio-editor-pwa
python3 -m http.server 8080
```

Apri `http://localhost:8080` (servono `localhost`/https per Service Worker e Web Audio;
via `file://` l'app funziona lo stesso ma senza offline caching).

## Funzionalità

- **Tracce multiple** (stile Sony Vegas): clip spostabili/tagliabili trascinando i bordi
- **Selezione regione** sul righello (drag per selezionare, doppio-click per pulire) —
  l'export esporta *solo* la regione selezionata
- **Effetti per clip**: volume, fade in/out, tempo e pitch (SoundTouch)
- **Effetti per traccia**: volume, pan, EQ 3 bande, filtro HP/LP, send verso il riverbero
- **Master**: EQ, riverbero (procedurale), compressore
- **Export**: WAV 16/24-bit PCM o MP3 (lamejs), 44.1/48 kHz, bitrate MP3 a scelta
- **Salvataggio**: autosave in IndexedDB + progetto esportabile/importabile come JSON
- **Scorciatoie**: `Space` play, `S` taglia al playhead, `Del` elimina clip, `Esc` chiude

## Struttura

- `project.js` — modello puro (progetto, tracce, clip, snap, split, serializzazione)
- `wav.js` — encoder WAV puro (16/24-bit)
- `mp3.js` — wrapper del codificatore MP3 (lamejs, global di browser)
- `audio.js` — motore Web Audio: grafo effetti, SoundTouch, render offline, export regione
- `waveform.js` — calcolo picchi + disegno forma d'onda
- `store.js` — persistenza IndexedDB (progetto + asset audio)
- `app.js` — client: UI, playback, interazioni, export
- `index.html` / `style.css` — UI
- `vendor/lame.min.js` / `vendor/soundtouch.min.js` — librerie (caricate via `<script>`)
- `manifest.webmanifest` / `sw.js` / `icons/` — PWA offline
- `tools/test.js` — test unitari (modello + encoder WAV)

## Comandi utili

```bash
# Test unitari (modello + WAV)
node tools/test.js

# Lint sintattico di tutti i moduli
for f in project.js wav.js mp3.js audio.js waveform.js store.js app.js; do node --check "$f"; done
```
