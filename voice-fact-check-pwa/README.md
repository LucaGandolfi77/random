# Signal Check

Signal Check is a static installable PWA that continuously listens through the browser microphone, transcribes speech locally with the Web Speech API, and sends transcript text to an OpenRouter `:free` model for extra context and lightweight fact-checking.

## What it does

- Keeps a live transcript running while the mic is active.
- Auto-analyzes after a short pause, or on demand with `Analyze now`.
- Asks an OpenRouter model to return structured JSON with:
  - a heard summary
  - fact-check notes
  - extra context
  - follow-up prompts
- Caches the app shell with a service worker so the UI still opens offline.

## Run locally

Serve it over localhost so microphone access and the service worker can work:

```bash
cd voice-fact-check-pwa
python3 -m http.server 4173
```

Then open `http://localhost:4173` in Chrome or Edge.

## Setup

1. Paste an OpenRouter API key into the settings panel.
2. Keep or replace the suggested model id with an OpenRouter `:free` model.
3. Optionally click `Load free models` to fetch the current free-model list.
4. Press `Start listening` and allow microphone access.

## Important limitations

- This app relies on `SpeechRecognition` / `webkitSpeechRecognition`, which is not consistently available in every browser.
- Continuous listening can still stop if the browser, OS, or mobile power management suspends the app.
- Raw audio is not sent to OpenRouter, but transcript text is.
- Free models may be slow, rate-limited, or less reliable than paid models.