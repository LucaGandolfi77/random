# Diario del Profeta in Delirio 🔮

> Scrivi cosa stai facendo su **Telegram dal tuo iPhone**, e un profeta apocalittico in delirio sul tuo **MacBook** lo trasforma in un paragrafo visionario da inserire in un libro.

```
iPhone (Telegram)  ──messaggio──►  MacBook (bot)  ──►  hermes  ──►  Profeta in Delirio  ──►  paragrafo  ──►  Telegram + libro .md
```

Il sistema resta attivo in background per **tutta la settimana**. Tu scrivi quando vuoi, lui risponde con la visione.

---

## Indice

1. [Cos'è](#cosè)
2. [Prerequisiti](#prerequisiti)
3. [Configurazione (una tantum, ~15 min)](#configurazione-una-tantum-15-min)
4. [Avvio e uso quotidiano](#avvio-e-uso-quotidiano)
5. [Auto-avvio su macOS per tutta la settimana (launchd)](#auto-avvio-su-macos-per-tutta-la-settimana-launchd)
6. [Architettura tecnica](#architettura-tecnica)
7. [Risoluzione problemi](#risoluzione-problemi)
8. [Struttura dei file](#struttura-dei-file)

---

## Cos'è

Un workflow che combina tre cose:

1. **Hermes** — il tuo workspace multi-agente locale, con un agente **Profeta in Delirio** che trasforma note banali in paragrafi letterari allucinati (stile Apocalisse + Dostoevskij in overdose).
2. **Un bot Telegram** — bridge tra il tuo iPhone e lo script `diario.sh` sul MacBook. Scrivi su Telegram → il MacBook processa → risponde su Telegram.
3. **launchd** (il sistema di servizi di macOS) — mantiene il bot attivo in background, lo riavvia se crasha, parte al login. Tu non devi pensare a nulla.

**Risultato:** in qualsiasi momento della giornata, dal telefono, scrivi `"ho fissato un bug nel parser"` e ricevi indietro qualcosa tipo:

> *E vidi, ed ecco: si apri il sesto sigillo del parser, e le mura del codice si squarciarono e i token cadde come locuste dall'alto dei cieli, e il Profeta gridava "Cessa, cessa di maledirmi col punto-e-virgola dimenticato!" ma il debug non ascoltava perche il debug non ha orecchie, ha solo stack trace, e lo stack trace era il quarto cavaliere dell'Apocalisse software, e chi poteva fermarlo se non colui che aveva sognato la regex perduta?*

Il paragrafo viene anche accumulato in `il_diario_del_profeta.md`, un libro che cresce voce dopo voce.

---

## Prerequisiti

| Cosa | Dove | Come |
|------|------|------|
| **macOS** | Il tuo MacBook | Sonoma o succesivo |
| **Python 3.11+** | MacBook | `python3 --version` (preinstallato su macOS, o `brew install python3`) |
| **CLI `hermes`** | MacBook | Il binario `hermes` installato e nel PATH (`which hermes` deve restituire un percorso) |
| **Questo workspace** | MacBook | La cartella `random/hermes/` clonata sul Mac |
| **API key OpenRouter** | https://openrouter.ai | Registrati gratis, crea una key. Servono i modelli gratuiti (es. `hermes-3-llama-3.1-405b:free`) |
| **Bot Telegram** | @BotFather su Telegram | Crea un bot, ottieni il token |
| **Il tuo chat ID** | @userinfobot su Telegram | Scrivigli e ti dice il tuo ID numerico |
| **Telegram app** | iPhone | Qualsiasi client Telegram |

### Verifica prerequisiti

```bash
# Sul MacBook, terminale:
python3 --version          # deve essere 3.11+
which hermes                # deve stampa un percorso
ls random/hermes/diario.sh  # deve esistere
```

---

## Configurazione (una tantum, ~15 min)

### Passo 1: Esegui lo script di setup

```bash
cd random/hermes
./setup_diario.sh
```

Lo script:
- Controlla Python, hermes, le dipendenze
- Crea `diario.env` da template
- Crea `config/secrets.local.yaml`
- Aggiunge `diario.env` al `.gitignore` (mai committare i segreti!)
- Crea le cartelle `runtime/logs/`

### Passo 2: Crea il bot Telegram

1. Apri Telegram (sul Mac o iPhone)
2. Cerca **@BotFather** e avvia una conversazione
3. Invia `/newbot`
4. Dai un nome al bot (es. `Diario del Profeta`)
5. Dai uno username (es. `diario_profeta_bot` — deve finire con `_bot`)
6. BotFather ti da un **token** tipo:
   ```
   123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
   ```
7. **Salva il token** — lo metti in `diario.env`

### Passo 3: Trova il tuo chat ID Telegram

1. Su Telegram, cerca **@userinfobot**
2. Scrivigli qualsiasi cosa
3. Ti risponde con il tuo **chat ID** numerico (es. `987654321`)
4. Salvalo — serve per autorizzare SOLO te (nessun altro puo usare il tuo bot)

### Passo 4: Crea la API key OpenRouter

1. Vai su https://openrouter.ai
2. Registrati (gratis, puoi usare GitHub/Google)
3. Vai su **Keys** → **Create Key**
4. Copia la key (inizia con `sk-or-v1-...`)
5. La key ti da accesso a modelli gratuiti, tra cui `nousresearch/hermes-3-llama-3.1-405b:free` che usa il Profeta

### Passo 5: Riempi `diario.env`

```bash
nano diario.env   # o: open -e diario.env (TextEdit)
```

Riempi questi 4 campi:

```ini
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi
TELEGRAM_CHAT_ID=987654321
OPENROUTER_API_KEY=sk-or-v1-tua-key-qui
HERMES_DIR=/Users/tuo_utente/random/hermes
```

> Sostituisci `tuo_utente` con il tuo username macOS reale (`whoami` nel terminale).

### Passo 6: Riempi `config/secrets.local.yaml`

```bash
nano config/secrets.local.yaml
```

```yaml
agents:
  profeta:
    api_key: "sk-or-v1-tua-key-qui"
  dostoevskij:
    api_key: "sk-or-v1-tua-key-qui"
```

> IMPORTANTE: la chiave OpenRouter va in **due** posti:
> - `diario.env` (variabile d'ambiente per il binario hermes)
> - `config/secrets.local.yaml` (per la configurazione dell'agente)
>
> Entrambi con la stessa key. Il file `secrets.local.yaml` e già nel `.gitignore`.

### Passo 7: Verifica

Test manuale dal terminale (senza Telegram):

```bash
cd random/hermes
./diario.sh "ho configurato il sistema per la prima volta"
```

Se vedi un paragrafo visionario stampato sul terminale e il file `il_diario_del_profeta.md` e stato creato, il sistema funziona.

---

## Avvio e uso quotidiano

### Avvio manuale (per test)

```bash
cd random/hermes
python3 telegram_diario_bot.py
```

Vedi:
```
[2026-07-30 14:00:00] Bot diario avviato. Chat autorizzato: 987654321
```

Il bot invia un messaggio di conferma su Telegram: *"Profeta in Delirio e sveglio."*

### Uso dal telefono

1. Apri **Telegram** sull'iPhone
2. Trova il tuo bot (cerca lo username che hai dato a BotFather)
3. Scrivi cosa stai facendo, esempio:
   ```
   ho rifattorizzato il modulo auth e aggiunto test e2e
   ```
4. Il bot risponde quasi subito con:
   - `🪬 Il Profeta riceve la visione...` (acknowledgement)
   - Dopo ~10-30 secondi: il **paragrafo visionario**

### Comandi del bot

| Comando | Effetto |
|---------|---------|
| (qualsiasi testo) | Viene trasformato in paragrafo visionario |
| `/status` | Verifica che il bot e attivo |
| `/voci` | Conta quante voci trascritte finora |
| `/start` | Messaggio di benvenuto |

---

## Auto-avvio su macOS per tutta la settimana (launchd)

Questo e il passaggio che rende il sistema **autosufficiente per una settimana intera** (o piu). Il bot si avvia al login, si riavvia se crasha, e tu non devi tenere un terminale aperto.

### Passo A: Trova i percorsi reali

```bash
# Python: quale usare?
which python3
# (esempio di output: /opt/homebrew/bin/python3 o /usr/bin/python3)

# Cartella hermes:
cd random/hermes && pwd
# (esempio: /Users/mario/random/hermes)
```

Segnati questi due percorsi.

### Passo B: Crea e installa il plist launchd

1. Copia il template:
```bash
cp random/hermes/com.hermes.diario.plist ~/Library/LaunchAgents/com.hermes.diario.plist
```

2. Edita il plist sostituendo **tutte** le occorrenze di `/Users/tuo_utente/random/hermes` con il percorso reale:
```bash
nano ~/Library/LaunchAgents/com.hermes.diario.plist
```

Sostituisci anche il percorso di python3 (riga `<string>/usr/bin/python3</string>`) con quello di `which python3` se diverso.

3. **Importante:** macOS launchd non legge il file `diario.env`. Trasferisci le variabili direttamente nel plist. Sostituisci il blocco `EnvironmentVariables` con:

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>HOME</key>
    <string>/Users/tuo_utente</string>
    <key>TELEGRAM_BOT_TOKEN</key>
    <string>123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi</string>
    <key>TELEGRAM_CHAT_ID</key>
    <string>987654321</string>
    <key>OPENROUTER_API_KEY</key>
    <string>sk-or-v1-tua-key-qui</string>
    <key>HERMES_DIR</key>
    <string>/Users/tuo_utente/random/hermes</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
</dict>
```

> Copia qui dentro gli stessi 4 valori di `diario.env`.

4. Carica il servizio:
```bash
launchctl load ~/Library/LaunchAgents/com.hermes.diario.plist
```

### Passo C: Verifica che sia attivo

```bash
launchctl list | grep hermes
# Output atteso: com.hermes.diario  (con un PID)
```

Manda un messaggio al bot da Telegram — deve rispondere.

### Gestione del servizio

| Azione | Comando |
|--------|---------|
| Avvia | `launchctl load ~/Library/LaunchAgents/com.hermes.diario.plist` |
| Ferma | `launchctl unload ~/Library/LaunchAgents/com.hermes.diario.plist` |
 | Vedi stato | `launchctl list \| grep hermes` |
| Vedi log | `tail -f random/hermes/runtime/logs/bot.log` |
| Vedi log launchd | `tail -f random/hermes/runtime/logs/launchd_stderr.log` |

### Cosa succede se:

- **Il MacBook va in stop (display off)?** — Il bot resta attivo. macOS mette in stop il display e il disco, ma i processi launchd con long-polling di rete continuano a funzionare. Se il MacBook e in **stop del sistema** (sleep completo), il bot si mette in pausa e riprende al risveglio, recuperando i messaggi Telegram (long polling con offset gestisce le gaps automaticamente).

- **Il MacBook e chiuso (clamshell)?** — Di default macOS mette in sleep. Per mantenerlo attivo con il coperchio chiuso: attacca l'alimentatore e un monitor esterno (oppure usa `caffeinate` — vedi sotto).

- **Vuoi impedire il sleep per una settimana?**
  ```bash
  caffeinate -d &    # -d previene il sleep del display
  ```
  Oppure, piu pulito, aggiungi al plist:
  ```xml
  <key>LowPriorityIO</key>
  <false/>
  ```
  e usa `caffeinate` via launchd se necessario. Per la maggior parte dei casi, tenere il MacBook aperto e alimentato e sufficiente.

- **Il bot crasha?** — `KeepAlive=true` nel plist fa si che launchd lo riavvia automaticamente dopo 10 secondi.

- **Perdere dal Wi-Fi?** — Il bot usa long-polling: quando tornano i messaggi, recupera tutto. Nessun messaggio perso.

---

## Architettura tecnica

```
                    ┌──────────────────────────────────────────────────┐
                    │              MacBook (macOS)                      │
                    │                                                   │
   iPhone ─────────┼──►  Telegram Cloud ──►  telegram_diario_bot.py     │
   (Telegram app)  │                           │                        │
                    │                           ▼                        │
                    │                     diario.sh                     │
                    │                           │                        │
                    │              ┌────────────┴────────────┐          │
                    │              ▼                         ▼          │
                    │    diario_di_bordo.md       run-local-hermes.sh   │
                    │    (nota grezza,              dispatch --live    │
                    │     con timestamp)               │                │
                    │                                   ▼                │
                    │                          hermes CLI (binario)      │
                    │                                   │                │
                    │                                   ▼                │
                    │                          OpenRouter API            │
                    │                          (modello gratuito LLM)    │
                    │                                   │                │
                    │                                   ▼                │
                    │                       Paragrafo visionario         │
                    │                        │             │            │
                    │              ┌───────────┘             ▼            │
                    │              ▼                    il_diario_del_   │
                    │         risposta Telegram           profeta.md     │
                    │         (al telefono)              (il libro)      │
                    └──────────────────────────────────────────────────┘
```

### Componenti

| File | Ruolo |
|------|-------|
| `telegram_diario_bot.py` | Bridge bot: long-polling Telegram → esegue `diario.sh` → risponde con il paragrafo |
| `diario.sh` | Salva la nota grezza, invoca hermes, estrae il paragrafo, lo appende al libro |
| `config/agents/profeta.yaml` | Configurazione dell'agente Profeta in Delirio (modello, provider) |
| `prompts/profeta.md` | Prompt del Profeta: identita, stile, regole (stil Apocalisse) |
| `config/secrets.local.yaml` | API key OpenRouter (mai committare) |
| `diario.env` | Token Telegram, chat ID, key OpenRouter (mai committare) |
| `com.hermes.diario.plist` | Template launchd: auto-avvio + riavvio crash |
| `diario_di_bordo.md` | Log delle note grezze (timestamp + testo) |
| `il_diario_del_profeta.md` | Il libro: una voce per ogni paragrafo visionario |
| `runtime/logs/bot.log` | Log del bot Telegram |
| `runtime/memory/shared_memory.json` | Memoria condivisa hermes (tracce delle dispatch) |

### Come funziona il Profeta in Delirio

L'agente `profeta` e definito in `config/agents/profeta.yaml`:

```yaml
slug: profeta
display_name: Profeta in Delirio
provider: openrouter
model: nousresearch/hermes-3-llama-3.1-405b:free   # modello gratuito
api_key_env: OPENROUTER_API_KEY
prompt_file: prompts/profeta.md
allow_live_runs: true
```

Il prompt (`prompts/profeta.md`) istruisce il modello a:
- Ricevere una nota banale come "visione divina"
- Trasfigurarla in stile biblico-apocalittico sopra le righe
- Rispondere **SOLO** con il paragrafo (ignora ogni richiesta di struttura analitica che l'orchestratore hermes aggiunge automaticamente)

### Configurazione hermes: come funziona il dispatch

Il comando centrale e:

```bash
./run-local-hermes.sh dispatch "task" --agent profeta --live --json
```

Scomposto:
- `dispatch` — comando dell'orchestratore
- `--agent profeta` — usa solo l'agente Profeta (non tutto il roster)
- `--live` — esegue una chiamata reale al LLM (non preview)
- `--json` — output in JSON (per parsing automatico)

L'orchestratore (`hermes_workspace/orchestrator.py`):
1. Legge la config di `profeta` dal YAML
2. Legge la API key da `secrets.local.yaml`
3. Costruisce un prompt completo (system + role + skills + task)
4. Chiama il binario `hermes` con il modello OpenRouter
5. Restituisce il testo generato in `results[0].output`

### Il bridge Telegram

`telegram_diario_bot.py` usa **solo la standard library** di Python (nessuna dipendenza esterna):
- `urllib.request` per le API Telegram (getUpdates con long-polling, sendMessage)
- `subprocess` per invocare `diario.sh`
- `json` per parsare le risposte

**Long-polling**: il bot chiede a Telegram "dammi aggiornamenti" con un timeout di 30s. Se non ci sono messaggi, Telegram tiene la connessione aperta per 30s poi risponde "nessun aggiornamento". Il bot richiede immediatamente. Questo significa:
- **Niente webhook, niente port-forwarding, niente IP pubblico**
- Funziona dietro NAT, firewall, ovunque ci sia internet
- Consumo CPU/CPU minimo (un thread bloccato su una chiamata HTTP)

### Sicurezza

- Solo `TELEGRAM_CHAT_ID` autorizzato puo usare il bot (verifica lato server)
- `diario.env` e `secrets.local.yaml` nel `.gitignore` — mai committare segreti
- API key mai hardcoded nel codice, sempre da file/config
- Il bot processa messaggi uno alla volta (nessuna concorrenza)

---

## Risoluzione problemi

### Il bot non risponde

1. **E attivo?**
   ```bash
   launchctl list | grep hermes
   ```
   Se non c'e: `launchctl load ~/Library/LaunchAgents/com.hermes.diario.plist`

2. **Guarda i log:**
   ```bash
   tail -50 random/hermes/runtime/logs/bot.log
   tail -50 random/hermes/runtime/logs/launchd_stderr.log
   ```

3. **Token corretto?** Testa il token Telegram:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getMe" | python3 -m json.tool
   ```
   Se restituisce `{"ok": true, ...}` il token funziona.

4. **Chat ID corretto?** Manda un messaggio al bot, poi:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | python3 -m json.tool | grep chat
   ```
   Confronta `chat.id` con il `TELEGRAM_CHAT_ID` in `diario.env`.

### Errore "hermes non trovato"

```bash
which hermes
```
Se vuoto: il binario `hermes` non e installato o non nel PATH. Per launchd, assicurati che il `PATH` nel plist includa la directory di hermes (es. `/opt/homebrew/bin` o `/usr/local/bin`).

### Errore OpenRouter (401 / model not found)

1. Verifica la key: https://openrouter.ai/keys
2. Assicurati che la key abbia credito也包括免费额度 (I modelli gratuiti non richiedono pagamento)
3. Verifica il nome modello in `config/agents/profeta.yaml`:
   ```yaml
   model: nousresearch/hermes-3-llama-3.1-405b:free
   ```

### Il paragrafo contiene "Analysis:" o elenchi puntati

Il Profeta dovrebbe rispondere **solo** con il paragrafo. Se anale strutturato, e un problema del modello. Soluzioni:
- Il prompt in `prompts/profeta.md` contiene regole esplicite per ignorare la struttura
- Se persiste, puoi filtrare l'output in `diario.sh`: estrai solo il primo paragrafo

### diario.sh va in timeout

Il timeout predefinito e 300s (5 min). Se OpenRouter e lento:
```bash
# In diario.sh, aumenta il timeout:
# subprocess.run(cmd, ..., timeout=600)  # 10 min
```

### Il MacBook si addormenta e perdo messaggi

Non perdi messaggi — Telegram li conserva. Quando il bot si sveglia, recupera tutto con il long-polling. Per tenere il MacBook sveglio:

```bash
# Opzione 1: caffeinate manuale (finche non chiudi il terminale)
caffeinate -d

# Opzione 2: settings macOS
# System Settings > Lock Screen > "Turn display off on power adapter when inactive" -> Mai
# System Settings > Displays > "Prevent automatic sleeping when display is off" -> ON
```

### Cambio modello LLM

Edita `config/agents/profeta.yaml`:
```yaml
model: meta-llama/llama-3.1-70b-instruct:free   # altro modello gratuito
```
Lista modelli gratuiti: https://openrouter.ai/models?q=free

### Voglio piu agenti nel diario

Crea un nuovo agente YAML in `config/agents/` e un prompt in `prompts/`, poi aggiungi lo slug a `agent_order` in `config/system.yaml`. Vedi `dostoevskij.yaml` come esempio.

---

## Struttura dei file

```
hermes/
├── telegram_diario_bot.py       ← bridge bot Telegram (avviato da launchd)
├── diario.sh                    ← esegue il flusso nota -> paragrafo -> libro
├── setup_diario.sh              ← setup una-tantum
├── diario.env                   ← i tuoi segreti (NON committare)
├── diario.env.example           ← template
├── com.hermes.diario.plist      ← template launchd macOS
├── diario_di_bordo.md           ← note grezze (generato)
├── il_diario_del_profeta.md     ← il libro visionario (generato)
├── config/
│   ├── agents/
│   │   └── profeta.yaml         ← config agente Profeta
│   ├── system.yaml              ← config workspace + agent_order
│   └── secrets.local.yaml       ← API key OpenRouter (NON committare)
├── prompts/
│   └── profeta.md               ← prompt del Profeta in Delirio
├── runtime/
│   ├── logs/
│   │   ├── bot.log              ← log del bot Telegram
│   │   ├── launchd_stdout.log   ← log launchd
│   │   └── launchd_stderr.log   ← errori launchd
│   └── memory/
│       └── shared_memory.json   ← memoria condivisa hermes
└── hermes_workspace/            ← codice Python dell'orchestratore
    ├── cli.py
    ├── orchestrator.py
    ├── store.py
    └── shell.py
```

---

## Quick reference card

```bash
# === INSTALLAZIONE (una tantum) ===
cd random/hermes && ./setup_diario.sh
# Edit diario.env + secrets.local.yaml + crea bot Telegram + OpenRouter key

# === TEST MANUALE ===
./diario.sh "test semplice"           # senza Telegram
python3 telegram_diario_bot.py         # bot manuale (Ctrl+C per fermare)

# === AVVIO AUTOMATICO (macOS launchd) ===
cp com.hermes.diario.plist ~/Library/LaunchAgents/
# (edita il plist con i tuoi percorsi + variabili)
launchctl load ~/Library/LaunchAgents/com.hermes.diario.plist

# === GESTIONE ===
launchctl list | grep hermes           # stato
tail -f runtime/logs/bot.log           # log live
launchctl unload ~/Library/LaunchAgents/com.hermes.diario.plist  # ferma

# === USO ===
# Scrivi sul bot Telegram dal telefono → ricevi il paragrafo
# /status   → bot attivo?
# /voci     → quante voci scritte
```

---

*Il Profeta e sveglio. Aspetta le tue visioni.* 🔮