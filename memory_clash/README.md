# Multiplayer Memory Clash

A real‑time multiplayer memory‑matching game built with Python, Pygame (client), aiohttp + WebSockets (server), and Redis (optional persistence). Players flip cards, try to find pairs, and compete against each other in timed rounds.

## Project Structure
```
memory_clash/
├─ README.md
├─ requirements.txt
├─ client/
│   ├─ main.py          # Entry point, Pygame loop, lobby & game screens
│   ├─ ui.py            # UI components (LobbyUI, GameBoardUI)
│   └─ network.py       # Socket.IO client logic
├─ server/
│   ├─ server.py        # aiohttp WebSocket server
│   ├─ matchmaking.py   # Queue & player pairing logic
│   ├─ redis_client.py  # aioredis wrapper for queues & leaderboard
│   └─ utils.py         # Card transformation & game rule utilities
└─ (optional) Dockerfile / deployment scripts
```

## Prerequisites
- Python 3.10+ (tested on 3.11)
- pip packages: `pygame`, `aiohttp`, `aioredis`, `python-socketio`
- Redis server (optional but recommended for matchmaking & leaderboard)
- Git (to clone the repo)

## Installation
```bash
# Clone the repository
git clone https://github.com/yourname/memory_clash.git
cd memory_clash

# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Server
```bash
# Start Redis (if you have it installed)
redis-server &

# Launch the WebSocket server
python server/server.py
```
The server will listen on `ws://localhost:8080`. You can change the host/port in `server/config.py` if needed.

## Running the Client
```bash
python client/main.py
```
The client will open a Pygame window. Follow the on‑screen instructions to:
1. Enter a nickname.
2. Join the matchmaking queue.
3. Play memory‑matching rounds against another player.

## Configuration
- **GRID_SIZE** (default 4) – set in `client/config.py` or `server/config.py`.
- **ROOM_TTL** – how long (seconds) a matchmaking room stays alive.
- **REDIS_URL** – connection string for Redis (e.g., `redis://localhost:6379`).

## Project Highlights
- **Dynamic card transformations** after each successful match (random rotations/swaps).
- **Real‑time state synchronization** via WebSockets (`aiohttp` + `python‑socketio`).
- **Optional Redis persistence** for matchmaking queues, scores, and leaderboard.
- **Clean separation** of client UI, network layer, and server logic.
- **Extensible**: easy to add chat, multiple difficulty levels, or AI opponents.

---

Enjoy building and playing *Multiplayer Memory Clash*! 🎮🧠