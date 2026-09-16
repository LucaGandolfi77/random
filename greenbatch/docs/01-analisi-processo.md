# 01 — Analisi di processo e ingegneria di base
### GreenBatch GB-8S · banco silos caffè verde, trasporto in depressione, dosaggio a lotti

> Documento di analisi. Distingue **ciò che è dato** (dal modello impianto fornito) da **ciò che è
> dedotto** (dall'osservazione dell'interfaccia SCADA/PLC) e da **ciò che va verificato in campo**.
> Nessuna deduzione viene presentata come fatto accertato.

---

## 1. Perimetro e dati di partenza

**Dato dal modello impianto (JSON):**

| Elemento | Valore |
|---|---|
| Banco silos | 8 silos verticali G1–G8, cono 60°, su telaio in acciaio |
| Trasporto | pneumatico in depressione (soffiante a valle di ciclone e filtro) |
| Ciclone | `CYCLONE_101` con sonda di livello basso `LSL151` |
| Isolamento/dosaggio ciclone | `EV101` (ghigliottina) → `M101` (valvola rotativa / airlock) |
| Distribuzione | `DISTRIBUTION_MANIFOLD` → deviatrici superiori individuali G1–G8 |
| Raccolta | `COLLECTION_MANIFOLD` ← valvole di scarico `EV201…EV208` |
| Pesa | `WEIGH_SCALE_HOPPER` su 3 celle, scarico `EV250` verso torrefattrice |
| Posizione pesa | `x=2.0, y=0.5, z=0.0` |
| Note 3D | telaio con 8 silos Ø cilindrico + cono 60°, tubazioni inox con curve e valvole, tramoggia su 3 punti di carico |

**Dedotto dall'interfaccia (foto) — con valutazione:**

| Osservazione | Valutazione tecnica | Stato |
|---|---|---|
| Suffissi **(W)** / **(N)** accanto alle varietà | **Corretto.** Washed vs Natural: cambiano densità apparente, angolo di riposo e colore del verde. Impatta taratura, tempi di dosaggio e resa | confermato |
| Suffisso **SD** (Brazil SD) | Plausibile *Sun Dried*; nelle compravendite "SD" indica anche partite essiccate al sole. **Da confermare con il listino interno** | da verificare |
| **"R Exc Cauca"** | "Exc" = *Excelso*, grado colombiano (vaglio 15/16). "R" non è standard: probabile codice fornitore/lotto, **non** Robusta (Cauca è arabica) | dedotto |
| **"M"** in *Yirgacheffe M* | Non è una classificazione etiope standard (si usa Grade 1/2). Probabile *Medium* o codice lotto interno | da verificare |
| **Quadratini rossi** in cima a G1–G2–G3 | Coerente con **allarme di livello massimo** su interruttore di livello dedicato; i pesi 974,5 / 985,5 / 976,6 kg sono prossimi al 100% | dedotto forte |
| Pesi silo con **risoluzione 0,1 kg** (974,5) | Implica **silos pesati** (celle di carico), non semplice stima da livello. Un sensore di livello non dà 0,1 kg | dedotto forte |
| Trasporto in **aspirazione** | Corretto: soffiante sul lato aria pulita, ciclone come separatore primario, filtro prima della soffiante | confermato |
| **EV101 + M101 in serie** | Corretto: M101 mantiene la tenuta del vuoto scaricando il prodotto; EV101 isola il ciclone (manutenzione/pulizia filtro) | confermato |
| Icona **orologio** (timer) e **ingranaggio** (parametro) | Plausibile: ciclo di aspirazione a tempo; ingranaggio = parametro configurabile dall'operatore | dedotto |
| **SCALE** a doppia riga +0,0 / +0,0 | Actual vs Target (setpoint di ricetta); ALARM/STOPPED come stato | confermato |
| Barra funzioni **Green / Alarms / Login / Print** | Tracciabilità e turni: report di lotto stampabile per ogni miscela | confermato |

**Conseguenza progettuale della deduzione sui pesi:** se i silos sono pesati, servono **3 celle di carico
per silo** (24 celle totali) più un trasmettitore per silo, **in aggiunta** agli interruttori di livello
alto/basso. In alternativa: livello radar + densità nota (meno preciso, ±2–3%). Il modello dati
consegnato adotta la soluzione pesata (classe III, 0,1 kg) perché coerente con i valori a display.

---

## 2. Ciclo di processo

```
                    ┌─────────────── aspirazione (sottovuoto −42 kPa) ───────────────┐
 big-bag/fossa ──► │  tubazione DN100 ──► CY-101 (ciclone) ──► FL-101 (filtro) ──► BL-01 soffiante
                    └───────────────────────────────┬───────────────────────────────┘
                                                    │ M-101 airlock (mantiene il vuoto)
                                                    ▼
                                     DISTRIBUTION_MANIFOLD
                        ┌───────┬───────┬─── … ───┬───────┐
                       DV-101  DV-102            DV-108   (una sola aperta per volta)
                         ▼       ▼                 ▼
                        G1      G2      …         G8      (silos pesati, 1000 kg)
                         │       │                 │
                       EV-201  EV-202            EV-208     (una sola aperta per volta)
                         └───────┴── COLLECTION_MANIFOLD ───┘
                                        │  DV-109 + EV-260 (regolazione)
                                        ▼
                              WEIGH_SCALE_HOPPER (3 celle, 120 kg)
                                        │  EV-250
                                        ▼
                              Torrefattrice (tramoggia di carico)
```

**Due modi operativi distinti:**

1. **Caricamento silos (vacuum load):** la soffiante aspira il caffè dalla ricezione, il ciclone
   decapita la velocità, l'airlock M-101 scarica nel manifold, la deviatrice instrada nel silo
   scelto. Blocco immediato se il silo è in allarme livello alto.
2. **Dosaggio a lotti (batching):** la stessa depressione, presa dal collettore inferiore, aspira il
   prodotto dal silo selezionato alla tramoggia di pesa. La **valvola di regolazione EV-260** limita
   la portata nelle fasi fini (100% → 12% → 6%), riducendo l'anticipo (*in-flight*) e quindi l'errore.

---

## 3. Calcoli di sizing (verificabili)

**Capacità silo.** Bulk density: Washed ≈ 720 kg/m³, Natural ≈ 680 kg/m³ (valori di letteratura per
verde, da confermare sul prodotto reale).

- Geometria: cilindro Ø1000 × 2000 mm = **1,571 m³** + cono 60° (h = 866 mm) = **0,227 m³** → **1,798 m³** geometrici.
- 1000 kg a 700 kg/m³ ≈ **1,43 m³** → riempimento ~79% del volume geometrico.
- **Conclusione:** i 1000 kg non sono il *massimo geometrico* (che sarebbe ~1250 kg) ma la **capacità
  configurata**; l'HMI mostra la percentuale su quella. Il franco residuo è necessario per polvere,
  espansione e non-trabocco. Se l'impianto reale carica fino a 985 kg, sta lavorando all'~79% del
  volume: coerente e prudente.

**Trasporto pneumatico (linea di carico).** Ipotesi: 3–4 t/h.

| Grandezza | 3 t/h | 4 t/h |
|---|---|---|
| Portata prodotto | 0,83 kg/s | 1,11 kg/s |
| Velocità di saltazione stimata (granella 6–8 mm) | ~15–18 m/s | ~15–18 m/s |
| Velocità di progetto (1,3× saltazione) | 20–23 m/s | 20–23 m/s |
| Rapporto di carico μ = ṁ_prodotto/ṁ_aria (target 4–6) | ~5 | ~5 |
| Portata d'aria necessaria | ~0,14 m³/s (8,3 m³/min) | ~0,19 m³/s (11 m³/min) |
| Diametro consigliato | **DN100** | **DN100** |
| Potenza soffiante (compressione isoterma 59,3→101,3 kPa, η 0,65) | **~6,8 kW** | **~9,0 kW** |

**Risultanze:**
- La linea principale va dimensionata **DN100**, non DN80: in DN80 servirebbero ~35 m/s, con usura,
  rottura dei chicchi e caduta di pressione eccessiva. *(Il P&ID è stato aggiornato con la nota.)*
- Una soffiante da **7,5 kW** copre **~3 t/h**. Per 4 t/h serve **11 kW**. Verificare la portata reale
  richiesta dalla torrefazione prima di confermare il modello.
- Regola operativa: **mai sotto 22 kPa** di vuoto in linea (sotto la saltazione il prodotto si deposita
  e intasa). È il vincolo implementato come interblocco nel simulatore.

**Linea di dosaggio.** Con EV-260 al 12%: ~0,095 kg/s (~340 kg/h); al 6%: ~0,048 kg/s.
Con ritardo di trasporto 0,8 s l'anticipo è ≈ 0,076 kg → risoluzione utile di dose **±0,05 kg**.
Senza valvola di regolazione, con sola valvola on/off, l'anticipo sarebbe ≈ 0,6 kg: **impossibile
dosare 5 kg a ±0,1 kg**. Questo è il motivo tecnico per cui EV-260 è necessaria (ed è il
comportamento verificato dai test del simulatore).

**Prestazione del ciclo (dai test del simulatore):** lotto da 50 kg in 3 componenti ≈ **158–174 s**,
scarto misurato ≤ 0,01 kg per componente nella seconda esecuzione (apprendimento attivo).

---

## 4. Strumentazione e filosofia di controllo

**Anelli e misure:**
- Peso silo (WT-201…WT-208): 3 celle sommate, classe III, 0,1 kg — per giacenza, scarico e inventario.
- Livello alto/basso per silo (LS-20xH / LS-20xL): interruttori a paletta o capacitivi, **indipendenti
  dal peso** — l'allarme di massimo è una barriera di sicurezza, non un calcolo.
- Vuoto di linea (PI-102) e ΔP filtro (PDT-103).
- Corrente soffiante (CT-01) e riferimento VFD (VFD-01).
- Peso tramoggia (WT-250) con 3 celle; posizione valvola di regolazione (EV-260-POS).
- Finecorsa di tutte le valvole pneumatiche (aperta/chiusa) — la logica non presume mai la posizione.

**Filosofia:**
- PLC + HMI; logica per assi (silo, linea di vuoto, pesa, lotto).
- **Interblocchi fondamentali:** una sola deviatrice aperta; una sola valvola di scarico silo aperta;
  caricamento inibito su livello alto; dosaggio inibito su livello basso; EV-250 apribile solo con
  valvole silo chiuse; blocco scarico se tramoggia torrefattrice piena; arresto trasporto su vuoto
  insufficiente; chiusura EV-101 e stop su guasto soffiante/rotativa.
- **Classi di allarme:** `WARNING` (avviso, ciclo prosegue), `ALARM` (ciclo sospeso), `FAULT`
  (guasto, richiede intervento), `CRITICAL` (emergenza). Un allarme di classe superiore prevale.
- **Tracciabilità:** ogni lotto genera un record con ricetta, operatore, timestamp, varietà, **lotto di
  origine** e peso reale per componente; report stampabile. Allineato a Reg. CE 178/2002
  (one-up / one-down) per la rintracciabilità alimentare.

---

## 5. Sicurezza, ambiente e conformità

- **ATEX polveri:** l'interno di silos, ciclone, filtro e tubazioni è **zona 22** (polvere di caffè
  verde è combustibile). Servono: pannelli di sfogo, filtro antistatico, **equipotenzialità** di silos,
  telaio e tubazioni, messa a terra < 10 Ω, divieto di accumulo polveri, utensili e apparecchi cat. 3D.
- **Sicurezza macchina:** IEC 60204-1; pulsante di emergenza a doppio canale su relè di sicurezza,
  categoria 3 / PL d; valvole in posizione di sicurezza in mancanza d'aria.
- **EMC:** VFD con filtro C2, cavo motore schermato, separazione potenza/segnali ≥ 200 mm.
- **Igiene/alimentare:** acciaio AISI 304 a contatto, superfici ispezionabili, ciclo di pulizia linea
  documentato (il "ciclo di pulizia filtro" con EV-104 va registrato nel log di lotto).

---

## 6. Punti aperti da verificare in campo

1. **Portata reale** richiesta dalla torrefazione (determina DN e potenza soffiante).
2. **I silos sono pesati o solo a livello?** (l'analisi deduce celle di carico: da confermare).
3. **PLC e HMI installati** (marca/modello, protocolli disponibili) per l'integrazione.
4. **Distanze e geometria** delle tubazioni (curve, dislivelli) per ricalcolare le perdite di carico.
5. **Classificazione ATEX** del sito e stato dei pannelli di sfogo esistenti.
6. **Capacità e interfaccia** della tramoggia torrefattrice (comunica un consenso di pieno?).
7. **Elenco varietà e lotti** correnti e significato dei codici interni (SD, M, R).
8. **Stato della marcatura CE** delle macchine esistenti e confine di fornitura.

---

## 7. Raccomandazioni di base

| # | Raccomandazione | Motivo |
|---|---|---|
| R1 | Linea di carico **DN100** (min. DN80 solo se ≤2 t/h) | velocità di trasporto e integrità del chicco |
| R2 | Soffiante **11 kW** se la portata target è 4 t/h | calcolo di compressione §3 |
| R3 | **EV-260** valvola di regolazione per il dosaggio fine | senza di essa non si ottiene ±0,1 kg su dosi piccole |
| R4 | **3 celle di carico per silo** (o radar + densità come ripiego) | coerenza con i pesi a 0,1 kg a display |
| R5 | **Interruttori di livello indipendenti** per l'allarme di massimo | barriera di sicurezza separata dalla misura di peso |
| R6 | **Apprendimento dell'anticipo** per silo/varietà in memoria PLC | compensa densità e usura, migliora col tempo |
| R7 | Equipotenzialità e pannelli di sfogo su tutti i volumi polveri | ATEX zona 22 |
| R8 | Log di pulizia filtro agganciato al lotto | igiene e tracciabilità |
