#!/usr/bin/env bash
# setup_diario.sh — configurazione una-tantum del sistema Diario del Profeta
# Esegue: controlla prerequisiti, crea diario.env, configura secrets, installa launchd
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; NC="\033[0m"
say() { echo -e "${BOLD}▶ $1${NC}"; }
ok()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn(){ echo -e "  ${YELLOW}⚠${NC} $1"; }
err() { echo -e "  ${RED}✗${NC} $1"; }

echo ""
say "Setup Diario del Profeta in Delirio"
echo "==================================="
echo ""

# 1. Python
say "Controllo Python 3..."
if command -v python3 &>/dev/null; then
  PYV=$(python3 --version 2>&1)
  ok "Python: $PYV ($(which python3))"
else
  err "Python 3 non trovato. Installa da python.org o: brew install python3"
  exit 1
fi

# 2. hermes binary
say "Controllo binario hermes..."
if command -v hermes &>/dev/null; then
  ok "hermes trovato: $(which hermes)"
else
  warn "hermes non nel PATH. Installa il CLI hermes prima di continuare."
  warn "   (Vedi README_DIARIO.md sezione Prerequisiti)"
fi

# 3. Dependencies workspace
say "Controllo dipendenze Python workspace..."
if [ -f "$DIR/../.venv/bin/activate" ]; then
  ok "Virtualenv trovato: $DIR/../.venv"
else
  warn "Virtualenv non trovato. Creandolo..."
  python3 -m venv "$DIR/../.venv"
  ok "Virtualenv creato."
fi
# shellcheck disable=SC1091
source "$DIR/../.venv/bin/activate" 2>/dev/null || true
pip install -q PyYAML typer rich 2>/dev/null && ok "Dipendenze Python installate." || warn "pip install richiede attenzione."

# 4. diario.env
say "Controllo diario.env..."
if [ -f "$DIR/diario.env" ]; then
  ok "diario.env esiste già."
else
  if [ -f "$DIR/diario.env.example" ]; then
    cp "$DIR/diario.env.example" "$DIR/diario.env"
    warn "diario.env creato da template. DEVI editarlo con i tuoi token:"
    warn "   $DIR/diario.env"
  else
    err "diario.env.example non trovato!"
  fi
fi

# 5. .gitignore safety
say "Controllo .gitignore..."
if grep -q "diario.env" "$DIR/.gitignore" 2>/dev/null; then
  ok "diario.env nel .gitignore."
else
  echo "diario.env" >> "$DIR/.gitignore"
  echo "diario_local_*" >> "$DIR/.gitignore"
  ok "Aggiunto diario.env al .gitignore."
fi

# 6. Cartella log
say "Creazione cartelle runtime..."
mkdir -p "$DIR/runtime/logs"
ok "runtime/logs creata."

# 7. OpenRouter key -> secrets.local.yaml
say "Configurazione OpenRouter key..."
if [ -f "$DIR/config/secrets.local.yaml" ]; then
  ok "secrets.local.yaml esiste. Verifica che contenga la key per 'profeta'."
else
  warn "secrets.local.yaml non trovato. Creandolo..."
  cat > "$DIR/config/secrets.local.yaml" <<'YAMLEOF'
agents:
  profeta:
    api_key: "INSERISCI_QUI_LA_TUA_OPENROUTER_API_KEY"
  dostoevskij:
    api_key: "INSERISCI_QUI_LA_TUA_OPENROUTER_API_KEY"
YAMLEOF
  warn "Creato config/secrets.local.yaml — edita con la tua OPENROUTER_API_KEY"
fi

echo ""
say "Setup completato!"
echo ""
echo "  ${BOLD}Prossimi passi:${NC}"
echo "  1. Ottieni un bot token Telegram: parla con @BotFather, /newbot"
echo "  2. Scopri il tuo chat ID: scrivi a @userinfobot"
echo "  3. Ottieni una API key da https://openrouter.ai (modelli gratuiti)"
echo "  4. Edit ${BOLD}$DIR/diario.env${NC} con i 3 valori"
echo "  5. Edit ${BOLD}$DIR/config/secrets.local.yaml${NC} con la OpenRouter key"
echo "  6. Test manuale: ${BOLD}cd $DIR && python3 telegram_diario_bot.py${NC}"
echo "  7. Per auto-avvio su macOS: vedi README_DIARIO.md sezione launchd"
echo ""