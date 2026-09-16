# 06 — Piano finanziario
### GreenBatch GB-8S · modello calcolato da `tools/finance.js` su `data/bom.csv`

> Riproducibile: `node tools/finance.js` → stampa le tabelle e rigenera
> `data/financial-model.csv`. Tutti gli importi sono in euro, IVA esclusa.

---

## 1. Assunzioni del modello

| Assunzione | Valore | Nota |
|---|---|---|
| Prezzo di listino GB-8S | € 219.000 | listino; GB-4S € 149k, GB-16S € 329k |
| Sconto medio di trattativa | 6% | prezzo netto € 205.860 |
| Unità vendute (anni 1–5) | 4 · 7 · 11 · 14 · 16 | = 52 unità cumulate |
| Costo unitario completo | € 154.850 | BOM € 102.200 + ingegneria/PM interni € 52.650 |
| Contratti di servizio | 85% del parco, € 9.800/anno | costo di erogazione 45% |
| Accantonamento garanzia | 1,5% dei ricavi unità | 24 mesi di garanzia |
| Costi fissi (anno 1 → 5) | R&S 90→160k · Sales 70→185k · G&A 55→120k | — |
| CAPEX iniziale (anno 0) | € 180.000 | prototipo, certificazioni, unità dimostrativa |
| Ammortamento | 5 anni, quote costanti | — |
| Aliquota fiscale effettiva | 27,9% | IRES 24% + IRAP ~3,9% |
| Tasso di sconto (NPV) | 10% | — |

## 2. Costo unitario (dalla distinta base reale)

| Categoria | Costo |
|---|---|
| Installazione (montaggio, cablaggio, collaudo, formazione) | € 20.900 |
| Software (Control + Trace + integrazione ERP) | € 19.800 |
| Processo (valvole, filtro, ciclone) | € 14.730 |
| Strumentazione (celle, trasmettitori, livelli, sensori) | € 12.630 |
| Meccanica (telaio, tubazioni AISI304) | € 12.400 |
| Potenza (VFD, soffiante, rotativa, ghigliottina) | € 10.930 |
| Automazione (PLC, I/O, sicurezza, HMI, quadro) | € 10.810 |
| **Totale BOM** | **€ 102.200** |
| Ingegneria e gestione interne | € 52.650 |
| **Costo unitario completo** | **€ 154.850** |

## 3. Unit economics

| Voce | Valore |
|---|---:|
| Prezzo di listino | € 219.000 |
| Prezzo netto (sconto 6%) | € 205.860 |
| Costo unitario | € 154.850 |
| **Margine di contribuzione** | **€ 51.010 (24,8%)** |
| Break-even a costi fissi di regime (anno 3) | **7 unità/anno** |
| Payback cumulato (con CAPEX iniziale) | **anno 2,45** |
| NPV @10% su 5 anni | **€ 510.013** |
| IRR | **57,3%** |

**Lettura:** ogni unità venduta copre i costi variabili e contribuisce con ~€51k ai costi fissi.
Con i costi fissi dell'anno 3 (€350k), servono **7 macchine/anno** per l'equilibrio operativo; il
piano prevede 11 unità nell'anno 3, quindi con margine di sicurezza del 57%.

## 4. Conto economico previsionale (5 anni)

| Voce | Anno 1 | Anno 2 | Anno 3 | Anno 4 | Anno 5 |
|---|---:|---:|---:|---:|---:|
| Unità vendute | 4 | 7 | 11 | 14 | 16 |
| Parco installato | 4 | 11 | 22 | 36 | 52 |
| Ricavi unità | € 823k | € 1.441k | € 2.264k | € 2.882k | € 3.294k |
| Ricavi servizi | € 33k | € 92k | € 183k | € 300k | € 433k |
| **Ricavi totali** | **€ 857k** | **€ 1.533k** | **€ 2.448k** | **€ 3.182k** | **€ 3.727k** |
| Costi variabili | € 647k | € 1.147k | € 1.820k | € 2.346k | € 2.722k |
| Margine lordo | € 210k | € 386k | € 628k | € 836k | € 1.005k |
| R&S | € 90k | € 110k | € 130k | € 150k | € 160k |
| Vendite e marketing | € 70k | € 95k | € 130k | € 160k | € 185k |
| G&A | € 55k | € 70k | € 90k | € 105k | € 120k |
| **EBITDA** | **€ −5k** | **€ 111k** | **€ 278k** | **€ 421k** | **€ 540k** |
| Ammortamenti | € 36k | € 36k | € 36k | € 36k | € 36k |
| EBIT | € −41k | € 75k | € 242k | € 385k | € 504k |
| Imposte | € 0k | € 21k | € 68k | € 107k | € 141k |
| **Utile netto** | **€ −41k** | **€ 54k** | **€ 174k** | **€ 277k** | **€ 363k** |
| Cash flow operativo | € −5k | € 90k | € 210k | € 313k | € 399k |

**Cassa cumulata:** anno 0 € −180k → anno 1 € −185k → anno 2 € −95k → anno 3 **€ +115k** →
anno 4 € +429k → anno 5 € +828k.

**Lettura:** il primo anno è di investimento (EBITDA sostanzialmente in pareggio, −5k), l'utile netto
diventa positivo dal **secondo anno** e il cash flow cumulato cambia segno nel **corso dell'anno 3**.

## 5. Analisi di sensibilità (EBITDA anno 3)

| Scenario | EBITDA | Δ vs base |
|---|---:|---:|
| Base (11 unità) | € 278k | — |
| Volumi −30% (8 unità) | € 120k | € −158k |
| Volumi +30% (14 unità) | € 435k | +€ 158k |
| Prezzo −10% | € 55k | € −223k |
| Prezzo +10% | € 501k | +€ 223k |
| BOM +10% (inflazione, cambio) | € 166k | € −112k |
| BOM −10% (accordi quadro fornitori) | € 390k | +€ 112k |

**Il modello è più sensibile al prezzo che ai volumi.** Una riduzione del 10% sul prezzo dimezza
l'EBITDA dell'anno 3 (−80%): la leva commerciale principale è **difendere il prezzo**, non inseguire
il volume. Contromisure: listino con optional a valore (integrazione ERP, secondo banco), sconti solo
in cambio di volumi pluriennali o casi studio, e **service** come ammortizzatore ricorrente.

## 6. Fabbisogno finanziario

| Voce | Importo |
|---|---:|
| CAPEX iniziale (anno 0) | € 180.000 |
| Cassa minima nel periodo | −€ 184.986 |
| **Finanziamento consigliato** | **€ 244.986** (cassa minima + €60k di margine) |

Copertura ipotizzata: 40% capitale proprio, 60% finanza agevolata/bancaria (strumenti per
digitalizzazione e PMI manifatturiere, tasso ipotizzato 5%, 5 anni → rata ~€ 2.800/mese, sostenibile
già dal secondo anno con EBITDA € 111k).

## 7. Indicatori di monitoraggio

| KPI finanziario | Target | Soglia di allarme |
|---|---|---|
| Margine di contribuzione | ≥ 24% | < 20% |
| CAC | ≤ € 18.000 | > € 25.000 |
| Quota ricavi ricorrenti (anno 5) | ≥ 12% | < 6% |
| Puntualità incassi (DSO) | ≤ 60 giorni | > 90 giorni |
| Scostamento BOM consuntivo vs preventivo | ≤ 5% | > 10% |
| Break-even unità/anno | ≤ 7 | > 9 |

## 8. Rischi finanziari

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Aumento costi componenti (elettronica, acciaio) | margine | accordi quadro, clausola di revisione prezzo, indicizzazione |
| Ritardo incassi su clienti esteri | cassa | lettera di credito, anticipo 30% / SAL 40% / saldo 30% |
| Sottostima ore di installazione in campo | margine | consuntivazione per fase, buffer 10% in offerta |
| Sovraccapacità di engineering | tempi | progetto standardizzato, libreria di blocchi riusabili |
| Dipendenza da pochi OEM | ricavi | canale diretto + dealer (marketing §6) |

## 9. Come rigenerare il modello

```bash
node tools/export-io.js    # aggiorna lista I/O e layout
node tools/finance.js      # ricalcola P&L, NPV/IRR, sensitivity → data/financial-model.csv
```

Modificando `data/bom.csv` (prezzi fornitori), `A.units` o `A.listPrice` in `tools/finance.js`,
tutte le tabelle di questo documento si aggiornano coerentemente.
