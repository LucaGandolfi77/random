# 04 — Piano progettuale
### GreenBatch GB-8S · dalla specifica alla messa in servizio

---

## 1. Struttura di scomposizione del lavoro (WBS)

| Fase | Attività | Output | Durata | Effort (PM*) |
|---|---|---|---|---|
| **A. Requisiti e rilievo** | sopralluogo, misura portate e distanze, elenco varietà, vincoli ATEX, requisiti IT | documento requisiti firmato, layout di massima | 3 sett. | 0,5 |
| **B. Ingegneria di base** | P&ID, dimensionamento trasporto, scelta soffiante/DN, filosofia di controllo, lista I/O | P&ID rev. A, lista I/O, specifiche | 3 sett. | 1,0 |
| **C. Ingegneria di dettaglio** | schemi elettrici, layout quadro, meccanica telaio e tubazioni, architettura software, DDL, wireframe HMI | pacchetto costruttivo completo | 5 sett. | 2,5 |
| **D. Approvvigionamento** | RFQ, ordini, verifica fornitori, collaudo in accettazione | materiali a bordo, certificati | 8 sett. (in parallelo) | 0,5 |
| **E. Costruzione e software** | montaggio quadro, cablaggio, sviluppo PLC + HMI + Trace, test in banco | quadro QGB-01, software v1.0, gemello digitale | 6 sett. | 2,0 |
| **F. FAT** | prove in fabbrica su protocollo: 20 lotti, accuratezza, sicurezza, allarmi | verbale FAT firmato | 1 sett. | 0,5 |
| **G. Installazione** | montaggio in campo, tubazioni, cablaggi, bonding ATEX | impianto installato | 3 sett. | 1,5 |
| **H. Messa in servizio** | taratura celle con pesi campione, prove SAT, formazione operatori e manutentori | verbale SAT, 2 sessioni formazione | 2 sett. | 1,0 |
| **I. Chiusura** | as-built, manuali, ricambi consigliati, passaggio in assistenza | dossier finale, garanzia 24 mesi | 1 sett. | 0,5 |
| **PM** | pianificazione, interfacce cliente, rischio, qualità | report bisettimanali | continuo | 1,5 |

\* PM = persona-mese. **Totale ≈ 11,5 PM tecnici + 1,5 PM di gestione.**

## 2. Cronoprogramma (26 settimane, T0 = firma ordine)

```
Settimana     1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
A Requisiti   ███
B Base           ███
C Dettaglio         █████
D Acquisti             ████████████
E Costruzione/Software       ████████████
F FAT                                   ███
G Installazione                            ██████
H Messa in serv.                                ████
I Chiusura                                         ██
PM            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
Milestone     M1 M2    M3        M4         M5     M6  M7   M8
```

| Milestone | Settimana | Criterio di superamento |
|---|---|---|
| M1 Requisiti congelati | 3 | documento firmato, portate e varietà confermate |
| M2 P&ID e lista I/O approvati | 6 | revisione cliente, nessuna richiesta aperta bloccante |
| M3 Pacchetto costruttivo completo | 11 | schemi, meccanica, software design consegnati |
| M4 Materiali a bordo | 16 | BOM completa, certificati verificati |
| M5 Software + quadro pronti | 20 | test in banco superati |
| M6 **FAT superato** | 21 | protocollo FAT firmato (accuratezza ±0,5%, sicurezza OK) |
| M7 Installazione completata | 24 | impianto energizzato, bonding verificato |
| M8 **SAT e handover** | 26 | 3 lotti reali conformi, formazione erogata, dossier consegnato |

## 3. Team e responsabilità (RACI sintetico)

| Ruolo | FTE di picco | A | R | C | I |
|---|---|---|---|---|---|
| Project manager | 1 | fasi, rischio, cliente | piano, report | — | team |
| Process engineer | 1 | P&ID, sizing | calcoli, specifiche | cliente | PM |
| Electrical engineer | 1 | schemi, ATEX | quadro, cavi, sicurezza | PM | cliente |
| Software engineer PLC | 1 | logica PLC | FB, sequencer, test | process | PM |
| Software engineer HMI/backend | 1 | HMI, API, DB | sviluppo, deploy | UX cliente | PM |
| Field technician | 2 | — | montaggio, cablaggi | elettrico | PM |
| Quality/HSE | 0,3 | FAT/SAT, conformità | verbali, dossier | tutti | PM |

## 4. Criteri di accettazione (estratto dal protocollo FAT/SAT)

1. **Accuratezza di dose:** 20 lotti consecutivi, ogni componente entro `max(0,5%, 0,1 kg)`; scarto
   medio del lotto ≤0,25%.
2. **Tempo ciclo:** lotto 50 kg ≤ 200 s (misurato dal simulatore: ~158–174 s).
3. **Interblocchi:** tutte le 12 condizioni di blocco verificate una per una, con esito registrato.
4. **Sicurezza:** test emergenza con misura dell'arresto; riarmo manuale; verifica posizione di
   sicurezza delle valvole in mancanza d'aria.
5. **Allarmi:** simulazione di guasto soffiante, filtro intasato, livello alto, sovraccarico pesa,
   timeout ciclo → verifica classe, messaggio, azione automatica e registrazione.
6. **Tracciabilità:** report di lotto con varietà, lotto di origine, pesi reali, operatore, timestamp;
   PDF con hash coerente al record in banca dati.
7. **Prestazioni HMI:** aggiornamento ≤250 ms, nessun blocco, login a ruoli verificato.
8. **Documentazione:** as-built, lista I/O aggiornata, manuali, registro tarature.

## 5. Registro dei rischi

| # | Rischio | P | I | Mitigazione | Owner |
|---|---|---|---|---|---|
| R1 | Portata reale superiore al previsto → soffiante sottodimensionata | M | A | rilievo in fase A, taglia 11 kW con margine, VFD per regolazione | Process |
| R2 | Silos non pesati (solo livello) → revisione strumentazione | M | A | verifica in fase A; ripiego radar + densità con accuratezza dichiarata | Process |
| R3 | Classificazione ATEX non conforme dei volumi esistenti | M | A | verifica HSE in fase A, kit sfogo/bonding in BOM | HSE |
| R4 | PLC/HMI esistenti con protocolli chiusi → integrazione difficile | M | M | gateway OPC UA, I/O hardwired come ripiego | Software |
| R5 | Lead time componenti (soffiante, valvole) oltre 8 settimane | M | M | ordini anticipati in fase B su specifica tecnica | PM |
| R6 | Tramoggia torrefattrice senza consenso di pieno | A | B | sensore di livello aggiuntivo LS-301H in fornitura | Elettrico |
| R7 | Resistenza del cliente al cambio di processo | M | M | formazione, modalità manuale di transizione, affiancamento 2 settimane | PM |
| R8 | Deriva di taratura delle celle nel tempo | A | M | verifica con pesi campione a 12 mesi, alert automatico su drift | Service |
| R9 | Perdita di dati di tracciabilità | B | A | backup notturno + report PDF firmati + retention 10 anni | Software |
| R10 | Infiltrazione polvere nel quadro | M | M | IP55, pressacavi IP68, filtro ventola, pulizia semestrale | Elettrico |

## 6. Qualità e documentazione

- **Piano qualità:** revisioni congelate per fase (A→I), nessuna modifica senza *change request*.
- **Gestione modifiche:** impatto su costo/tempi valutato entro 2 giorni lavorativi; approvazione cliente.
- **Documenti consegnati:** requisiti, P&ID, schemi elettrici, lista I/O, DDL, manuale HMI, manuale
  manutenzione, verbali FAT/SAT, dichiarazione CE, registro tarature, lista ricambi consigliati.
- **Codice:** repository Git, revisione a due paia d'occhi, test automatici (gemello digitale) in CI,
  rilascio versionato del software PLC/HMI con note di rilascio.

## 7. Assistenza post-vendita

| Pacchetto | Contenuto | Tempo di risposta |
|---|---|---|
| Base (incluso, 24 mesi) | garanzia ricambi, supporto telefonico/remoto in orario lavorativo | 2 giorni lavorativi |
| Service Plus (opzionale) | ispezione annuale, taratura celle, aggiornamenti software minori | 24 ore |
| Full Care | monitoraggio remoto KPI, manutenzione predittiva, ricambi in loco | 8 ore |

## 8. Budget di fase (calcolato da `tools/finance.js` su `data/bom.csv`)

| Voce | Costo per unità |
|---|---|
| A–C Ingegneria interna (4 PM) | € 36.000 |
| Materiali e costruzione: automazione, potenza, processo, strumentazione, meccanica | € 61.500 |
| Installazione, messa in servizio, FAT/SAT (BOM) | € 20.900 |
| Licenze software (Control + Trace + integrazione ERP) | € 19.800 |
| PM, qualità e conformità (1,8 PM) | € 16.650 |
| **Costo unitario completo** | **€ 154.850** |
| Prezzo di listino (sconto medio 6%) | € 219.000 → netto € 205.860 |
| **Margine di contribuzione** | **€ 51.010 (24,8% del prezzo netto)** |

> Assunzioni complete, P&L a 5 anni, break-even, NPV/IRR e analisi di sensibilità sono in
> `06-piano-finanziario.md`, generato dallo stesso modello.
