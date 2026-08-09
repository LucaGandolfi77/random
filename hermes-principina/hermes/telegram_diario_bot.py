#!/usr/bin/env python3
"""Bridge bot Telegram -> diario.sh (Profeta in Delirio).

Funzionamento:
  - Long-polling sulle API Telegram (nessun webhook, nessun port-forwarding).
  - Quando l'utente autorizzato invia un messaggio, il bot:
      1. Salva la nota in diario_di_bordo.md (tramite diario.sh)
      2. Invoca hermes -> profeta -> paragrafo visionario
      3. Risponde su Telegram con il paragrafo

Sicurezza: solo il CHAT_ID autorizzato in diario.env puo usare il bot.

Avvio:  python3 telegram_diario_bot.py
Oppure tramite launchd (vedi README_DIARIO.md).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Configurazione da ambiente / diario.env
# ---------------------------------------------------------------------------
def load_env():
    env_path = SCRIPT_DIR / "diario.env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip()
                if v and not os.environ.get(k):
                    os.environ[k] = v

load_env()

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ALLOWED_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
HERMES_DIR = os.environ.get("HERMES_DIR", str(SCRIPT_DIR))
LOG_FILE = os.environ.get("DIARIO_LOG", str(SCRIPT_DIR / "runtime" / "logs" / "bot.log"))

TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
def log(msg: str):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Telegram API helpers (stdlib urllib, zero dipendenze)
# ---------------------------------------------------------------------------
def tg_call(method: str, payload: dict) -> dict:
    url = f"{TELEGRAM_API}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:300]
        log(f"Telegram API error {e.code}: {body}")
        return {"ok": False, "error": body}
    except Exception as e:
        log(f"Telegram API exception: {e}")
        return {"ok": False, "error": str(e)}

def tg_send(chat_id, text, parse_mode=None):
    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    # Telegram max message length: 4096 chars; split if needed
    while text:
        chunk = text[:4000]
        text = text[4000:]
        payload["chat_id"] = chat_id
        payload["text"] = chunk
        if parse_mode:
            payload["parse_mode"] = parse_mode
        tg_call("sendMessage", payload)
        if not text:
            break

# ---------------------------------------------------------------------------
# diario.sh invocation
# ---------------------------------------------------------------------------
def run_diario(entry: str) -> tuple[bool, str]:
    """Esegue diario.sh con la voce; ritorna (success, output_paragraph_or_error)."""
    cmd = [str(SCRIPT_DIR / "diario.sh"), entry]
    log(f"Invoking diario.sh with entry: {entry[:80]}...")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(SCRIPT_DIR),
        )
    except subprocess.TimeoutExpired:
        return False, "⏱ Timeout: il Profeta ha perso il senno tra le visioni."
    except Exception as e:
        return False, f"Errore esecuzione: {e}"

    if result.returncode != 0:
        err = (result.stderr or result.stdout or "").strip()[:500]
        return False, f"❌ diario.sh fallito:\n{err}"

    out = result.stdout.strip()
    # Extract the paragraph (everything between the === lines, or full stdout)
    if "================================================================" in out:
        parts = out.split("================================================================")
        # paragraph is typically the last non-empty part
        paragraph = parts[-2].strip() if len(parts) >= 2 else out
    else:
        paragraph = out
    return True, paragraph

# ---------------------------------------------------------------------------
# Main loop: long polling
# ---------------------------------------------------------------------------
def main():
    if not BOT_TOKEN:
        print("ERRORE: TELEGRAM_BOT_TOKEN non impostato.")
        print("Crea diario.env con il tuo token (vedi README_DIARIO.md).")
        sys.exit(1)
    if not ALLOWED_CHAT_ID:
        print("ERRORE: TELEGRAM_CHAT_ID non impostato.")
        print("Aggiungi il tuo chat ID a diario.env per autorizzare solo te.")
        sys.exit(1)

    log(f"Bot diario avviato. Chat autorizzato: {ALLOWED_CHAT_ID}")
    log(f"Cartella hermes: {HERMES_DIR}")
    log(f"Log file: {LOG_FILE}")

    # Notifica avvio
    tg_send(ALLOWED_CHAT_ID, "🔮 Profeta in Delirio è sveglio.\nScrivi cosa stai facendo e io lo trasfigurerò.")

    offset = 0
    poll_timeout = 30  # long polling seconds

    while True:
        try:
            payload = {"offset": offset, "timeout": poll_timeout, "allowed_updates": ["message"]}
            resp = tg_call("getUpdates", payload)
            if not resp.get("ok"):
                log(f"getUpdates fallito: {resp.get('error', '?')}")
                time.sleep(5)
                continue

            for update in resp.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message")
                if not msg:
                    continue

                chat_id = str(msg.get("chat", {}).get("id", ""))
                text = (msg.get("text") or "").strip()

                # Security: only allowed chat
                if chat_id != ALLOWED_CHAT_ID:
                    log(f"Unauthorized chat_id {chat_id} — ignored")
                    tg_send(chat_id, "⛔ Non sei autorizzato.")
                    continue

                # Skip commands / empty
                if not text or text.startswith("/"):
                    if text == "/start":
                        tg_send(chat_id, "🔮 Scrivi cosa stai facendo. Lo trasformo in una visione.")
                    elif text == "/status":
                        tg_send(chat_id, "✅ Il Profeta è sveglio e in ascolto.")
                    elif text == "/voci":
                        book = SCRIPT_DIR / "il_diario_del_profeta.md"
                        if book.exists():
                            count = book.read_text().count("\n### Voce ")
                            tg_send(chat_id, f"📖 {count} voci trascritte finora.")
                        else:
                            tg_send(chat_id, "📖 Nessuna voce ancora.")
                    continue

                log(f"Ricevuto da {chat_id}: {text[:80]}")

                # Acknowledge receipt
                tg_send(chat_id, "🪬 Il Profeta riceve la visione...")

                # Run diario.sh
                ok, output = run_diario(text)

                if ok:
                    log("Paragrafo generato con successo.")
                    tg_send(chat_id, output)
                else:
                    log(f"Errore: {output[:120]}")
                    tg_send(chat_id, f"⚠️ {output}")

        except KeyboardInterrupt:
            log("Bot fermato dall'utente.")
            break
        except Exception as e:
            log(f"Errore nel loop principale: {e}")
            time.sleep(10)

if __name__ == "__main__":
    main()