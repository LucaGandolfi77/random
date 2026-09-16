# DARK ORBIT CLONE

Simulazione spaziale in stile *Dark Orbit*, giocabile nel browser. È un **MMO locale**: tutti gli account vivono nello stesso universo condiviso e le partite si salvano automaticamente nel `localStorage` del browser. Nessun server, nessuna registrazione.

- **Puro HTML/CSS/JS** (nessuna dipendenza, nessuna build)
- **Lingua**: italiano
- **Valute**: crediti (CR) e uridio (UR)

---

## 1. Come si avvia

Apri semplicemente `index.html` con un doppio clic o con:

```bash
python3 -m http.server 8000
```

poi vai su `http://localhost:8000`. Funziona anche aprendo il file direttamente da disco.

### Account e "MMO locale"

- I profili sono salvati nella chiave `darkorbit_accounts` del `localStorage`.
- L'universo (asteroidi, NPC, drop) è **condiviso** tra tutti gli account e salvato nella chiave `darkorbit_world`: se un account estrae un asteroide o uccide un nemico, gli altri account lo vedono.
- Più piloti nella stessa schermata non sono simulati: la condivisione avviene attraverso lo stesso mondo persistente (è una simulazione di MMO, non una rete reale).
- Per cancellare tutto: Console → `localStorage.clear()` e ricarica.

### Account ADMIN

Digitando **admin** come nome pilota ottieni un account speciale:

- CreditI e uridio **infiniti** (mostrati come `INF`)
- Acquisti sempre gratuiti
- **Nessuna perdita** alla morte (i normali perdono il 20% dei crediti)
- Nave color oro

---

## 2. Controlli

| Tasto / Azione | Effetto |
|---|---|
| **W A S D** o **frecce** | Movimento manuale con inerzia |
| **Click** su spazio vuoto | La nave vola verso il punto cliccato |
| **Click** su un nemico | Seleziona il nemico (barra della vita in basso) |
| **CTRL** | Alterna ATTACCO sul nemico selezionato |
| **Click** su un asteroide | Mining manuale (la nave spara solo a quello) |
| **Click sulla minimappa** | La nave va verso il punto del mondo selezionato |
| **Trascina la minimappa** | Sposta la finestrella della minimappa |
| **ESC** | Deseleziona il bersaglio / annulla il mining |
| **1 · 2 · 3 · 4** | Munizioni Rosse / Blu / Verdi / Bianche (x1 · x2 · x3 · x4) |
| **C** | Apre il negozio |
| **M** | Apre la mappa galattica |
| **B** | Apre la bacheca missioni |
| **G** | Entra / esce dal Galaxy Gate (dal portale) |
| **V** | Alterna configurazione **ASSALTO** ↔ **VELOCITA** |

> **Nota**: durante la schermata di login, o quando il focus è dentro un campo di testo (es. la casella del nome), i tasti di scelta rapida **non funzionano**. Puoi quindi digitare "admin" senza aprire la mappa.

### Movimento

- Il movimento manuale **annulla** la destinazione cliccata.
- Il click su spazio vuoto o sulla minimappa **mantiene** bersaglio, attacco e mining attivi: se stai attaccando e clicchi altrove per spostarti, la nave continua a sparare al nemico quando è in gittata. Usa **ESC** per interrompere.

---

## 3. Combattimento

- I nemici del mondo sono **difensivi**: vagano a caso e **attaccano solo se provocati** (li colpisci per primi). Appena colpiti diventano ostili e inseguono il giocatore; possono allertare anche i nemici vicini.
- I nemici del **Galaxy Gate** sono invece sempre aggressivi.
- Quando uccidi un nemico: crediti (drop), possibilità di uridio, **EP**, **onore** e progresso missioni.
- **Scudo prima, poi scafo**: il danno si assorbe prima sullo scudo (che si rigenera), poi sull'HP.
- **Energia**: si rigenera passivamente (base + generatore); i kit la riportano al massimo.
- **Drone**: se equipaggiato, orbita attorno alla nave, spara sullo stesso bersaglio del pilota e **raccoglie automaticamente** i drop entro 150 px.
- **Munizioni**: cambia il moltiplicatore di danno di tutti i laser (compresi quelli del drone).

### Nemici (11 tipi, dal più debole al più forte)

| Nemico | HP | Danno | Drop CR | Ch. uridio | EP | Onore |
|---|---|---|---|---|---|---|
| Streuner | 60 | 8 | 200 | 4% | 8 | 2 |
| Lordakia | 110 | 15 | 600 | 8% | 25 | 5 |
| Saimon | 180 | 24 | 1.400 | 14% | 70 | 12 |
| Devolarium | 280 | 34 | 3.000 | 22% | 190 | 30 |
| Sibelon | 420 | 48 | 6.000 | 30% | 480 | 70 |
| Kristallin | 650 | 65 | 12.000 | 40% | 1.100 | 150 |
| Kristallon | 1.000 | 85 | 25.000 | 50% | 2.600 | 350 |
| Palladion | 1.600 | 105 | 50.000 | 55% | 6.000 | 800 |
| Halon | 2.400 | 130 | 90.000 | 60% | 12.000 | 1.600 |
| Desmo | 3.500 | 160 | 150.000 | 65% | 25.000 | 3.200 |
| StreuneR | 5.000 | 200 | 250.000 | 70% | 50.000 | 6.000 |

> Ogni nemico ha una **sagoma procedurale dedicata**: pirati a forma di nave (Streuner, Lordakia, Saimon, Devolarium, Sibelon), alieni cristallini (Kristallin, Kristallon) e corazzate d'élite (Palladion, Halon, Desmo, StreuneR).

---

## 4. Mining, minerali e raffinazione

- **Click su un asteroide**: la nave vola lì e spara **solo** all'asteroide selezionato (niente auto-mining degli altri).
- Ogni asteroide contiene un minerale e 3 unità di risorsa; c'è un 6% di probabilità che rilasci uridio.
- Gli asteroidi **respawn** dopo un po'.
- I minerali si **vendono** e si **raffinano** nel negozio (tab **MINERALI**).

### Valori base di vendita

| Minerale | Fascia | Valore base (CR) |
|---|---|---|
| Prometium | grezzo | 10 |
| Endurium | grezzo | 15 |
| Terbium | grezzo | 25 |
| Prometid | II grado | 200 |
| Duranium | II grado | 200 |
| Promerium | III grado | 500 |
| Seprom | III grado | 750 |
| Osmium | avanzato | 3.000 |
| Arkon | élite | 8.000 |
| Xenodium | élite | 20.000 |

> Il prezzo di vendita è moltiplicato per **1 + onore/2000**, fino a un massimo di **×2,5**: più onore guadagni, più i minerali valgono.

### Ricette di raffinazione

| Produce | Consuma |
|---|---|
| 1 Prometid | 3 Prometium + 2 Endurium |
| 1 Duranium | 3 Endurium + 2 Terbium |
| 1 Promerium | 3 Prometid + 1 Duranium |
| 1 Seprom | 3 Duranium + 1 Promerium |
| 1 Osmium | 3 Seprom + 1 Promerium |
| 1 Arkon | 2 Osmium + 2 Seprom |
| 1 Xenodium | 2 Arkon + 2 Osmium |

---

## 5. Progressione: EP, Livello, Settori, Rank

### Esperienza e Livello

- Ogni nemico e ogni missione danno **EP**.
- Per passare dal livello *l* al livello *l+1* servono **10.000 × 2^(l-1)** EP (l'1 → 2 costa 10.000, il 2 → 3 costa 20.000, il 3 → 4 costa 40.000, e così via).
- Il livello è anche un **permesso geografico**: i settori avanzati richiedono un livello minimo.

### Settori

| Settore | Posizione | Livello richiesto | Nemici | Minerali |
|---|---|---|---|---|
| Alpha | 0–1500 × 0–1200 | 1 | fascia 0–1 | prometium, endurium, terbium |
| Beta | 1500–3000 × 0–1200 | 3 | fascia 1–3 | endurium, terbium, prometid, duranium |
| Gamma | 0–1500 × 1200–2400 | 5 | fascia 3–5 | prometid, duranium, promerium, seprom |
| Delta | 1500–3000 × 1200–2400 | 8 | fascia 5–6 | promerium, seprom, osmium |
| Epsilon | 3000–4500 × 0–1200 | 11 | fascia 7–8 | osmium, arkon, xenodium |
| Zeta | 3000–4500 × 1200–2400 | 14 | fascia 9–10 | arkon, xenodium |

> La galassia è divisa in **6 settori** (griglia 3×2). La mappa (tasto **M**) mostra tutti i settori con il livello richiesto: verde = accessibile, rosso = oltre il tuo livello.

### Rank (grado)

Punti rank = **EP + Onore × 50 + Uccisioni × 200**.

| Punti | Grado |
|---|---|
| 0 | Recluta |
| 1.000 | Pilota |
| 10.000 | Soldato |
| 50.000 | Capitano |
| 150.000 | Comandante |
| 400.000 | Ammiraglio |

---

## 6. Nave e moduli: il sistema a slot

Ogni nave ha **un numero fisso di slot** e una **velocità propria**:

| Nave | HP | Velocità | Slot | Costo |
|---|---|---|---|---|
| Phoenix | 100 | 140 | 3 | gratis |
| Yamato | 160 | 155 | 4 | 20.000 CR |
| Vengeance | 220 | 170 | 5 | 60.000 CR + 40 UR |
| Goliath | 320 | 180 | 7 | 150.000 CR + 150 UR |
| Nemesis | 430 | 195 | 9 | 350.000 CR + 500 UR |

Il **tab NAVE** del negozio (aperto di default quando premi C) mostra la nave, le statistiche totali e uno **selettore per ogni slot**. Ecco come funziona:

1. **Compri i moduli** nelle altre schede (LASER, SCUDO, GENERATORE, BATTERIE, PROPULSORE): finiscono nei tuoi *posseduti* e NON si attivano da soli.
2. **Li installi** nel tab NAVE scegliendo un modulo per slot.
3. Gli effetti dei moduli installati **si sommano** (per i laser si sommano i danni; frequenza e portata prendono il massimo; scudi/generatori/batterie/propulsori si sommano).
4. Quando **compri una nave nuova**, gli slot si ridimensionano: i moduli in eccesso restano nei posseduti, gli slot nuovi vengono riempiti automaticamente coi tuoi moduli non installati.

### Valori base dello scafo (con slot vuoti)

- Scudo: 30 (+ rigenerazione 2/s)
- Energia: 60 (+ rigenerazione 6/s)

### Moduli (5 livelli ciascuno)

| Livello | Laser (danno) | Scudo (max) | Generatore (en/s) | Batterie (en max) | Propulsore (+vel) |
|---|---|---|---|---|---|
| 1 | LC-1: 12 | SG1: 60 | G3N-1: 12 | B4T-1: 100 | PR-1: 0 |
| 2 | LC-2: 22 | SG2: 120 | G3N-2: 22 | B4T-2: 180 | PR-2: 18 |
| 3 | LCB-10: 38 | SG3: 220 | G3N-3: 35 | B4T-3: 300 | PR-3: 40 |
| 4 | LCB-20: 60 | SG4: 360 | G3N-4: 52 | B4T-4: 460 | PR-4: 70 |
| 5 | LF-4: 95 | SG5: 560 | G3N-5: 75 | B4T-5: 680 | PR-5: 110 |

I laser hanno anche frequenza (2,2→3,0 colpi/s) e portata (260→340 px). I moduli superiori costano crediti e, dai livelli 3+, anche uridio.

### Configurazioni (tasto V)

| Config | Danno | Velocità | Scudo |
|---|---|---|---|
| **ASSALTO** | ×1,20 | ×0,92 | ×1,00 |
| **VELOCITA** | ×0,85 | ×1,18 | ×0,92 |

---

## 7. Skylab (produzione passiva)

Nel tab **SKYLAB** del negozio si attivano livelli di produzione automatica di minerali raffinati.

- Produce **anche da offline**: al login si calcola il tempo trascorso dall'ultimo salvataggio e si aggiunge la produzione.
- Ogni livello richiede un livello minimo del pilota e costa crediti.

| Livello | Costo CR | Produzione (u/h) | Livello richiesto |
|---|---|---|---|
| L1 | 5.000 | 20 | 1 |
| L2 | 25.000 | 45 | 4 |
| L3 | 80.000 | 90 | 8 |
| L4 | 200.000 | 160 | 12 |
| L5 | 450.000 | 260 | 16 |
| L6 | 900.000 | 400 | 20 |

---

## 8. Droni (tab DRONI)

| Drone | Danno | Colpi/s | Portata | Costo |
|---|---|---|---|---|
| E-1 | 8 | 1,6 | 260 | 8.000 CR |
| E-2 | 18 | 2,0 | 300 | 40.000 CR + 20 UR |
| E-3 | 40 | 2,4 | 340 | 150.000 CR + 120 UR |
| X-4 | 95 | 2,8 | 380 | 450.000 CR + 400 UR |

- Comprandolo, il drone si **equipaggia subito** (tab DRONI mostra "IN USO").
- Orbita attorno alla nave, spara al bersaglio del pilota e raccoglie i drop entro 150 px.
- Il suo danno è moltiplicato dalle munizioni selezionate.

---

## 9. Missioni (tasto B)

La **bacheca** genera sempre 3 missioni proporzionate al tuo livello; puoi averne **una attiva alla volta**.

| Tipo | Obiettivo | Tracciamento |
|---|---|---|
| Abbatti | Elimina N nemici (generici o di una fascia) | ogni uccisione conta |
| Raccogli | Raccogli N minerali di una fascia | ogni minerale estratto conta |
| Raggiungi | Raggiungi un settore specifico | entra nel settore |
| Sopravvivi | Sopravvivi N secondi in combattimento | conta il tempo di gioco |

- Ricompensa tipica: crediti, uridio ed EP (scala con il livello).
- Completata una missione, riscuoti con **B** → "RISCUOTI".
- Dopo la riscossione viene generata una nuova bacheca.

---

## 10. Galaxy Gate (tasto G)

Un dungeon a ondate nel **Settore Delta**.

- **Requisito**: livello 8.
- **Posizione del portale**: (2700, 2075) — cerchio animato visibile nel settore e nella mappa.
- Avvicinati e premi **G** per entrare; **G** di nuovo per uscire (o muori).
- Dentro l'arena (rettangolo in alto a destra della mappa) affronti **5 ondate** di nemici (fascia proporzionata al livello) e infine il boss:

  **MINDIFIRE BEHEMOTH** — 2.500 HP · 90 danni · 40.000 CR di ricompensa · rilascio uridio garantito.

- **Ricompensa** (scala col livello): crediti, uridio, EP, onore e **parti di gate** (2 + livello/6, arrotondate).
- **Morte dentro il gate** = uscita, progressi azzerati e (per i non-admin) perdita del 20% dei crediti.
- I nemici del gate sono sempre ostili e **non vengono salvati** nel mondo condiviso.

### Scambio parti (tab PORTALE del negozio)

| Scambio | Ottieni |
|---|---|
| 5 parti | 2.000 uridio |
| 1 parte | 1.500 crediti |

---

## 11. Booster e Kit (tab BOOSTER)

### Booster (si comprano con uridio)

Durano **10 ore reali** e continuano a contare **anche da offline**.

| Booster | Costo UR | Effetto |
|---|---|---|
| DANNO | 25 | +25% danno |
| SCUDO | 20 | +40% scudo massimo |
| VELOCITA | 15 | +25% velocità |
| MINING | 15 | +50% minerali estratti |

### Kit consumabili (si comprano con crediti)

| Kit | Costo CR | Effetto |
|---|---|---|
| Riparazione scafo | 2.000 | Ripara il 60% dello scafo |
| Ricarica scudo | 1.500 | Scudo al massimo |
| Ricaricatore energia | 800 | Energia al massimo |

---

## 12. Salvataggio e morte

- **Autosalvataggio ogni 10 secondi** (account + mondo). Il progresso Skylab calcola anche il tempo offline.
- **Morte**: respawn alla base (1500, 1200), scudo/energia/HP pieni. I piloti normali **perdono il 20% dei crediti**; l'admin non perde nulla.
- I drop (crediti, uridio, minerali) restano per 45 secondi sul campo: passaci sopra per raccoglierli (il drone li raccoglie da solo se sei equipaggiato).

---

## 13. FAQ approfondita

**Cos'è un "MMO locale"?**
È una simulazione della componente multigiocatore senza rete: tutti gli account salvati nel browser condividono lo **stesso universo persistente**. Le azioni di un pilota (estrazione, uccisioni) modificano il mondo che gli altri piloti vedono alla loro entrata.

**Posso giocare su più dispositivi?**
No. Il salvataggio è nel `localStorage` del browser: ogni dispositivo ha il suo universo. Per condividere i salvataggi dovresti copiare le chiavi `darkorbit_accounts` e `darkorbit_world` (per esempio con l'import/export dei dati del browser).

**Come faccio ad avere soldi infiniti?**
Login con nome **admin**.

**Perché quando digito "admin" mi si apre la mappa?**
È il bug che è stato corretto: i tasti di scelta rapida ora sono disattivati durante il login e quando il focus è su un campo di testo.

**I nemici mi attaccano appena mi vedono?**
No. I nemici del mondo sono **difensivi**: vagano a caso e reagiscono solo se li colpisci per primi (e possono chiamare i rinforzi vicini). I nemici del Galaxy Gate, invece, sono sempre aggressivi.

**Ho cliccato un nemico ma non spara.**
Dopo aver selezionato il nemico devi attivare l'attacco con **CTRL**. Finché resti in gittata spari in automatico.

**Se mi sposto mentre attacco, smetto di sparare?**
No. Cliccando su spazio vuoto o sulla minimappa la nave si sposta **mantenendo** bersaglio e attacco: riprendi a sparare appena il nemico torna in gittata. Usa **ESC** per fermare l'attacco.

**Clicco sulla minimappa ma la nave non parte.**
Verifica di non avere tasti WASD premuti (il movimento manuale annulla la destinazione). Se stai trascinando la minimappa per spostarla, il clic non viene interpretato come destinazione. Altrimenti il clic dovrebbe far volare la nave sul punto: il punto cliccato è mostrato sulla minimappa e sulla mappa con un cerchietto.

**Perché l'energia si svuota?**
L'energia in questa simulazione si rigenera passivamente e non viene consumata dai laser; serve da risorsa di gioco (i generatori la aumentano e i kit la riportano al massimo).

**Come aumento il prezzo dei minerali?**
Guadagnando **onore** (uccidendo nemici e completando missioni): ogni 2.000 onore il prezzo base aumenta fino al massimo di ×2,5.

**Ho comprato un laser ma il danno non cambia.**
Nel nuovo sistema a slot i moduli acquistati finiscono nei **posseduti** e vanno **installati nel tab NAVE**. Solo i moduli installati negli slot contano.

**Cosa succede se compro una nave con meno slot di quelli che uso?**
Gli slot si ridimensionano: i moduli in eccesso tornano nei posseduti e non vengono persi. Gli slot nuovi (nave più grande) vengono riempiti automaticamente con i moduli non installati.

**Come faccio a entrare nel Galaxy Gate?**
Raggiungi il Settore Delta (livello 8), avvicinati al portale a (2700, 2075) e premi **G**.

**Muoio nel gate: perdo qualcosa?**
Sì: i progressi delle ondate si azzerano (devi ricominciare) e, se non sei admin, perdi il 20% dei crediti.

**A cosa servono le parti di gate?**
Si scambiano nel tab PORTALE: 5 parti → 2.000 uridio, 1 parte → 1.500 crediti.

**I booster scadono se chiudo il gioco?**
No, durano 10 ore reali e il tempo scorre anche a gioco chiuso (si controllano tramite la data, non con un timer di gioco).

**Lo Skylab funziona da offline?**
Sì: al login si somma la produzione calcolata dal tempo trascorso dall'ultimo salvataggio.

**Come si resetta tutto?**
Console del browser → `localStorage.clear()` → ricarica la pagina. Verranno creati universo e account nuovi.

**Il gioco funziona su mobile?**
Le basi funzionano, ma il gioco è progettato per **mouse e tastiera** (WASD, CTRL, clic).

**Perché le navi non hanno i missili o le mine?**
Sono fuori scope della simulazione attuale: il combattimento si basa su laser, drone, configurazioni e moduli.

---

## 14. Struttura del progetto

```
darkorbit-clone/
├── index.html      # pagina principale, HUD e overlay
├── style.css       # tema scuro e layout
└── js/
    ├── data.js     # tutti i dati di gioco (navi, moduli, NPC, ore, missioni, gate...)
    ├── sprites.js  # disegno procedurale (navi, nemici, asteroidi, laser, esplosioni)
    ├── save.js     # localStorage, account, migrazioni, slot
    ├── world.js    # universo condiviso, AI dei nemici, gate, drops
    ├── ui.js       # HUD, negozio, mappa, missioni, minimappa
    └── game.js     # loop, input, combattimento, mining, progressione
```