# Matcha Heart 🍵 — cozy matcha match-3 PWA

> Sei **Aoi**, erede dell'ultimo chashitsu di Kyoto. Ogni tazza servita bene riapre una memoria di nonna Hana. Ogni tazza fredda la chiude. Cozy fuori, ansia dentro — con pioggia, romance e un frullino-cucciolo che ti vuole bene.

- 📱 **PWA mobile-first** (portrait, touch, installabile, 100% offline)
- 🍵 **Match-3 swap 8×8** cozy: combo = emozioni, scelte che cambiano il board
- 📖 **Saga IT**: 9 capitoli canone = **45 tazze**, 18 personaggi, 5 finali
- 🌸 **Multiverso**: **100 livelli totali** — Sakura Eterna (25, 🌱 boccioli), Notte Yokai (15, ⬛ inchiostro), Marea d'Estate (15, 🧊 gelo + quote schiuma fino al 90%)
- 🐾 **Mugi** il chasen-cucciolo, 🎭 check-in umore, 🔮 oracolo, 🥚 10 easter egg
- 🛠️ **Zero build, zero dipendenze**: HTML/CSS/JS vanilla come `keyfall-pwa`

## Indice

1. [Avvio rapido](#1-avvio-rapido)
2. [Come si gioca](#2-come-si-gioca)
3. [Personaggi](#3-personaggi)
4. [Trama e capitoli](#4-trama-e-capitoli)
5. [Finali](#5-finali)
6. [Easter egg](#6-easter-egg)
7. [Architettura](#7-architettura)
8. [Bilanciamento](#8-bilanciamento)
9. [Accessibilità e privacy](#9-accessibilità-e-privacy)
10. [Sviluppo: aggiungere contenuti](#10-sviluppo-aggiungere-contenuti)
11. [Roadmap futura](#11-roadmap-futura)
12. [Changelog](#12-changelog)

## 1. Avvio rapido

```bash
cd matcha-heart-pwa
python3 -m http.server 8141
# apri http://localhost:8141/index.html (meglio da telefono in rete locale)
```

**Installazione mobile:**
- **iOS Safari** → Condividi → *Aggiungi a Home* (standalone, fullscreen).
- **Android Chrome** → ⋮ → *Installa app* (oppure il bottone 📲 in home usa `beforeinstallprompt`).
- Il service worker (`sw.js`, cache-first) rende tutto offline dopo la prima visita.

Flusso: **Casa → Apri il locale → leggi la memoria → scegli → Servi la tazza → Rito → Diario.**

## 2. Come si gioca

### Match-3
- Board **8×8**, swap con tap o swipe (celle ≥44px, `touch-action:none`).
- 6 tessere-tè: 🍵 Usucha · 🍃 Koicha · 🌸 Sakura · 🍋 Yuzu · 🖤 Kurogoma · 🤍 Mochi.
- Obiettivo per livello: `N tessere-target in M mosse` + barra del tè (si riempie servendo).
- **Combo = emozioni**: x2 "doppio sorso", x3 "BATTITO 💓" (vibrazione + petali), x4+, x5 "ETERNO ✨".
- Scelta **rabbia** prima del livello = più 🖤 sul vassoio (bias 28%). Cozy: non esiste game-over duro — se la tazza si fredda, Hana ti fa riprovare (cuore rimborsato).
- **Booster**: 🌀 Chasen (8 tessere→target), 🌈 Tazza (3 jolly). Si ricaricano coi riti.

### Cuori, stelle, lettere
- 5 ♥, ricarica 1 ogni 5 min (o +1 col Respiro). Ogni lettera vinta finisce nel **Diario di Hana** con bottone **🔈 Ascoltami** (voce sintetica IT + karaoke, solo su tap).
- Stelle cozy: 3★ con `schiuma≥60 + ≥15% mosse rimaste`, 2★ quasi sempre alla vittoria.
- 60★ totali → finale segreto **MATCHA ETERNO ✨**.

### Riti-minigiochi (danno +mosse reali)
| Rito | Gesto | S = |
|---|---|---|
| 🌀 Awa | ruota il dito in cerchio a velocità media, 12s | +4 mosse |
| 🌸 Latte-Art | disegna un cuore senza uscire, 20s (doppio-tap = fine) | +4 mosse + scena romantica |
| 🌊 Respiro 4-7-8 | segui il cerchio: 4s in, 7s tieni, 8s fuori | +2 mosse +1 ♥ |

### Mugi 🐾, umore 🎭, oracolo 🔮
- **Mugi**: tap = coccola (+2 xp, max 5/giorno). Evoluzioni: 🌱 Germoglio → 🎋 Bamboo (80xp, +5% schiuma) → ✨🥢 Lacca oro (200xp, +1 Chasen/giorno). Nome personalizzabile ✏️ (default Mugi). Non muore mai.
- **Check-in umore** in home (😰🥺🌸): solo bonus — ansiosa apre il Respiro e aggiunge Yuzu al vassoio, malinconica aggiunge Mochi, bene fa piovere petali. Striscia 7×🌸 = regalo di Yuki.
- **Oracolo giornaliero** (pesca deterministica dalla data, +1 mossa la prima del giorno), **pioggia toccabile** (+1 mossa/20s), **Notte Lo-Fi** 🌙.

## 3. Personaggi

| # | Nome | Ruolo | In breve (no spoiler finali) |
|---|---|---|---|
| 1 | Aoi | tu · erede | 26 anni, mani che tremano, cuore che resta |
| 2 | Hana | nonna · voce | 25 (+2 segrete) lettere, sogni, vapore |
| 3 | Ren | ex · critico | taccuino nuovo, stesse mani dei 19 anni |
| 4 | Yuki | bambina · disegni | 7 anni, quasi muta; le sue tazze sono mappe |
| 5 | Takeshi | Uomo della Pioggia | ombrello nero, primo amore di Hana, 60 anni dopo |
| 6 | Mika | food-blogger | 40k follower, cuore più grande del telefono |
| 7 | Sōma | postino | 62 anni, vedovo; una lettera per Hana pesa 30 anni |
| 8 | Kiku | rivale · 81 anni | chashitsu oltre il fiume; astio finto, candele vere |
| 9 | Itsuki | fratello di Ren | 24 anni, fotografo di notte, rullino da 36 |
| 10 | Rei | madre di Yuki | infermiera, turni doppi, sta imparando a esserci |
| 11 | Tè | gatto del tempio | dorme sulle tazze calde; rivale di Mugi |
| 12 | Mugi | tuo chasen 🐾 | il tuo frullino-cucciolo (sei tu a dargli il nome) |

Sottotrame intrecciate: **Sōma** (1-1→2-5→4-5→6-1), **Kiku** (1-3→3-4→6-2), **Itsuki** (2-4→6-3), **Rei** (4-3→scelta part-time), **Hana giovane** (flashback dopo 2-5, 4-5, 5-2 + 6-5 giocabile).

## 4. Trama e capitoli

| Cap | Titolo | Episodi | Obiettivi (target/mosse) | Mini | Note |
|---|---|---|---|---|---|
| 1 | La Schiuma che Trema | 1-1…1-5 | 12/26 → 16/26 | awa/latte/respiro | tutorial travestito da rito; entra Sōma |
| 2 | Zucchero e Sale | 2-1…2-5 | 15/25 → 17/26 (bias 🖤 su 2-1,2-2) | misto | Ren critico;entra Itsuki |
| 3 | La Notte Yuzu | 3-1…3-5 | 15/25 → 18/27 | respiro/awa/latte | blackout; Kiku manda candele |
| 4 | Sakura Marcia | 4-1…4-5 | 17/26 → 19/27 | misto | Yuki sparisce; Rei e la busta |
| 5 | L'Ultima Tazza | 5-1…5-5 | 18/27 → 21/28 | misto | Takeshi; 3 finali (25) |
| 6 | Il Primo del Resto | 6-1…6-5 | 17/27 → 20/28 | misto | Sōma, duello Kiku, rullino, Tè, Hana ventenne; 4° finale (30) |
| 7 | Neve su Kyoto | 7-1…7-5 | 18/27 → 20/28 | 🧊 gelo | tetto che perde, junior nella tormenta, Moka nella neve |
| 8 | Festival delle Lanterne | 8-1…8-5 | 19/26 → 21/27 | mix + quota 55-65 | Itsuki torna, duello miele, chasen della madre |
| 9 | Ritorno al Vapore | 9-1…9-5 | 21/27 → 24/28 | mix/gelo + quota 65-80 | tempesta, scatola di latta, voto del vapore |
| S1–S2 | Sakura Eterna 🌸 | s1…s10 | 12/26 → 20/28 | 🌱 | Hana viva, Aoi bambina, Giardiniere; 2 finali |
| S3–S5 | Sakura: Radici/Seme/Petali | s11…s25 | 18/27 → 24/28 | 🌱 + quota 60-85 | quaderno condiviso, arbusto, voto dei petali |
| Y1–Y3 | Notte Yokai 🌙 | y1…y15 | 15/25 → 25/28 | ⬛ inchiostro + quota 60-85 | Padrona, Baku, Kitsune; teatro; 2 finali |
| E1–E3 | Marea d'Estate 🌊 | e1…e15 | 19/27 → 26/28 | 🧊/mix + quota 65-90 | Umi, Gin, Ondina; faro; tifone; 2 finali |

Dettagli testuali in `js/story.js` (`STORY`) e `js/universes.js` (`SSTORY`), lettere in `letter`, ratio sempre ≤0.75 (filosofia cozy, vedi §8).

### 4b. Multiverso 🌫️

- **Come si apre:** un finale del canone → **Sakura Eterna** · un finale Sakura → **Notte Yokai** · un finale Yokai → **Marea d'Estate**. Catena di difficoltà crescente, sblocchi nel selettore in home.
- **Meccaniche per mondo:** Pioggia (base + gelo/mix nei Cap.7-9) · Sakura (🌱 boccioli: match adiacente li fa sbocciare, valgono doppio) · Yokai (⬛ inchiostro: avanza ogni 3 mosse, si pulisce coi match vicini) · Estate (🧊 gelo + quote schiuma fino al 90%: 🧊 e ⬛ non si spostano mai).
- **Cosa cambia:** tema, canvas (petali / lucciole / spruzzi), skin tessere (🎋💜 · 🏮🎴🍡👻🌙 · 🐚🌊🪸), 12 fili 🧵 totali con progresso nel Diario.
- **Cosa resta:** ♥, Mugi, umore, riti, bonus e distintivi sono condivisi tra mondi.
- **Crossover:** il finale 🌧️ *Pioggia Vera* regala +3 mosse al canone, una volta sola.
- **Sottotrame canone:** il nipote postino di Sōma (1-1 → 4-4 → 6-1 → 7-1/7-3 → 9-1) e Moka, la gatta giudice di Kiku (1-3 → 6-2 → 6-4 → 7-4 → 8-3 → 9-4), entrambe tracciate nei Fili.

## 5. Finali

| Finale | Come si sblocca | Senza spoiler |
|---|---|---|
| 🌿 RESTO | Cap.5-5 scelta A | firmi 10 anni + sala tatami |
| 🕊️ LASCIO ANDARE | Cap.5-5 scelta B | banchetto itinerante |
| ✨ MATCHA ETERNO (segreto) | 60★ totali | la leggenda del locale |
| 🌳 RADICI E ALI (+ variante 🕊️) | Cap.6-5 scelta A/B | sala tatami + furgoncino verde |
| 🌸 RADICE SOGNATA | Sak.2-5 scelta A | resti nel sogno, nipote ritrovata |
| 🌧️ PIOGGIA VERA | Sak.2-5 scelta B | ti svegli con tutto (+3 mosse crossover) |
| 🏮 MASCHERA | Yok.3-5 scelta A | resti cantastorie, torni a ogni luna nuova |
| 🌅 ALBA | Yok.3-5 scelta B | torni all'alba vera con la lanterna accesa |
| 🌊 MAREA | Est.3-5 scelta A | stand ogni estate + chashitsu d'inverno |
| 🗼 FARO | Est.3-5 scelta B | affidi tutto, torni con il faro nel cuore |

Scegliere RESTO/LASCIO sblocca il Cap.6; RADICI chiude la saga (31 = completato).

## 6. Easter egg

Hint criptici (soluzioni nel codice `js/eggs.js`, non qui):

1. 🌈 *Il tè arcobaleno obbedisce alle frecce, ma solo sulla mappa, una volta al giorno.*
2. 🌙 *Hana scrive haiku per chi non dorme.*
3. 💌 *La settima lettera vibra, se la tocchi con pazienza. Sette volte.*
4. 🌧️ *Cento gocce fanno un ombrello per Mugi.*
5. 🌧️ *Chiama il cucciolo come la nonna e la pioggia parlerà.*
6. 🌸 *Sette soli rosa di fila e Yuki disegna per te.*
7. 👵 *Perdi tre volte nello stesso posto e la rivale si intenerisce.*
8. 🎂 *Il locale compie gli anni quando li compi tu… quasi.*
9. 🌙 *Vola senza rete e diventi Eremita.*
10. ✨ *Venticinque schiume perfette e il cerchio si completa.*

Distintivi visibili nel Diario (🏅). Lettere segrete: 26 + Parola di Hana.

## 7. Architettura

```
matcha-heart-pwa/
  index.html            # shell: 4 view (Casa/Map/Servi/Diario) + 3 modali + tabbar
  manifest.webmanifest  # standalone portrait, theme #7a9e7e, lang it
  sw.js                 # cache-first app shell, VERSION bump a ogni release
  css/style.css         # design token cozy + night mode + reduce-motion
  js/save.js            # localStorage matcha-heart-save-v1 (migrazioni incluse)
  js/tiles.js           # 6 tessere
  js/audio.js           # synth WebAudio (pop/swap/chime/whisk/pioggia)
  js/board.js           # motore match-3 (findMatches, cascade, booster, bias)
  js/story.js           # CHAPTERS, CHARACTERS, STORY(30), ORACLES(9), ENDINGS(5)
  js/universes.js       # UNIVERSES(4), SSTORY(25), YSTORY(15), ESTORY(15), THREADS(12), helper MHU
  js/minigames.js       # awa / latte / respiro → {grade, bonus}
  js/tama.js            # xp, stage, coccole, rename, daily chasen
  js/eggs.js            # 10 easter egg + tick da hud()
  js/app.js             # router, livelli, diario+TTS, umore, oracolo, pioggia/petali
  js/pwa.js             # SW register + install prompt
  data/story.json       # indice leggibile (fonte live = story.js)
  icons/                # 192 + 512 (+maskable riuso 512)
```

Flusso: `save → openStory(scelta) → startLevel(board+T bias/umore) → win/lose → lettere/stelle/Tama/egg → Diario`. Mai fetch di rete in gameplay (oracolo/meteo deterministici locali).

## 8. Bilanciamento

- Filosofia **cozy gentile**: win-rate ~95%, 3★ ~60%, bonus come coccole mai requisiti.
- Ratio `target/mosse` per tier: Cap.1 0.46-0.62 · Cap.2-6 0.60-0.75 · Cap.7-S3-Y1-E1 0.60-0.75 · Cap.8-S4-Y2-E2 0.72-0.82 · Cap.9-S5-Y3-E3 0.78-0.95 (con quote schiuma 55→90%).
- Nuove leve difficoltà: 🧊 gelo e ⬛ inchiostro non si spostano (si sciolgono/puliscono per adiacenza), ⬛ avanza ogni 3 mosse (max 12), quota schiuma ritarda la vittoria.
- Livelli con `biasTile=4` (rabbia/Kurogoma) compensati con +2 mosse implicite.
- Stelle: `3★ se schiuma≥60 e mosse≥15%`; `2★` quasi sempre alla vittoria.
- Score schiuma: `match×2 + catena×3` (+5 Tama Bamboo), cap 100.

## 9. Accessibilità e privacy

- `prefers-reduced-motion`: niente petali/combo animate. Haptics con try/catch.
- TTS solo su tap, stop al cambio tab, rispetto `sound:false`. Nessun autoplay.
- Bottoni ≥44px, font 16px+, contrasto carta/inchiostro + night mode.
- **Privacy totale**: nessun account, nessun tracker, tutto in `localStorage`. Export/import save (roadmap) resta file locale.

## 10. Sviluppo: aggiungere contenuti

**Nuovo episodio (5 step):**
1. Aggiungi `{id, chap, ep, kicker, title, text, cliff, choiceA/B, level:T(t,c,m,mini,bias), letter}` in `STORY` (o `SSTORY` con id `'sN'` + `threads:[...]`).
2. Controlla ratio `c/m ≤ 0.75` (bias → +2 mosse).
3. Se `choice.effect` inizia con `finale-`, `unlockEnding` lo gestisce da solo.
4. Aggiorna `data/story.json` (conteggi) e questa tabella §4.
5. Bump `sw.js` VERSION + test `python3 -m http.server`.

**Nuovo universo:** aggiungi voce in `UNIVERSES` (`id, theme, skin, mechanic, chapters, story, endings, unlock`) + tema CSS `body[data-universe]` + ganci già pronti (`mechanic`, namespace id, `progress{}`).

**Nuovo personaggio:** aggiungi a `CHARACTERS` + un cameo in un `cliff` esistente + (opzionale) un episodio che lo chiuda. **Nuovo egg:** hook in `eggs.js` + badge in Diario + hint qui §6.

## 11. Roadmap futura

### 11.1 Gameplay (vanilla, zero dipendenze)
- [ ] **Boss Inchiostro** (liv.26 alternativo): tessere inchiostro che si espandono ogni 3 mosse; sblocco dopo tutti i finali.
- [ ] **Duello Kiku vs CPU**: Awa a turni con IA a 3 livelli (lenta/media/nonna).
- [ ] **Gacha Yokai del Tè**: 12 spiritelli pescati con Foglie (valuta solo gameplay), passivi micro (+5% sakura ecc.), collezione nel Diario.
- [ ] **Tazze-fantasma**: daily-seed, bot poetici da battere + haiku lasciati (finto-async, tutto locale).
- [ ] **Modalità Zen infinita**: board senza mosse, solo respiro + punteggio; per le notti insonni.
- [ ] **Export/import save JSON** + reset selettivo (solo stelle / solo Tama).

### 11.2 Narrativa
- [ ] **Cap.10 "Cenere e Germoglio"** (epilogo canone giocabile dopo tutti i finali).
- [ ] **Flashback Hana giocabili** come episodi bonus rigiocabili (palette seppia via classe CSS).
- [ ] **TTS multi-voce**: Ren (pitch basso), Takeshi (lento), Yuki (solo sussurri testuali — scelta poetica).
- [ ] **Finale 6° stagionale**: si sblocca solo giocando in una stagione reale diversa.

### 11.3 Grafica (solo vanilla: SVG/CSS/canvas, niente asset esterni)
- [ ] **Sprite SVG artigianali** per i 12 personaggi (volto + 2 pose), stile carta.
- [ ] **Ciclo giorno/notte reale** (ora dispositivo → palette) + **meteo reale opzionale** (open-meteo con fallback offline; mai obbligatorio).
- [ ] **Stagioni CSS**: sakura primaverili, lucciole estive, aceri autunnali, neve invernale (canvas particellare già presente per petali/pioggia).
- [ ] **CG sbloccabili in SVG**: Ren sotto la pioggia (Latte-Art S), Hana ventenne (6-5), mappa di Yuki (47 tazze).
- [ ] **Photo-mode**: cornice haiku + punteggio condivisibile via Web Share API (solo testo/emoji, niente upload).
- [ ] **Icone maskable stagionali** generate dagli stessi SVG.

### 11.4 Tech
- [ ] Bot autoplay board (mosse random/greedy ×500 run) per validare ogni nuovo livello (win-rate target ≥90%).
- [ ] Lighthouse mobile PWA 100 (performance: sprite invariati, canvas già cheap).
- [ ] Save v2 con versionamento + migrazione testata (pattern già in `save.js`).
- [ ] Test smoke `node --check` + serve/curl in un unico script `tools/check.sh`.

## 12. Changelog

- **v1.0.0** — 25 episodi, 3 finali, 3 riti, oracolo, pioggia, notte Lo-Fi.
- **v1.0.1** — bilanciamento cozy (ratio ≤0.85→curve, stelle gentili).
- **v1.1.0** — Tama Mugi (nome personalizzabile), lettere TTS, check-in umore.
- **v1.2.0** — 6 personaggi nuovi, Cap.6 (26-30), 4° finale RADICI E ALI, 5 sottotrame, 10 easter egg, oracoli 9.
- **v1.3.0** — Multiverso: Fessura nel Vapore, Sakura Eterna (10 tazze, Bocciolo 🌱, 3 fili, 2 finali + crossover), nipote di Sōma, Moka.
- **v1.4.0** — **100 livelli**: Cap.7-9 (Neve, Lanterne, Ritorno), Sakura S3-S5, U-3 Notte Yokai (⬛ inchiostro), U-4 Marea d'Estate (🧊 + quote 90%), 12 fili, 9 finali, unlock a catena. *(corrente)*
- **v1.5.0 (pianificata)** — modalità Zen + boss Inchiostro espanso + export save.
