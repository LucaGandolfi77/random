#!/bin/bash

# Script di build per Photoshop Clone su macOS

echo "========================================="
echo "  Photoshop Clone - Build Script macOS"
echo "========================================="

# Verifica Homebrew
if ! command -v brew &> /dev/null; then
    echo "Errore: Homebrew non installato"
    echo "Installa Homebrew da: https://brew.sh"
    exit 1
fi

# Installa Qt6 se non presente
if ! brew list qt6 &> /dev/null; then
    echo "Installazione Qt6..."
    brew install qt6
fi

# Variabili
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
QT_PATH="$(brew --prefix qt6)"

echo "Qt6 installato in: ${QT_PATH}"
echo "Directory build: ${BUILD_DIR}"

# Crea directory build
mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"

# Configura CMake
echo ""
echo "Configurazione CMake..."
cmake .. \
    -DCMAKE_PREFIX_PATH="${QT_PATH}" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=10.15

if [ $? -ne 0 ]; then
    echo "Errore nella configurazione CMake"
    exit 1
fi

# Compila
echo ""
echo "Compilazione in corso..."
cmake --build . --config Release -j$(sysctl -n hw.ncpu)

if [ $? -ne 0 ]; then
    echo "Errore nella compilazione"
    exit 1
fi

echo ""
echo "========================================="
echo "  Build completata con successo!"
echo "========================================="
echo ""
echo "Eseguibile: ${BUILD_DIR}/PhotoshopClone"
echo ""
echo "Per creare un'app bundle:"
echo "  cpack -G DragNDrop"