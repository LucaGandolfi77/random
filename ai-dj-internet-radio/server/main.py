"""
AI DJ Internet Radio - Server intermedio FastAPI
Fornisce commenti DJ e TTS senza esporre API key all'ESP32
"""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import random
from datetime import datetime
import asyncio

app = FastAPI(title="AI DJ Radio Server")

# Configurazione
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"

# Modelli dati
class DjRequest(BaseModel):
    time: str
    station_name: str
    genre: str
    mode: str
    weather: Optional[str] = "sunny"
    city: Optional[str] = "Milan"
    event: str

class DjResponse(BaseModel):
    text: str
    mood: str
    color: str
    tts_recommended: bool

class TtsRequest(BaseModel):
    text: str

class TtsResponse(BaseModel):
    audio_url: str

# Template commenti fallback (usati se AI non disponibile)
FALLBACK_COMMENTS = {
    "morning": [
        "Buongiorno! Oggi iniziamo con {{genre}} per una giornata perfetta.",
        "Sono le {{time}}, modalità mattina. {{station_name}} per accendere le vibrazioni.",
        "Caffè in mano, {{genre}} in cuffia. Buona giornata!"
    ],
    "focus": [
        "Modalità focus attiva. {{station_name}} per concentrazione massima.",
        "Lavoro in arrivo? {{genre}} per aiutarti a rimanere nel flow.",
        "Sono le {{time}}, tempo di produttività con {{station_name}}."
    ],
    "relax": [
        "Relax mode ON. Lascia che {{station_name}} ti accompagni.",
        "Tempo di relax con {{genre}}. Siediti, respira, ascolta.",
        "Sono le {{time}}, {{station_name}} per dolci pensieri."
    ],
    "evening": [
        "Serata {{station_name}} con {{genre}} per un tramonto speciale.",
        "Sono le {{time}}, l'atmosfera si fa magica con {{station_name}}.",
        "Fine giornata, {{genre}} per rilassare la mente."
    ],
    "night": [
        "Notte profonda, {{station_name}} per sogni dolci.",
        "Sono le {{time}}, {{genre}} per accompagnarti nel sonno.",
        "Modalità notte: {{station_name}} a volume minimo."
    ]
}

MOOD_COLORS = {
    "calm": "#4a9fff",
    "energetic": "#ff6b35",
    "chill": "#9d4edd",
    "focus": "#06d6a0",
    "neutral": "#ffffff"
}

def generate_fallback_comment(request: DjRequest) -> DjResponse:
    """Genera commento fallback senza AI"""
    templates = FALLBACK_COMMENTS.get(request.mode, FALLBACK_COMMENTS["neutral"])
    template = random.choice(templates)
    
    text = template.replace("{{time}}", request.time)
    text = text.replace("{{station_name}}", request.station_name)
    text = text.replace("{{genre}}", request.genre)
    
    # Aggiungi contesto meteo
    if request.weather and request.weather != "sunny":
        text += f" Oggi {{request.weather}} a {{request.city}}."
    
    mood = request.mode
    color = MOOD_COLORS.get(mood, "#ffffff")
    
    return DjResponse(
        text=text[:180],  # Massimo 180 caratteri
        mood=mood,
        color=color,
        tts_recommended=random.choice([True, False])
    )

async def call_openai(request: DjRequest) -> DjResponse:
    """Chiama OpenAI per generare commento DJ"""
    if not OPENAI_API_KEY:
        return generate_fallback_comment(request)
    
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        prompt = f"""
        Genera un breve commento da DJ radiofonico per una radio Internet personale.
        Il tono deve essere naturale, leggero, non invadente, massimo 180 caratteri.
        Usa il contesto fornuto: ora {request.time}, stazione {request.station_name}, 
        genere {request.genre}, modalità {request.mode}, meteo {request.weather}, 
        città {request.city}, evento {request.event}.
        Non inventare notizie reali. Non citare brani specifici.
        Rispondi solo in JSON con: text, mood, display_color, tts_recommended.
        """
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0.7
        )
        
        # Parsing semplice del JSON
        import json
        result = json.loads(response.choices[0].message.content)
        
        return DjResponse(
            text=result.get("text", "")[:180],
            mood=result.get("mood", "neutral"),
            color=result.get("display_color", "#ffffff"),
            tts_recommended=result.get("tts_recommended", False)
        )
        
    except Exception as e:
        print(f"OpenAI error: {e}")
        return generate_fallback_comment(request)

@app.post("/dj/comment", response_model=DjResponse)
async def get_dj_comment(request: DjRequest):
    """Endpoint per ottenere commento DJ"""
    try:
        return await call_openai(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts", response_model=TtsResponse)
async def generate_tts(request: TtsRequest):
    """Endpoint per generare TTS"""
    if not TTS_ENABLED:
        # TTS disabilitato, ritorna URL fittizio
        return TtsResponse(audio_url="http://server.local/audio/fallback.mp3")
    
    try:
        # Usa gTTS per generare audio
        from gtts import gTTS
        import uuid
        
        filename = f"dj_{uuid.uuid4().hex[:8]}.mp3"
        filepath = f"/tmp/{filename}"
        
        tts = gTTS(text=request.text, lang='it')
        tts.save(filepath)
        
        # In produzione, carica su server web
        return TtsResponse(audio_url=f"http://server.local/audio/{filename}")
        
    except Exception as e:
        print(f"TTS error: {e}")
        return TtsResponse(audio_url="")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/stations")
async def get_stations():
    """Endpoint per ottenere lista stazioni (opzionale)"""
    # In produzione, legge da database
    return [
        {"name": "Jazz Lounge", "url": "http://example.com/jazz.mp3", "genre": "jazz"},
        {"name": "Deep Focus", "url": "http://example.com/focus.mp3", "genre": "ambient"}
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)