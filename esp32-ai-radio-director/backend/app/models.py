"""
ESP32 AI Radio Station Director - Modelli dati
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ==================== Request Models ====================

class StationIdentity(BaseModel):
    name: str = "Radio Gandolfi"
    language: str = "it"
    style: str = "elegante, tech, notturna, intelligente"

class MusicItem(BaseModel):
    id: str
    title: str
    artist: str
    genre: str
    mood: List[str]
    duration_sec: int
    license: str  # royalty_free, cc-by, user_owned
    url: str

class PodcastItem(BaseModel):
    id: str
    title: str
    duration_sec: int
    language: str
    topics: List[str]
    published_at: str
    source: str  # rss_authorized

class ScheduleSlot(BaseModel):
    start: str  # "08:00"
    end: str    # "09:00"
    show_name: str
    mood: str
    items: List[dict]  # {"type": "music", "id": "..."}

class ScheduleRequest(BaseModel):
    date: str
    station_identity: StationIdentity
    available_music: List[MusicItem]
    available_podcasts: List[PodcastItem]
    constraints: dict

# ==================== Response Models ====================

class DjSpeakRequest(BaseModel):
    event: str  # station_start, transition, periodic
    show: str
    current_item: str
    next_item: str
    mood: str

class DjSpeakResponse(BaseModel):
    text: str
    tone: str  # warm, energetic, calm, night, focus, formal
    tts_recommended: bool
    led_color: str

class TtsRequest(BaseModel):
    text: str
    voice: str = "warm_it_male"

class TtsResponse(BaseModel):
    audio_url: str

class RadioStatus(BaseModel):
    online: bool
    current_show: str
    current_item: str
    next_item: str
    listeners: int
    stream_url: str

class CommandRequest(BaseModel):
    command: str
    source: str
    timestamp: str

class FeedbackRequest(BaseModel):
    item_id: str
    feedback: str  # like, dislike
    timestamp: Optional[str] = None