# AI DJ Internet Radio

Una radio Internet Wi-Fi con uscita audio I²S, display OLED/TFT, encoder rotativo e commenti AI in stile "DJ radiofonico".

## Panoramica del Progetto

L'AI DJ Internet Radio trasforma il modo di ascoltare la radio con:
- Streaming audio MP3/AAC da stazioni Internet
- Display OLED per informazioni in tempo reale
- Controllo volume e stazione tramite encoder rotativo
- Commenti AI contestuali (ora, stazione, genere, meteo, modalità)
- Supporto TTS opzionale per messaggi vocali

## Lista Materiali

| Componente | Quantità | Note |
|------------|----------|------|
| ESP32-S3 DevKit | 1 | Consigliato per prestazioni migliori |
| MAX98357A DAC I²S | 1 | Amplificatore audio 3W |
| Speaker 4Ω/8Ω | 1 | 3-5W consigliato |
| Encoder rotativo | 1 | Con pulsante integrato |
| Display OLED SSD1306 128x64 | 1 | Interfaccia I²C |
| Pulsanti Tactile | 3 | Preferiti, Mute, Modalità (opzionale) |
| Resistori 10kΩ | 3 | Pull-up per pulsanti |
| Breadboard/PCB | 1 | Per prototipo |
| Alimentatore 5V 1A | 1 | Micro-USB o USB-C |

## Schema Collegamenti

```
ESP32-S3 DevKit -> MAX98357A (Audio)
  GPIO 26  -> BCLK (Bit Clock)
  GPIO 25  -> LRC/WS (Word Select)
  GPIO 22  -> DIN (Data In)
  5V       -> VIN
  GND      -> GND

ESP32-S3 DevKit -> Encoder Rotativo
  GPIO 32  -> CLK (con pull-up)
  GPIO 33  -> DT (con pull-up)
  GPIO 27  -> SW (pulsante, con pull-up)

ESP32-S3 DevKit -> OLED SSD1306 (I²C)
  GPIO 18  -> SDA (evita conflitto con I²S)
  GPIO 19  -> SCL (evita conflitto con I²S)
  3.3V     -> VCC
  GND      -> GND

Pulsanti opzionali (se usati):
  GPIO 34  -> Pulsante Preferiti
  GPIO 35  -> Pulsante Mute
  GPIO 36  -> Pulsante Modalità
```

## Architettura Software

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ESP32     │     │  Server AI  │     │   Internet  │
│             │     │  (FastAPI)  │     │   Streams   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ WiFi              │ HTTP              │ HTTP
       ├──────────────────►├──────────────────►│
       │                   │                   │
       │ I²S               │                   │
       ├──────────────────►│ Speaker           │
       │                   │                   │
       │ I²C               │                   │
       ├──────────────────►│ Display OLED      │
       │                   │                   │
       │ GPIO              │                   │
       ├──────────────────►│ Encoder           │
```

### Componenti Firmware

- **WifiManagerCustom**: Gestione connessione Wi-Fi e sincronizzazione NTP
- **AudioManager**: Streaming audio I²S con ESP32-audioI2S
- **DisplayManager**: Visualizzazione su OLED SSD1306
- **EncoderManager**: Controllo encoder rotativo con callback
- **AiDjClient**: Comunicazione HTTP con server AI intermedio

### Endpoint Server

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/dj/comment` | POST | Richiede commento DJ contestuale |
| `/tts` | POST | Genera audio TTS dal testo |
| `/health` | GET | Health check server |
| `/stations` | GET | Lista stazioni (opzionale) |

## Installazione e Compilazione

### Firmware ESP32

1. Installare PlatformIO (VS Code extension o CLI)
2. Modificare `src/config.h` con credenziali WiFi e URL server AI
3. Compilare e caricare:

```bash
cd ai-dj-internet-radio
pio run
pio run --target upload
```

### Server AI

```bash
cd server
pip install -r requirements.txt
export OPENAI_API_KEY="your-key-here"
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Esempi Configurazione

### stations.json (opzionale)

```json
[
  {
    "name": "Jazz Lounge",
    "url": "http://stream.radiojazz.it:8000/jazz",
    "genre": "jazz",
    "mode_hint": "morning"
  },
  {
    "name": "Deep Focus",
    "url": "http://stream.focusambient.com:8000/ambient",
    "genre": "ambient",
    "mode_hint": "focus"
  }
]
```

### Richiesta AI

```json
{
  "time": "08:20",
  "station_name": "Jazz Lounge",
  "genre": "jazz",
  "mode": "morning",
  "weather": "cloudy",
  "city": "Milan",
  "event": "startup"
}
```

### Risposta AI

```json
{
  "text": "Sono le 8:20, modalità caffè. Jazz morbido e cielo grigio: partiamo piano, ma con stile.",
  "mood": "calm",
  "color": "#ffaa44",
  "tts_recommended": true
}
```

## Possibili Problemi e Debug

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| Nessun audio | Pin I²S errati | Verificare BCLK, LRC, DIN |
| Display nero | SDA/SCL errati o conflitto | Usare GPIO 18/19 invece di 21/22 |
| WiFi non si connette | Credenziali errate | Controllare SSID/password in config.h |
| AI non risponde | Server non raggiungibile | Verificare IP server e firewall |
| Encoder non funziona | Debounce insufficiente | Aumentare debounce delay |

## Roadmap Versione 2

- [ ] Supporto TFT ST7789 con grafica avanzata
- [ ] Meteo reale tramite API (OpenWeatherMap)
- [ ] Salvataggio stazioni in SPIFFS
- [ ] Bluetooth A2DP per output audio
- [ ] Alexa/Google Assistant integration
- [ ] Web interface per configurazione
- [ ] Equalizzatore audio digitale
- [ ] Altoparlante con amplificatore PAM8403
- [ ] Case stampato 3D con supporto encoder
- [ ] OTA updates per firmware

## Licenza

MIT License - Utilizzo libero per progetti personali e commerciali.