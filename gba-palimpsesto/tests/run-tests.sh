#!/usr/bin/env bash
#
# Banco di prova della logica di Palimpsesto sul PC.
#
# Compila battle.c e battle_ai.c per x86-64 e gira i test. E' il modo piu'
# rapido per bilanciare il combattimento: cambiare un numero e rilanciare
# costa un secondo, invece di un boot di mGBA.
#
# Uso: tests/run-tests.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/palimpsesto-tests"

cd "$ROOT"

gcc -std=c11 -O1 -g \
	-Wall -Wextra -Wno-unused-parameter \
	-DPALIMPSESTO_HOST \
	-I tests/host -I include \
	tests/host/test_battle.c \
	source/battle.c \
	source/battle_ai.c \
	-o "$OUT" || {
		echo "compilazione fallita" >&2
		exit 1
	}

"$OUT"