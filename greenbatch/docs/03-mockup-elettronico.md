# 03 — Mockup elettronico ed elettrico
### GreenBatch GB-8S · quadro QGB-01 · 400/230 V 50 Hz + comando 24 VDC

> Riferimenti: `diagrams/electrical.svg` (unifilare), `diagrams/network.svg` (rete OT/IT),
> `data/io-list.csv` (107 punti I/O), `data/io-modules.csv` (riepilogo moduli),
> `data/cable-list.csv` (lista cavi), `data/bom.csv` (distinta base con costi).

---

## 1. Architettura elettrica

| Livello | Tensione | Contenuto |
|---|---|---|
| Potenza | 400 V 3F + N + PE | VFD soffiante, motoriduttore valvola rotativa, ausiliari |
| Comando | 24 VDC | PLC e I/O, solenoidi valvole, sensori, HMI |
| Sicurezza | 24 VDC doppio canale | emergenza, relè di sicurezza K1, consenso contattori ed elettrovalvole |
| Segnali | 4-20 mA / 0-10 V / RS-485 | vuoto, ΔP filtro, corrente, posizione EV-260, pesi via Modbus |

**Catena di sicurezza (cat. 3 / PL d, IEC 60204-1):** due pulsanti di emergenza a doppio canale
(quadro + campo) → relè di sicurezza K1 → diseccita KM1 (rotativa), l'abilitazione del VFD e
l'alimentazione delle elettrovalvole (le valvole vanno in posizione di sicurezza per mancanza d'aria).
Lo stato `ESTOP-01/01-B`, `MODE-LOCAL` (selettore locale/remoto) e `PANEL-DOOR` sono in catena.
**Il riarmo è sempre manuale** (pulsante di riarmo + reset allarme da HMI), mai automatico.

## 2. Bilancio di potenza

| Carico | Potenza | Corrente | Note |
|---|---|---|---|
| Soffiante BL-01 (motore 11 kW, 400 V) | 11 kW installati, ~9,5 kW assorbiti | ~18,5 A | 7,5 kW / ~14,6 A se portata ≤3 t/h |
| Valvola rotativa M-101 (0,55 kW) | 0,55 kW | ~1,5 A | marcia continua durante il trasporto |
| Ausiliari (pulse filtro, beacon) | 0,15 kW | ~0,7 A | intermittenti |
| **Totale potenza** | **~11,7 kW installati / ~10,2 kW assorbiti** | — | feeder consigliato 25 A curva D |
| 24 VDC: PLC + I/O | ~25 W | 1,05 A | rack 12 moduli |
| 24 VDC: solenoidi valvole (20 uscite, 3 W) | ~60 W (picco ~110 W in spunto) | 2,5–4,6 A | bistabili, impulso breve |
| 24 VDC: HMI panel PC | 30 W | 1,25 A | — |
| 24 VDC: strumentazione (9 trasmettitori, sensori) | ~55 W | 2,3 A | — |
| **Totale 24 VDC** | **~170 W (picco ~230 W)** | **~7,1 A (picco 9,6 A)** | alimentatore **10 A** con UPS 24 V 7 Ah → **≥30 min** di autonomia su HMI+PLC |

Protezioni: QF1 32 A (generale), QF2 20 A curva D (VFD, con differenziale tipo B se richiesto),
QF3 6 A (rotativa), QF4 4 A (24 V), QF5 6 A (HMI/rete), QF6 4 A (ausiliari). Scaricatori di
sovratensione tipo 2 in ingresso.

## 3. Quadro QGB-01 — disposizione frontale

```
┌──────────────────────────────────────────────────────────────────────────┐
│  QGB-01 · 800×600×300 · IP55 · doppia porta · termostato + resistenza     │
│ ┌───────────────────────────┬──────────────────────────────────────────┐ │
│ │ QF1  QF2  QF3  QF4 QF5 QF6 │  SPD tipo 2 · morsettiera ingresso L1L2L3NPE│
│ ├───────────────────────────┴──────────────────────────────────────────┤ │
│ │ VFD-01 11 kW (dissipazione forzata, filtro EMC C2)                    │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │ PS1 24 V 10 A  +  UPS 24 V 7 Ah  +  modulo di diagnostica batteria     │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │ Rack PLC: PS │ CPU 1512SP │ DI×4 │ DQ×3 │ AI │ AQ │ CM PtP │ K1 safety │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │ Isola valvole 20 uscite + relè di rinvio + fusibili 2 A per gruppo     │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │ Morsettiere: DI (56) · DQ (33) · AI/AQ (6) · RS-485 (9) · PE/schermi    │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│  Passacavi inferiori IP68 · targhette per ogni conduttore · schema a bordo │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4. Punti I/O — riepilogo

| Tipo | Punti | Moduli | Modello di riferimento |
|---|---|---|---|
| DI (24 VDC) | 56 | 4 | DI 16×24VDC (6ES7131-6BH01-0BA0) |
| DQ (24 VDC, 0,5 A) | 33 | 3 | DQ 16×24VDC/0,5A (6ES7132-6BH01-0BA0) |
| AI (4-20 mA, 0-10 V) | 4 | 1 | AI 8×I (6ES7134-6GF00-0AA1) |
| AQ | 2 | 1 | AQ 4×I (6ES7135-6HD00-0BA1) |
| Modbus RTU (pesi) | 12 nodi | 1 | CM PtP (6ES7137-6AA01-0BA0) |
| **Totale** | **107** | **10** | + CPU 1512SP-1 PN |

Riserva: ~12% DI, ~48% DQ, 50% AI — sufficiente per estensioni (es. secondo banco silos o
strumentazione aggiuntiva).

**Modbus RTU (9600 8E1, RS-485):** 8 × `WT-20x` (peso silo), `WT-250` (pesa), diagnostica celle.
Terminazione 120 Ω ai due estremi, schermo collegato solo lato quadro, indirizzi 1–12.

## 5. Cavidotti e segregazione

Vedi `data/cable-list.csv`. Regole applicate:

- Analogiche e RS-485 in **cavo schermato a coppie**, schermo a terra **solo lato quadro**.
- Cavo motore VFD schermato, con filtro EMC C2 e distanza ≥200 mm dai segnali.
- Percorsi separati: potenza, comando 24 V, segnali.
- Tutti i passaggi con pressacavi IP68; nessun ingresso dall'alto (polvere).
- Marcatura di ogni conduttore e targhetta su ogni valvola (a corredo dell'as-built).

## 6. Messa a terra, equipotenzialità e ATEX

- Barra PE di quadro; **R < 10 Ω** verso terra; equipotenzialità di silos, telaio, tubazioni, ciclone,
  filtro con conduttori ≥6 mm² e resistenza di collegamento **< 0,1 Ω**.
- Interno silos/ciclone/filtro = **zona 22** (polvere di caffè combustibile):
  apparecchi cat. **3D**, filtro antistatico, pannelli di sfogo, divieto di accumulo polveri.
- Nessuna giunzione nuda all'interno dei volumi; verifiche periodiche documentate.

## 7. Conformità

| Norma | Ambito |
|---|---|
| IEC 60204-1 | equipaggiamento elettrico delle macchine |
| IEC 61439-1/2 | quadri di distribuzione e comando |
| 2014/35/UE (LVD) · 2014/30/UE (EMC) | sicurezza elettrica ed emissioni |
| 2014/34/UE (ATEX) | atmosfere esplosive — zona 22 polveri |
| 2006/42/CE (Direttiva Macchine) | se l'insieme costituisce una quasi-macchina/macchina |
| IEC 62443 | sicurezza informatica dei sistemi di automazione (zone/condotti) |
| CEI 0-16 / CEI 64-8 | connessione alla rete e impianti utilizzatori |

**Documentazione a corredo:** schemi as-built (IEC 61082/81346), distinta materiali, lista I/O,
verbali FAT/SAT, dichiarazione di conformità, manuale d'uso e manutenzione, registro tarature celle.

## 8. Manutenzione elettrica consigliata

| Attività | Frequenza | Nota |
|---|---|---|
| Verifica serraggi morsettiere di potenza | 12 mesi | termografia consigliata |
| Test catena di sicurezza (emergenza, riarmo) | 6 mesi | verbale firmato |
| Pulizia filtri ventole quadro e VFD | 6 mesi | ambiente polveroso |
| Sostituzione batteria UPS | 36–48 mesi | test autonomia annuale |
| Taratura celle di carico con pesi campione | 12 mesi | classe III, verbale |
| Verifica equipotenzialità e pannelli di sfogo | 12 mesi | ATEX |
