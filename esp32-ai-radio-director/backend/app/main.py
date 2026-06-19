"""
ESP32 AI Radio Station Director - Backend FastAPI principale
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from typing import Optional

from app.config import settings
from app.models import (
    ScheduleRequest, DjSpeakRequest, DjSpeakResponse,
    TtsRequest, TtsResponse, RadioStatus, CommandRequest, FeedbackRequest
)
from app.openrouter_client import OpenRouterClient
from app.scheduler import RadioScheduler

app = FastAPI(
    title="ESP32 AI Radio Station Director API",
    description="Backend per direttore artistico AI radio",
    version="1.0.0"
)

security = HTTPBearer()
scheduler = RadioScheduler()
ai_client = OpenRouterClient()

# ==================== Auth ====================

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifica token dispositivo"""
    token = credentials.credentials
    if token != settings.api_token:
        raise HTTPException(status_code=403, detail="Token non valido")
    return token

# ==================== Endpoints ====================

@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/api/schedule/generate")
async def generate_schedule(request: ScheduleRequest, token: str = Depends(verify_token)):
    """Genera palinsesto AI"""
    
    schedule = await ai_client.generate_schedule(request.model_dump())
    return schedule

@app.post("/api/playlist/next")
async def get_next_item(
    current_show: str,
    history: list,
    liked: list,
    disliked: list,
    time: str,
    token: str = Depends(verify_token)
):
    """Sceglie prossimo contenuto"""
    
    next_item = scheduler.get_next_item(history, liked, disliked, time)
    return {"next_item": next_item}

@app.post("/api/dj/speak", response_model=DjSpeakResponse)
async def dj_speak(request: DjSpeakRequest, token: str = Depends(verify_token)):
    """Genera intervento speaker DJ"""
    
    response = await ai_client.generate_speak(request.model_dump())
    return DjSpeakResponse(**response)

@app.post("/api/tts", response_model=TtsResponse)
async def generate_tts(request: TtsRequest, token: str = Depends(verify_token)):
    """Genera audio TTS (placeholder)"""
    
    # In produzione usa gTTS o servizio TTS
    return TtsResponse(
        audio_url=f"https://server.local/generated/tts_{hash(request.text) % 10000}.mp3"
    )

@app.get("/api/radio/status", response_model=RadioStatus)
async def get_status(token: str = Depends(verify_token)):
    """Stato corrente radio"""
    
    music, podcasts = scheduler.load_catalog()
    
    return RadioStatus(
        online=True,
        current_show=scheduler.get_current_show(),
        current_item="Morning Dust",
        next_item="Neon Rain",
        listeners=12,
        stream_url="https://radio.example.com/live.mp3"
    )

@app.post("/api/radio/command")
async def send_command(request: CommandRequest, token: str = Depends(verify_token)):
    """Riceve comandi da ESP32"""
    
    valid_commands = ["play", "pause", "skip", "like", "dislike", 
                      "change_mode", "emergency_calm", "announce_now"]
    
    if request.command not in valid_commands:
        raise HTTPException(status_code=400, detail="Comando non valido")
    
    # Qui si controllerebbe il motore di streaming (Liquidsoap/Icecast)
    return {"status": "ok", "command": request.command}

@app.post("/api/feedback")
async def send_feedback(request: FeedbackRequest, token: str = Depends(verify_token)):
    """Registra feedback utente"""
    
    scheduler.record_feedback(request.item_id, request.feedback)
    return {"status": "ok"}

@app.get("/api/catalog/music")
async def get_music_catalog(token: str = Depends(verify_token)):
    """Ottiene catalogo musicale"""
    return {"music": scheduler.load_catalog()[0]}

@app.get("/api/catalog/podcasts")
async def get_podcast_catalog(token: str = Depends(verify_token)):
    """Ottiene catalogo podcast"""
    return {"podcasts": scheduler.load_catalog()[1]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.server_host, port=settings.server_port)