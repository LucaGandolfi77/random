# Redazione Autonoma — Newsroom Orchestrator

Sistema editoriale multi-agente riutilizzabile che gestisce l'intero ciclo di vita di una notizia:

```
DISCOVER → CLASSIFY → DEDUPLICATE → RANK → RESEARCH → VERIFY → ATTACK THE STORY
        → DECIDE → WRITE → EDIT → SEO → QUALITY GATE → PUBLISH → MONITOR → UPDATE
```

La qualità viene prima della quantità: l'obiettivo è massimizzare
`ACCURACY × RELEVANCE × TIMELINESS × TRUST × LONG_TERM_AUDIENCE_VALUE`, tenendo sotto controllo il costo operativo degli agenti.

---

## Architettura

| Componente | Percorso | Ruolo |
|---|---|---|
| Config editoriale | `config/editorial.json` | Pesci NEWS_SCORE e CONFIDENCE, policy, soglie, gerarchia fonti |
| Schema NEWS OBJECT | `schema/news-object.schema.json` | Contratto dati di ogni storia |
| Contratti dei ruoli | `prompts/*.md` | Specifica e istruzioni di ciascun agente della redazione |
| Workflow eseguibile | `workflow/cycle.script.js` | Ciclo orchestrato (DISCOVER→UPDATE) — **generato** |
| Generatore | `workflow/build-cycle.js` | Ricompila il workflow dai prompt/config |
| Smoke test | `workflow/smoke-test.js` | Verifica strutturale del workflow senza agenti reali |
| Stato | `state/` | Memoria delle storie, articoli pubblicati, performance |
| **Sito — config** | `site/config.json` | Identità del sito (nome, URL, autore, categorie) e impostazioni di pubblicazione |
| **Sito — fonti** | `site/sources.json` | Siti di notizie configurati per il sourcing (domini, lingua, tipo) |
| **Sito — publisher** | `site/publish.js` | Motore di pubblicazione: inbox → pagina HTML + registro + index |
| **Sito — template** | `site/template.html` | Template delle pagine articolo |

## La redazione (13 ruoli)

| Agente | Fase | Responsabilità |
|---|---|---|
| **SITE SCOUT** | DISCOVER | Sourcing mirato per singolo sito di news (web_search `site:` + lettura pagine) |
| **SCOUT** | DISCOVER | Trova notizie reali via web, fonti primarie/secondarie, breaking news, trend |
| **EDITOR-IN-CHIEF** | CLASSIFY/RANK/DECIDE | Dedup, NEWS_SCORE, priorità, decisione editoriale, policy confidence |
| **RESEARCHER** | RESEARCH | Dossier: mappa CLAIM → SOURCE → EVIDENCE → CONFIDENCE, contesto storico |
| **FACT CHECKER** | VERIFY | Verifica claim: confidence_score 0-100, verification_status, indipendenza fonti |
| **CONTRADICTION AGENT** | ATTACK | Ricerca attiva di prove che la storia sia sbagliata; blocca se critica |
| **WRITER** | WRITE | Scrive SOLO dal dossier verificato; REWRITE POLICY per fonti di terzi |
| **COPY EDITOR** | EDIT | Grammatica, chiarezza, tono, struttura — mai alterare i fatti |
| **SEO EDITOR** | SEO | Title, description, slug, keyword, H2/H3 — senza clickbait |
| **VISUAL EDITOR** | VISUAL | Immagine principale, caption, alt text, grafici su dati verificati |
| **PUBLISHER** | QUALITY GATE | Checklist obbligatoria; blocca se un check critico fallisce |
| **MONITOR** | MONITOR | Sorveglianza post-pubblicazione; genera UPDATE EVENT se la storia cambia |
| **SITE MANAGER** | INFRA | Config del sito, pipeline di pubblicazione, registro, deployment |

## Il ciclo (workflow)

Il workflow (`workflow/cycle.script.js`) viene eseguito con il tool **workflow** del harness.
Ogni fase lancia subagent reali con i prompt dei ruoli e gli output sono validati da schemi JSON
(nessun parsing fragile di testo libero).

### Modalità

| mode | Cosa fa | Decisioni di uscita |
|---|---|---|
| `cycle` | Ciclo completo: discover → ricerca → verifica → scrittura → quality gate | `PUBLISH`, `URGENT_PUBLISH`, `UPDATE`, `BLOCK`, `MORE_RESEARCH`, `CORRECT`, `IGNORE`, `MONITOR` |
| `update` | Aggiorna una storia esistente (input: `targetStoryId`, `newInfo`) | `UPDATE`, `CORRECT`, `MONITOR` |
| `research` | Solo ricerca+verifica di un tema (input: `topic`), senza pubblicare | `RESEARCH` (dossier pronto) |

### Input (args)

```json
{
  "mode": "cycle | update | research",
  "memory": [{ "id": "", "topic": "", "headline": "", "status": "" }],
  "scope": "ambito di ricerca (opzionale)",
  "sources": "lista fonti da site/sources.json (opzionale, cycle): attiva il fan-out dei SITE SCOUT per sito",
  "topic": "topic (update/research)",
  "targetStoryId": "id storia esistente (update)",
  "newInfo": "nuove informazioni dal monitor (update)",
  "language": "it",
  "now": "timestamp ISO del ciclo"
}
```

### Output (FINAL OUTPUT)

```json
{
  "decision": "IGNORE | MONITOR | RESEARCH | WRITE | UPDATE | URGENT_PUBLISH | PUBLISH | CORRECT | RETRACT",
  "priority": 0,
  "reason": "",
  "story_id": "",
  "required_agents": [],
  "confidence": 0,
  "publication_status": "",
  "next_action": "",
  "news_object": { },
  "artifacts": { "article": {}, "seo": {}, "media": {}, "checklist": [] }
}
```

## Policy incorporate

- **Deduplicazione**: `NEW_STORY` / `EXISTING_STORY_UPDATE` (preferito) / `DUPLICATE` / `RELATED_STORY`, confrontando con `state/story-memory.json`.
- **Confidence**: 0-39 BLOCK · 40-59 MORE_RESEARCH · 60-79 PUBLISH_WITH_CAUTION · 80-94 PUBLISH · 95-100 HIGH_CONFIDENCE. Una confidence alta non autorizza a ignorare una contraddizione critica.
- **NEWS_SCORE** = 0.30×IMPORTANCE + 0.25×RECENCY + 0.20×SOURCE_RELIABILITY + 0.15×AUDIENCE_RELEVANCE + 0.10×TREND_VELOCITY.
- **Breaking news**: pubblica solo il verificato, dichiara il non confermato, nessun dettaglio speculativo, attiva MONITOR.
- **Correzione**: claim errato → verifica → aggiorna → registra → nota di correzione → RETRACT se sostanzialmente falso. Mai nascondere un errore.

## Il sito — SITE MANAGER e pipeline di pubblicazione

Il layer `site/` è il gestore dell'infrastruttura del sito web della redazione:

- **`site/config.json`** — identità del sito (nome, URL, lingua, autore, categorie) e modalità di pubblicazione (`file` di default; aggancio `api` documentato per WordPress/custom).
- **`site/sources.json`** — i principali siti di notizie da cui gli agenti cercano notizie (ANSA, Reuters, AP, Corriere, Repubblica, Sole 24 Ore, BBC, Guardian — modificabile).
- **`site/publish.js`** — motore di pubblicazione: legge il bundle dal workflow (`site/inbox/<story_id>.json`), renderizza `site/template.html`, scrive la pagina in `site/out/<slug>.html`, aggiorna `site/registry.json` e genera `site/out/index.html`. Gestisce aggiornamenti (stesso slug, `updated_at` rinnovato) e note di correzione.
- **SITE MANAGER** (`prompts/site-manager.md`) — il ruolo che possiede l'infrastruttura: pubblica i bundle approvati, verifica l'output, registra gli URL in `state/published.json`, gestisce deployment e diagnostica.

Flusso di pubblicazione: `workflow (PUBLISH/UPDATE)` → orchestratore salva il bundle in `site/inbox/` → `node site/publish.js <story_id>` (o delega al SITE MANAGER) → URL registrato in `state/published.json`.

**Sourcing e rewriting**: passando `sources` al workflow, la fase DISCOVER lancia un SITE SCOUT per ogni fonte (query `site:<dominio>` + lettura delle pagine, fetch abilitata nel preset). Il WRITER applica la REWRITE POLICY: testo originale, aggregazione multi-fonte, attribuzione puntuale — mai riproduzione dei testi di terzi (le agenzie come Reuters/AP richiedono licenze per la redistribuzione).

## Modificare il sistema

1. I contratti dei ruoli vivono in `prompts/*.md`; la config in `config/editorial.json`.
2. Dopo ogni modifica: `node workflow/build-cycle.js` per rigenerare `cycle.script.js`.
3. Verifica: `node workflow/smoke-test.js` (non lancia agenti reali).

## Hard rules (non negoziabili)

NON inventare fonti, citazioni, statistiche. NON trasformare rumor in fatti. NON usare una singola
fonte debole per affermare fatti importanti. NON pubblicare con contraddizioni critiche irrisolte.
NON creare duplicati quando basta un aggiornamento. NON usare clickbait ingannevole. NON ottimizzare
il SEO alterando il significato. NON nascondere errori. NON assumere che una fonte sia corretta
solo perché è popolare.

---

## Operazioni

Vedi `run-cycle.md` per il manuale operativo: come l'orchestratore esegue un ciclo, aggiorna la
memoria delle storie e monitora le pubblicazioni.
