# esp32-os

Mini sistema operativo stile Unix per ESP32-S3, con shell interattiva via seriale.

## Architettura

```
┌──────────────────────────────────────┐
│  Shell (task su core 1)              │
│  Line editor, history, dispatch      │
├──────────────────────────────────────┤
│  Commands (20+ built-in)             │
│  ps, kill, ls, cat, wifi, echo, ...  │
├──────────────────────────────────────┤
│  Kernel (FreeRTOS wrapper)           │
│  Task registry, spawn, kill          │
├──────────────────────────────────────┤
│  FS (LittleFS)                       │
│  Working directory, file I/O         │
├──────────────────────────────────────┤
│  WiFiSvc (WiFi manager)              │
│  Scan, connect, status               │
└──────────────────────────────────────┘
```

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `help` | Lista comandi disponibili |
| `uname` | Nome e versione OS |
| `sysinfo` | Info hardware dettagliate (chip, core, flash, MAC, SDK) |
| `uptime` | Tempo dall'accensione |
| `free` | Utilizzo heap e PSRAM |
| `reboot` | Riavvia l'ESP32 |
| `clear` | Pulisce il terminale |
| `echo <testo>` | Stampa testo (supporta `>` per scrivere file) |
| `ps` | Lista task FreeRTOS con stato, priorità, stack libero |
| `kill <nome>` | Termina un task utente |
| `blink <pin>` | Avvia un task blink su un pin GPIO |
| `ls [path]` | Elenca file/directory |
| `cd [dir]` | Cambia directory corrente |
| `pwd` | Mostra directory corrente |
| `cat <file>` | Legge un file |
| `write <file> <testo>` | Scrive un file (sovrascrive) |
| `append <file> <testo>` | Aggiunge testo a un file |
| `rm <file>` | Cancella un file |
| `mkdir <dir>` | Crea una directory |
| `rmdir <dir>` | Rimuove una directory vuota |
| `df` | Mostra spazio su LittleFS |
| `run <script>` | Esegue script dal filesystem |
| `wifi scan` | Scansiona reti WiFi |
| `wifi connect <ssid> <pass>` | Connette a WiFi |
| `wifi status` | Stato connessione |
| `wifi disconnect` | Disconnette |

## Boot flow

1. Inizializza kernel (task registry)
2. Monta LittleFS (auto-format se necessario)
3. Registra comandi built-in
4. Stampa banner e info sistema
5. Esegue `/boot/init.rc` (script di avvio)
6. Stampa `/etc/motd`
7. Avvia shell interattiva su core 1

## Build e flash

```bash
pio run --target uploadfs    # carica filesystem (data/)
pio run --target upload      # flash firmware
pio device monitor           # apre la shell seriale (115200 baud)
```

## Esempio sessione

```
root@esp32-os:/# uname
esp32-os v1.0.0 (v5.1.4)

root@esp32-os:/# ps
NAME                     STATE PRIO CORE STACK FREE
--------------------------------------------------
shell                    BLK      1    1 1000

root@esp32-os:/# write /etc/hello.txt Ciao mondo!
OK

root@esp32-os:/# cat /etc/hello.txt
Ciao mondo!

root@esp32-os:/# wifi scan
Scansione in corso...
5 reti trovate:
  1. CasaFibra (-45 dBm) [Protetta]
  2. FASTWEB-2G (-62 dBm) [Protetta]
  ...

root@esp32-os:/# blink 2
Task blink avviato su pin 2 (usa 'ps' per vederlo)

root@esp32-os:/# ps
NAME                     STATE PRIO CORE STACK FREE
--------------------------------------------------
shell                    BLK      1    1 1000
blink_2                  BLK      1    1  988

root@esp32-os:/# kill blink_2
blink_2 terminato
```

## Pinout

| Segnale | GPIO |
|---------|------|
| LED built-in | 48 |
| UART TX | 43 |
| UART RX | 44 |

## Dipendenze (PlatformIO)

- `platform = espressif32`
- `framework = arduino`
- `board = esp32-s3-devkitc-1` o `esp32dev`
- `board_build.filesystem = littlefs`

## Licenza

MIT
