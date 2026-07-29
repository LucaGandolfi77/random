# OpenPhone OS - Feature Phone Emulator

Emulatore web di feature phone in stile KaiOS con kernel JS simulato. React + Vite.

## Architettura

```
┌──────────────────────────────────────┐
│  UI React: Phone / Screen / Keypad   │
├──────────────────────────────────────┤
│  Shell: Launcher, StatusBar, Boot    │
├──────────────────────────────────────┤
│  Kernel JS                           │
│  - Process table (launch/kill/ps)    │
│  - Input routing al foreground       │
│  - Syscalls: fs, notify, onKey, exit │
├──────────────────────────────────────┤
│  VFS: filesystem in memoria +        │
│  persistenza su localStorage         │
└──────────────────────────────────────┘
```

## Come eseguire

```bash
npm install
npm run dev
```

Apri `http://localhost:5173` nel browser.

## Comandi tastiera

| Tasto fisico | Azione sul telefono |
|---|---|
| Frecce | D-pad (su/giu/sinistra/destra) |
| Invio | OK / Seleziona |
| Backspace / Esc | Esci / Indietro |
| F1 | SoftKey Sinistro |
| F2 | SoftKey Destro |
| 0-9 | Tastierino numerico |
| C | Clear (calcolatrice) / Reset (cronometro) |
| + - * / | Operatori calcolatrice |
| Spazio | Inserisce spazio (SMS) |

## App incluse

| App | Descrizione |
|---|---|
| **Snake** | Gioco classico controllato con D-pad. Record salvato su VFS/localStorage. |
| **Messaggi** | Conversazioni SMS simulate con thread, scrittura messaggi. |
| **Contatti** | Rubrica con ricerca, aggiunta e modifica contatti. Persistente su VFS. |
| **Calcolatrice** | Calcoli base con tastierino numerico. |
| **Orologio** | Ora digitale + cronometro con avvia/stop/reset. |
| **Impostazioni** | Tema schermo (5 temi), profilo suono, Info telefono con uptime e lista processi attivi (`ps`). |

## Kernel JS

Il kernel simula un sistema operativo reale:

- **Processi**: ogni app è un processo con PID, nome e stato
- **Scheduler cooperativo**: le app si registrano per ricevere input via `sys.onKey()`
- **Syscall API**: `sys.fs.read/write/ls/mkdir/rm`, `sys.notify()`, `sys.exit()`, `sys.getState()`
- **VFS**: struttura ad albero in memoria, salvata su localStorage

I dati (contatti, messaggi, highscore, impostazioni) persistono tra ricariche della pagina.

## Build

```bash
npm run build    # produce in dist/
npm run preview  # preview della build
```

## Tecnologie

- React 18
- Vite 6
- CSS vanilla (nessuna libreria UI)
- localStorage per persistenza VFS
