"""
ESP32 AI Radio Station Director - Simulatore
Simula il comportamento dell'ESP32 con interfaccia web
"""

import asyncio
import json
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.requests import Request
import socketio
import uvicorn

# Stato simulazione
radio_state = {
    "station_name": "Radio Gandolfi",
    "current_show": "Morning Flow",
    "current_item": {"type": "music", "title": "Morning Dust", "artist": "Royalty Free Artist"},
    "next_item": {"type": "podcast", "title": "AI Weekly Brief"},
    "volume": 70,
    "mode": "auto_dj",
    "wifi_connected": True,
    "backend_connected": True,
    "listeners": 12,
    "stream_url": "https://radio.example.com/live.mp3",
    "dj_message": "Buongiorno! Parte Morning Flow con suoni morbidi.",
    "led_color": "#ffaa44",
    "time": datetime.now().strftime("%H:%M"),
    "date": datetime.now().strftime("%d/%m/%Y"),
    "energy_level": 65,
    "taste_profile": {
        "lofi": 0.8,
        "ambient": 0.7,
        "jazz": 0.6,
        "synthwave": 0.5,
        "electronic": 0.4
    }
}

# Catalogo musicale simulato
music_catalog = [
    {"id": "track_001", "title": "Neon Rain", "artist": "Royalty Free Artist", "genre": "synthwave", "mood": ["night", "focus"], "duration_sec": 214},
    {"id": "track_002", "title": "Morning Dust", "artist": "Creative Commons Artist", "genre": "lofi", "mood": ["morning", "calm"], "duration_sec": 180},
    {"id": "track_003", "title": "Deep Focus", "artist": "Ambient Artist", "genre": "ambient", "mood": ["focus", "night"], "duration_sec": 300},
    {"id": "track_004", "title": "Jazz Lounge", "artist": "Jazz Artist", "genre": "jazz", "mood": ["morning", "relax"], "duration_sec": 240},
    {"id": "track_005", "title": "Drive Home", "artist": "Synthwave Artist", "genre": "synthwave", "mood": ["evening"], "duration_sec": 195},
]

podcast_catalog = [
    {"id": "pod_001", "title": "AI Weekly Brief", "duration_sec": 720, "language": "it", "topics": ["ai", "tech"]},
    {"id": "pod_002", "title": "Tech News Daily", "duration_sec": 600, "language": "it", "topics": ["tech", "startup"]},
    {"id": "pod_003", "title": "Creative Minds", "duration_sec": 900, "language": "it", "topics": ["art", "design"]},
]

# Creazione app
sio = socketio.AsyncServer(async_mode='asgi')
app = FastAPI(title="ESP32 AI Radio Simulator")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
app = socketio.ASGIApp(sio, other_asgi_app=app)

# WebSocket per aggiornamenti real-time
@socketio.AsyncServer.on('connect')
async def connect(sid, environ):
    print(f"Client connesso: {sid}")
    await sio.emit('state_update', radio_state)

@socketio.AsyncServer.on('disconnect')
async def disconnect(sid):
    print(f"Client disconnesso: {sid}")

# API endpoints
@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/state")
async def get_state():
    """Ottieni stato corrente radio"""
    radio_state["time"] = datetime.now().strftime("%H:%M")
    return radio_state

@app.post("/api/encoder/rotate")
async def encoder_rotate(direction: int):
    """Simula rotazione encoder (+1 o -1)"""
    radio_state["volume"] = max(0, min(100, radio_state["volume"] + direction * 5))
    await sio.emit('state_update', radio_state)
    return {"status": "ok", "volume": radio_state["volume"]}

@app.post("/api/encoder/click")
async def encoder_click():
    """Simula click encoder - cambia stazione"""
    shows = ["Morning Flow", "Deep Work", "Lunch Break", "Drive Home", "Night Mode"]
    idx = shows.index(radio_state["current_show"])
    radio_state["current_show"] = shows[(idx + 1) % len(shows)]
    
    # Genera nuovo item
    radio_state["current_item"] = random.choice(music_catalog)
    radio_state["dj_message"] = f"Cambio programma: ora in diretta {radio_state['current_show']}!"
    radio_state["led_color"] = random.choice(["#ffaa44", "#4a9fff", "#06d6a0", "#9d4edd"])
    
    await sio.emit('state_update', radio_state)
    return {"status": "ok", "show": radio_state["current_show"]}

@app.post("/api/encoder/longpress")
async def encoder_longpress():
    """Simula long press - cambia modalità"""
    modes = ["auto_dj", "human_curator", "focus_radio", "night_pirate", "city_radio", "serendipity", "emergency_calm"]
    idx = modes.index(radio_state["mode"])
    radio_state["mode"] = modes[(idx + 1) % len(modes)]
    radio_state["dj_message"] = f"Modalità: {radio_state['mode'].replace('_', ' ').title()}"
    
    await sio.emit('state_update', radio_state)
    return {"status": "ok", "mode": radio_state["mode"]}

@app.post("/api/button/skip")
async def button_skip():
    """Pulsante skip - salta contenuto"""
    radio_state["dj_message"] = "Salto questa traccia. La radio sceglie qualcosa di diverso..."
    radio_state["current_item"] = random.choice(music_catalog)
    await sio.emit('state_update', radio_state)
    return {"status": "ok"}

@app.post("/api/button/like")
async def button_like():
    """Pulsante like - feedback positivo"""
    genre = radio_state["current_item"].get("genre", "unknown")
    if genre in radio_state["taste_profile"]:
        radio_state["taste_profile"][genre] = min(1.0, radio_state["taste_profile"][genre] + 0.1)
    radio_state["dj_message"] = "Grazie! Questo stile verrà ripreso più spesso."
    await sio.emit('state_update', radio_state)
    return {"status": "ok"}

@app.post("/api/button/dislike")
async def button_dislike():
    """Pulsante dislike - feedback negativo"""
    genre = radio_state["current_item"].get("genre", "unknown")
    if genre in radio_state["taste_profile"]:
        radio_state["taste_profile"][genre] = max(0.0, radio_state["taste_profile"][genre] - 0.1)
    radio_state["dj_message"] = "Capito, meno {genre} in futuro."
    await sio.emit('state_update', radio_state)
    return {"status": "ok"}

@app.post("/api/button/emergency")
async def button_emergency():
    """Emergency calm mode"""
    radio_state["mode"] = "emergency_calm"
    radio_state["energy_level"] = 20
    radio_state["dj_message"] = "Modalità emergenza attiva. Playlist rilassante in corso..."
    radio_state["led_color"] = "#06d6a0"
    await sio.emit('state_update', radio_state)
    return {"status": "ok"}

@app.post("/api/dj/speak")
async def dj_speak():
    """Genera intervento DJ simulato"""
    messages = [
        "Sono le {time}, {city}. Oggi {weather} e la radio sceglie {genre}.",
        "Tra poco: {next_item}. Rimani sintonizzato!",
        "La tua radio intelligente, con gusto e senza invadere.",
        "Feedback ricevuto! La radio impara i tuoi gusti.",
    ]
    radio_state["dj_message"] = random.choice(messages).format(
        time=radio_state["time"],
        city="Milano",
        weather="è una bella giornata",
        genre=radio_state["current_item"].get("genre", "musica"),
        next_item=radio_state["next_item"].get("title", "prossimo contenuto")
    )
    await sio.emit('state_update', radio_state)
    return {"status": "ok", "message": radio_state["dj_message"]}

# Task di aggiornamento periodico
async def periodic_update():
    """Aggiornamento stato ogni secondo"""
    while True:
        radio_state["time"] = datetime.now().strftime("%H:%M")
        radio_state["listeners"] = random.randint(10, 25)
        await sio.emit('state_update', radio_state)
        await asyncio.sleep(1)

# Avvio
if __name__ == "__main__":
    import threading
    import webbrowser
    
    # Avvia task aggiornamento
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(periodic_update())
    
    # Apri browser
    webbrowser.open("http://localhost:8000")
    
    # Avvia server
    uvicorn.run(app, host="0.0.0.0", port=8000)