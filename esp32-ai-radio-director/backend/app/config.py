"""
ESP32 AI Radio Station Director - Configurazione backend
"""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OpenRouter
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model_schedule: str = "anthropic/claude-3-haiku"  # Veloce per palinsesto
    openrouter_model_speak: str = "anthropic/claude-3-sonnet"   # Migliore per testi
    openrouter_model_tts: str = "openai/tts-1"
    
    # Server
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    
    # Radio identity
    station_name: str = "Radio Gandolfi"
    station_tagline: str = "Suoni intelligenti da una stanza connessa"
    station_language: str = "it"
    voice_style: str = "calmo, tech, elegante, leggermente ironico"
    
    # Music policy
    allowed_genres: list = ["lofi", "ambient", "jazz", "synthwave", "electronic", "classical"]
    max_talk_per_hour_sec: int = 180
    
    # Security
    api_token: str = os.getenv("API_TOKEN", "change-this-token")
    
    class Config:
        env_file = ".env"

settings = Settings()