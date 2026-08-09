#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
Hermes Specialist Workspace

Core commands:
  ./run-local-hermes.sh system show
  ./run-local-hermes.sh agent list
  ./run-local-hermes.sh agent show ricercatore
  ./run-local-hermes.sh agent show statistico
  ./run-local-hermes.sh agent show architetto
  ./run-local-hermes.sh skills list
  ./run-local-hermes.sh dispatch "Task solo ricerca" --agent ricercatore
  ./run-local-hermes.sh dispatch "Task ricerca + review" --agent ricercatore --agent revisore
  ./run-local-hermes.sh dispatch "Valuta un dataset e gli scenari" --agent statistico --agent economista
  ./run-local-hermes.sh dispatch "Analizza vincoli e architettura" --agent giurista --agent architetto
  ./run-local-hermes.sh tui
  ./run-local-hermes.sh tui --snapshot

Live config edits:
  ./run-local-hermes.sh agent update ricercatore --role "Ricerca, scraping e analisi dati"
  ./run-local-hermes.sh agent update sviluppatore --skill-add testing --tool-add pytest
  ./run-local-hermes.sh agent update revisore --prompt-text "Controlla coerenza, chiarezza e formattazione."
  ./run-local-hermes.sh agent update sviluppatore --api-key-env OPENROUTER_API_KEY

Shared memory:
  ./run-local-hermes.sh memory add --author operatore --content "Nota persistente di progetto"
  ./run-local-hermes.sh memory list
  ./run-local-hermes.sh memory search backlog

Parallel orchestration:
  ./run-local-hermes.sh dispatch "Analizza la codebase e proponi un fix"
  ./run-local-hermes.sh dispatch "Esegui il task con Hermes reale" --live

Interactive slash shell:
  ./run-local-hermes.sh shell
  ./run-local-hermes.sh shell --agent sviluppatore
  /agents
  /show sviluppatore
  /targets
  /targets set ricercatore revisore
  /targets clear
  /skill add ricercatore scraping
  /apikey sviluppatore sk-or-...
  /dispatch "Prepara piano, patch e review"

Interactive TUI:
  ./run-local-hermes.sh tui
  ./run-local-hermes.sh tui --live-default
  ./run-local-hermes.sh tui --agent ricercatore --agent revisore
  Inside the TUI:
    frecce su/giu o j/k    cambia agente
    Spazio                 toggle agente nel gruppo attivo
    F2                     toggle preview/live
    Invio                  esegue il buffer comandi
    /targets set ricercatore revisore
    /targets clear
    /prompt revisore "Nuovo prompt"
    /role sviluppatore "Codice, debug e test"
    /dispatch "Analizza e proponi fix"
    /live "Esegui con Hermes reale"
EOF