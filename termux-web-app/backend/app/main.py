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