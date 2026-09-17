# OpenPhone OS — v2.0 «Crazy Frog Edition» 📞🐸

Emulatore web di feature phone in stile KaiOS con **kernel JS simulato**. React + Vite.
Nessuna libreria UI, nessun framework CSS: solo vogione cruda e tastierini numerici.

> *"Non è un telefono. È uno stile di vita con 12 tasti."*

```
┌──────────────────────────────────────────┐
│  UI React: Phone / Screen / Keypad       │
├──────────────────────────────────────────┤
│  Shell: Launcher, StatusBar, Boot        │
├──────────────────────────────────────────┤
│  Kernel JS                               │
│  - Process table (launch/kill/ps)        │
│  - Nav stack + sospensione processi      │
│  - Daemon: SMS in arrivo, chiamate,      │
│    batteria (drain + warning)            │
│  - Syscalls: fs, notify, onKey, exit,    │
│    call, openApp, vibrate, beep, getInfo │
├──────────────────────────────────────────┤
│  VFS v2: albero in memoria +             │
│  persistenza localStorage (archivio v2)  │
├──────────────────────────────────────────┤
│  Moduli OS: sound (WebAudio),            │
│  t9 (dizionario italiano), input (T9)    │
└──────────────────────────────────────────┘
```

---

## 🔍 Diagnosi — i bug più scassati trovati (e giustiziati)

| # | Bug | Gravità | Destino |
|---|---|---|---|
| 1 | 👻 **Il tasto Invio fantasma**: MessagesApp e ContactsApp ascoltavano `'enter'`, un tasto che **non esiste** nel keymap (esiste solo `'ok'`) → impossibile inviare SMS / salvare contatti | CRITICA | ☠️ Fix: `'ok'` ovunque |
| 2 | 💣 **Backspace suicida**: `Backspace` mappato a `'end'` → un tasto per cancellare chiudeva l'app e l'intero sistema | CRITICA | ☠️ Fix: `Backspace`→`'back'`, protocollo return-boolean |
| 3 | 🧟 **Il contatto zombie**: due `useEffect` che si litigano `sys.onKey()` sullo stesso processo: il secondo sovrascrive il primo → il pulsante "Nuovo contatto" non ha MAI funzionato | CRITICA | ☠️ Fix: un handler unico per app |
| 4 | 🔥 **VFS piròmano**: `write()` su un path che è una directory la trasformava in file, **cancellando tutto il sottoalbero** (`/data` intero!) | CRITICA | ☠️ Fix: write su dir = fallimento |
| 5 | 🎲 **Eval nella calcolatrice**: `Function("return (" + expr + ")")` per calcolare. Sicurezza orrenda E logica rotta: `2+3-1 = 2` (perdeva il primo termine) | CRITICA | ☠️ Fix: calcolo token-by-token left-to-right, zero eval |
| 6 | 📉 **Uptime bugiardo**: `ps()` dava a TUTTI i processi l'uptime del boot | Media | ☠️ Fix: `proc.startTime` per processo |
| 7 | 🔇 **Notifiche fantasma**: `sys.notify()` esisteva ma non c'era NESSUNA UI per vederle, e nessuna app le usava | Media | ☠️ Fix: Notification Center + popup live |
| 8 | 📞 **Il telefono senza telefono**: manca il dialer, il tasto verde è decorativo, non si può CHIAMARE (feature phone, ahiahiahi) | CRITICA UX | ☠️ Fix: Dialer + chiamate simulate + registro |
| 9 | 🐍 **Snake si allena da solo**: in background continuava a giocarsi (e morire) perché gli `setInterval` non si fermano mai | Media | ☠️ Fix: sospensione processi non-foreground |
| 10 | ✍️ **Glitch tipografico**: `\u25E1`, `\u25A0`, `Gi\uf8ff` renderizzati come testo LETTERALE dentro il JSX | Media | ☠️ Fix: caratteri reali |
| 11 | 🎯 **Tasti morti**: `*`, `#`, tasto verde: niente. In un feature phone! | UX | ☠️ Fix: `#`=cambio modalità T9, `*`=simboli, verde=dialer |
| 12 | 🧭 **Softkeys bugiarde**: label tipo "Apri" su tasti che non facevano nulla | UX | ☠️ Fix: softkeys vere e funzionanti |

---

## 🎪 IL PIANO FOLLE — TODOs

### FASE 0 — Riabilitazione intensiva 🏥 *(il paziente era in coma, ora cammina)*
- [x] Fix kernel: nav stack vero + `killForeground()` (End chiude SOLO l'app corrente)
- [x] Fix kernel: sospensione processi in background (state `suspended`, tick skip)
- [x] Fix kernel: `proc.startTime`, uptime per processo
- [x] Fix kernel: guard anti-doppia-init (StrictMode)
- [x] Fix VFS: `write()` su directory fallisce, `stat()`, `nuke()` (factory reset)
- [x] Fix keymap: `Backspace`→`back`, `Backslash`→`#`, `NumpadEnter`→`ok`
- [x] Protocollo input: keyHandler ritorna `true` se consuma il tasto → fallback elegante
- [x] Fix StatusBar/Boot/Settings: caratteri unicode reali
- [x] Fix Messages/Contacts: `'ok'` per confermare, un handler unico, navigazione D-pad
- [x] Fix Calculator: ZERO eval, catena vera `2+3-1=4`
- [x] Fix Snake: side-effect fuori dall'updater (StrictMode), pausa in background

### FASE 1 — Un telefono che SA telefonare ☎️
- [x] **App Telefono (Dialer)**: composizione con tastierino, match contatti live
- [x] **Chiamate simulate**: tono di chiamata, collegamento automatico, timer, riaggancio
- [x] **Registro chiamate** persistente su VFS (uscite / perse)
- [x] **Chiamate in ENTRATA** dal daemon: squilla DAVVERO, accetta/rifiuta, "chiamata persa"
- [x] Chiamare dalla rubrica (`sys.call`)

### FASE 2 — T9 italiano + input multitap ⌨️ *(il cuore folle)*
- [x] **Motore T9 predittivo** con dizionario italiano (~170 parole comuni)
- [x] **Multi-tap** classico (2→a, 22→b, 222→c) con timeout di commit
- [x] `#` cicla modalità: **abc → ABC → 123 → T9** (come i veri Nokia)
- [x] `*` cicla simboli/punteggiatura
- [x] T9 in Messaggi (up/down per ciclare i candidati, spazio per commit)
- [x] Draft autosaved su VFS: Escape non distrugge più i tuoi pensieri
- [x] QWERTY fisica sempre attiva in parallelo (scrivi lettere col PC)

### FASE 3 — Il telefono prende vita 🔊
- [x] **Suoni di sistema WebAudio**: click tasti, beep notifiche, toni chiamata
- [x] **Vibrazione** (navigator.vibrate) per chiamate e notifiche
- [x] **Batteria simulata**: drain nel tempo, warning al 15%, indicatore in StatusBar
- [x] **Daemon SMS**: i contatti TI SCRIVONO davvero ogni tanto (con beep!)
- [x] **Popup notifiche live** + Notification Center app (leggi/pulisci)
- [x] Volume master impostabile (0-10) con demo beep

### FASE 4 — Il kernel al gran completo 🖥️
- [x] **App Note**: lista/crea/modifica/cancella su VFS reale (`/data/notes/`)
- [x] **App Terminale**: shell con `ls`, `cat`, `write`, `rm`, `mkdir`, `ps`, `kill`, `open`, `notify`, `echo`, `df`, `uptime`, `uname`, history con ↑/↓
- [x] **Easter egg folle**: `sudo rm -rf /` nel terminale → distruzione drammatica + factory reset
- [x] Kill processi dall'app Info (anche te stesso, se osi)

### FASE 5 — Giochi, musica e caos 🎵
- [x] **Snake 2.0**: velocità progressiva, cibo bonus lampeggiante, record persistente
- [x] **App Musica chiptune**: synth WebAudio, 4 tracce 8-bit (inclusa la mitica Gran Vals), play/pause/next, visualizer
- [x] La musica continua in background mentre mandi SMS (realismo folle)
- [x] **Orologio 3-in-1**: ora + cronometro + timer countdown (beep + notifica a fine)

### FASE 6 — Polish da collezione ✨
- [x] **Boot cinematografica**: log kernel-style con progress bar
- [x] **Easter egg IMEI**: digita `*#06#` sul launcher (vero codice da Nokia)
- [x] Tasto verde sul launcher = apre il Telefono
- [x] Launcher: orologio live, wrap circolare del cursore
- [x] Factory reset dall'Impostazioni con schermata drammatica
- [x] Nuovo archivio VFS v2 (defaults più vivaci)

---

## 🚀 Roadmap futura (cose che OSAREMO dopo)

- [ ] Screensaver "demo mode": Snake che gioca da solo dopo 30s di inattività
- [ ] Multi-lingua IT/EN selezionabile dalle Impostazioni
- [ ] Wallpaper personalizzati + temi per-app
- [ ] Bluetooth finto che cerca dispositivi immaginari ("Nokia 3310 di Mamma")
- [ ] WAP browser che naviga un mini-web locale in stile 2003
- [ ] Radio FM con scan canali e statica
- [ ] Torcia (lo schermo tutto bianco a brigthness massimo, feature phone ESSENZIALE)
- [ ] Calendario con appuntamenti e notifiche
- [ ] Gestoreattività con TODO e pomodoro
- [ ] Mod: retail box, antialiasing CRT, CRT scanlines overlay

---

## Come eseguire

```bash
npm install
npm run dev
```

Apri `http://localhost:5173` nel browser. **Consiglio folle:** apri il Terminale e digita `sudo rm -rf /`.

## Comandi tastiera

| Tasto fisico | Azione sul telefono |
|---|---|
| Frecce | D-pad (su/giù/sinistra/destra) |
| Invio / NumpadEnter | OK / Seleziona |
| Backspace | Indietro / Cancella (gestito dalle app) |
| Esc | Chiama / Riaggancia / Chiudi app |
| F1 | SoftKey Sinistro |
| F2 | SoftKey Destro |
| 0-9 (e Numpad) | Tastierino / T9 / Multitap |
| `\` (Backslash) | `#` cambio modalità input (abc/ABC/123/T9) |
| C | Clear (calcolatrice) / Reset (cronometro/timer) |
| + - * / . , | Operatori e simboli |
| Spazio | Spazio / commit parola T9 |
| Tasto verde (mouse) | Dialer / Accetta chiamata |

## App incluse (v2.0)

| App | Descrizione |
|---|---|
| **✆ Telefono** | Dialer con tastierino, match contatti live, chiamate simulate con tono/timer, registro chiamate. Ricevi chiamate vere (simulate) che squillano. |
| **✉ Messaggi** | Thread SMS con **T9 predittivo italiano**, multitap, ABC/ABC/123/T9, draft autosaved. Ricevi SMS dal daemon dei contatti. |
| **📓 Contatti** | Rubrica con ricerca, aggiunta (ok per toggle campo), modifica, eliminazione, chiamata diretta. Persistente su VFS. |
| **📝 Note** | Blocco appunti su VFS reale: crea, modifica, cancella. Il kernel è vero e questo lo dimostra. |
| **🐍 Snake** | Il classico, con velocità progressiva e cibo bonus. Record su VFS. Si sospende in background. |
| **🎵 Musica** | Chiptune synth 8-bit: 4 tracce (Gran Vals inclusa), play/pause/next, visualizer. Suona in background. |
| **🧮 Calcolatrice** | Zero eval, catena vera (2+3-1=4), percentuale, backspace. |
| **⏰ Orologio** | Ora + cronometro + timer countdown con beep e notifica. |
| **🔔 Avvisi** | Notification Center: notifiche del sistema, chiamate perse, SMS ricevuti. Leggi e pulisci. |
| **>_ Terminale** | Shell del kernel: ls, cat, write, rm, mkdir, ps, kill, open, notify, df, uptime, history. `sudo rm -rf /` ti aspetta. |
| **⚙️ Impostazioni** | 5 temi, profilo suono, volume con demo, vibrazione, batteria, processi (con kill), factory reset. |

## Kernel JS v2

- **Processi**: ogni app è un processo con PID, nome, stato (`running`/`suspended`), startTime
- **Nav stack**: End chiude solo l'app corrente, torna alla precedente
- **Scheduler cooperativo**: solo il foreground riceve input; i processi in background vengono sospesi (Snake si congela, la musica no — realismo)
- **Daemon di sistema**: SMS in arrivo dai contatti, chiamate in entrata, drain batteria
- **Syscall API**: `sys.fs.*`, `sys.notify()`, `sys.exit()`, `sys.call()`, `sys.openApp()`, `sys.vibrate()`, `sys.beep()`, `sys.getInfo()`, `sys.getState()`
- **VFS v2**: albero in memoria + localStorage, `stat()`, `nuke()` factory reset
- **Protocollo input**: keyHandler ritorna `true` se consuma il tasto; altrimenti `back` chiude l'app (fallback elegante)

## Build

```bash
npm run build    # produce in dist/
npm run preview  # preview della build
```

## Tecnologie

- React 18
- Vite 6
- WebAudio API (suoni, chiptune synth)
- CSS vanilla (nessuna libreria UI)
- localStorage per persistenza VFS v2
- Zero dipendenze folli, tutto fatto a mano come i veri feature phone
