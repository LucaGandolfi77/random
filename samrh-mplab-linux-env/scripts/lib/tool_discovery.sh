#!/usr/bin/env bash

tool_discovery_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./log.sh
source "$tool_discovery_dir/log.sh"

absolute_path() {
    local target_path

    target_path="${1:?path is required}"

    if [[ -d "$target_path" ]]; then
        (cd "$target_path" && pwd -P)
        return 0
    fi

    (cd "$(dirname "$target_path")" && printf '%s/%s\n' "$(pwd -P)" "$(basename "$target_path")")
}

resolve_first_executable() {
    local candidate

    for candidate in "$@"; do
        if [[ -x "$candidate" ]]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    return 1
}

discover_mplabx_dir() {
    local candidate
    local candidates=()

    if [[ -n "${MPLABX_DIR:-}" ]]; then
        [[ -d "$MPLABX_DIR" ]] || die "MPLABX_DIR does not exist: $MPLABX_DIR"
        absolute_path "$MPLABX_DIR"
        return 0
    fi

    shopt -s nullglob
    candidates=(
        /opt/microchip/mplabx
        /opt/microchip/mplabx/*
        /opt/microchip/MPLABX
        /opt/microchip/MPLABX/*
        "$HOME"/microchip/mplabx
        "$HOME"/microchip/mplabx/*
        "$HOME"/Microchip/mplabx
        "$HOME"/Microchip/mplabx/*
    )
    shopt -u nullglob

    for candidate in "${candidates[@]}"; do
        if [[ -x "$candidate/mplab_platform/bin/mdb.sh" ]] || [[ -x "$candidate/mplab_ide/bin/mdb.sh" ]]; then
            absolute_path "$candidate"
            return 0
        fi
    done

    return 1
}

discover_mdb_path() {
    local mplabx_dir
    local candidate
    local candidates=()

    if [[ -n "${MDB_PATH:-}" ]]; then
        [[ -x "$MDB_PATH" ]] || die "MDB_PATH is not executable: $MDB_PATH"
        absolute_path "$MDB_PATH"
        return 0
    fi

    if command -v mdb.sh >/dev/null 2>&1; then
        command -v mdb.sh
        return 0
    fi

    if mplabx_dir="$(discover_mplabx_dir 2>/dev/null)"; then
        candidates=(
            "$mplabx_dir/mplab_platform/bin/mdb.sh"
            "$mplabx_dir/mplab_ide/bin/mdb.sh"
            "$mplabx_dir/bin/mdb.sh"
        )
        if candidate="$(resolve_first_executable "${candidates[@]}" 2>/dev/null)"; then
            absolute_path "$candidate"
            return 0
        fi
    fi

    shopt -s nullglob
    candidates=(
        /opt/microchip/mplabx/*/mplab_platform/bin/mdb.sh
        /opt/microchip/mplabx/mplab_platform/bin/mdb.sh
        /opt/microchip/MPLABX/*/mplab_platform/bin/mdb.sh
        /opt/microchip/MPLABX/mplab_platform/bin/mdb.sh
    )
    shopt -u nullglob

    if candidate="$(resolve_first_executable "${candidates[@]}" 2>/dev/null)"; then
        absolute_path "$candidate"
        return 0
    fi

    return 1
}

discover_xc32_dir() {
    local xc32_gcc
    local candidate
    local candidates=()

    if [[ -n "${XC32_DIR:-}" ]]; then
        [[ -d "$XC32_DIR" ]] || die "XC32_DIR does not exist: $XC32_DIR"
        [[ -x "$XC32_DIR/bin/xc32-gcc" ]] || die "XC32_DIR does not contain bin/xc32-gcc: $XC32_DIR"
        absolute_path "$XC32_DIR"
        return 0
    fi

    if command -v xc32-gcc >/dev/null 2>&1; then
        xc32_gcc="$(command -v xc32-gcc)"
        absolute_path "$(dirname "$(dirname "$xc32_gcc")")"
        return 0
    fi

    shopt -s nullglob
    candidates=(
        /opt/microchip/xc32
        /opt/microchip/xc32/*
        "$HOME"/microchip/xc32
        "$HOME"/microchip/xc32/*
        "$HOME"/Microchip/xc32
        "$HOME"/Microchip/xc32/*
    )
    shopt -u nullglob

    for candidate in "${candidates[@]}"; do
        if [[ -x "$candidate/bin/xc32-gcc" ]]; then
            absolute_path "$candidate"
            return 0
        fi
    done

    return 1
}

discover_xc32_gcc() {
    local xc32_dir

    xc32_dir="$(discover_xc32_dir)" || return 1
    printf '%s/bin/xc32-gcc\n' "$xc32_dir"
}

prepend_xc32_to_path_if_available() {
    local xc32_dir

    if xc32_dir="$(discover_xc32_dir 2>/dev/null)"; then
        export PATH="$xc32_dir/bin:$PATH"
    fi
}

require_mdb() {
    local mdb_path

    mdb_path="$(discover_mdb_path)" || die "Unable to find mdb.sh. Set MDB_PATH or MPLABX_DIR, or add mdb.sh to PATH."
    printf '%s\n' "$mdb_path"
}

require_xc32_dir() {
    local xc32_dir

    xc32_dir="$(discover_xc32_dir)" || die "Unable to find XC32. Set XC32_DIR or add xc32-gcc to PATH."
    printf '%s\n' "$xc32_dir"
}

assert_supported_mode() {
    case "${1:?mode is required}" in
        host|sim|hw)
            ;;
        *)
            die "Unsupported mode: $1. Expected one of: host, sim, hw."
            ;;
    esac
}

canonicalize_device() {
    local raw
    local normalized

    raw="${1:?device is required}"
    normalized="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]')"

    case "$normalized" in
        samrh707|samrh707-family|samrh707f18a)
            printf '%s\n' "${SAMRH707_DEFAULT_DEVICE:-SAMRH707F18A}"
            ;;
        samrh71|samrh71-family|samrh71f20c)
            printf '%s\n' "${SAMRH71_DEFAULT_DEVICE:-SAMRH71F20C}"
            ;;
        *)
            printf '%s\n' "$raw"
            ;;
    esac
}

family_from_device() {
    local raw

    raw="$(printf '%s' "${1:?device is required}" | tr '[:upper:]' '[:lower:]')"

    case "$raw" in
        samrh707*)
            printf '%s\n' 'samrh707'
            ;;
        samrh71*)
            printf '%s\n' 'samrh71'
            ;;
        *)
            return 1
            ;;
    esac
}