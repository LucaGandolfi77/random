# Photoshop Clone

Un'applicazione di editing immagini open-source in C++ con Qt6, che replica le funzionalità principali di Adobe Photoshop.

![Screenshot](assets/screenshot.png)

## Caratteristiche

- **Strumenti di disegno**: Pennello, matita, righello
- **Strumenti di selezione**: Rettangolo, ellisse, lasso, magic wand
- **Strati (Layers)**: Gestione completa con opacità e fusion mode
- **Filtri**: Blur, sharpen, edge detection, correzione colore
- **Correzione colore**: Brightness, contrast, saturation, hue
- **Effetti**: Noise, pixelate, vignette
- **Operazioni geometriche**: Rotazione, flip, resize, crop
- **Undo/Redo**: Fino a 50 passi
- **Formati supportati**: PNG, JPEG, BMP, TIFF

## Requisiti

### Sistema operativo
- **macOS**: 10.15 Catalina o successivo
- **Windows**: Windows 10/11 (64-bit)

### Dipendenze
- **Qt 6**: Core, Gui, Widgets, OpenGL
- **CMake**: 3.16 o superiore
- **C++17 compiler** (Clang su macOS, MSVC su Windows)

## Installazione

### macOS

#### 1. Installa le dipendenze con Homebrew

```bash
# Installa Qt6
brew install qt6

# Verifica l'installazione
qmake6 --version
```

#### 2. Clona il repository

```bash
git clone https://github.com/tuo-utente/photoshop-clone.git
cd photoshop-clone
```

#### 3. Crea la directory di build

```bash
mkdir build && cd build
```

#### 4. Configura con CMake

```bash
cmake .. \
    -DCMAKE_PREFIX_PATH=$(brew --prefix qt6) \
    -DCMAKE_BUILD_TYPE=Release
```

#### 5. Compila

```bash
cmake --build . --config Release
```

#### 6. Crea l'applicazione macOS (opzionale)

```bash
# Crea bundle .app
cmake --install . --prefix ../PhotoshopClone.app/Contents

# Oppure usa cpack per creare un .dmg
cpack -G DragNDrop
```

### Windows

#### 1. Installa le dipendenze

**Opzione A: Usando vcpkg (consigliato)**

```powershell
# Installa vcpkg
git clone https://github.com/Microsoft/vcpkg.git
cd vcpkg
.\bootstrap-vcpkg.bat

# Installa Qt6
.\vcpkg install qt6-base:x64-windows
```

**Opzione B: Usando Qt Online Installer**

1. Scarica Qt Installer da: https://www.qt.io/download
2. Installa Qt 6 con componenti: Desktop gcc 64-bit (o MSVC 2019 64-bit)

#### 2. Clona e compila

```powershell
git clone https://github.com/tuo-utente/photoshop-clone.git
cd photoshop-clone
mkdir build
cd build

# Configura con CMake
cmake .. -G "Visual Studio 17 2022" -A x64 ^
    -DCMAKE_PREFIX_PATH="C:/Qt/6.5.0/msvc2019_64"

# Compila
cmake --build . --config Release
```

#### 3. Crea installer con CPack

```powershell
cpack -G NSIS
```

## Build Manuale

### Struttura delle directory

```
photoshop-clone/
├── build/              # Directory di build
├── src/                # Codice sorgente
├── assets/             # Risorse (icone, cursori)
├── external/           # Dipendenze esterne
└── CMakeLists.txt      # Configurazione CMake
```

### Comandi di build

#### macOS (Clang)

```bash
mkdir build && cd build
cmake .. -DCMAKE_PREFIX_PATH=$(brew --prefix qt6)
cmake --build .
```

#### Windows (MSVC)

```powershell
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
```

#### Linux (GCC)

```bash
mkdir build && cd build
cmake .. -DCMAKE_PREFIX_PATH=/usr/lib/qt6
cmake --build .
```

## Esecuzione

### macOS

```bash
./build/PhotoshopClone
# Oppure apri PhotoshopClone.app
```

### Windows

```powershell
.\build\Release\PhotoshopClone.exe
```

## Personalizzazione

### Aggiungi nuovi filtri

Modifica il file `src/ImageProcessor.cpp` aggiungendo nuove funzioni:

```cpp
QImage ImageProcessor::myCustomFilter(const QImage &image) {
    // Implementa il tuo filtro
    return image;
}
```

### Aggiungi nuovi strumenti

1. Crea `src/tools/NewTool.h` e `src/tools/NewTool.cpp`
2. Aggiungi il nuovo tool al `MainWindow.cpp`
3. Aggiorna il `CMakeLists.txt` se necessario

## Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi file `LICENSE` per i dettagli.

## Contributi

Sii il benvenuto! Ecco come puoi contribuire:

1. Fork del repository
2. Crea una feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit delle tue modifiche (`git commit -m 'Add some amazing feature'`)
4. Push alla branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## Stack Tecnologico

| Tecnologia | Versione |
|------------|----------|
| C++        | C++17    |
| Qt         | 6.x      |
| CMake      | 3.16+    |
| OpenGL     | 3.3+     |

## Roadmap

- [ ] Supporto plugin
- [ ] Tema scuro/chiaro
- [ ] Shortcut personalizzabili
- [ ] Anteprima filtri in tempo reale
- [ ] Supporto formati RAW
- [ ] Strumenti di tracciamento

## Contatti

- **Autore**: OpenSource Community
- **Email**: support@photoshop-clone.org
- **Issues**: [GitHub Issues](https://github.com/tuo-utente/photoshop-clone/issues)

## Risorse

- [Documentazione Qt6](https://doc.qt.io/qt-6/)
- [OpenCV Documentation](https://docs.opencv.org/)
- [CMake Documentation](https://cmake.org/documentation/)

---

**Photoshop Clone** - Un'alternativa open-source a Adobe Photoshop