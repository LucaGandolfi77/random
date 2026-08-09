# Hermes Principina — il Diario del Profeta da Telegram

Il MacBook resta a casa acceso, un bot Telegram gira in background e tu scrivi solo dal telefono. Ogni messaggio diventa un paragrafo visionario (stile Apocalisse + Dostoevskij) salvato in un libro `.md` che cresce voce dopo voce.

```
iPhone (Telegram) ──► MacBook (bot) ──► diario.sh ──► hermes ──► OpenRouter (LLM)
                                                          │
                        risposta su Telegram ◄───────────┘
                                                          │
                        il_diario_del_profeta.md ◄────────┘ (il libro)
```

---

## Struttura

```
random/hermes-principina/
├── .venv/                    ← ambiente Python (nella cartella padre del progetto)
└── hermes/
    ├── diario.sh             ← nota → paragrafo → libro
    ├── telegram_diario_bot.py← bridge Telegram (gira 24/7)
    ├── setup_diario.sh       ← setup una tantum
    ├── diario.env            ← token Telegram + chat ID (MAI committare)
    ├── com.hermes.diario.plist ← template launchd (già installato)
    ├── config/
    │   ├── agents/*.yaml     ← i 11 agenti (modelli LLM)
    │   └── secrets.local.yaml← API key OpenRouter (MAI committare)
    ├── prompts/              ← identità dei personaggi
    ├── runtime/logs/         ← log del bot
    └── il_diario_del_profeta.md ← il libro (generato)
```

Il venv è in `hermes-principina/.venv` (NON dentro `hermes/`): `run-local-hermes.sh` lo cerca nel parent e lo attiva da solo, quindi non devi mai attivarlo a mano.

---

## Prerequisiti

- macOS (il Mac che resta a casa)
- Python 3.11+ (`python3 --version`)
- Il binario `hermes` già installato e nel PATH (`which hermes` → `/Users/lgandolfi/.local/bin/hermes`)
- Un account OpenRouter (modelli gratuiti, senza carta di credito)
- Un bot Telegram (token da @BotFather) e il tuo chat ID (da @userinfobot)

---

## Come si crea da zero (se devi ricostruirlo)

```bash
# 1. Copia il progetto in una cartella nuova (o clonalo da git)
cp -R random/hermes random/hermes-principina/hermes

# 2. Setup: crea il venv nel parent, installa le dipendenze,
#    genera diario.env e secrets.local.yaml dai template
cd random/hermes-principina/hermes
./setup_diario.sh

# 3. Verifica che hermes risponda
./run-local-hermes.sh agent list
```

Nota: i modelli gratuiti di OpenRouter cambiano spesso. Quelli configurati ora (luglio 2026) sono:
- `profeta` e `dostoevskij` → `nvidia/nemotron-3-ultra-550b-a55b:free`
- gli altri agenti → `nvidia/nemotron-3-super-120b-a12b:free`

Per vedere la lista `:free` aggiornata:
```bash
curl -s "https://openrouter.ai/api/v1/models" | python3 -c "import sys,json;[print(m['id']) for m in json.load(sys.stdin)['data'] if m['id'].endswith(':free')]"
```

---

## Configurazione (una volta sola)

### 1. `diario.env` — i tuoi token

```bash
open -e diario.env    # o: nano diario.env
```

Compila solo i campi segreti (`HERMES_DIR` e `DIARIO_LOG` sono già a posto):

```ini
TELEGRAM_BOT_TOKEN=123456789:ABC...   # da @BotFather (/newbot)
TELEGRAM_CHAT_ID=987654321            # il TUO id, da @userinfobot
OPENROUTER_API_KEY=sk-or-v1-...       # da openrouter.ai → Keys
```

> Il chat ID è il filtro di sicurezza: solo quel numero può usare il bot.

### 2. `config/secrets.local.yaml` — API key (opzionale)

Il binario `hermes` usa già la sua auth globale, quindi il sistema funziona anche senza. Per coerenza puoi comunque inserire la stessa OpenRouter key:

```bash
open -e config/secrets.local.yaml
```

---

## Uso locale (test sul Mac, senza Telegram)

```bash
cd random/hermes-principina/hermes
./diario.sh "ho finito la configurazione"          # nota → paragrafo → libro
```

Se vedi un paragrafo visionario tra i `====` e `il_diario_del_profeta.md` esiste, funziona.

Altri comandi utili:
```bash
./run-local-hermes.sh agent list                          # agenti disponibili
./run-local-hermes.sh dispatch "un compito" --agent profeta --live --json
```

---

## Uso da Telegram (la parte che vuoi tu)

### Test manuale

```bash
cd random/hermes-principina/hermes
python3 telegram_diario_bot.py
```

Deve comparire `Bot diario avviato. Chat autorizzato: 987654321`. Da Telegram scrivi qualcosa al bot → risponde con la visione. Ctrl+C per fermare.

### 24/7 con launchd (il PC a casa)

Il servizio è già installato:

```bash
launchctl load ~/Library/LaunchAgents/com.hermes.diario.plist   # avvia ora e al login
```

Da questo momento scrivi solo dal telefono. Il bot:
- parte al login e resta attivo per sempre
- si riavvia da solo se crasha (`KeepAlive`)
- usa long-polling: niente porte aperte, niente IP pubblico, funziona dietro qualsiasi rete

### Tenere il Mac sveglio

Il bot è un long-polling HTTP: non consuma quasi nulla e resta vivo anche a display spento. Per non farlo dormire quando chiudi il coperchio:

```bash
caffeinate -d &          # impedisce il sleep (finché il terminale resta aperto)
```

Il modo più robusto è lasciarlo su scrivania con alimentatore e monitor esterno collegati (così resta sveglio anche da chiuso). Se il Mac va in sleep completo, il bot si mette in pausa e al risveglio recupera tutti i messaggi (Telegram li conserva, nessuna perdita).

---

## Gestione del servizio

| Azione | Comando |
|---|---|
| Avvia | `launchctl load ~/Library/LaunchAgents/com.hermes.diario.plist` |
| Ferma | `launchctl unload ~/Library/LaunchAgents/com.hermes.diario.plist` |
| Stato | `launchctl list \| grep diario` |
| Log live | `tail -f random/hermes-principina/hermes/runtime/logs/bot.log` |
| Errori launchd | `tail -f random/hermes-principina/hermes/runtime/logs/launchd_stderr.log` |

Comandi del bot:
| Comando | Effetto |
|---|---|
| (qualsiasi testo) | Trasformato in paragrafo visionario |
| `/status` | Il bot è vivo? |
| `/voci` | Quante voci scritte finora |

---

## Risoluzione problemi

- **401 Unauthorized nei log** → token Telegram sbagliato in `diario.env`. Verifica:
  ```bash
  curl -s "https://api.telegram.org/bot<TOKEN>/getMe"
  ```
- **Bot che non risponde ma è carico** → `tail -f runtime/logs/bot.log` e `launchctl list | grep diario`.
- **Errore modello (404 / unavailable)** → il modello `:free` è stato rimosso da OpenRouter. Prendi uno slug dalla lista aggiornata (vedi sopra) e cambialo in `config/agents/*.yaml`.
- **`hermes: command not found`** → il plist ha già `.local/bin` nel PATH; se il binario è altrove, aggiorna il PATH in `~/Library/LaunchAgents/com.hermes.diario.plist`.
- **Ricarica config dopo una modifica** → gli agenti si ricaricano a ogni comando; il bot non va riavviato per le YAML, solo se tocchi `diario.env` o `telegram_diario_bot.py`.

---

*Il Profeta è sveglio. Aspetta le tue visioni.*
