# 🃏 Giochi di Carte Online

Piattaforma multiplayer per giocare a giochi di carte classici dal browser, self-hostata su LAN.

## Avvio

```bash
npm start
```

Il server si avvia su `http://localhost:3000`. Altri dispositivi nella stessa rete si connettono via `http://<IP-DEL-MAC>:3000`.

## Giochi disponibili

| Gioco | Giocatori | Mazzo |
|---|---|---|
| Scopa | 2–4 | Italiano 40 |
| Briscola | 2 | Italiano 40 |
| Blackjack | 1–6 | Francese 52 |
| Sette e Mezzo | 1–6 | Italiano 40 |
| Tressette | 2 | Italiano 40 |
| Texas Hold'em | 2–8 | Francese 52 |
| UNO | 2–6 | 108 carte UNO |
| Exploding Kittens | 2–5 | Mazzo custom |
| Skull King | 2–6 | 70 carte (4 semi + speciali) || The Mind | 2–6 | 100 carte numerate |
| Odin | 2–6 | 54 carte (1-9 in 6 colori) |
| Monopoly Deal | 2–5 | 105 carte (proprieta, azioni, affitti, denaro) |

## Funzionalità

- Stanze con codice 4 lettere
- Nickname (nessuna registrazione)
- Bot automatici con difficoltà per-bot (Facile/Medio/Difficile), modificabili e rimovibili in lobby
- Chat in tempo reale
- Timer 45s con azione di default
- Anti-imbroglio: server autoritario, client vede solo info pubbliche + propria mano
- Responsive (mobile-friendly)

## Comandi

- `npm start` — avvia il server
- `npm test` — esegue i test
- `node --test server/**/*.test.js` — test specifici

## Tech

- Node.js + Express + Socket.IO
- Client HTML/CSS/JS puro (nessun build step)
- Architettura a plugin: ogni gioco implementa `create`/`getPublicState`/`getValidActions`/`applyAction`/`isOver`/`nextRound`

## Odin — Regole e Strategie

**Odin** è un gioco di carte *shedding/climbing* di Helvetiq (2023) per 2–6 giocatori. L'obiettivo è essere il primo a scartare tutte le carte e avere il minor numero di punti a fine partita.

### Materiale
- **54 carte** numerate da **1 a 9** in **6 colori** (rosso, blu, verde, giallo, viola, arancione)
- Ispirato agli archetipi vichinghi: 1=Guaritore, 2=Bardo, 3=Spia, 4=Saggio, 5=Veggente, 6=Guardia, 7=Berserker, 8=Capitano, 9=Jarl

### Setup
1. Mescola tutte le carte.
2. Distribuisci **9 carte coperte** a ogni giocatore.
3. Scegli casualmente il primo giocatore.

### Svolgimento
Il gioco si svolge in **più mani**. Ogni mano è divisa in **round**.

- All'inizio di un round, il primo giocatore gioca **1 carta** scoperta al centro.
- A turno, ogni giocatore può:
  1. **Giocare** una o più carte, oppure
  2. **Passare**

#### Giocare carte
- Il valore delle carte giocate deve essere **maggiore** del valore al centro.
- Puoi giocare **lo stesso numero di carte** già presenti al centro, oppure **1 carta in più**.
  - Esempio: se al centro ci sono 2 carte, puoi giocare 2 o 3 carte.
- Per giocare più carte, devono essere **dello stesso valore** o **dello stesso colore**.
- Il valore di una combinazione si calcola **concatenando le cifre** in ordine decrescente.
  - Esempio: 2 e 8 dello stesso colore → valore **82** (non 28).
  - Esempio: 2, 4 e 9 dello stesso colore → valore **942**.
- Dopo aver giocato, **pesca 1 carta** dal centro (non puoi prendere quella che hai appena giocato).

#### Passare
- Se passi, non giochi carte. Il turno passa al giocatore successivo.
- Puoi giocare normalmente al turno successivo.
- Se **tutti tranne 1** passano, il round finisce. Le carte rimaste al centro vengono scartate.

#### Fine della mano
Una mano finisce in 2 modi:
1. Se all'inizio di un nuovo round hai **tutte le carte dello stesso valore o colore**, puoi giocarle tutte e la mano finisce.
2. Se in qualsiasi momento **giocando rimani senza carte** in mano.

A fine mano, ogni giocatore segna **1 punto per ogni carta rimasta in mano**.

### Fine della partita
- **Prima partita**: si gioca fino a **15 punti** (chi raggiunge o supera 15 fa terminare la partita).
- **Vince** chi ha **meno punti**.
- In caso di pareggio, i giocatori condividono la vittoria.
- Partite più lunghe: fino a 20 punti. Più corte: fino a 10 punti.

### Strategie
- **Scartare carte alte**: le carte 9, 8, 7 hanno valori alti e sono difficili da superare. Giocale quando puoi per sbarazzartene.
- **Preservare combinazioni**: tieni carte dello stesso valore o colore per giocare combo multiple e aumentare il valore.
- **Passare strategicamente**: passa se non hai carte abbastanza alte, ma attento a non accumulare troppe carte.
- **Fine mano rapida**: se hai carte tutte dello stesso valore/colore, puoi chiudere la mano istantaneamente.
- **Bluff**: gioca carte di valore medio-basso per indurre gli avversari a sprecare le loro carte alte.
- **Variante**: si può giocare a squadre (2vs2) con punteggio combinato.

Per le regole ufficiali complete: [PDF Helvetiq](https://helvetiq.com/media/hexaattachment/products/attachments/Odin_Rules_EN_DE_FR_ES_IT_NL_compressed.pdf)
