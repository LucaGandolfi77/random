"""
ESP32 AI Radio Station Director - Client OpenRouter
Gestisce chiamate al modello AI senza esporre API key
"""

import httpx
import json
from typing import Optional, Dict, Any
from app.config import settings

class OpenRouterClient:
    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.base_url = "https://openrouter.ai/api/v1"
        self.timeout = 30.0
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://radio-gandolfi.local",
            "X-Title": "ESP32 AI Radio Director"
        }
    
    async def chat_completion(
        self, 
        model: str,
        messages: list,
        max_tokens: int = 200,
        temperature: float = 0.7
    ) -> Optional[Dict[str, Any]]:
        """Chiama OpenRouter chat completions"""
        
        if not self.api_key:
            return None
            
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._get_headers(),
                    json={
                        "model": model,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data
                    
            except Exception as e:
                print(f"OpenRouter error: {e}")
                
        return None
    
    async def generate_schedule(self, request: Dict) -> Dict:
        """Genera palinsesto radiofonico"""
        
        system_prompt = """
        Sei il direttore artistico di una radio online personale.
        Devi costruire palinsesti coerenti, eleganti e ascoltabili.
        Usa solo i contenuti forniti nel catalogo.
        Non inventare tracce, podcast, URL, artisti o notizie.
        Rispetta licenze e vincoli.
        Bilancia musica, podcast e interventi speaker.
        Evita ripetizioni.
        Rispondi SOLO con JSON valido, senza markdown.
        """
        
        user_prompt = f"""
        Genera un palinsesto per oggi {request.get('date')}.
        Stazione: {request.get('station_identity', {}).get('name')}
        Stile: {request.get('station_identity', {}).get('style')}
        Lingua: {request.get('station_identity', {}).get('language')}
        
        Catalogo musicale disponibile: {len(request.get('available_music', []))} tracce
        Podcast disponibili: {len(request.get('available_podcasts', []))} episodi
        
        Vincoli: {request.get('constraints', {})}
        
        Formato output:
        {{
          "schedule": [
            {{
              "start": "08:00",
              "end": "09:00", 
              "show_name": "Morning Flow",
              "mood": "calm",
              "items": [
                {{"type": "music", "id": "track_001"}},
                {{"type": "talk", "script": "..."}}
              ]
            }}
          ]
        }}
        """
        
        result = await self.chat_completion(
            model=settings.openrouter_model_schedule,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1000
        )
        
        if result and "choices" in result:
            try:
                return json.loads(result["choices"][0]["message"]["content"])
            except:
                pass
        
        # Fallback
        return self._fallback_schedule()
    
    async def generate_speak(self, request: Dict) -> Dict:
        """Genera intervento speaker DJ"""
        
        system_prompt = """
        Sei uno speaker radiofonico AI elegante, sintetico e naturale.
        Scrivi micro-interventi radio da massimo 220 caratteri.
        Non inventare notizie.
        Non citare brani, artisti o podcast non presenti nel contesto.
        Adatta tono, energia e lunghezza all'orario e alla modalità.
        Rispondi SOLO in JSON valido con: text, tone, tts_recommended, led_color.
        """
        
        user_prompt = f"""
        Genera un intervento per evento: {request.get('event')}
        Show: {request.get('show')}
        Item corrente: {request.get('current_item')}
        Prossimo item: {request.get('next_item')}
        Mood: {request.get('mood')}
        """
        
        result = await self.chat_completion(
            model=settings.openrouter_model_speak,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=100
        )
        
        if result and "choices" in result:
            try:
                return json.loads(result["choices"][0]["message"]["content"])
            except:
                pass
        
        # Fallback
        return {
            "text": "Buona musica su Radio Gandolfi.",
            "tone": "neutral",
            "tts_recommended": False,
            "led_color": "#ffffff"
        }
    
    def _fallback_schedule(self) -> Dict:
        """Palinsesto di fallback"""
        return {
            "schedule": [
                {
                    "start": "08:00",
                    "end": "12:00",
                    "show_name": "Morning Flow",
                    "mood": "calm",
                    "items": [{"type": "music", "id": "fallback_001"}]
                }
            ]
        }