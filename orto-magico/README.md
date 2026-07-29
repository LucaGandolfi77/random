# Orto Magico 🌱

Giooco di giardinaggio idle/cozy a lungo termine. Colttiva il tuo orto, espandilo, scopri nuove varietà e completa obiettivi nel corso di giorni e settimane. Frontend + backend full-stack.

> Sì, ho scritto "Giooco" e "Colttiva": un piccolo omaggio ai refusi che ogni tanto sfuggono. 🙃

## Panoramica

- **Loop**: pianta → annaffia → aspetta (tempo reale) → raccogli → vendi → compra campi e semi nuovi
- **Cura**: le piante hanno sete! Una pianta assetata smette di crescere (non muore mai, resta cozy). Fertilizzante = crescita 2x.
- **Espansione**: inizia con 2 campi, sblocca fino a 20 con costi crescenti
- **Semi**: 12 varietà sbloccabili per livello, dai 2 minuti della lattuga ai 7 giorni della leggendaria Rosa Arcobaleno
- **Stagionali**: Zucca di Halloween 🎃 e Albero di Natale 🎄 (coltivabili tutto l'anno!)
- **Alberi ricorrenti**: melo e limone, dopo la prima crescita producono frutti in loop senza dover ripiantare
- **Valuta premium (gemme)**: accelera istantaneamente la crescita. **Account di test con gemme infinite (999999)!**
- **Obiettivi a lungo termine**: 8 traguardi, incluso l'endgame "Giardiniere Eroico" (crescere la Rosa Arcobaleno, 7 giorni)
- **Album**: colleziona tutte le varietà scoperte

## Stack

- **Backend**: FastAPI + SQLite (aiosqlite). Tempi di crescita autoritativi server-side.
- **Frontend**: React 18 + Vite. Grafica pastello + emoji, animazioni CSS. Polling ogni 2s.
- **Account**: singolo account di test (`giardiniere`), gemme infinite, senza registrazione.

## Come eseguire

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API su `http://localhost:8000`, docs interattivi su `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Apri `http://localhost:5173`. Il dev server proxy inoltra `/api` al backend su `:8000`.

## Struttura

```
orto-magico/
├── README.md
├── .gitignore
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app + CORS
│       ├── db.py              # SQLite, schema, account test
│       ├── catalog.py         # 12 semi + costi campi + economia
│       ├── engine.py          # calcolo crescita, annaffiatura, status
│       ├── achievements.py    # 8 obiettivi
│       └── routers/api.py     # 12 endpoint REST
└── frontend/
    ├── package.json, vite.config.js, index.html
    └── src/
        ├── main.jsx, App.jsx, api.js
        ├── components/  (Header, Garden, Plot, SeedPanel, Shop, Goals, Collection, Toasts)
        └── styles/garden.css   # tema cozy pastello + animazioni
```

## Catalogo semi

| Livello | Seme | Tempo | Prezzo vendita |
|---|---|---|---|
| 1 | Lattuga 🥬 | 2 min | 20 |
| 1 | Carota 🥕 | 5 min | 55 |
| 3 | Fragola 🍓 | 15 min | 130 |
| 3 | Pomodoro 🍅 | 30 min | 220 |
| 6 | Girasole 🌻 | 1 h | 420 |
| 6 | Rosa 🌹 | 2 h | 850 |
| 10 | **Zucca di Halloween** 🎃 | 4 h | 2200 |
| 10 | Melo 🍎 | 12 h | 1500 *(albero ricorrente)* |
| 12 | Fungo Magico 🍄 | 8 h | 1100 |
| 15 | Melo di Limoni 🍋 | 24 h | 3200 *(albero ricorrente)* |
| 20 | **Albero di Natale** 🎄 | 3 giorni | 6000 |
| 30 | **Rosa Arcobaleno Leggendaria** 🌈 | 7 giorni | 60000 |

## API endpoints

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/api/state` | Stato completo (utente, campi, semi, obiettivi, album) |
| POST | `/api/plots/buy` | Compra un nuovo campo (espansione) |
| POST | `/api/plots/{idx}/plant` | Pianta un seme in un campo |
| POST | `/api/plots/{idx}/water` | Annaffia la pianta |
| POST | `/api/plots/{idx}/fertilize` | Fertilizzante 2x (costa 100 monete) |
| POST | `/api/plots/{idx}/speedup` | Accelera con gemme |
| POST | `/api/plots/{idx}/harvest` | Raccogli (ottieni monete + XP) |
| POST | `/api/plots/{idx}/clear` | Erpica il campo (se pianti per sbaglio) |
| POST | `/api/seeds/buy` | Compra semi dal negozio |
| POST | `/api/selected` | Imposta il seme selezionato |
| POST | `/api/achievements/{id}/claim` | Riscuoti ricompensa obiettivo |

## Account di test

L'utente `giardiniere` viene creato automaticamente al primo avvio con:
- 999999 gemme (infinite agli effetti pratici)
- 500 monete
- 2 campi iniziali
- 5 semi di lattuga + 3 di carota

I dati persistono su SQLite (`backend/data/orto.db`). Per azzerare tutto, elimina il file e riavvia il backend.

## Licenza

MIT