#!/usr/bin/env bash
set -e

echo "🚀 Bootstrapping Termux Web App..."

# ---- Python env -------------------------------------------------
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# ---- Frontend build ---------------------------------------------
cd frontend
pnpm install
pnpm run build   # creates ./dist

# ---- Ngrok authtoken (optional but recommended) -----------------
# Sign up at https://dashboard.ngrok.com/get-started/your-authtoken
# then replace the placeholder below:
# ngrok authtoken YOUR_AUTH_TOKEN

echo "✅ Bootstrap complete!"