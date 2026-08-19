# Tiny Harvest 🧑‍🌾

Un piccolo gioco agricolo in **stile Harvest Moon** per **Game Boy Advance**,
scritto in C con [devkitPro](https://devkitpro.org) (devkitARM + libgba).
Compila in un vero ROM `.gba` che gira in **qualsiasi emulatore GBA**
(mGBA, VBA-M, RetroArch, Delta, My OldBoy...) e su flash cart.

Atmosfera **cozy e misteriosa**: palette calda (verdi salvia, terra crema,
terracotta), notte stellata con luna, foschia, casetta con la finestra accesa
e lucciole che volteggiano nella schermata d'apertura.

---

## 📖 MANUALE DI ISTRUZIONI

### 1. Schermata di intro

All'avvio compare la schermata titolo: *TINY HARVEST* in oro su una notte
misteriosa, con stelle che brillano, una luna crescente, foschia, la tua
casetta illuminata e lucciole che si muovono.

- **A** o **START** → inizia il gioco (parte il tutorial)

### 2. Tutorial

Dopo l'intro, nel box in basso scorrono 8 pagine di tutorial:

1. Benvenuto nel podere
2. Zappa il prato con A
3. Annaffia e semina (seme = 10 soldi)
4. Le rape crescono 1 stadio al giorno
5. Raccogli le rape con la mano
6. Vendi alla cassetta in basso a destra
7. Parla con Nonno e la Stretta: missioni!
8. SELECT cambia strumento, START = fine giornata

- **A** → pagina successiva · **B** o **START** → chiudi il tutorial
- In qualsiasi momento: **SELECT + START** riapre il tutorial

### 3. Obiettivo del gioco

Gestisci il tuo podere: **prepara la terra, pianta, annaffia ogni giorno** e
raccogli le rape. Vendile alla **cassetta** (in basso a destra) per guadagnare
soldi e comprare nuovi semi. Completa le **missioni** dei personaggi per
ottenere ricompense.

### 4. Giornata di gioco

- Un giorno dura **30 secondi**; alla fine le rape innaffiate crescono di uno
  stadio e l'acqua evapora.
- **START** → vai a dormire e termina subito la giornata.

### 5. Ciclo di coltivazione

| Azione        | Dove                     | Risultato                 |
|---------------|--------------------------|---------------------------|
| ZAPPA (A)     | su erba o fiori          | terra arata               |
| ACQUA (A)     | su terra arata/coltivata | terra innaffiata          |
| SEMI (A)      | su terra arata           | pianta seme (-10 soldi)   |
| MANO (A)      | su rapa matura           | raccogli (+1 rapa)        |
| MANO (A)      | davanti alla cassetta    | vendi le rape (+25 l'una) |

Le rape passano per **4 stadi** (germoglio → pianta → rapa): serve un giorno
innaffiato per ogni stadio.

---

## 🕹️ COMANDI

| Tasto         | Azione                                        |
|---------------|-----------------------------------------------|
| **D-Pad**     | Muovi il personaggio                          |
| **A**         | Usa lo strumento / parla / avanza nei dialoghi |
| **SELECT**    | Cambia strumento: ZAPPA → ACQUA → SEMI → MANO |
| **START**     | Dormi (fine giornata) / inizia il gioco       |
| **B**         | Chiudi dialoghi e tutorial                    |
| **SELECT+START** | Riapri il tutorial                         |

---

## 🧙 Personaggi e missioni

Due personaggi popolano il podere. Avvicinati e premi **A** per parlare.

### 👴 Nonno (vicino alla casa)

- Ti affida la prima missione: **zappa 3 campi** → ricompensa **50 soldi**

### 🧙‍♀️ La Stretta (vicino allo stagno)

Una figura misteriosa con un destino da compiere:

- Missione 2: **portale 5 rape** → ricompensa **100 soldi**
- Missione 3: **vendi 5 rape alla cassetta** → ricompensa **200 soldi**

### 📊 Stato missione nell'HUD

Sulla riga 1 dello schermo trovi `Q1:2/3` (missione attiva e progresso),
`Q1:FATTA` (missione completata) o `Q-` (nessuna missione). Le ricompense si
ritirano **parlando di nuovo** con il personaggio che ha dato la missione.

---

## 🔧 Compilazione

Serve **devkitPro** (pacchetto `gba-dev` — devkitARM + libgba) e `make`.

```sh
# installa devkitPro una volta (macOS / Linux / Windows):
#   https://devkitpro.org/wiki/Getting_Started
#   pacman -S gba-dev        (nell'ambiente pacman di devkitPro)

make          # produce tiny_harvest.gba
make clean    # rimuove i file di build
```

`DEVKITARM` e `DEVKITPRO` devono puntare alla tua installazione devkitPro
(es. `export DEVKITARM=/opt/devkitpro/devkitARM`).

## ▶️ Esecuzione

```sh
# mGBA (emulatore consigliato)
mgba tiny_harvest.gba

# oppure doppio clic sul ROM in mGBA / VBA-M / RetroArch / Delta ...
```

Con una flash cart (EZ-Flash Omega, EverDrive GBA) copia
`tiny_harvest.gba` sulla microSD e avvialo.

---

## 🛠 Com'è fatto (in breve)

- **Mode 0, un solo BG0 (8bpp)** — mappa, HUD e box messaggi vivono nello
  stesso layer: niente sovrapposizioni di testo. Box messaggi con bordo
  arrotondato in basso, barra HUD in alto.
- **Schermata intro** disegnata a tile (notte, stelle animate, luna, foschia,
  colline, casetta con finestra accesa) + **3 lucciole** a sprite con moto
  sinusoidale e lampeggio.
- **Titolo grande** "TINY HARVEST": font 5×7 scalato 2× in tile dorate.
- **Sprite**: giocatore 16×16 con 8 frame (4 direzioni + passo), sprite
  dedicato a destra; Nonno e Stretta con sprite propri; lucciole 8×8.
- **Quest**: macchina a stati (`g_stage` 0→6) con progresso tracciato
  nell'HUD e dialoghi a pagine nel box messaggi.
- Tutta l'arte è generata nel codice da string art + font 5×7: nessun asset
  esterno.
- Ciclo giorno con interrupt VBlank (`VBlankIntrWait`).

## 📁 Struttura del progetto

```
gba-tiny-harvest/
├── Makefile          # build devkitPro (make → tiny_harvest.gba)
├── src/
│   └── main.c        # tutto il gioco (~1250 righe)
└── README.md
```

## 💡 Idee per estendere

- Più colture con prezzi e tempi diversi
- Negozio di semi / strumenti
- Effetti sonori (libgba `gba_sound.h` o maxmod)
- Mappa più grande e scorrevole con camera
- Salvataggio su SRAM / EEPROM
- Più personaggi e missioni secondarie
