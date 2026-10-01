#!/usr/bin/env bash
#
# Installa un toolchain devkitPro minimale (devkitARM + libgba + libtonc)
# estraendolo dall'immagine Docker ufficiale devkitpro/devkitarm.
#
# Il pacman di devkitPro non e' utilizzabile in questo ambiente: pkg.devkitpro.org
# risponde 404/403 dietro Cloudflare. L'immagine Docker invece si scarica dal
# registry, quindi estraiamo a mano il layer che contiene opt/devkitpro.
#
# Uso: scripts/setup-toolchain.sh [destinazione]   (default: /tmp/devkitpro)
#
set -euo pipefail

DEST="${1:-/tmp/devkitpro}"
LAYER_DIGEST="sha256:3c5026e520aeec9e208399f6d0a62098d5ee4c13d8cca97cdb9adbc6bb56a1c0"
REPO="devkitpro/devkitarm"
CACHE="${TMPDIR:-/tmp}/devkitpro-layer-cache"

log() { printf '[setup-toolchain] %s\n' "$*"; }
die() { printf '[setup-toolchain] ERRORE: %s\n' "$*" >&2; exit 1; }

# --- gia' installato? -------------------------------------------------------

if [ -x "$DEST/devkitARM/bin/arm-none-eabi-gcc" ] \
	&& [ -f "$DEST/libtonc/lib/libtonc.a" ] \
	&& [ -f "$DEST/libgba/lib/libgba.a" ] \
	&& [ -x "$DEST/tools/bin/gbafix" ]; then
	log "toolchain gia' presente in $DEST"
	exit 0
fi

need() { command -v "$1" >/dev/null 2>&1 || die "manca il comando richiesto: $1"; }
need curl
need tar
need python3

mkdir -p "$CACHE"

# --- token del registry ------------------------------------------------------

log "richiedo il token del registry Docker..."
TOKEN="$(curl -fsS "https://auth.docker.io/token?service=registry.docker.io&scope=repository:${REPO}:pull" \
	| python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')"
[ -n "$TOKEN" ] || die "token vuoto dal registry"

# --- download del layer ------------------------------------------------------

TARBALL="$CACHE/devkitpro-layer.tar.gz"
if [ -f "$TARBALL" ] && [ "$(stat -c%s "$TARBALL")" -gt 200000000 ]; then
	log "layer gia' in cache ($TARBALL)"
else
	log "scarico il layer $LAYER_DIGEST (~215 MB)..."
	curl -fsSL -H "Authorization: Bearer $TOKEN" \
		"https://registry-1.docker.io/v2/${REPO}/blobs/${LAYER_DIGEST}" \
		-o "$TARBALL.part"
	mv "$TARBALL.part" "$TARBALL"
	log "download completato ($(du -h "$TARBALL" | cut -f1))"
fi

# --- estrazione selettiva ----------------------------------------------------

# Il layer contiene anche /etc, ma ci servono solo questi sotto-alberi di
# opt/devkitpro: il compilatore, le due librerie GBA e i binari di supporto.
log "estraggo devkitARM, libgba, libtonc e tools/bin in $DEST ..."
mkdir -p "$DEST"
tar xzf "$TARBALL" -C "$DEST" \
	opt/devkitpro/devkitARM \
	opt/devkitpro/libgba \
	opt/devkitpro/libtonc \
	opt/devkitpro/tools/bin \
	opt/devkitpro/portlibs/gba

# Il layer ha un solo livello di profondita: /opt/devkitpro sale di un livello.
# mv dentro una directory esistente finirebbe per annidarla, quindi togliamo
# prima la directory di destinazione e usiamo mv -T per evitare sorprese.
if [ -d "$DEST/opt/devkitpro" ]; then
	log "appiattisco la directory opt/devkitpro"
	mv "$DEST/opt/devkitpro" "$CACHE/devkitpro-flat"
	rmdir "$DEST/opt"
	rmdir "$DEST"
	mv -T "$CACHE/devkitpro-flat" "$DEST"
fi

# --- permessi e verifica -----------------------------------------------------

chmod -R u+rwX "$DEST"
chmod +x "$DEST/tools/bin/"* 2>/dev/null || true

[ -x "$DEST/devkitARM/bin/arm-none-eabi-gcc" ] || die "arm-none-eabi-gcc non trovato"
[ -f "$DEST/libtonc/lib/libtonc.a" ] || die "libtonc.a non trovato"
[ -f "$DEST/libgba/lib/libgba.a" ] || die "libgba.a non trovato"
[ -x "$DEST/tools/bin/gbafix" ] || die "gbafix non eseguibile"

GCC_VER="$("$DEST/devkitARM/bin/arm-none-eabi-gcc" -dumpversion)"

cat <<EOF

[setup-toolchain] toolchain pronto in $DEST

  gcc        $GCC_VER
  libtonc    $("$DEST/devkitARM/bin/arm-none-eabi-ar" t "$DEST/libtonc/lib/libtonc.a" | wc -l) oggetti
  libgba     $("$DEST/devkitARM/bin/arm-none-eabi-ar" t "$DEST/libgba/lib/libgba.a" | wc -l) oggetti

Per costruire il gioco:
  export DEVKITPRO=$DEST
  export DEVKITARM=\$DEVKITPRO/devkitARM
  export PATH=\$DEVKITARM/bin:\$DEVKITPRO/tools/bin:\$PATH
  make

EOF
