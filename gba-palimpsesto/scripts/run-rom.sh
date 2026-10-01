#!/usr/bin/env bash
#
# Esegue un ROM GBA in mGBA headless (Xvfb + SDL dummy audio).
#
# Uso:
#   scripts/run-rom.sh <rom.gba> [immagine.png] [secondi]
#
# Con un secondo argomento cattura un frame dell'emulatore e lo salva.
# Premendo un tasto si puo pilotare l'emulatore: i tasti sono mappati con
#   -C <chiave>=<tasto>   (vedi `mgba --help` per l'elenco dei tasti)
#
set -uo pipefail

ROM="${1:?uso: run-rom.sh <rom.gba> [png] [secondi]}"
SHOT="${2:-}"
SECONDS_TO_RUN="${3:-4}"
DISPLAY_NUM=":98"
SCALE=2

[ -f "$ROM" ] || { echo "[run] ROM non trovato: $ROM" >&2; exit 1; }

MGBA="$(command -v mgba || true)"
if [ -z "$MGBA" ]; then
	for c in /usr/games/mgba /usr/bin/mgba /usr/local/bin/mgba; do
		[ -x "$c" ] && { MGBA="$c"; break; }
	done
fi
[ -n "$MGBA" ] || { echo "[run] mGBA non trovato. Installa: sudo apt install mgba-sdl xvfb" >&2; exit 1; }

XVFB_PID=""
cleanup() {
	[ -n "${EMU_PID:-}" ] && kill "$EMU_PID" 2>/dev/null
	[ -n "$XVFB_PID" ] && kill "$XVFB_PID" 2>/dev/null
	return 0
}
trap cleanup EXIT

# Qualsiasi mGBA rimasto attivo mostrerebbe una finestra vecchia sulla quale
# finiremmo per fotografare il ROM precedente invece di quello appena costruito.
# Lo script uccide solo le istanze che condividono il nostro ROM, cosi' non
# tocchiamo un eventuale emulator aperto a mano dall'utente.
pkill -f "mgba.*${ROM##*/}" 2>/dev/null
sleep 0.5

# Usiamo sempre un display dedicato :98, cosi' non dipendiamo da eventuali
# Xvfb gia' presenti (che potrebbero avere una geometria diversa).
OWN_DISPLAY=1

if xdpyinfo -display "$DISPLAY_NUM" >/dev/null 2>&1 \
	&& [ "$(xwininfo -display "$DISPLAY_NUM" -root 2>/dev/null | awk '/Width/{print $2}')" -lt 500 ]; then
	# Display gia' avviato ma troppo piccolo per lo screenshot.
	pkill -f "Xvfb $DISPLAY_NUM" 2>/dev/null
	sleep 1
fi

if ! xdpyinfo -display "$DISPLAY_NUM" >/dev/null 2>&1; then
	command -v Xvfb >/dev/null || { echo "[run] Xvfb non trovato" >&2; exit 1; }
	Xvfb "$DISPLAY_NUM" -screen 0 800x600x24 -nolisten tcp >/tmp/palimpsesto-xvfb.log 2>&1 &
	XVFB_PID=$!
	OWN_DISPLAY=1
	sleep 2
fi

export DISPLAY="$DISPLAY_NUM"
export SDL_AUDIODRIVER=dummy
export SDL_VIDEODRIVER="${SDL_VIDEODRIVER:-x11}"

LOG=$(mktemp)
"$MGBA" "-$SCALE" "$ROM" >"$LOG" 2>&1 &
EMU_PID=$!

# Attende che la finestra della nostra istanza compaia, invece di fermarci a un
# tempo fisso: cosi' lo screenshot non e' mai di una finestra non ancora mappata.
WID=""
for _ in $(seq 1 40); do
	kill -0 "$EMU_PID" 2>/dev/null || break
	WID="$(xwininfo -root -tree 2>/dev/null \
		| grep -oE '0x[0-9a-f]+ "mGBA"' | head -1 | grep -oE '0x[0-9a-f]+')"
	[ -n "$WID" ] && break
	sleep 0.25
done

# Dopo che la finestra esiste, lascia ancora qualche frame all'emulatore.
if [ -n "$WID" ]; then
	sleep "$SECONDS_TO_RUN"
else
	sleep 1
fi

if ! kill -0 "$EMU_PID" 2>/dev/null; then
	echo "[run] WARNING: l'emulatore e' uscito prima del previsto:"
	sed 's/^/    /' "$LOG" | head -20
	exit 1
fi

if [ -n "$SHOT" ]; then
	mkdir -p "$(dirname "$SHOT")"

	# Catturiamo la finestra dell'emulatore, non la root: la root includerebbe
	# bordi neri e non e' quello che si vede sullo schermo del gioco.
	if [ -z "$WID" ]; then
		echo "[run] finestra mGBA non trovata" >&2
		exit 1
	fi

	if command -v xwd >/dev/null; then
		xwd -id "$WID" -silent | convert xwd:- "$SHOT"
	elif command -v import >/dev/null; then
		import -window "$WID" "$SHOT"
	else
		echo "[run] nessuno strumento per catturare lo schermo" >&2
		exit 1
	fi

	if [ -s "$SHOT" ]; then
		echo "[run] screenshot salvato in $SHOT ($(identify -format '%wx%h' "$SHOT"))"
	else
		echo "[run] screenshot vuoto: controlla $LOG" >&2
		exit 1
	fi
fi

if [ -z "$SHOT" ]; then
	# Resta in foreground finche l'utente non lo interrompe.
	wait "$EMU_PID"
fi

rm -f "$LOG"
