# Expedition 33 (GBA)

Un piccolo RPG per Game Boy Advance ispirato a "Clair Obscur: Expedition 33".
Movimento a griglia stile Pokemon, tre mondi scrollabili, dialoghi e una quest
a catena in cui una spedizione parte per cancellare il GOMMAGE dal MONOLITE.

## Compilare

Serve devkitPro (con libgba).

```sh
export DEVKITPRO=/opt/devkitpro
export DEVKITARM=$DEVKITPRO/devkitARM
export PATH=$DEVKITARM/bin:$PATH
make
```

Viene generato `expedition33.gba` (ROM con header valido, testabile in mGBA).

## Giocare

- Titolo: premi START per cominciare.
- Muoviti con la croce direzionale; parla con gli NPC premendo la direzione
  verso di loro.
- A/B per avanzare nei dialoghi.

## Flusso della quest

1. Intro -> parla con Sophie (la spedizione parte).
2. Raduna Maelle, Lune e Sciel.
3. Parla con Esquie per salpare verso il continente.
4. Trova Renoir e scopri il passaggio verso la Piana del Monolite.
5. La PEINTRESSE dipinge il numero 33 sul MONOLITE: fine del gioco.

## Note tecniche

- Modalita grafica: Mode 0, BG0 8bpp (screenblock 20, charblock 0), OBJ 4bpp.
- Mappe: 3 mondi 64x64 tile, camera centrata sul giocatore con scorrimento
  fluido (REG_BG0HOFS/VOFS per l'offset residuo).
- Font 5x7 senza apostrofi/lettere accentate (testo in italiano).
- Sprites condivise 16x16 a 4bpp; l'identita dei personaggi e data dal banco
  di palette OBJ.