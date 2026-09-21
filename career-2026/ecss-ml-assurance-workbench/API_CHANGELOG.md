# API Changelog

Tutte le modifiche significative all'API del ECSS ML Assurance Workbench vengono documentate qui.

Formato basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/).

---

## [1.0.0-rc.1] - 2026-09-21

### Aggiunto

#### Health Endpoints
- `GET /api/health` - Health check completo con stato database
- `GET /api/health/live` - Liveness probe per Kubernetes
- `GET /api/health/ready` - Readiness probe con dipendenze
- `GET /api/version` - Versione tool e analyzer

#### Projects CRUD
- `POST /api/projects` - Crea nuovo progetto
- `GET /api/projects` - Lista tutti i progetti
- `GET /api/projects/{id}` - Dettaglio progetto
- `PATCH /api/projects/{id}` - Aggiorna progetto
- `DELETE /api/projects/{id}` - Elimina progetto

#### Dataset Management
- `POST /api/projects/{id}/datasets` - Upload CSV (max 50MB)
- `GET /api/projects/{id}/dataset` - Metadata dataset attivo
- `GET /api/projects/{id}/dataset/preview` - Preview (max 500 righe)
- `DELETE /api/projects/{id}/dataset` - Elimina dataset

#### Analysis Configuration
- `GET /api/projects/{id}/config` - Ottieni configurazione
- `PUT /api/projects/{id}/config` - Aggiorna configurazione

#### Data Readiness Analysis
- `POST /api/projects/{id}/analysis` - Esegui analisi
- `GET /api/projects/{id}/analysis/latest` - Ultima analisi
- `GET /api/analysis/{run_id}` - Dettaglio analisi
- `GET /api/analysis/{run_id}/score` - Score di readiness (0-100)
- `GET /api/analysis/{run_id}/findings` - Lista findings con filtri

#### Reports
- `POST /api/analysis/{run_id}/report` - Genera report JSON
- `GET /api/projects/{id}/reports` - Lista report progetto
- `GET /api/reports/{id}` - Contenuto report
- `GET /api/reports/{id}/download` - Download report JSON

#### Audit Trail
- `GET /api/audit` - Log audit globale
- `GET /api/projects/{id}/audit` - Log audit progetto

#### Portfolio Management
- `GET /api/portfolio/projects` - Lista progetti portfolio
- `GET /api/portfolio/projects/summary` - Riepilogo progetti
- `GET /api/portfolio/projects/{id}` - Dettaglio progetto
- `GET /api/portfolio/projects/{id}/requirements` - Requisiti
- `GET /api/portfolio/projects/{id}/traceability` - Matrice tracciabilità
- `GET /api/portfolio/projects/{id}/evidence` - Evidenze
- `GET /api/portfolio/projects/{id}/tests` - Test e coverage
- `GET /api/portfolio/projects/{id}/fmea` - Analisi FMEA/FMECA
- `GET /api/portfolio/projects/{id}/risks` - Rischi
- `GET /api/portfolio/projects/{id}/limitations` - Limitazioni
- `GET /api/portfolio/projects/{id}/deployment-decision` - Decisione deployment
- `GET /api/portfolio/projects/{id}/monitoring` - Stato monitoring
- `GET /api/portfolio/projects/{id}/odd` - Operational Design Domain
- `GET /api/portfolio/projects/{id}/completeness` - Completezza package

#### Evidence Packages
- `GET /api/portfolio/projects/{id}/evidence-packages` - Lista package
- `POST /api/portfolio/projects/{id}/evidence-packages` - Genera package
- `GET /api/portfolio/evidence-packages/{id}/download` - Download ZIP
- `POST /api/portfolio/evidence-packages/{id}/verify` - Verifica integrità
- `GET /api/portfolio/meta/completeness-categories` - Categorie completezza

#### Assurance Registry
- `GET /api/assurance/projects` - Lista progetti assurance
- `GET /api/assurance/projects/summary` - Riepilogo
- `GET /api/assurance/projects/{id}` - Dettaglio progetto
- `GET /api/assurance/artefact-types` - Tipi artefatti disponibili
- `POST /api/assurance/projects/{id}/evidence-packages` - Genera package
- `GET /api/assurance/evidence-packages/{id}/download` - Download package

#### Assurance Engine (Week 5)
- `GET /api/assurance-engine/projects/{id}/gaps` - Analisi gap (26 regole)
- `GET /api/assurance-engine/projects/{id}/traceability-issues` - Problemi tracciabilità
- `GET /api/assurance-engine/projects/{id}/dimensions` - 15 dimensioni assurance
- `GET /api/assurance-engine/projects/{id}/deployment-gate` - Valutazione gate deployment
- `GET /api/assurance-engine/projects/{id}/monitoring` - Readiness monitoring
- `POST /api/assurance-engine/projects/{id}/assurance-report` - Genera report assurance
- `POST /api/assurance-engine/evidence-packages/{id}/validate` - Validazione completa package

#### Continuous Assurance (Week 7)
- `POST /api/continuous/projects/{id}/ingest` - Importa risultati CI (JUnit XML/JSON)
- `POST /api/continuous/projects/{id}/snapshots` - Crea snapshot immutabile
- `GET /api/continuous/projects/{id}/snapshots` - Lista snapshot
- `POST /api/continuous/snapshots/compare` - Confronta snapshot
- `POST /api/continuous/projects/{id}/regressions` - Rileva regressioni
- `GET /api/continuous/projects/{id}/regressions` - Lista regressioni
- `GET /api/continuous/projects/{id}/actions` - Lista azioni
- `GET /api/continuous/projects/{id}/actions/export` - Export CSV azioni
- `POST /api/continuous/actions/{id}/close` - Chiudi azione
- `POST /api/continuous/actions/{id}/issue-draft` - Genera bozza issue
- `POST /api/continuous/projects/{id}/reproducibility` - Record riproducibilità
- `POST /api/continuous/projects/{id}/review-pack` - Genera Technical Review Pack

### Parametri di Query Comuni

| Endpoint | Parametro | Tipo | Default | Descrizione |
|----------|-----------|------|---------|-------------|
| `/findings` | `status` | string | null | `PASS\|WARNING\|FAIL\|NOT_APPLICABLE\|NOT_EVALUATED` |
| `/findings` | `severity` | string | null | `CRITICAL\|HIGH\|MEDIUM\|LOW\|INFO` |
| `/findings` | `category` | string | null | Categoria finding |
| `/findings` | `column` | string | null | Nome colonna |
| `/findings` | `q` | string | null | Ricerca testuale |
| `/findings` | `sort` | string | `severity` | `severity\|status\|category\|title\|check_id` |
| `/findings` | `order` | string | `desc` | `asc\|desc` |
| `/findings` | `limit` | int | 100 | 1-500 |
| `/findings` | `offset` | int | 0 | >= 0 |
| `/dataset/preview` | `limit` | int | 100 | 1-500 |
| `/audit` | `limit` | int | 200 | 1-1000 |

### Formati di Risposta

Tutti gli endpoint restituiscono JSON con i seguenti header:
- `Content-Type: application/json`
- Errori: `{"error_code": "STRING", "message": "STRING", "details": {}}`

### Note sulla Sicurezza

- Upload file: validazione estensione, dimensione (50MB), SHA-256
- Filename sanitization lato server
- Nessun path traversal possibile
- Zip member validation per evidence packages
- Root enforcement per link esterni

---

## [0.7.0] - 2026-08-XX

### Aggiunto
- CI result ingestion (JUnit XML, JSON summary)
- Immutable assurance snapshots
- Baseline comparison e regression detection
- Action Register con CSV export
- Technical Review Pack generator
- Project Adapter SDK

---

## [0.6.0] - 2026-08-XX

### Aggiunto
- Public engineering portfolio (10 pages)
- Assurance engine con 26 gap rules
- 15 Assurance Dimensions
- Deployment Readiness Gate
- Guided demo tour
- Screenshot automation

---

## [0.1.0] - 2026-07-XX

### Aggiunto
- Project CRUD
- Dataset upload e preview
- 9 analyzer checks
- Data Readiness Score (0-100)
- Findings API con filtri
- JSON report generation
- Audit trail
- SQLite database (WAL mode)
- Docker Compose setup
