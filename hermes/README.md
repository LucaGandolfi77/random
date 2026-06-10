# Hermes Specialist Workspace

Workspace locale basato su Hermes Agent con un roster esteso di agenti specializzati, configurazione ricaricabile a caldo, memoria persistente condivisa e orchestrazione parallela.

## Architettura

Agenti core:

- Ricercatore: scraping, ricerca web, raccolta fonti, analisi dati.
- Sviluppatore: scrittura codice, debugging, refactor, test.
- Revisore: quality gate, controllo formale, formattazione e ship review.

Agenti specialistici aggiuntivi:

- Storico: personalita archivistica e contestuale, orientata a fonti primarie, cronologie e ricostruzione storica.
- Economista: personalita quantitativa e prudente, focalizzata su scenari, trade-off economici e impatti organizzativi.
- Giurista: personalita cauta e normativa, specializzata in compliance, analisi regolatoria e memo di rischio.
- Statistico: personalita rigorosa e scettica verso inferenze deboli, specializzato in dati, campioni e robustezza metodologica.
- Architetto: personalita sistemica e trade-off driven, specializzata in architetture software, scalabilita e decisioni tecniche di lungo periodo.
- Docente: personalita pedagogica e chiarificatrice, specializzata in spiegazioni progressive, formazione e trasferimento di conoscenza.

## Roster esteso

Il workspace ora include questi slug operativi:

- `ricercatore`
- `sviluppatore`
- `revisore`
- `storico`
- `economista`
- `giurista`
- `statistico`
- `architetto`
- `docente`

Ogni agente ha:

- un file YAML dedicato in `config/agents/`
- un prompt dedicato in `prompts/`
- skill abilitate modificabili da CLI o slash-command
- provider, modello e API key separabili per agente

## Comandi principali

Wrapper locale:

```bash
./run-local-hermes.sh --help
./run-local-hermes.sh agent list
./run-local-hermes.sh dispatch "Analizza il backlog e proponi una patch"
./run-local-hermes.sh dispatch "Analizza solo la ricerca" --agent ricercatore
./run-local-hermes.sh dispatch "Ricerca e review finale" --agent ricercatore --agent revisore
./run-local-hermes.sh shell
./run-local-hermes.sh shell --agent sviluppatore
./run-local-hermes.sh tui
./run-local-hermes.sh tui --agent ricercatore --agent revisore
./run-local-hermes.sh tui --snapshot
```

Aggiornare un agente senza riavviare il sistema:

```bash
./run-local-hermes.sh agent update ricercatore \
	--role "Ricerca, scraping e analisi comparativa" \
	--skill-add fact_check \
	--prompt-text "Sei il Ricercatore. Lavora con fonti verificabili."

./run-local-hermes.sh agent update sviluppatore \
	--model "nousresearch/hermes-3-llama-3.1-405b:free" \
	--provider openrouter \
	--api-key-env OPENROUTER_API_KEY

./run-local-hermes.sh agent update revisore \
	--tool-add markdown \
	--tool-add qa_checklist
```

Usare la shell slash-command:

```text
/agents
/show ricercatore
/role sviluppatore "Codice, debug e test automatici"
/prompt revisore "Controlla struttura, leggibilita e formattazione finale."
/skill add ricercatore scraping
/apikey sviluppatore sk-or-...
/targets set ricercatore revisore
/targets clear
/dispatch "Rivedi una feature e proponi fix"
/live "Esegui il task con Hermes reale"
```

Usare la TUI con pannelli e hot reload:

```bash
./run-local-hermes.sh tui
./run-local-hermes.sh tui --live-default
./run-local-hermes.sh tui --refresh 0.5
./run-local-hermes.sh tui --agent ricercatore
./run-local-hermes.sh tui --agent ricercatore --agent revisore
./run-local-hermes.sh tui --snapshot
```

Tasti e interazione della TUI:

- frecce su/giu o `j` e `k`: cambiano agente selezionato
- `Spazio`: aggiunge o rimuove l'agente selezionato dal gruppo che verra avviato al prossimo dispatch
- `F2`: alterna preview e live come modalita di default
- `Invio`: esegue il task o il comando slash scritto nella riga comandi
- `Esc`: chiude la TUI
- testo semplice: esegue un dispatch usando la modalita corrente
- comandi slash: aggiornano YAML, prompt, skill, tool, API key o lanciano dispatch senza restart

Comandi slash supportati nella TUI:

```text
/help
/show ricercatore
/role sviluppatore "Codice, debug e test automatici"
/prompt revisore "Controlla struttura, leggibilita e formattazione finale."
/skill add ricercatore scraping
/tool add sviluppatore shell
/model sviluppatore nousresearch/hermes-3-llama-3.1-405b:free
/provider sviluppatore openrouter
/apikey sviluppatore sk-or-...
/targets show
/targets set ricercatore revisore
/targets add sviluppatore
/targets remove revisore
/targets clear
/memory add operatore "Nota persistente di progetto"
/dispatch "Rivedi una feature e proponi fix"
/live "Esegui il task con Hermes reale"
/mode live
/mode preview
```

## Guida passo passo per avviare uno o piu agenti

Questa sezione spiega esattamente come scegliere quali agenti far partire, quando usare un solo agente e quando usarne piu di uno.

### 1. Preparazione iniziale

Apri il workspace Hermes:

```bash
cd /workspaces/random/hermes
```

Verifica che il wrapper e gli agenti siano disponibili:

```bash
./run-local-hermes.sh agent list
```

Output atteso: una tabella con il roster completo utilizzabile nei comandi.

- `ricercatore`
- `sviluppatore`
- `revisore`
- `storico`
- `economista`
- `giurista`
- `statistico`
- `architetto`
- `docente`

Se vuoi vedere in dettaglio configurazione, prompt, modello e skill di un agente prima di lanciarlo:

```bash
./run-local-hermes.sh agent show ricercatore
./run-local-hermes.sh agent show sviluppatore
./run-local-hermes.sh agent show revisore
```

### 2. Capire la differenza tra preview e live

Prima di lanciare gli agenti devi scegliere la modalita.

- `preview`: simula il lavoro degli agenti con output locale, utile per testare configurazione, prompt e routing senza consumare API.
- `live`: usa il binario `hermes` e il provider configurato per ogni agente. Richiede una API key valida se il provider la richiede.

Per impostare una API key locale per un agente, se ti serve il live:

```bash
./run-local-hermes.sh agent update ricercatore --api-key-env OPENROUTER_API_KEY --api-key sk-or-xxxxx
./run-local-hermes.sh agent update sviluppatore --api-key-env OPENROUTER_API_KEY --api-key sk-or-xxxxx
./run-local-hermes.sh agent update revisore --api-key-env OPENROUTER_API_KEY --api-key sk-or-xxxxx
```

Le chiavi vengono salvate in `config/secrets.local.yaml`, che non viene versionato.

### 3. Avviare un solo agente da CLI

Questo e il modo piu diretto per scegliere esattamente un agente.

Esempio: avviare solo il Ricercatore in preview.

```bash
./run-local-hermes.sh dispatch "Raccogli fonti recenti sul tema e prepara una sintesi" --agent ricercatore
```

Esempio: avviare solo lo Sviluppatore in preview.

```bash
./run-local-hermes.sh dispatch "Analizza il bug e proponi una patch minima" --agent sviluppatore
```

Esempio: avviare solo il Revisore in preview.

```bash
./run-local-hermes.sh dispatch "Rivedi il documento e segnala i problemi di qualita" --agent revisore
```

Se vuoi eseguire lo stesso task in live, aggiungi `--live`:

```bash
./run-local-hermes.sh dispatch "Rivedi il documento e segnala i problemi di qualita" --agent revisore --live
```

Regola pratica:

- usa `ricercatore` quando il task richiede fonti, scraping o confronto dati
- usa `sviluppatore` quando il task richiede patch, refactor o debugging
- usa `revisore` quando il task richiede controllo finale, struttura o formattazione

### 4. Avviare due agenti specifici da CLI

Per avviare due agenti insieme, ripeti il flag `--agent` una volta per ogni agente che vuoi includere.

Esempio: Ricercatore piu Sviluppatore.

```bash
./run-local-hermes.sh dispatch "Trova le fonti del problema e poi proponi una patch" \
	--agent ricercatore \
	--agent sviluppatore
```

Esempio: Ricercatore piu Revisore.

```bash
./run-local-hermes.sh dispatch "Raccogli evidenze e fai una revisione finale del report" \
	--agent ricercatore \
	--agent revisore
```

Esempio: Sviluppatore piu Revisore in live.

```bash
./run-local-hermes.sh dispatch "Correggi il modulo e verifica se e pronto per la consegna" \
	--agent sviluppatore \
	--agent revisore \
	--live
```

### 5. Avviare tutti e tre gli agenti

Hai due modi.

Modo 1: non specificare nessun `--agent`. In questo caso il workspace usa tutti gli agenti configurati.

```bash
./run-local-hermes.sh dispatch "Analizza il problema, proponi una patch e fai una review finale"
```

Modo 2: specificare tutti e tre gli agenti in modo esplicito.

```bash
./run-local-hermes.sh dispatch "Analizza il problema, proponi una patch e fai una review finale" \
	--agent ricercatore \
	--agent sviluppatore \
	--agent revisore
```

Il primo modo e piu rapido. Il secondo e utile quando vuoi rendere esplicita la composizione del gruppo nel comando o in uno script.

### 6. Scegliere gli agenti dentro la shell interattiva

Se preferisci restare in una sessione persistente, usa la shell.

Avvio shell con tutti gli agenti disponibili:

```bash
./run-local-hermes.sh shell
```

Avvio shell gia filtrata su uno o piu agenti:

```bash
./run-local-hermes.sh shell --agent ricercatore
./run-local-hermes.sh shell --agent ricercatore --agent revisore
```

Una volta dentro la shell, verifica il target corrente:

```text
/targets
```

Impostare un solo agente:

```text
/targets set sviluppatore
```

Impostare due agenti:

```text
/targets set ricercatore revisore
```

Aggiungere un terzo agente al gruppo corrente:

```text
/targets add sviluppatore
```

Rimuovere un agente dal gruppo corrente:

```text
/targets remove revisore
```

Tornare a tutti gli agenti:

```text
/targets clear
```

Dopo avere scelto i target, lancia il task:

```text
/dispatch "Analizza il ticket e proponi la soluzione"
/live "Esegui il workflow reale con Hermes"
```

Importante: `dispatch` e `live` usano il gruppo attivo impostato con `/targets`. Se il gruppo e vuoto, partono tutti gli agenti.

### 7. Scegliere gli agenti dentro la TUI

La TUI e utile quando vuoi vedere insieme agenti, memoria condivisa e stato dei task.

Avvio TUI con tutti gli agenti:

```bash
./run-local-hermes.sh tui
```

Avvio TUI gia filtrata su uno o piu agenti:

```bash
./run-local-hermes.sh tui --agent ricercatore
./run-local-hermes.sh tui --agent ricercatore --agent revisore
```

Dentro la TUI hai due modi per scegliere chi parte.

Modo 1: da tastiera.

1. usa le frecce o `j` e `k` per spostarti sull'agente
2. premi `Spazio` per aggiungerlo o rimuoverlo dai target attivi
3. ripeti sui vari agenti che vuoi includere
4. scrivi il task nella riga comandi
5. premi `Invio`

Modo 2: con i comandi slash nella riga comandi della TUI.

```text
/targets show
/targets set ricercatore revisore
/targets add sviluppatore
/targets remove ricercatore
/targets clear
```

Quando hai finito la selezione, puoi avviare il task in tre modi.

Testo semplice, che usa la modalita corrente mostrata in alto:

```text
Analizza il bug, proponi una patch e poi verifica il testo finale
```

Dispatch esplicitamente in preview:

```text
/dispatch "Analizza il bug, proponi una patch e poi verifica il testo finale"
```

Dispatch esplicitamente in live:

```text
/live "Analizza il bug, proponi una patch e poi verifica il testo finale"
```

Per cambiare la modalita di default:

```text
/mode preview
/mode live
```

Oppure premi `F2`.

### 8. Come verificare quali agenti sono partiti davvero

Dopo un dispatch, puoi controllare in tre modi.

Controllo immediato a video:

- la CLI mostra una tabella con gli agenti eseguiti
- la shell stampa il JSON del dispatch
- la TUI mostra l'ultimo dispatch nel pannello Activity

Controllo sulla memoria condivisa:

```bash
./run-local-hermes.sh memory list --limit 20
```

Ogni agente che ha lavorato scrive un record nel file `runtime/memory/shared_memory.json`.

Controllo puntuale per tipo di task:

- se vedi solo output di `ricercatore`, e partito solo il Ricercatore
- se vedi output di `ricercatore` e `revisore`, e partito quel gruppo e non lo Sviluppatore
- se vedi output di tutti e tre, hai eseguito un dispatch completo

### 9. Strategia consigliata di uso pratico

Se non sai ancora come comporre il gruppo, usa questa regola semplice.

1. Parti con un solo agente se il task e chiaramente mono-funzione.
2. Usa due agenti se il task richiede una handoff naturale.
3. Usa tutti e tre se vuoi un mini workflow completo end-to-end.

Esempi consigliati:

- solo `ricercatore`: raccolta fonti, segnali, benchmark, scraping
- solo `sviluppatore`: bugfix, refactor, test, automazione
- solo `revisore`: QA finale, stile, coerenza, formattazione
- solo `storico`: timeline, contesto, confronto fonti e ricostruzione di precedenti
- solo `economista`: scenari, costi, incentivi, effetti organizzativi o di mercato
- solo `giurista`: compliance, policy, obblighi, memo di rischio non sostitutivi di consulenza legale
- solo `statistico`: validazione quantitativa, inferenza, disegno sperimentale, controllo assunzioni
- solo `architetto`: architettura di sistema, interfacce, scalabilita, ADR e trade-off
- solo `docente`: onboarding, documentazione didattica, spiegazioni step-by-step, materiale formativo
- `ricercatore` + `sviluppatore`: dal dato alla patch
- `sviluppatore` + `revisore`: dalla patch alla verifica finale
- `ricercatore` + `revisore`: dalla raccolta evidenze alla validazione editoriale
- `economista` + `statistico`: scenari quantitativi con verifica metodologica
- `giurista` + `revisore`: controllo di conformita piu rifinitura finale
- `architetto` + `sviluppatore`: dalla decisione di alto livello all'implementazione
- `docente` + `revisore`: dalla spiegazione tecnica alla rifinitura editoriale
- tutti e tre: ricerca, implementazione e quality gate nello stesso passaggio

## Nuovi file agente

I nuovi agenti sono definiti in:

- `config/agents/storico.yaml`
- `config/agents/economista.yaml`
- `config/agents/giurista.yaml`
- `config/agents/statistico.yaml`
- `config/agents/architetto.yaml`
- `config/agents/docente.yaml`

I prompt dedicati si trovano in:

- `prompts/storico.md`
- `prompts/economista.md`
- `prompts/giurista.md`
- `prompts/statistico.md`
- `prompts/architetto.md`
- `prompts/docente.md`

## Memoria condivisa

La memoria persistente si trova in `runtime/memory/shared_memory.json`.

- ogni dispatch registra il task iniziale
- ogni agente scrive il proprio output nella stessa memoria
- i task successivi leggono gli ultimi elementi condivisi

## Modalita operative

- `dispatch` usa di default una preview parallela locale, utile anche senza API key.
- `dispatch --live` usa il binario `hermes` presente nel container e tenta un'esecuzione reale agente per agente in parallelo.
- le modifiche ai file YAML e ai prompt sono rilette a ogni comando, quindi non serve riavviare la shell.
- `tui` mostra pannelli per agenti, memoria condivisa, dettaglio agente e attivita recente; il refresh rilegge i file da disco in automatico.

## File chiave

- `config/system.yaml`: impostazioni globali del workspace
- `config/agents/*.yaml`: configurazione dei tre agenti
- `config/secrets.local.yaml`: API key locali non versionate
- `skills/catalog.yaml`: catalogo skill del workspace
- `AGENTS.md` e `SOUL.md`: contesto Hermes locale caricato in automatico dal binario

## Test

```bash
python -m pytest tests/test_workspace.py
```
