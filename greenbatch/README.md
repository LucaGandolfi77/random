# GreenBatch GB-8S
### Sistema di stoccaggio, dosaggio a lotti e tracciabilità per caffè verde

Riproduzione ingegneristica completa del sistema descritto nella specifica (banco di 8 silos,
trasporto pneumatico **in depressione**, ciclone con valvola rotativa, distribuzione con deviatrici,
tramoggia di pesa su 3 celle, scarico alla torrefattrice) con:

- **analisi di processo** verificata e con calcoli di dimensionamento;
- **simulatore SCADA/HMI funzionante** (gemello digitale, non un disegno);
- **mockup elettronico** con lista I/O reale, quadri, bilancio di potenza, lista cavi e BOM;
- **architettura software** con modello dati, API, macchina a stati e algoritmo di dosaggio;
- **piano progettuale, di marketing e finanziario** con numeri calcolati e riproducibili.

---

## Avvio rapido

```bash
node serve.js
# → simulatore:  http://localhost:4180/simulator/index.html
# → documenti:   http://localhost:4180/docs/
```

Nel simulatore:
1. premi **Soffiante BL-01**, **Rotativa M-101**, **Ghigliottina EV-101** (o avvia direttamente un lotto);
2. scegli una **ricetta** e premi **Avvia lotto**: guarda la sequenza GROSSOLANO → FINE → TOP-UP →
   SCARICO, con la pesa che insegue il target e il report di lotto in **Print**;
3. clicca un **silo** per comandarlo; prova **EMERGENZA** e il **riarmo**;
4. apri **Monitor I/O** per vedere i 107 tag in tempo reale e **Allarmi** per le classi di allarme.

## Verifiche automatiche

```bash
node test/plant.test.js   # 29 check: interblocchi, cicli di lotto, accuratezza, apprendimento, emergenza
node test/hmi.test.js     # 10 check: percorsi di rendering (iso, mimic, trend) su 4 stati d'impianto
node tools/export-io.js   # rigenera data/io-list.csv, io-modules.csv, plant-layout.json
node tools/finance.js     # rigenera P&L, NPV/IRR, sensitivity → data/financial-model.csv
```

Tutti i test sono verdi: accuratezza di dose misurata **±0,005 kg su 30 kg**, lotto da 50 kg in
**~158 s**, scarto stabile su lotti consecutivi.

---

## Mappa degli artefatti

| Percorso | Contenuto |
|---|---|
| `simulator/` | **Il simulatore**: HMI (vista isometrica 3D + mimic P&ID), motore di processo, ricette, allarmi, monitor I/O, report di lotto |
| `docs/01-analisi-processo.md` | Analisi a fondo: cosa è dato / dedotto / da verificare, calcoli di sizing, ATEX, punti aperti |
| `docs/02-architettura-software.md` | Mockup informatico: livelli, componenti, DDL, API, macchina a stati, apprendimento anticipo, sicurezza IEC 62443, roadmap |
| `docs/03-mockup-elettronico.md` | Mockup elettronico: architettura elettrica, bilancio di potenza, quadro, I/O, cavi, ATEX, conformità |
| `docs/04-piano-progettuale.md` | WBS, Gantt 26 settimane, milestone, team/RACI, criteri FAT/SAT, rischi, budget |
| `docs/05-piano-marketing.md` | Mercato, personas, posizionamento, concorrenza, gamma/prezzi, canali, lancio, KPI |
| `docs/06-piano-finanziario.md` | Costo unitario, unit economics, P&L 5 anni, sensitivity, fabbisogno (calcolato) |
| `diagrams/pid.svg` | P&ID con i tag reali dell'impianto |
| `diagrams/electrical.svg` | Schema elettrico unifilare (quadro QGB-01) |
| `diagrams/network.svg` | Architettura di rete OT/IT a zone (IEC 62443) |
| `data/bom.csv` | Distinta base con prezzi (input del modello finanziario) |
| `data/cable-list.csv` | Lista cavi con tipo, sezione, lunghezza |
| `data/io-list.csv` | 107 punti I/O con modulo e canale assegnati |
| `data/plant-layout.json` | Layout 3D, tubazioni, ricette (dal modello dati) |
| `data/financial-model.csv` | Output del modello finanziario |
| `tools/` · `test/` | Generatori (I/O, finanza) e test automatici |

---

## Risultanze tecniche principali

1. **La linea di carico va in DN100, non DN80.** A 3–4 t/h in DN80 servirebbero ~35 m/s: usura,
   rottura del chicco e perdite di carico eccessive. *(calcoli in `docs/01` §3)*
2. **La soffiante da 7,5 kW copre ~3 t/h; per 4 t/h servono 11 kW** (compressione isoterma
   59,3 → 101,3 kPa, η 0,65). Il simulatore usa 7,5 kW come dato di targa e 11 kW come raccomandazione.
3. **Serve una valvola di regolazione (EV-260) per il dosaggio fine.** Con la sola valvola on/off
   l'anticipo di trasporto (~0,6 kg) rende impossibile dosare 5 kg a ±0,1 kg: è il comportamento
   dimostrato dal simulatore e il motivo tecnico dell'aggiunta.
4. **I pesi a 0,1 kg a display implicano silos pesati** (3 celle per silo), non stimati da livello;
   gli interruttori di livello alto/basso restano come barriera di sicurezza indipendente.
5. **Capacità 1000 kg = setpoint configurato**, non massimo geometrico (1,798 m³ ⇒ ~1250 kg a
   700 kg/m³): l'81% di riempimento è coerente con franco polveri e sicurezza.
6. **Zona 22 polveri** su silos, ciclone, filtro e tubazioni: equipotenzialità, pannelli di sfogo,
   filtro antistatico, apparecchi cat. 3D.

## Numeri chiave del prodotto

| Grandezza | Valore |
|---|---|
| Costo unitario completo | € 154.850 |
| Prezzo di listino (GB-8S) | € 219.000 |
| Margine di contribuzione | € 51.010 (24,8%) |
| Break-even | 7 unità/anno |
| Payback cumulato | anno 2,45 |
| NPV @10% / IRR | € 510.013 / 57,3% |
| Finanziamento consigliato | € 244.986 |
| Accuratezza di dose (simulata) | ±0,005 kg su 30 kg |
| Tempo ciclo lotto 50 kg | ~158 s |

> Nota di trasparenza: la specifica di partenza è un modello dati + osservazioni sull'interfaccia.
> Le parti **dedotte** (es. silos pesati, significato dei codici varietà) sono etichettate come tali in
> `docs/01`; i valori di letteratura (densità, velocità di saltazione) vanno confermati con prove sul
> prodotto reale.
