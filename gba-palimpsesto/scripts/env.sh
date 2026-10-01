#!/usr/bin/env bash
#
# Variabili d'ambiente per costruire Palimpsesto.
#   source scripts/env.sh
#
# Se il toolchain non esiste lo installa con setup-toolchain.sh.
#
set -u

PALE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
DEVKITPRO="${DEVKITPRO:-/tmp/devkitpro}"

if [ ! -x "$DEVKITPRO/devkitARM/bin/arm-none-eabi-gcc" ]; then
	echo "[env] toolchain non trovato in $DEVKITPRO, installo..."
	"$PALE_ROOT/scripts/setup-toolchain.sh" "$DEVKITPRO" || {
		echo "[env] installazione fallita" >&2
		return 1 2>/dev/null || exit 1
	}
fi

export DEVKITPRO
export DEVKITARM="$DEVKITPRO/devkitARM"
export PATH="$DEVKITARM/bin:$DEVKITPRO/tools/bin:$PATH"

echo "[env] DEVKITPRO=$DEVKITPRO"
echo "[env] DEVKITARM=$DEVKITARM"
