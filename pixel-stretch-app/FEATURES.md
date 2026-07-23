# Pixel Stretch — Piano di Sviluppo

## Stato Attuale
- ✅ Tutti gli effetti funzionano e test passano (88/88)
- ✅ TypeScript pulito, nessun errore
- ✅ PWA, Background Removal, Layer management, Export PNG

---

## Bug da Correggere

### B1. WarpGridOverlay — hover state non funziona
**File:** `src/components/WarpGridOverlay.tsx:116`
**Problema:** `pointerEvents: draggingIndex !== null ? 'all' : 'none'` blocca gli eventi quando non si sta trascinando.
`onPointerEnter`/`onPointerLeave` non si attivano mai.
**Fix:** Usare sempre `pointerEvents: 'all'` e gestire manualmente il pass-through con CSS.

### B2. Overlay loop non si ferma
**File:** `src/components/Canvas.tsx:173-183`
**Problema:** Il loop requestAnimationFrame per il source line preview gira in continuazione quando `isLineTool` è true, anche senza source line selezionata.
**Fix:** Aggiungere controllo esplicito `if (!isLineTool && !sourceLine) return` dentro il loop, non solo nell'effect.

### B3. `StretchPreview.sourcePos` non aggiornato durante drag
**File:** `src/components/Canvas.tsx:298`
**Problema:** In `handlePointerMove` mode `stretch`, viene passato `sourcePos: 0` invece del valore reale dalla source line. Non impatta il rendering ma è impreciso.
**Fix:** Leggere `sourceLine.position` dallo store al momento del set.

---

## Feature — Priorità Alta

### F1. Undo/Redo
**Descrizione:** Stack di stati per annullare/ripristinare operazioni sui layer (aggiunta, rimozione, modifica).
**Store:** Aggiungere `history: Layer[][]`, `historyIndex: number`.
**Azioni:** `undo()`, `redo()` con snapshot automatico prima di ogni mutazione.
**UI:** Pulsanti nella toolbar o scorciatoie Ctrl+Z / Ctrl+Shift+Z.
**Limite:** 50 stati massimi per evitare memory leak.

### F2. Sposta layer sul canvas
**Descrizione:** Permette di trascinare un layer sulla canvas per posizionarlo. Attualmente `Layer.position` e `moveLayerPosition` esistono ma non c'è UI.
**Store:** Già pronto (`moveLayerPosition`).
**Canvas:** In modalità `select`, clicca su un layer visibile per attivarlo (hit-testing sulla composizione). Poi trascina per spostarlo.
**Hit-testing:** Composite di tutti i layer visibili in un canvas offscreen, poi `getImageData` al click per trovare il primo pixel non trasparente.

### F3. True Radial Stretch (multidirezionale)
**Descrizione:** L'attuale `radialStretch` stira solo 2 linee perpendicolari (orizzontale e verticale). Un vero radial stretch espande in tutte le direzioni da un punto centrale.
**Effetto:** Per ogni pixel (x, y), calcola angolo e distanza dal centro. I pixel più lontani sono copie del pixel centrale con alpha calato in base alla distanza.
**File:** `src/effects/pixelStretch.ts` — nuova funzione `radialStretchFull()`.

### F4. Dialog Export con più formati
**File:** `src/components/ExportDialog.tsx`
**Aggiungere:**
- JPEG (con slider qualità 0-100)
- WebP
- PNG (come oggi)
- Nome file personalizzabile

### F5. Pulsante "Reset tutto"
**Descrizione:** Pulisce tutti i layer, resetta canvas a 800x600, torna al tool select.
**Store:** Nuova azione `resetAll()`.
**UI:** Pulsante nella sidebar o header, con conferma.

---

## Feature — Priorità Media

### F6. Effetto Mirror Stretch
**Descrizione:** Specchia i pixel da una linea sorgente invece di stirarli. Simile a row/column stretch ma senza fading: specchia simmetricamente.
**File:** `src/effects/pixelStretch.ts` — nuova funzione `mirrorStretch()`.

### F7. Effetto Twirl / Vortice
**Descrizione:** Distorsione rotazionale. Il centro "ruota" i pixel più lontani con un angolo che cresce con la distanza. Parametro: intensità.
**File:** `src/effects/pixelStretch.ts` — nuova funzione `twirlEffect()`.

### F8. Easing per lo stretch
**Descrizione:** Attualmente il decadimento alpha è lineare (`1 - i / stretchH`). Aggiungere curve:
- `linear` (default)
- `exponential` — decade più velocemente all'inizio
- `sine` — decade più lentamente all'inizio e fine
- `bounce` — piccole oscillazioni prima di sparire
**Modifica:** `computeAlpha()` in `pixelStretch.ts` o parametro `easing` nelle funzioni stretch.

### F9. Stretch simmetrico
**Descrizione:** Per row/column stretch, opzione per stirare in entrambe le direzioni contemporaneamente (es. da riga verso su E giù insieme) con un solo drag.
**UI:** Toggle "Simmetrico" nello StretchControls.

### F10. Live preview dello stretch
**Descrizione:** Mentre si trascina, mostrare una preview in tempo reale dell'effetto (non solo il riquadro di selezione).
**Canvas:** Applicare l'effetto su un canvas offscreen durante il drag e mostrarlo in overlay.
**Attenzione:** Può essere lento su immagini grandi. Limitare a preview a bassa risoluzione.

### F11. Più blend modes
**File:** `src/types/index.ts:23` — attualmente `'normal' | 'dissolve'`
**Aggiungere:** `screen`, `multiply`, `overlay`, `difference`, `lighten`, `darken`
**Implementazione:** Funzioni in `pixelStretch.ts` o file separato `blendModes.ts`. Ogni funzione prende colore sorgente, colore destinazione, alpha e restituisce il colore finale.

---

## Feature — Priorità Bassa / Refactoring

### F12. Web Worker per effetti pesanti
**Descrizione:** Spostare `radialStretch`, `selectionWarp`, `applyGridWarp` in un Web Worker per non bloccare la UI.
**Implementazione:** Worker che riceve ImageData via `transferable`, processa in background e restituisce il risultato.
**UI:** Aggiungere loading spinner durante l'elaborazione.

### F13. Touch gestures (pinch zoom)
**File:** `src/components/Canvas.tsx`
**Aggiungere:** `onWheel` per zoom (già presente), più gesture touch: pinch-to-zoom con `TouchEvent` e calcolo della distanza tra due dita.
**Considerazioni:** Mobile-first, da testare su dispositivi touch.

### F14. Canvas resize
**Descrizione:** Permette di 
 la tela dopo il caricamento iniziale. Utile per composizioni.
**UI:** Dialog con larghezza/altezza, opzioni: "Adatta ai contenuti", "Personalizzato", proporzioni predefinite (1:1, 4:3, 16:9).

### F15. Salva/Carica progetto
**Descrizione:** Serializza lo stato (layer, canvas, posizioni, opacità) in un file JSON.
**Salva:** Ogni layer canvas → `canvas.toDataURL()`. Salva tutto in un JSON con `data:` URI.
**Carica:** Legge il JSON, ricrea i canvas da DataURL, ripristina lo store.

### F16. Filtri immagine base
**Descrizione:** Regolazioni non distruttive per layer:
- Luminosità/Contrasto
- Saturazione
- Tonalità
- Sfocatura gaussiana
**Implementazione:** Ogni filtro crea un nuovo layer (come gli stretch).

### F17. Colori checkerboard per tema scuro
**File:** `src/utils/canvas.ts:78-79`
**Attuale:** `#cccccc` e `#999999` (chiari su tema scuro).
**Fix:** Usare `#2a2a2a` e `#333333` o simili per integrarsi col tema dark.

---

## Come procedere

```
1. [ ] B1 — WarpGridOverlay hover fix
2. [ ] B2 — Overlay loop cleanup
3. [ ] B3 — StretchPreview sourcePos fix
4. [ ] F1 — Undo/Redo
5. [ ] F2 — Sposta layer sul canvas
6. [ ] F3 — True Radial Stretch
7. [ ] F4 — Export più formati
8. [ ] F5 — Reset tutto
9. [ ] F6 — Mirror Stretch
10. [ ] F7 — Twirl / Vortice
11. [ ] F8 — Easing
12. [ ] F9 — Stretch simmetrico
13. [ ] F10 — Live preview
14. [ ] F11 — Più blend modes
15. [ ] F12–F17 — Bassa priorità
```

Ogni feature è indipendente e può essere sviluppata singolarmente. I bug B1-B3 sono veloci (pochi minuti ciascuno).
