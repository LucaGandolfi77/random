"""
ESP32 AI Radio Station Director - Scheduler e catalogo contenuti
"""

import json
from datetime import datetime
from typing import List, Optional
from app.models import MusicItem, PodcastItem, ScheduleSlot

# Catalogo musicale legale (esempio)
LEGAL_MUSIC_CATALOG = [
    {
        "id": "track_001",
        "title": "Neon Rain",
        "artist": "Royalty Free Artist",
        "genre": "synthwave",
        "mood": ["night", "focus"],
        "duration_sec": 214,
        "license": "royalty_free",
        "url": "https://server.local/audio/neon-rain.mp3"
    },
    {
        "id": "track_002",
        "title": "Morning Dust",
        "artist": "Creative Commons Artist",
        "genre": "lofi",
        "mood": ["morning", "calm"],
        "duration_sec": 180,
        "license": "cc-by",
        "url": "https://server.local/audio/morning-dust.mp3"
    },
    {
        "id": "track_003",
        "title": "Deep Focus",
        "artist": "Ambient Collection",
        "genre": "ambient",
        "mood": ["focus", "work"],
        "duration_sec": 300,
        "license": "royalty_free",
        "url": "https://server.local/audio/deep-focus.mp3"
    },
    {
        "id": "track_004",
        "title": "Jazz Lounge",
        "artist": "Jazz Royalty Free",
        "genre": "jazz",
        "mood": ["evening", "relax"],
        "duration_sec": 240,
        "license": "royalty_free",
        "url": "https://server.local/audio/jazz-lounge.mp3"
    }
]

# Catalogo podcast legali
LEGAL_PODCAST_CATALOG = [
    {
        "id": "pod_001",
        "title": "AI Weekly Brief",
        "duration_sec": 720,
        "language": "it",
        "topics": ["ai", "tech", "startup"],
        "published_at": "2026-06-18",
        "source": "rss_authorized"
    },
    {
        "id": "pod_002",
        "title": "Science Vibes",
        "duration_sec": 1200,
        "language": "it",
        "topics": ["science", "culture"],
        "published_at": "2026-06-17",
        "source": "rss_authorized"
    }
]

class RadioScheduler:
    def __init__(self):
        self.schedule: List[ScheduleSlot] = []
        self.current_slot_index = 0
        self.history: List[str] = []
        self.liked: List[str] = []
        self.disliked: List[str] = []
    
    def load_catalog(self) -> tuple:
        """Carica catalogo musicale e podcast"""
        music = [MusicItem(**item) for item in LEGAL_MUSIC_CATALOG]
        podcasts = [PodcastItem(**item) for item in LEGAL_PODCAST_CATALOG]
        return music, podcasts
    
    def get_current_show(self) -> str:
        """Ottiene lo show corrente in base all'ora"""
        now = datetime.now()
        hour = now.hour
        
        if 6 <= hour < 12:
            return "Morning Flow"
        elif 12 <= hour < 14:
            return "Lunch Break"
        elif 14 <= hour < 18:
            return "Deep Work"
        elif 18 <= hour < 22:
            return "Drive Home"
        else:
            return "Night Mode"
    
    def get_next_item(self, history: List[str], liked: List[str], 
                      disliked: List[str], time: str) -> dict:
        """Sceglie il prossimo contenuto"""
        
        # Filtra contenuti non dislikati
        available = [m for m in LEGAL_MUSIC_CATALOG 
                     if m["id"] not in disliked]
        
        # Preferisci contenuti likati
        preferred = [m for m in available if m["id"] in liked]
        if preferred:
            import random
            return {"type": "music", "id": random.choice(preferred)["id"]}
        
        # Altrimenti scegli casuale
        import random
        item = random.choice(available)
        return {"type": "music", "id": item["id"]}
    
    def record_feedback(self, item_id: str, feedback: str):
        """Registra feedback utente"""
        if feedback == "like":
            if item_id not in self.liked:
                self.liked.append(item_id)
        elif feedback == "dislike":
            if item_id not in self.disliked:
                self.disliked.append(item_id)