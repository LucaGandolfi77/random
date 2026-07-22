# Script di build per Photoshop Clone su Windows

Write-Host "========================================="
Write-Host "  Photoshop Clone - Build Script Windows"
Write-Host "========================================="

# Verifica CMake
$cmake = Get-Command cmake -ErrorAction SilentlyContinue
if (-not $cmake) {
    Write-Host "Errore: CMake non installato"
    Write-Host "Installa CMake da: https://cmake.org/download/"
    exit 1
}

# Verifica Qt6
$qtPath = $env:QTDIR6
if (-not $qtPath) {
    # Prova a trovare Qt6 in posizioni standard
    $possiblePaths = @(
        "C:\Qt\6.5.0\msvc2019_64",
        "C:\Qt\6.5.0\msvc2022_64",
        "C:\Qt\6.6.0\msvc2019_64",
        "C:\Qt\6.6.0\msvc2022_64"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $qtPath = $path
            break
        }
    }
}

if (-not $qtPath) {
    Write-Host "Errore: Qt6 non trovato"
    Write-Host "Imposta la variabile d'ambiente QTDIR6 o installa Qt6"
    Write-Host "Download da: https://www.qt.io/download"
    exit 1
}

Write-Host "Qt6 trovato in: $qtPath"

# Directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $scriptDir "build"

Write-Host "Directory build: $buildDir"

# Crea directory build
if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

Set-Location $buildDir

# Configura CMake
Write-Host ""
Write-Host "Configurazione CMake..."
& cmake .. -G "Visual Studio 17 2022" -A x64 `
    -DCMAKE_PREFIX_PATH="$qtPath" `
    -DCMAKE_BUILD_TYPE=Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "Errore nella configurazione CMake"
    exit 1
}

# Compila
Write-Host ""
Write-Host "Compilazione in corso..."
& cmake --build . --config Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "Errore nella compilazione"
    exit 1
}

Write-Host ""
Write-Host "========================================="
Write-Host "  Build completata con successo!"
Write-Host "========================================="
Write-Host ""
Write-Host "Eseguibile: $buildDir\Release\PhotoshopClone.exe"
Write-Host ""
Write-Host "Per creare un installer:"
Write-Host "  cpack -G NSIS"