# LINGUA-EVOLVER

Simulatore di evoluzione linguistica artificiale con agenti AI.

## Concetto

Un gruppo di agenti AI parte con fonemi casuali astratti (come "ka", "mu", "ti") e interagisce per comunicare. Nel tempo, emergono vocaboli, regole grammaticali e strutture sintattiche — verso una lingua condivisa.

## Installazione

```bash
cd lingua-evolver
pip install -e ".[dev]"
```

## Configurazione

Copia `.env.example` in `.env` e inserisci la tua chiave OpenRouter:

```bash
cp .env.example .env
# Modifica .env con la tua OPENROUTER_API_KEY
```

## Uso

### Esegui simulazione

```bash
# Simulazione base (8 agenti, 100 generazioni)
lingua-evolver run

# Personalizza parametri
lingua-evolver run --agents 10 --generations 50 --phonemes 6

# Senza LLM (deterministico)
lingua-evolver run --no-llm

# Modalità interattiva (input durante esecuzione)
lingua-evolver run --interactive

# Carica parole pre-definite
lingua-evolver run --input-file words.txt
```

### Aggiungi parole

```bash
# Aggiungi a simulazione salvata
lingua-evolver add-word <save_file> "ka" "io"

# Batch da file
lingua-evolver add-words <save_file> words.txt
```

### Esporta risultati

```bash
# Report markdown
lingua-evolver export <save_file> --format markdown

# Dizionario lessico
lingua-evolver export <save_file> --format lexicon
```

### Altri comandi

```bash
# Mostra statistiche
lingua-evolver stats <save_file>

# Lista salvataggi
lingua-evolver list-saves
```

## Formato file parole

```
# comments sono ignorati
ka = io
mu = vedere
ti = te
zo = tu
pa = mangiare
```

## Architettura

```
lingua_evolver/
├── models.py          # Modelli Pydantic
├── phonology.py       # Gestione fonemi
├── lexicon.py         # Lessico emergente
├── grammar.py         # Regole grammaticali
├── input_queue.py     # Coda input utente
├── engine.py          # Ciclo simulazione
├── ui.py              # Rich Live display
├── client.py          # OpenRouter client
├── agents/
│   ├── base.py        # Agenti deterministici
│   └── llm_agent.py   # Agenti LLM
├── cli.py             # CLI Typer
├── exporters.py       # Export risultati
├── persistence.py     # Save/load
└── config.py          # Configurazione
```

## Licenza

MIT
