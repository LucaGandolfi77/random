# AI Courtroom CLI

AI Courtroom CLI e' una versione interamente da terminale del progetto AI Courtroom.
Non richiede browser, interfacce web o componenti grafiche: tutto il flusso si usa con Python dalla linea di comando.

Il progetto esegue un dibattito strutturato fra agenti con ruoli distinti, salva casi e verdetti in SQLite locale ed esporta il report finale in Markdown. La prima versione usa agenti mock deterministici, ma la struttura e' gia' pronta per sostituire il provider con chiamate reali a LLM.

## Funzionalita'

- creazione di un nuovo caso decisionale da terminale
- dibattito multi-agente con opening statements, challenge e verdetto finale
- salvataggio locale di casi, messaggi, report e cronologia sessioni
- visualizzazione completa del report direttamente nel terminale
- export del verdetto in Markdown
- supporto sia come modulo Python sia come comando installabile `ai-courtroom`

## Agenti inclusi

- Case Intake Agent
- Pro Advocate
- Contra Advocate
- Technical Expert
- Financial Expert
- Skeptic
- Futurist
- Judge

## Obiettivi architetturali

- CLI-only, senza dipendenze da browser
- Python-only per il flusso MVP
- storage locale con SQLite
- provider layer sostituibile per integrazione LLM futura
- output deterministico dei mock per demo e test ripetibili

## Struttura del progetto

```text
ai-courtroom-cli/
  ai_courtroom_cli/
    __init__.py
    __main__.py
    cli.py
    examples.py
    exporters.py
    formatters.py
    mock_agents.py
    models.py
    orchestrator.py
    providers.py
    storage.py
    templates.py
  examples/
    used-rtx-3090.json
  tests/
    test_trial_engine.py
  run.py
  pyproject.toml
  README.md
```

## Requisiti

- Python 3.11+

## Avvio rapido

Esecuzione diretta come modulo:

```bash
cd /workspaces/random/ai-courtroom-cli
python -m ai_courtroom_cli
```

Esecuzione con launcher locale:

```bash
cd /workspaces/random/ai-courtroom-cli
python run.py
```

Caso demo incluso:

```bash
python -m ai_courtroom_cli demo
```

oppure:

```bash
python run.py demo
```

## Comando installabile

Il progetto espone gia' uno script console Python chiamato `ai-courtroom`.

Installazione editable locale:

```bash
cd /workspaces/random/ai-courtroom-cli
python -m pip install -e .
```

Dopo l'installazione puoi usare il comando direttamente:

```bash
ai-courtroom
ai-courtroom demo
ai-courtroom new --dilemma "Should I buy 2 used RTX 3090 GPUs now, or should I wait?"
ai-courtroom list
ai-courtroom show 1
ai-courtroom export 1
ai-courtroom settings
```

## Comandi disponibili

### Modalita' modulo Python

```bash
python -m ai_courtroom_cli
python -m ai_courtroom_cli new
python -m ai_courtroom_cli demo
python -m ai_courtroom_cli list
python -m ai_courtroom_cli show 1
python -m ai_courtroom_cli export 1
python -m ai_courtroom_cli settings
```

### Modalita' launcher locale

```bash
python run.py
python run.py new
python run.py demo
python run.py list
python run.py show 1
python run.py export 1
python run.py settings
```

## Input supportati per un nuovo caso

Quando crei un caso puoi fornire:

- titolo
- dilemma
- categoria
- budget
- orizzonte temporale
- vincoli
- tolleranza al rischio
- contesto esistente
- alternative gia' considerate

Esempio completo:

```bash
ai-courtroom new \
  --title "GPU purchase decision" \
  --dilemma "Should I buy 2 used RTX 3090 GPUs now, or should I wait?" \
  --category "Technology purchase" \
  --budget "1500 EUR" \
  --time-horizon "6 months" \
  --constraints "Need CUDA for local LLM experiments" \
  --risk-tolerance 45 \
  --context "Electricity cost is high and market prices are volatile" \
  --alternatives "Wait for RTX 5000 discounts,Buy 1 GPU only"
```

## Dove salva i dati

Per default i dati vengono salvati nel database SQLite locale gestito da `CourtroomStorage`.

Puoi usare un path custom con:

```bash
ai-courtroom --db-path /custom/path/courtroom.sqlite3 demo
```

I report Markdown esportati vengono salvati nella cartella `exports/` del progetto o nel path esplicitamente richiesto.

## Caso di esempio incluso

Il caso demo incluso nel progetto e' questo:

```text
Should I buy 2 used RTX 3090 GPUs now, or should I wait?
```

Il relativo input strutturato e' disponibile in `examples/used-rtx-3090.json`.

## Come sostituire i mock con un provider reale

1. implementa il protocollo `AgentProvider` in `ai_courtroom_cli/providers.py`
2. sostituisci `MockAgentProvider` nel bootstrap della CLI
3. mantieni invariati orchestrazione, storage e formato dei report

In questo modo puoi aggiungere un backend LLM reale senza cambiare il flusso terminale o la persistenza locale.

## Test

```bash
cd /workspaces/random/ai-courtroom-cli
python -m unittest discover -s tests
```

## Limiti del MVP

- nessuna chiamata reale a LLM nel rilascio corrente
- nessuna autenticazione
- nessuna UI web
- nessuna ricerca live sul web
- nessun upload di evidenze o documenti

## Disclaimer

- questo strumento e' un supporto decisionale, non un sostituto di consulenza professionale
- non fornisce consulenza legale, finanziaria, medica o professionale
- l'analisi finanziaria e' solo informativa
- la decisione finale resta sempre all'utente
