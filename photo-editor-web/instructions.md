# PIANO DI IMPLEMENTAZIONE — Web App di Fotoritocco tipo Photoshop

> Prompt self-contained per il modello implementatore (Kimi K2.5).
> Implementa la web app seguendo questo documento nell'ordine indicato (§8 Milestones).
> Vincoli: nessun backend, tutto client-side, build statico deployabile, TypeScript strict, nessun errore in console.

---

## 1. Obiettivo

Realizzare una **web app statica** (deployabile su Vercel/Netlify/GitHub Pages, nessun backend) che permetta di:

1. **Caricare un'immagine** dal disco locale (drag & drop o file picker, PNG/JPEG/WebP).
2. **Gestire i livelli**: aggiungi, elimina, duplica, rinomina, riordina (drag), mostra/nascondi, opacità, blend mode di base (normal, multiply, screen, overlay).
3. **Zoom e pan** del canvas (zoom al cursore con rotellina, pulsanti, "adatta", 100%).
4. **Applicare filtri** al livello immagine selezionato con anteprima live: luminosità, contrasto, saturazione, blur, grayscale, seppia, invert, hue-rotate, sharpen.
5. **Scontornare persone/soggetti in primo piano** (background removal on-device, nessun server): il soggetto ritagliato diventa un nuovo livello.
6. **Tracciare linee dritte** da un punto A a un punto B con: colore libero (bianco/nero/qualsiasi), spessore, pattern (continua, tratteggiata, punteggiata, dash custom), cap (butt/round/square) e **bordo/outline** (colore e spessore del contorno della linea). Ogni linea creata diventa un **livello di tipo "linea"** modificabile: trascinare gli endpoint, modificare A e B con input numerici, e applicare **warp** (punto di controllo trascinabile che curva la linea come bezier quadratico).
7. **Scaricare il risultato** appiattendo tutti i livelli visibili in PNG o JPEG (scelta formato, qualità, scala 1x/2x).

Extra richiesti: **undo/redo** (almeno 30 step), UI desktop-first in italiano.

---

## 2. Stack tecnologico (obbligatorio)

| Area | Scelta | Motivo |
|---|---|---|
| Build | **Vite + React 18 + TypeScript (strict)** | Standard, deploy statico |
| State | **Zustand** | Store unico per documento/livelli/tool/viewport/history |
| Rendering | **Canvas 2D API nativa** (no Konva/Fabric) | Controllo totale su compositing, filtri (`ctx.filter`) e warp; meno dipendenze |
| Scontornamento | **`@imgly/background-removal`** (ONNX ISNet, gira in browser) | Soggetti generici + persone, on-device, asset bundleabili in `/public` per evitare CORS/CDN |
| UI | CSS Modules (o Tailwind, a scelta) + `lucide-react` per icone | Semplicità |
| Deploy | Vercel (`vercel.json`) o Netlify (`netlify.toml`) | Statico |

Nessun servizio esterno a runtime: tutto client-side (privacy + hosting gratuito).

---

## 3. Struttura del progetto

```
src/
  main.tsx, App.tsx
  types.ts                    # tutti i tipi condivisi
  state/store.ts              # Zustand: documento, livelli, selezione, tool, viewport
  state/history.ts            # undo/redo (snapshot strutturali, cap 30)
  canvas/renderer.ts          # pipeline di render (layer stack → stage canvas)
  canvas/coordinates.ts       # conversioni screen↔canvas, matrice viewport
  canvas/hitTest.ts           # hit test livelli, handle endpoint/control point
  tools/toolManager.ts        # dispatch eventi pointer per tool attivo
  tools/moveTool.ts           # selezione + drag livello
  tools/lineTool.ts           # creazione linea (click-drag)
  tools/panZoom.ts            # pan + zoom-to-cursor
  filters/filters.ts          # FilterSettings → stringa ctx.filter + kernel sharpen
  ml/backgroundRemoval.ts     # lazy-load @imgly/background-removal, progress callback
  export/exportImage.ts       # flatten → toBlob → download
  components/
    TopBar.tsx                # apri, esporta, undo/redo, zoom
    ToolBar.tsx               # move / linea / pan
    CanvasStage.tsx           # canvas + gestione eventi pointer/wheel
    LayersPanel.tsx           # lista livelli (reorder, eye, opacità, dup/del/rename)
    PropertiesPanel.tsx       # contestuale: filtri immagine | proprietà linea
    ProgressOverlay.tsx       # progress scontornamento
public/models/                # asset ONNX di background-removal (self-hosted)
```

---

## 4. Modello dati (`types.ts`)

```ts
type Point = { x: number; y: number }; // coordinate documento (px)

interface BaseLayer {
  id: string; name: string;
  visible: boolean; opacity: number;            // 0..1
  blendMode: GlobalCompositeOperation;          // default "source-over"
}

interface ImageLayer extends BaseLayer {
  type: "image";
  bitmap: ImageBitmap;
  x: number; y: number; scaleX: number; scaleY: number; rotation: number;
  filters: FilterSettings;
}

interface LineLayer extends BaseLayer {
  type: "line";
  start: Point; end: Point;
  color: string; width: number;
  pattern: "solid" | "dashed" | "dotted" | "custom";
  dashArray: number[];                          // es. [12, 6]
  cap: "butt" | "round" | "square";
  border: { enabled: boolean; color: string; width: number };
  warp: { enabled: boolean; control: Point };   // bezier quadratico start→control→end
}

interface FilterSettings {
  brightness: number; contrast: number; saturate: number;  // %, default 100/100/100
  blur: number; grayscale: number; sepia: number;          // px / %
  invert: number; hueRotate: number; sharpen: boolean;     // %, deg, flag
}

interface DocumentState { width: number; height: number; layers: Layer[]; }
interface Viewport { zoom: number; panX: number; panY: number; } // zoom 0.05..32
```

---

## 5. Pipeline di rendering (`canvas/renderer.ts`)

- Un unico `<canvas>` stage con **devicePixelRatio scaling**; render **on-demand** (funzione `invalidate()`), non in loop.
- Ordine: clear → sfondo a scacchiera (trasparenza) → per ogni livello dal basso: `save()` → `globalAlpha`, `globalCompositeOperation` → trasformazioni → **ImageLayer**: `ctx.filter = toCssFilter(filters)` + `drawImage` (bitmap filtrata cachata in offscreen con chiave = hash di `filters`, invalidata al cambio); **LineLayer**: se `border.enabled` disegna prima una stroke con `lineWidth = width + 2*border.width` e colore bordo, poi la stroke principale; se `warp.enabled` usa `quadraticCurveTo(start, control, end)` invece di `lineTo` (i dash funzionano anche sulle curve); `setLineDash(dashArray)` + `lineCap` → `restore()`.
- **Overlay non persistente** sopra i livelli: bounding box selezione, handle cerchiati sugli endpoint A/B e sul control point di warp della linea selezionata, preview della linea durante il drag.
- Hit test handle: distanza punto-cerchio (raggio 8px screen); hit test livelli: topmost-first, per le linee distanza punto-segmento/curva ≤ max(width/2, 6).

---

## 6. Specifiche dei moduli funzionali

### 6.1 Caricamento immagine
- `input[type=file]` + drag & drop sulla finestra → `createImageBitmap(file)`; se dimensione > 4096px sul lato maggiore, downscale via `createImageBitmap(blob, { resizeWidth, resizeHeight })` con avviso.
- Prima immagine → crea il documento (dimensioni = immagine) con un `ImageLayer` "Sfondo". Immagini successive → nuovi `ImageLayer` in cima, centrati.

### 6.2 Livelli (LayersPanel)
- Lista invertita (top = in primo piano), thumbnail 48px, nome editabile (doppio click), toggle visibilità (eye), slider opacità, select blend mode, bottoni duplica/elimina, **drag & drop per riordinare**. Selezione singola con highlight. Tutte le mutazioni passano dallo store e sono undo-abili.

### 6.3 Zoom / Pan
- Wheel → zoom-to-cursor (formula: mantieni fermo il punto documento sotto il cursore); pulsanti `+ / − / Adatta / 100%` in TopBar; percentuale zoom mostrata. Pan: tool mano, oppure Space+drag, oppure middle-mouse drag.

### 6.4 Filtri (PropertiesPanel, ImageLayer selezionato)
- Slider live per ogni voce di `FilterSettings` → anteprima immediata via `ctx.filter` (cache offscreen). **Sharpen** = kernel di convoluzione 3×3 applicato su offscreen `getImageData`, eseguito throttled (200ms) o solo al rilascio dello slider. Bottone "Reset filtri".
- **Fallback compatibilità**: feature-detect di `ctx.filter` (Safari < 18 non lo supporta) → se assente, applicare brightness/contrast/grayscale/sepia/invert/saturate via pixel ops su offscreen; documentare il limite.

### 6.5 Scontornamento (ml/backgroundRemoval.ts)
- Bottone **"Scontorna soggetto"** attivo su ImageLayer.
- Lazy-load dinamico di `@imgly/background-removal` con `publicPath` puntato a `/models/` (asset self-hosted scaricati in fase di build/setup) per evitare CORS da CDN; progress callback → overlay con barra di avanzamento (primo download ~40MB, poi cache browser).
- Output `Blob` → `ImageBitmap` → **nuovo layer** "Soggetto scontornato" sopra l'originale (originale nascosto, non distruttivo). Gestione errori con messaggio in UI.

### 6.6 Tool Linea + editing (cuore della feature)
- **Creazione**: tool linea attivo → pointerdown fissa A, drag mostra preview, pointerup fissa B → creato `LineLayer` con default (colore bianco, width 4, solid, round cap, no border, no warp) e selezionato.
- **PropertiesPanel (LineLayer)**: color picker (con shortcut bianco/nero), slider spessore (1–100), select pattern (solid/dashed/dotted/custom → input dash array es. "12,6"), select cap, toggle **bordo** + colore + spessore bordo, toggle **warp**, input numerici X/Y per A e B.
- **Editing sul canvas** (tool move, linea selezionata): drag sul corpo → sposta tutta la linea; drag handle A/B → sposta l'endpoint; se warp attivo, handle romboidale sul control point → curva la linea (inizializzato sul midpoint). Handle visibili solo per il layer selezionato.

### 6.7 Undo/Redo (state/history.ts)
- Stack di snapshot strutturali del `DocumentState` (i campi primitivi copiati, gli `ImageBitmap` condivisi per riferimento — mai clonati), cap 30, `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`, bottoni in TopBar.

### 6.8 Export (export/exportImage.ts)
- Canvas offscreen alle dimensioni del documento (scala 1x o 2x), stessa pipeline del renderer **senza** overlay e **senza** scacchiera (JPEG → sfondo bianco) → `toBlob('image/png' | 'image/jpeg', quality)` → download con nome file editabile.

---

## 7. Layout UI

- **TopBar**: nome app, Apri immagine, Esporta ▾ (PNG/JPEG, scala, qualità), Undo/Redo, controlli zoom.
- **Sinistra**: toolbar verticale (Sposta, Linea, Mano).
- **Destra**: pannello Livelli (sopra) + pannello Proprietà contestuale (sotto).
- **Centro**: canvas su sfondo neutro scuro, scacchiera per trasparenza.
- Overlays: progress scontornamento, toast errori.

---

## 8. Milestones (ordine di implementazione obbligatorio)

1. Scaffold Vite+React+TS+Zustand, layout vuoto, tipi base.
2. Caricamento immagine → documento + renderer base + scacchiera.
3. Zoom-to-cursor + pan.
4. Pannello livelli completo (CRUD, reorder, opacità, blend).
5. Move tool + hit testing + bounding box.
6. Filtri live con cache + fallback pixel-ops.
7. Undo/redo.
8. Line tool: creazione + proprietà (colore/spessore/pattern/cap/**bordo**).
9. Editing linea: drag endpoint, **warp** con control point, input numerici A/B.
10. Scontornamento con progress + gestione errori.
11. Export PNG/JPEG con flatten.
12. Polish: downscale immagini grandi, empty state, loading states, shortcut tastiera.
13. Config deploy (`vercel.json`/`netlify.toml`), README con `npm install && npm run dev` / `npm run build`.

---

## 9. Criteri di accettazione (checklist per chi implementa)

- [ ] Carico un'immagine e la vedo; zoom al cursore preciso; pan fluido.
- [ ] Tutte le operazioni livelli funzionano e sono undo-abili.
- [ ] Ogni filtro produce un cambiamento visibile in anteprima live e nell'export.
- [ ] "Scontorna soggetto" su foto con persona produce un layer con sfondo trasparente (verificabile sulla scacchiera).
- [ ] Creo una linea rossa spessa 10px tratteggiata con bordo nero 2px: appare come layer; posso trascinare A e B, attivare warp e curvarla; i valori numerici nel pannello si aggiornano col drag e viceversa.
- [ ] Export PNG = esattamente ciò che si vede sul canvas (stessi livelli visibili, stesse trasparenze).
- [ ] `npm run build` senza errori TS; nessun errore in console a runtime; app funzionante da build statico servito localmente (`npm run preview`).

---

## 10. Pitfalls da rispettare

- **Memoria**: chiamare `bitmap.close()` sui bitmap sostituiti/rimossi; non clonare `ImageBitmap` nella history.
- **DPR**: tutto il rendering moltiplicato per `devicePixelRatio`; handle e hit test in coordinate screen.
- **CORS**: solo file locali (Blob) → nessun problema; asset ML self-hosted in `/public/models`.
- **ctx.filter**: feature-detect + fallback (§6.4).
- **Primo download modello ML**: sempre con progress bar + retry.
- Non usare librerie canvas "magiche" (Konva/Fabric): il warp custom e il bordo-sulla-stroke richiedono controllo diretto.

---

## 11. Deliverable

Repository completo con `README.md` (setup, comandi, deploy), build statico funzionante, configurazione deploy inclusa.
