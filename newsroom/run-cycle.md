# Manuale operativo — Esecuzione di un ciclo editoriale

Questo documento è il manuale che l'**Editor-in-Chief** (l'agente del preset `newsroom`)
segue per eseguire cicli editoriali autonomi. È anche la guida per chiunque voglia
eseguire la redazione manualmente.

---

## 1. Preparazione (una volta)

1. Verifica che esista `newsroom/workflow/cycle.script.js`. Se manca o è obsoleto:
   `node newsroom/workflow/build-cycle.js`.
2. Verifica `newsroom/state/story-memory.json` (memoria delle storie).
   Se il file manca, inizializzalo: `{ "stories": [], "last_cycle": null }`.

## 2. Esecuzione di un ciclo completo (mode: cycle)

L'orchestratore:

1. Legge `state/story-memory.json` e costruisce la vista `memory` per il workflow:
   per ogni storia in `stories`, `{ id, topic, headline, status }`.
2. Invoca il tool **workflow** con:
   - `meta`: `name: "newsroom-cycle"`, `description`, fasi dichiarate
     (`discover`, `classify`, `research`, `verify`, `decide`, `write`, `polish`, `quality-gate`, `final`);
   - `script`: il contenuto di `newsroom/workflow/cycle.script.js` **così com'è**;
   - `args`:
     ```json
     {
       "mode": "cycle",
       "memory": [ ... ],
       "scope": "ambito richiesto o nessuna preferenza",
       "sources": [ { "domain": "ansa.it", "name": "ANSA", "lang": "it", "kind": "agenzia" }, "..." ],
       "language": "it",
       "now": "<timestamp ISO corrente>"
     }
     ```
     `sources` (opzionale): se presente, la fase DISCOVER lancia un **SITE SCOUT per ogni
     fonte** — query `site:<dominio>` + lettura delle pagine. Default consigliato:
     `default_sources` di `site/sources.json`. Senza `sources` si usa lo SCOUT generico.
3. Riceve il bundle (FINAL OUTPUT + NEWS OBJECT + artifacts).

## 3. Persistenza dei risultati (dopo ogni ciclo)

L'orchestratore aggiorna `state/`:

- **`story-memory.json`**: aggiungi `news_object` a `stories` (o aggiorna la voce con
  `id == story_id` per UPDATE). Imposta `last_cycle` con il riepilogo.
- **`published.json`**: se `decision` ∈ {PUBLISH, URGENT_PUBLISH, UPDATE}, aggiungi
  `{ id, headline, slug, published_at, updated_at, status, url }`.
- **`performance.json`**: appendi `{ timestamp, mode, decision, priority, confidence,
  agents_used, quality_gate_passed }`.

## 4. Pubblicazione sul sito (SITE MANAGER)

Se `decision` ∈ {PUBLISH, URGENT_PUBLISH, UPDATE}:

1. Salva il bundle in `site/inbox/<story_id>.json`.
2. Esegui `node site/publish.js <story_id>` (oppure `--all` per tutto l'inbox,
   `--list` per vedere cosa c'è). Verifica l'output: pagina in `site/out/<slug>.html`,
   `site/registry.json` aggiornato, `site/out/index.html` rigenerato.
3. Registra l'URL finale in `state/published.json` e `state/story-memory.json`.
4. Casi complessi (categorie, deploy su hosting/git, modalità `api` verso WordPress o
   un CMS custom): delega al ruolo **SITE MANAGER** (`prompts/site-manager.md`), che
   possiede config (`site/config.json`), template e registro.
5. Prima di un deploy reale, configura `site/config.json` (nome, URL, autore, categorie)
   e conferma la piattaforma: la modalità `file` è l'anteprima locale funzionante.

## 5. Aggiornamento di una storia esistente (mode: update)

Quando il MONITOR (o una segnalazione esterna) rileva un cambiamento materiale:

1. Individua `targetStoryId` nella memoria.
2. Esegui il workflow con `mode: "update"`, `targetStoryId`, `topic`, `newInfo`.
3. Se `decision === UPDATE`: sostituisci la voce in `story-memory.json` con il nuovo
   `news_object`, aggiorna `timestamps.updated` e `published.json`, e ripubblica con
   `node site/publish.js <story_id>` (sovrascrive la pagina, aggiorna `updated_at`).
4. Se `decision === CORRECT`: applica la Correction Policy (nota di correzione,
   aggiornamento dell'articolo, RETRACT se sostanzialmente falso).

## 6. Ricerca senza pubblicazione (mode: research)

Per approfondire un tema senza pubblicare: `mode: "research"`, `topic`. Il risultato è un
dossier verificato (`decision: RESEARCH`, `next_action: "write"`) da usare nel ciclo successivo.

## 7. Monitoraggio continuo

Dopo ogni pubblicazione, l'orchestratore può eseguire cicli `update` periodici o lanciare il
ruolo MONITOR per le storie in `state/published.json`. Regola pratica: un UPDATE EVENT esiste
solo se la storia è cambiata **materialmente** (nuovi fatti accertati, smentite, numeri corretti).

## 8. Costi

Il ciclo completo usa da 10 a ~18 subagent per una storia (`required_agents` nel bundle:
il fan-out dei SITE SCOUT aggiunge un agente per fonte configurata). Per contenere i costi:
limita `sources` alle 3-4 fonti più rilevanti, usa `mode: research` per le storie dubbie,
`mode: update` per i follow-up, e non ripetere cicli `cycle` sulla stessa storia nello
stesso giorno senza un segnale nuovo.

---

## Checklist dell'orchestratore (prima di chiudere un ciclo)

- [ ] `news_object` salvato/aggiornato in `story-memory.json`
- [ ] `published.json` aggiornato se pubblicato/aggiornato (con `url`)
- [ ] `performance.json` aggiornato
- [ ] Se `PUBLISH`/`URGENT_PUBLISH`/`UPDATE`: bundle in `site/inbox/`, `node site/publish.js` eseguito, output verificato
- [ ] Se `CORRECT`/`RETRACT`: nota di correzione registrata nella storia (e nella pagina se pubblicata)
- [ ] Se `BLOCK`/`MORE_RESEARCH`: motivo archiviato in `reason`/`next_action`
