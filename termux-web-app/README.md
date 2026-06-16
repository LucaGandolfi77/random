# Termux‑Hosted Modern Web App  
*A state‑of‑the‑art, fully‑Linux‑based web server that runs **directly on an Android device** using **Termux**. The stack combines a **FastAPI + uvicorn** backend, a **React + Vite** progressive‑web‑app front‑end, and **ngrok/Cloudflare Tunnel** for secure public exposure – all installed and executed inside Termux.*

---  

## 📋 Table of Contents  
1. [Why This Setup?](#why-this-setup)  
2. [Prerequisites](#prerequisites)  
3. [Project Structure](#project-structure)  
4. [Step‑by‑Step Instructions](#step‑by‑step-instructions)  
5. [Creative, State‑of‑the‑Art Features](#creative-state-of-the-art-features)  
6. [Sample Code Snippets](#sample-code-snippets)  
7. [Testing & Validation](#testing--validation)  
8. [Next Steps & Extensions](#next-steps--extensions)  
9. [License](#license)  

---  

## Why This Setup? <a id="why-this-setup"></a>  
- **Native Linux environment** on Android (Termux) → full `bash`, `python`, `git`, `node`, `npm`, `docker` (via `proot-distro`).  
- **ASGI performance** with **FastAPI** + **uvicorn** (async, auto‑docs, WebSockets).  
- **Modern front‑end** built with **React 18** + **Vite** → ultra‑fast HMR, tree‑shaking, native ES modules.  
- **Zero‑cost public URL** via **ngrok** or **Cloudflare Tunnel** (HTTPS, custom subdomains).  
- **PWA capabilities** (offline support, service workers, install‑prompt) for a native‑app feel.  
- **All‑in‑one install script** – one‑liner to spin up the whole stack.  

---  

## Prerequisites <a id="prerequisites"></a>  
| Item | Command (run inside Termux) |
|------|-----------------------------|
| Update packages | `pkg update && pkg upgrade -y` |
| Install core utilities | `pkg install -y git curl wget proot-distro` |
| Install Python 3.12 (latest) | `pkg install -y python` |
| Install Node.js 20 (LTS) | `pkg install -y nodejs npm` |
| (Optional) Docker inside Termux | `proot-distro install ubuntu && proot-distro login ubuntu -- apt install -y docker.io` |
| Install **ngrok** (or Cloudflare Tunnel) | `curl -sSL https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-arm.zip -o ngrok.zip && unzip ngrok.zip && chmod +x ngrok && mv ngrok $PREFIX/bin/` |
| Install **pnpm** (fast package manager) | `npm i -g pnpm` |

> **Tip:** All commands can be placed in a single `bootstrap.sh` (see below) for reproducibility.

---  

## Project Structure <a id="project-structure"></a>  
```
termux‑web‑app/
├─ backend/                     # FastAPI + uvicorn
│   ├─ app/
│   │   ├─ __init__.py
│   │   ├─ main.py
│   │   ├─ routers/
│   │   │   └─ api.py
│   │   └─ models/
│   │       └─ db.py
│   ├─ requirements.txt
│   └─ Dockerfile               # optional for containerised run
├─ frontend/                    # React + Vite
│   ├─ src/
│   │   ├─ main.jsx
│   │   ├─ App.jsx
│   │   └─ routes/
│   │       └─ Home.jsx
│   ├─ index.html
│   ├─ vite.config.js
│   └─ package.json
├─ scripts/
│   ├─ install_backend.sh
│   ├─ install_frontend.sh
│   ├─ start.sh
│   └─ bootstrap.sh             # one‑liner installer
├─ .gitignore
└─ README.md                    # ← this file
```

---  

## Step‑by‑Step Instructions <a id="step-by-step-instructions"></a>  

### 1️⃣ Clone the repo (or copy the skeleton)  

```bash
git clone https://github.com/your‑username/termux‑web‑app.git
cd termux‑web‑app
```

### 2️⃣ Bootstrap the environment  

```bash
# One‑liner – creates venv, installs Python deps, builds frontend, and sets up ngrok
bash <(curl -sSL https://raw.githubusercontent.com/your‑username/termux‑web‑app/main/scripts/bootstrap.sh)
```

**`scripts/bootstrap.sh`** (copy‑paste into `scripts/bootstrap.sh` and execute):

```bash
#!/usr/bin/env bash
set -e

# ---- Python env -------------------------------------------------
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# ---- Frontend build ---------------------------------------------
cd frontend
pnpm install
pnpm run build   # creates ./dist

# ---- Ngrok authtoken (optional but recommended) -----------------
# Sign up at https://dashboard.ngrok.com/get-started/your-authtoken
# then replace the placeholder below:
# ngrok authtoken YOUR_AUTH_TOKEN

# ---- Start the services -------------------------------------------
cd ..
# 1️⃣ Run FastAPI with hot‑reload (development) or with gunicorn (prod)
uvicorn backend/app.main:app --host 0.0.0.0 --port 8000 &
# 2️⃣ Expose via ngrok (HTTPS)
ngrok http 8000 --region us --log=stdout &
# 3️⃣ Serve built static files with a tiny http server (optional)
cd frontend/dist
python -m http.server 8080 &
```

> **Result:**  
> - FastAPI API reachable at `http://127.0.0.1:8000`.  
> - Public URL via ngrok, e.g. `https://abcd1234.ngrok.io`.  
> - Front‑end assets served from the same ngrok tunnel (or from the local `8080` server).  

### 3️⃣ Production‑ready (optional)  

```bash
# Use gunicorn with multiple workers
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.app.main:app -b 0.0.0.0:8000

# Run ngrok as a background service (recommended for stable URLs)
ngrok http 8000 --log=stdout --log-format=logfmt --log-level=info &
```

You can also wrap the whole thing in a **Docker container** (see `backend/Dockerfile`) and run it with `docker compose up -d`.

---  

## Creative, State‑of‑the‑Art Features <a id="creative-state-of-the-art-features"></a>  

| Feature | Implementation |
|---------|----------------|
| **Live API Docs** | FastAPI automatically serves Swagger UI at `/docs` and ReDoc at `/redoc`. |
| **WebSockets** | Add a `/ws` endpoint in `api.py` for real‑time notifications (e.g., chat, live stats). |
| **PWA Offline Support** | Vite plugin `vite-plugin-pwa` generates a service worker that caches all assets, enabling offline usage. |
| **Automatic HTTPS** | Ngrok provides TLS termination; for custom domains, point a sub‑domain to the ngrok URL via Cloudflare DNS and enable “HTTPS‑Only” mode. |
| **Zero‑Config DB** | SQLite (`aiosqlite`) bundled in the backend; migrations handled by `alembic`. |
| **Dynamic Theming** | Tailwind CSS + `postcss-preset-env` for utility‑first styling; theme toggles persisted in `localStorage`. |
| **CI/CD on‑device** | GitHub Actions workflow that runs `pnpm test && pnpm build` inside Termux via `act` (GitHub Actions runner). |
| **Secure Secrets** | Store API keys in `termux-keyring` (via `termux-keyring store`) and inject them at runtime (`$API_KEY`). |
| **Resource‑Efficient** | Use `uvicorn` with `--workers 1` + `async` handlers; limit CPU with `cpulimit` if needed. |

---  

## Sample Code Snippets <a id="sample-code-snippets"></a>  

### `backend/requirements.txt`  
```text
fastapi==0.110.0
uvicorn[standard]==0.23.0
aiohttp==3.9.5
pydantic==2.6.4
aiosqlite==0.20.0
alembic==1.13.1
python-multipart==0.0.9
```

### `backend/app/main.py`  
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import api
from models.db import init_db

app = FastAPI()

# Initialize DB on startup
@app.on_event("startup")
async def on_startup():
    await init_db()

# CORS – allow the front‑end (served from the same origin after ngrok)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")
```

### `backend/app/routers/api.py`  
```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import List

from models.db import get_items as db_get_items, get_item as db_get_item, add_item as db_add_item

router = APIRouter()

# Pydantic model for Item
class Item(BaseModel):
    id: int
    name: str
    description: str = ""

# ---------- Basic CRUD endpoints ----------
@router.get("/items/", response_model=List[Item])
async def get_items():
    return await db_get_items()

@router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: int):
    item = await db_get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/items/", response_model=Item)
async def create_item(item: Item):
    new_item = await db_add_item(item.name, item.description)
    return new_item

# ---------- WebSocket chat ----------
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        pass

# ---------- Health check ----------
@router.get("/ping")
async def ping() -> dict:
    return {"msg": "pong"}
```

### `frontend/package.json` (scripts)  
```json
{
  "name": "termux-web-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.2.0",
    "vite-plugin-pwa": "^0.19.0"
  }
}
```

### `frontend/src/App.jsx`  
```jsx
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const ws = new WebSocket(`wss://${window.location.host}/ws`);
    ws.onmessage = (e) => setMsg((prev) => `${prev}\n${e.data}`);
    ws.onopen = () => ws.send("Hello from browser!");
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Termux‑Hosted PWA</h1>
        <p>Live backend: <code>/api/ping</code></p>
      </header>
      <main>
        <p>WebSocket echo: {msg}</p>
        <button onClick={() => setMsg("")}>Clear</button>
      </main>
    </div>
  );
}

export default App;
```

### `frontend/src/main.jsx`  
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `frontend/index.html`  
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Termux Web App</title>
    <script type="module" src="/src/main.jsx"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js");
      }
    </script>
  </body>
</html>
```

### `frontend/vite.config.js` (PWA plugin)  
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Termux Web App',
        short_name: 'TWA',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#61dafb',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---  

## Testing & Validation <a id="testing--validation"></a>  

1. **Local sanity check** – after `bootstrap.sh` finishes, open `http://127.0.0.1:8000/docs` – you should see the FastAPI Swagger UI.  
2. **Public URL** – the ngrok tunnel will output something like `https://abcd1234.ngrok.io`. Visit it; the React PWA should load, and the WebSocket echo will work.  
3. **PWA Install Prompt** – Chrome on Android will show “Install Termux Web App”. Accept to add a home‑screen shortcut that works offline.  
4. **Security** – verify that no secret keys are printed in logs; use `termux-keyring` to store them.  

---  

## Next Steps & Extensions <a id="next-steps--extensions"></a>  

- **Add a CI pipeline** that runs `pnpm lint && pnpm test && pnpm build` on every push (use GitHub Actions with `act`).  
- **Deploy to a custom domain** via Cloudflare Tunnel (`cloudflared tunnel run my‑site`) for a permanent HTTPS URL without third‑party exposure.  
- **Integrate a DB** – switch `aiosqlite` to PostgreSQL (`asyncpg`) for larger data sets.  
- **Add authentication** – use **FastAPI‑Users** + **OAuth2** (Google, GitHub) and protect WebSocket endpoints.  
- **Scale with Docker Swarm** – spin up multiple containers (backend, redis, postgres) behind an internal nginx reverse‑proxy.  

---  

## License <a id="license"></a>  
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---  

*Feel free to copy the entire structure above into a new repository, adjust the `author` and `license` fields in `README.md`, and start building your own Android‑hosted web services.*  

**Happy hacking!** 🚀  
