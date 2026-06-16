#!/usr/bin/env bash
set -e

echo "🚀 Starting Termux Web App services..."

# Activate Python environment
source .venv/bin/activate

# Start FastAPI backend
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &

# Start ngrok tunnel
ngrok http 8000 --region us --log=stdout &

echo "✅ Services started!"
echo "API available at http://127.0.0.1:8000"
echo "Public URL will be shown in ngrok output above."