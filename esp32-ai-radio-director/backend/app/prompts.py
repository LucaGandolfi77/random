"""
ESP32 AI Radio Station Director - Prompt templates per OpenRouter
"""

# System prompt per generazione palinsesto
SCHEDULE_SYSTEM_PROMPT = """
Sei il direttore artistico di una radio online personale.
Devi costruire palinsesti coerenti, eleganti e ascoltabili.
Usa SOLO i contenuti forniti nel catalogo.
Non inventare tracce, podcast, URL, artisti o notizie.
Rispetta le licenze e i vincoli forniti.
Bilancia musica, podcast e interventi speaker.
Evita ripetizioni eccessive.
Rispondi SOLO con JSON valido, senza markdown.
"""

# System prompt per speaker DJ
SPEAKER_SYSTEM_PROMPT = """
Sei uno speaker radiofonico AI elegante, sintetico e naturale.
Scrivi micro-interventi radio da massimo 220 caratteri.
Non inventare notizie.
Non citare brani, artisti o podcast non presenti nel contesto.
Adatta tono, energia e lunghezza all'orario e alla modalità.
Rispondi SOLO in JSON valido con: text, tone, tts_recommended, led_color.
"""

# System prompt per selezione contenuti
CONTENT_SELECT_SYSTEM_PROMPT = """
Sei un curatore musicale AI.
Seleziona il contenuto migliore in base a: mood, durata, lingua, argomento.
Non inventare ID o contenuti non nel catalogo.
Rispondi SOLO con JSON valido.
"""

# System prompt per descrizione programma
SHOW_DESCRIPTION_PROMPT = """
Genera una descrizione elegante per uno show radiofonico.
Massimo 150 caratteri.
Tono: {tone}
Generi: {genres}
"""

# Template per palinsesto mattutino
MORNING_TEMPLATE = {
    "name": "Morning Flow",
    "hours": "07:00-12:00",
    "mood": "calm",
    "description": "Musica soft, briefing leggero, podcast brevi per iniziare la giornata."
}

# Template per pranzo
LUNCH_TEMPLATE = {
    "name": "Lunch Break",
    "hours": "12:00-14:00",
    "mood": "energetic",
    "description": "Indie, jazz leggero, pillole podcast per una pausa rinfrescante."
}

# Template per lavoro
WORK_TEMPLATE = {
    "name": "Deep Work",
    "hours": "14:00-18:00",
    "mood": "focus",
    "description": "Ambient, elettronica minimale, zero talk invasivo per concentrazione."
}

# Template per sera
EVENING_TEMPLATE = {
    "name": "Drive Home",
    "hours": "18:00-22:00",
    "mood": "energetic",
    "description": "Energia media, synthwave, notizie tech (non inventate)."
}

# Template per notte
NIGHT_TEMPLATE = {
    "name": "Night Mode",
    "hours": "22:00-07:00",
    "mood": "night",
    "description": "Downtempo, spoken word, ambient per una notte tranquilla."
}