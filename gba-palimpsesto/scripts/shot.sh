#!/usr/bin/env bash
#
# Cattura un frame del ROM in mGBA headless.
#
# Uso: scripts/shot.sh <rom.gba> <out.png> [secondi]
#
# Diversamente da gba-marmotta/scripts/run-rom.sh, questo non usa pkill: pulisce
# solo i processi che avvia lui, tramite i PID. Un pkill con un pattern largo
# ("mgba") puo' uccidere anche la shell che lo lancia, e in un ambiente
# condiviso blocca la sessione.
#
set -uo pipefail

ROM="${1:?uso: shot.sh <rom.gba> <out.png> [secondi]}"
OUT="${2:?uso: shot.sh <rom.gba> <out.png> [secondi]}"
RUNFOR="${3:-5}"

[ -f "$ROM" ] || { echo "[shot] ROM non trovato: $ROM" >&2; exit 1; }

MGBA="$(command -v mgba || true)"
if [ -z "$MGBA" ]; then
	for c in /usr/games/mgba /usr/bin/mgba /usr/local/bin/mgba; do
		[ -x "$c" ] && { MGBA="$c"; break; }
	done
fi
[ -n "$MGBA" ] || { echo "[shot] mGBA non trovato" >&2; exit 1; }
command -v Xvfb >/dev/null || { echo "[shot] Xvfb mancante" >&2; exit 1; }

# Un display dedicato scelto dalla shell, cos' non si scontra con altri.
DISP="${PALI_DISPLAY:-:97}"
MINE=""

cleanup() {
	[ -n "${EMU_PID:-}" ] && kill "$EMU_PID" 2>/dev/null
	[ -n "$MINE" ] && kill "$MINE" 2>/dev/null
	return 0
}
trap cleanup EXIT

if ! xdpyinfo -display "$DISP" >/dev/null 2>&1; then
	rm -f "/tmp/.X${DISP#:}-lock" 2>/dev/null
	Xvfb "$DISP" -screen 0 800x600x24 -nolisten tcp >/tmp/palimpsesto-xvfb.log 2>&1 &
	MINE=$!
	for _ in $(seq 1 30); do
		xdpyinfo -display "$DISP" >/dev/null 2>&1 && break
		sleep 0.3
	done
fi
xdpyinfo -display "$DISP" >/dev/null 2>&1 || { echo "[shot] Xvfb non parte" >&2; exit 1; }

export DISPLAY="$DISP"
export SDL_AUDIODRIVER=dummy

LOG="$(mktemp)"
"$MGBA" "-2" "$ROM" >"$LOG" 2>&1 &
EMU_PID=$!

# Aspetto che la finiglia esista, invece di fermarmi a un tempo fisso.
WID=""
for _ in $(seq 1 40); do
	kill -0 "$EMU_PID" 2>/dev/null || break
	WID="$(xwininfo -root -tree 2>/dev/null \
		| grep -oE '0x[0-9a-f]+ "mGBA"' | head -1 | grep -oE '0x[0-9a-f]+')"
	[ -n "$WID" ] && break
	sleep 0.25
done

if [ -n "$WID" ]; then
	sleep "$RUNFOR"
else
	sleep 1
fi

if ! kill -0 "$EMU_PID" 2>/dev/null; then
	echo "[shot] WARNING: mGBA e' uscito prima del previsto:"
	sed 's/^/    /' "$LOG" | head -20
	exit 1
fi

if [ -z "$WID" ]; then
	echo "[shot] finestra mGBA non trovata" >&2
	exit 1
fi

mkdir -p "$(dirname "$OUT")"

# Catturo la finestra, non la root: la root includerebbe bordi neri e non e'
# quello che si vede sullo schermo del gioco.
if command -v xwd >/dev/null; then
	xwd -id "$WID" -silent | convert xwd:- "$OUT"
else
	import -window "$WID" "$OUT"
fi

if [ ! -s "$OUT" ]; then
	echo "[shot] screenshot vuoto: controllo $LOG" >&2
	exit 1
fi

echo "[shot] $OUT ($(identify -format '%wx%h' "$OUT"))"
rm -f "$LOG"