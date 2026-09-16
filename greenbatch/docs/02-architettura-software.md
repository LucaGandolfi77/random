# 02 — Architettura software (mockup informatico)
### GreenBatch Control (HMI/SCADA) · GreenBatch Trace (lotti e tracciabilità)

---

## 1. Architettura a livelli

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ LIVELLO 4 — Enterprise                                                        │
│  ERP/MES (ordini, ricette master, anagrafica lotti)  ·  BI/OEE  ·  backup cloud│
└───────────────────────────────▲──────────────────────────────────────────────┘
                                │ OPC UA / REST (sola lettura+write ricette)
┌───────────────────────────────┴──────────────────────────────────────────────┐
│ LIVELLO 3 — Servizi (edge server, on-premise)                                 │
│  API REST · WebSocket live · Motore ricette · Traceability · Report PDF       │
│  TimescaleDB (trend) · PostgreSQL (lotti/ricette) · Redis (stato live)        │
└───────────────────────────────▲──────────────────────────────────────────────┘
                                │ OPC UA (subscription 250 ms) + store&forward
┌───────────────────────────────┴──────────────────────────────────────────────┐
│ LIVELLO 2 — Supervisione                                                      │
│  HMI panel PC (15") · GreenBatch Control (web, React) · login a ruoli         │
│  Postazione engineering (solo in modalità locale)                             │
└───────────────────────────────▲──────────────────────────────────────────────┘
                                │ PROFINET / OPC UA
┌───────────────────────────────┴──────────────────────────────────────────────┐
│ LIVELLO 1 — Controllo                                                         │
│  PLC (S7-1500 / ControlLogix) · FB_Silo · FB_Diverter · FB_VacuumLine          │
│  FB_Weigher · FB_Batch · FB_Alarm · FB_Trace · Safety (K1 cat.3 PL d)          │
└───────────────────────────────▲──────────────────────────────────────────────┘
                                │ 24 VDC · 4-20 mA · Modbus RTU
┌───────────────────────────────┴──────────────────────────────────────────────┐
│ LIVELLO 0 — Campo                                                             │
│  8× WT-20x (peso silo) · WT-250 + LC-01..03 · LS-20xH/L · LSL-151             │
│  PI-102 · PDT-103 · CT-01 · EV/DV (18+ solenoidi) · VFD-01 · M-101            │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Componenti software

| Componente | Tecnologia | Responsabilità |
|---|---|---|
| `gb-plc` | SCL/LAD (TIA Portal) o ST (Studio 5000) | Logica di processo, interblocchi, sicurezza, sequencer di lotto, apprendimento anticipo |
| `gb-gateway` | Node.js + node-opcua | Sottoscrizione tag, normalizzazione, store-and-forward se il server è offline |
| `gb-api` | Node.js (Fastify) o Python (FastAPI) | REST per ricette/lotti/report, validazione, RBAC, audit log |
| `gb-live` | WebSocket (ws) | Push stato live 4 Hz verso HMI e client remoti |
| `gb-trace` | Worker + PostgreSQL | Ricette, lotti, componenti, varietà, lotti di origine, report |
| `gb-trend` | TimescaleDB | Storico tag (1 s), compressione, retention 24 mesi |
| `gb-report` | Puppeteer/PDFKit | Report di lotto PDF firmato (hash) per tracciabilità |
| `gb-hmi` | React + Vite + TypeScript | Interfaccia operatore: mimic, isometrico, SCALE, allarmi, ricette |
| `gb-notify` | SMTP/webhook | Notifica allarmi e fine lotto (opzionale) |

> Il **simulatore in `simulator/`** è la versione dimostrativa senza dipendenze: stessa logica di
> processo, stesso modello tag, stessa HMI — usato come **gemello digitale** per test e formazione.

## 3. Modello dati (DDL essenziale)

```sql
CREATE TABLE varieties (            -- anagrafica caffè verde
  id            TEXT PRIMARY KEY,   -- 'BR-SD-17/18'
  name          TEXT NOT NULL,      -- 'Brazil SD'
  process       CHAR(1) NOT NULL CHECK (process IN ('W','N')),
  origin        TEXT, grade TEXT,
  density_kgm3  NUMERIC(6,1) DEFAULT 700,
  flow_factor   NUMERIC(4,3) DEFAULT 1.0   -- taratura dosaggio per varietà
);

CREATE TABLE lots (                 -- lotti fisici in silo (tracciabilità)
  id          TEXT PRIMARY KEY,     -- 'L-2402'
  variety_id  TEXT REFERENCES varieties(id),
  supplier    TEXT, received_at TIMESTAMPTZ, kg_received NUMERIC(9,2),
  silo_id     TEXT, kg_remaining NUMERIC(9,2)
);

CREATE TABLE silos (
  id TEXT PRIMARY KEY, capacity_kg NUMERIC(9,2),
  high_pct NUMERIC(4,1) DEFAULT 97, low_pct NUMERIC(4,1) DEFAULT 8
);

CREATE TABLE recipes (
  id TEXT PRIMARY KEY, name TEXT, batch_kg NUMERIC(9,2),
  tolerance_pct NUMERIC(4,2) DEFAULT 0.5, active BOOLEAN DEFAULT TRUE
);
CREATE TABLE recipe_components (
  recipe_id TEXT REFERENCES recipes(id), silo_id TEXT, variety_id TEXT,
  kg NUMERIC(9,2), seq INT, PRIMARY KEY (recipe_id, seq)
);

CREATE TABLE batches (
  id TEXT PRIMARY KEY, recipe_id TEXT, operator TEXT,
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, status TEXT,
  target_kg NUMERIC(9,2), actual_kg NUMERIC(9,2),
  dest_roaster TEXT, report_hash TEXT
);
CREATE TABLE batch_components (
  batch_id TEXT REFERENCES batches(id), seq INT,
  silo_id TEXT, variety_id TEXT, lot_id TEXT,
  target_kg NUMERIC(9,2), actual_kg NUMERIC(9,3), delta_kg NUMERIC(9,3),
  verdict TEXT, inflight_used NUMERIC(6,3),
  PRIMARY KEY (batch_id, seq)
);

CREATE TABLE alarms (
  id BIGSERIAL PRIMARY KEY, code TEXT, tag TEXT, cls TEXT,
  raised_at TIMESTAMPTZ, acked_at TIMESTAMPTZ, acked_by TEXT,
  cleared_at TIMESTAMPTZ, text TEXT
);
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ DEFAULT now(),
  actor TEXT, role TEXT, action TEXT, target TEXT, detail JSONB
);
CREATE TABLE tags_history (          -- hypertable TimescaleDB
  ts TIMESTAMPTZ NOT NULL, tag TEXT NOT NULL, value DOUBLE PRECISION
);
```

## 4. Contratti API (estratto)

```http
GET  /api/v1/state                 → stato impianto (silos, pesa, allarmi) [live]
GET  /api/v1/silos                 → giacenze, varietà, lotti
GET  /api/v1/recipes               → ricette attive
POST /api/v1/batches               → { "recipe_id": "RCP-ESP-01", "operator": "OP-01" }
GET  /api/v1/batches/{id}          → dettaglio + componenti + esiti
GET  /api/v1/batches/{id}/report   → PDF firmato (hash SHA-256 in DB)
POST /api/v1/alarms/{id}/ack
GET  /api/v1/trends?tags=WT-250,PI-102&from=…&to=…
WS   /ws/live                      → push 4 Hz: { state, alarms, batch }
```

Mappatura tag ↔ OPC UA: `ns=2;s=GB.G1.WT` (peso silo), `ns=2;s=GB.BL01.VAC` (vuoto),
`ns=2;s=GB.WH250.WT` (pesa), `ns=2;s=GB.BATCH.STATE` (macchina a stati del lotto).

## 5. Logica di dosaggio: macchina a stati e apprendimento

**Macchina a stati del lotto** (implementata identica nel PLC e nel simulatore):

```
IDLE ──avvio──► COARSE ──resto<max(3·inflight,15%)──► FINE ──resto≤inflight──► SETTLE
                   ▲                                     │                       │
                   │                                     └───(scarto<−tol)──► TOPOFF
                   │                                                             │
                   └──────────────(verifica OK, prossimo componente)─────────────┘
                                                   │ (ultimo componente)
                                                   ▼
                                              DISCHARGE ──pesa≈0──► DONE
```

**Anticipo adattativo (in-flight learning).** Il materiale già in volo nella tubazione continuerà ad
arrivare dopo la chiusura della valvola; se non lo si compensa, ogni dose è sistematicamente corta.

```text
// per ciascun silo/varietà, memoria non volatile nel PLC
inflight[silo] ← 0.08 kg                      // iniziale: ṁ_fine × t_trasporto
...
FINE:   chiudi quando  rimanente ≤ inflight[silo]
SETTLE: attendi stabilità (t = 1.2 s) e tubazione vuota
VERIFY: delta = dose_reale − dose_target
        se delta < −tolleranza  e tentativi < 3 → TOPOFF (valvola al 6%)
        altrimenti:
            inflight[silo] ← clamp(inflight[silo] + 0.35 × delta, 0.02, 3.0)
            esito = |delta| ≤ tolleranza
```

Tolleranza: `max(0,5% · target, 0,1 kg)`. Il test automatico sul simulatore verifica che lo scarto
scenda sotto **0,01 kg** già al primo lotto e resti stabile (vedi `test/plant.test.js`).

## 6. HMI — wireframe

**Overview (schermata principale)**
```
┌ Green │ Alarms │ Login │ Print ─────────── AUTO │ 14:32:07 │ Allarmi 3 │ [EMERGENZA] ┐
│ ┌── Vista impianto (isometrico 3D / mimic P&ID) ─────┐ ┌── SCALE ────────────────┐ │
│ │   G1 G2 G3 G4 G5 G6 G7 G8  con livelli e allarmi   │ │ Actual  +30.0 Kg        │ │
│ │   ciclone · filtro · soffiante · flussi animati    │ │ Target  +50.0 Kg        │ │
│ │                                                    │ │ [ FINE ]   LC1/2/3      │ │
│ └────────────────────────────────────────────────────┘ └─────────────────────────┘ │
│ ┌── Banco silos (8 schede, semaforo W/N, % , kg) ────┐ ┌── Lotto / ricetta ──────┐ │
│ ┌── Trend 180 s (vuoto, peso, corrente, ΔP) ─────────┐ ┌── Allarmi attivi ───────┐ │
│ ┌── Monitor I/O (107 tag live) ──────────────────────┐ ┌── Eventi/tracciabilità ─┐ │
```

**Altre schermate:** dettaglio silo (celle, giacenza, storico carichi), editor ricette (componenti,
tolleranze, sequenza), storico lotti con filtro per data/varietà/operatore, diagnostica (tempi di
manovra valvole, drift celle), report di lotto.

## 7. Sicurezza informatica (IEC 62443)

| Controllo | Implementazione |
|---|---|
| Zone e condotti | 4 zone: Enterprise / DMZ / OT / Campo (vedi `diagrams/network.svg`) |
| Accesso | RBAC: operatore (lotti, comandi), supervisore (+ricette), manutentore (diagnostica), admin (impianto) |
| Autenticazione | locale + opzionale AD/LDAP; password policy; blocco dopo 5 tentativi |
| Audit | ogni comando e modifica ricetta in `audit_log` (chi, cosa, quando, prima/dopo) |
| Rete | nessun accesso Internet dall'OT; solo OPC UA in uscita verso DMZ; VPN con MFA per manutenzione |
| Integrità | report PDF con hash SHA-256; backup notturno PLC+HMI+DB; test di ripristino semestrale |
| Hardening | porte inutili chiuse, firmware firmato, USB bloccate in produzione |

## 8. Deployment e esercizio

```yaml
# docker-compose.yml (edge server, on-premise)
services:
  api:      { image: greenbatch/api:1.0, ports: ["8080:8080"], env_file: .env }
  live:     { image: greenbatch/live:1.0 }
  gateway:  { image: greenbatch/gateway:1.0, network_mode: host }   # OPC UA verso PLC
  db:       { image: timescale/timescaledb:latest, volumes: ["gbdata:/var/lib/postgresql/data"] }
  report:   { image: greenbatch/report:1.0 }
volumes: { gbdata: {} }
```

- **Requisiti:** edge server fanless, 4 core, 16 GB RAM, SSD 256 GB, UPS; rete OT separata.
- **Disponibilità:** se il server cade, il PLC **continua** a dosare con le ricette già scaricate
  (modalità degradata); al ritorno il gateway ricarica i lotti in coda (store-and-forward).
- **Retention:** tag 1 s per 24 mesi (compressione Timescale), lotti e report **10 anni** (alimentare).

## 9. Strategia di test

| Livello | Metodo | Cosa copre |
|---|---|---|
| Unit | Jest/Vitest sul motore di dosaggio, Pytest sull'API | macchina a stati, apprendimento, tolleranze |
| **Gemello digitale** | `simulator/` + `test/plant.test.js`, `test/hmi.test.js` | interblocchi, allarmi, cicli di lotto, regressioni |
| Integrazione | OPC UA simulator (SoftPLC) | gateway, store-and-forward, riconnessione |
| HIL | PLC reale + IO simulati | tempi di manovra valvole, sicurezza |
| FAT | protocollo firmato in fabbrica | 20 lotti di prova, accuratezza ±0,5%, tempi ciclo |
| SAT | protocollo in campo | prove con prodotto reale, taratura celle con pesi campione |

## 10. Roadmap di prodotto software

| Release | Contenuto | Valore per il cliente |
|---|---|---|
| **v1.0 (MVP)** | HMI, ricette, dosaggio, allarmi, report lotto, monitor I/O | sostituisce il dosaggio manuale, tracciabilità di base |
| **v1.5** | Integrazione ERP (ricette master, ordini), OEE, trend avanzati | meno data entry, costi per lotto |
| **v2.0** | Manutenzione predittiva (corrente soffiante, ΔP filtro, drift celle), pianificazione silos | fermi macchina ridotti |
| **v2.5** | Ottimizzatore di miscela (costi/qualità, disponibilità silos) | margine per lotto |
| **v3.0** | Modelli predittivi (resa in tostatura per varietà), assistente AI operatore | qualità e riduzione scarti |
