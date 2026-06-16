#!/usr/bin/env bash
set -e

# Create Python virtual environment
python -m venv .venv
source .venv/bin/activate

# Upgrade pip and install backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "Backend dependencies installed."