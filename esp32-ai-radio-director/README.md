# ESP32 AI Radio Station Director

Un direttore artistico AI per radio online che orchestra musica, podcast e interventi speaker tramite ESP32-S3.

## Panoramica

Il sistema è composto da due parti distinte:
- **ESP32-S3**: Interfaccia hardware, controlli fisici, visualizzazione
- **Backend FastAPI**: Intelligenza AI, palinsesto, gestione contenuti

## Architettura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ESP32     │     │  Backend    │     │ OpenRouter  │     │ Icecast/    │
│             │◄──► │  FastAPI    │◄──► │             │     │ Liquidsoap  │
│ Display     │     │             │     │             │     │             │
│ Encoder     │     │ AI Director │     │ LLM         │     │ Streaming   │
│ LED Mood    │     │ Catalog     │     │             │     │ Server      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Lista Materiali

| Componente | Quantità | Note |
|------------|----------|------|
| ESP32-S3 DevKit | 1 | Preferito per GPIO disponibili |
| MAX98357A DAC I²S | 1 | Audio output |
| Speaker 4Ω/8Ω | 1 | 3-5W |
| TFT ST7789 240x240 | 1 | SPI interface |
| Encoder rotativo | 1 | Con pulsante |
| LED WS2812B | 1-12 | Anello mood |
| Pulsanti Tactile | 4 | Skip, Like, Dislike, Emergency |
| Resistori 10kΩ | 4 | Pull-up |
| Breadboard/PCB | 1 | Prototipo |
| Alimentatore 5V 2A | 1 | USB-C |

## Pinout ESP32-S3

```
// Audio I2S
MAX98357A:
  BCLK  -> GPIO 17
  LRC   -> GPIO 18
  DIN   -> GPIO 16
  VIN   -> 5V
  GND   -> GND

// TFT ST7789 SPI
  SCLK  -> GPIO 12
  MOSI  -> GPIO 11
  CS    -> GPIO 10
  DC    -> GPIO 9
  RST   -> GPIO 8
  BL    -> GPIO 7 (opzionale)

// Encoder
  A     -> GPIO 4
  B     -> GPIO 5
  SW    -> GPIO 6

// LED Mood
  DIN   -> GPIO 48 (disponibile su S3)

// Pulsanti
  Skip     -> GPIO 3
  Like     -> GPIO 47
  Dislike  -> GPIO 46
  Emergency  -> GPIO 45
```

## Installazione

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Modifica .env con OPENROUTER_API_KEY e API_TOKEN
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Firmware ESP32

```bash
cd firmware
# Modifica src/Config.h con WiFi e BACKEND_URL
pio run --target upload
```

## Endpoint API

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/schedule/generate` | POST | Genera palinsesto AI |
| `/api/playlist/next` | POST | Sceglie prossimo contenuto |
| `/api/dj/speak` | POST | Genera intervento speaker |
| `/api/tts` | POST | Genera audio TTS |
| `/api/radio/status` | GET | Stato radio corrente |
| `/api/radio/command` | POST | Invia comando |
| `/api/feedback` | POST | Registra like/dislike |
| `/api/catalog/music` | GET | Catalogo musicale |
| `/api/catalog/podcasts` | GET | Catalogo podcast |

## Modalità Radio

1. **Auto DJ**: AI decide tutto il palinsesto
2. **Human Curator**: Utente sceglie generi, AI organizza
3. **Focus Radio**: Zero talk, solo musica concentrante
4. **Night Pirate**: Mood synthwave notturno
5. **Local City**: Interventi meteo/ora contestuali
6. **Serendipity**: Contenuti inaspettati ma coerenti
7. **Emergency Calm**: Playlist rilassante immediata

## Radio Brain (Memoria Editoriale)

```json
{
  "taste_profile": {
    "jazz": 75,
    "electronic": 80,
    "ambient": 90,
    "lofi": 65,
    "synthwave": 55
  },
  "daily_energy_curve": {
    "morning": 60,
    "afternoon": 80,
    "evening": 70,
    "night": 30
  },
  "recent_repetition_penalty": ["track_001", "track_002"],
  "listener_feedback": {
    "liked": ["track_003"],
    "disliked": ["track_004"]
  },
  "station_identity": {
    "name": "Radio Gandolfi",
    "style": "elegante, tech, notturna"
  }
}
```

## Streaming Server (Liquidsoap + Icecast)

### Configurazione Liquidsoap

```bash
# /etc/liquidsoap/radio.liq
set("log.file", false)
set("log.stdout", true)
set("log.level", 3)

# Playlist dinamica
default = single("/var/music/silence.mp3")
radio = fallback([default])

# Output Icecast
output.icecast(
  %mp3,
  host = "localhost",
  port = 8000,
  password = "hackme",
  mount = "radio.mp3",
  radio
)
```

### Pro/Contro Opzioni Streaming

| Opzione | Pro | Contro |
|---------|-----|--------|
| Liquidsoap + Icecast | Flessibile, script potenti | Configurazione complessa |
| AzuraCast | Interfaccia web completa | Risorse elevate |
| FFmpeg + Icecast | Semplice, leggero | Meno funzioni |

## Sicurezza

- Nessuna API key nel firmware ESP32
- Token univoco ESP32-backend
- HTTPS consigliato in produzione
- Rate limiting implementato
- Validazione JSON rigorosa
- Fallback offline integrato

## Roadmap v2

- [ ] TFT con grafica avanzata (waveform)
- [ ] Bluetooth A2DP output
- [ ] Web dashboard per gestione
- [ ] Meteo reale via API
- [ ] Equalizzatore digitale
- [ ] Registrazione podcast live
- [ ] Multi-room audio
- [ ] Voice commands
- [ ] Spotify Connect (con licenza)
- [ ] Analytics ascolti

## Licenze

Solo contenuti legali: royalty-free, Creative Commons, user-owned, o autorizzati.