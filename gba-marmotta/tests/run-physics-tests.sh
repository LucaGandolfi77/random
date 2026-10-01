#!/usr/bin/env bash
#
# Banco di prova del motore fisica sul PC.
#
# Compila physics.c e materials.c per x86-64 e gira i test: e' il modo piu'
# rapido per capire se un difetto del solver e' nel solver o nell'emulatore,
# perche' sul PC possiamo stampare posizioni e guardare le cascate.
#
# Uso: tests/run-physics-tests.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/marmotta-physics-test"

cd "$ROOT"

gcc -std=c11 -O1 -g \
	-Wall -Wextra -Wno-unused-parameter \
	-DMARMOTTA_HOST \
	-I tests/host -I include -I source \
	tests/host/test_physics.c \
	source/physics.c \
	source/materials.c \
	-o "$OUT" \
	-lm || {
		echo "compilazione fallita" >&2
		exit 1
	}

"$OUT"
