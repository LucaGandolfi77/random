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
| Skull King | 2–6 | 70 carte (4 semi + speciali) |

## Funzionalità

- Stanze con codice 4 lettere
- Nickname (nessuna registrazione)
- Bot automatici
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
