# OpenRouter Free Model Comparator

A progressive web app (PWA) for benchmarking free OpenRouter models sequentially with the same prompt.

## Features

- **Sequential Execution**: Send the same prompt to multiple free OpenRouter models, one at a time
- **Live Progress Tracking**: Monitor current model, elapsed time, success/error counts
- **Comprehensive Metrics**: Per-model latency, token counts, tokens/second, characters, words
- **Side-by-Side Comparison**: View outputs from different models next to each other
- **Aggregate Statistics**: Summary cards with total tokens, fastest/slowest models, success rates
- **Charts**: Visualize latency, token usage, and tokens/second across models
- **Export**: Download results to JSON or CSV
- **Model Management**: Add, remove, reorder, and enable/disable models
- **Dark Mode**: Theme toggle with automatic system preference detection
- **Installable**: Works as a standalone PWA with offline shell caching
- **Security**: API key stays client-side for the session only

## Hardcoded Default Models

The app comes with six free models pre-configured:
- `openrouter/free`
- `meta-llama/llama-3.3-70b-instruct:free`
- `deepseek/deepseek-chat-v3-0324:free`
- `qwen/qwen3-235b-a22b:free`
- `meta-llama/llama-4-maverick:free`
- `google/gemini-2.0-flash-exp:free`

To edit the default list, modify `DEFAULT_MODELS` in `app.js` (line ~1).

## Setup

1. Extract all files to a directory
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari)
3. Paste your OpenRouter API key (from https://openrouter.ai/keys)
4. Configure temperature, max tokens, timeout
5. Add or modify models as needed
6. Write your prompt and click "Run comparison"

## API Key Security

Your OpenRouter API key:
- Is entered directly in the browser
- Is NOT sent to any server except OpenRouter
- Is stored only in memory for the current session
- Is NOT saved to disk unless you explicitly save browser data via browser settings
- Is NOT included in exports (JSON/CSV)

## Browser Compatibility

- Chrome/Chromium 56+
- Firefox 55+
- Edge 79+
- Safari 14.1+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## PWA Installation

- **Desktop**: Click "Install app" button or use browser install prompt
- **Mobile**: Use browser "Add to Home Screen" or install via app menu
- **Offline Shell**: The app shell caches for offline access, but API calls require network

## Exporting Results

- **JSON**: Full result objects with raw API responses and all metrics
- **CSV**: Tabular format for spreadsheet analysis (model, status, latency, tokens, etc.)

## Notes

- Free model availability on OpenRouter changes over time
- Add custom models in the UI or edit the hardcoded list in `app.js`
- Temperature and max_tokens are sent as optional parameters; some models may ignore them
- Timeouts default to 90 seconds per model; adjust if needed
- Side-by-side comparison works best with 2–6 models

## Files

- `index.html` – UI structure and elements
- `app.js` – State management, API calls, rendering (improved with diff view)
- `styles.css` – Responsive design, dark/light mode, diff layout
- `manifest.json` – PWA metadata
- `sw.js` – Service worker for app shell caching
- `assets/icon-192.png` & `assets/icon-512.png` – App icons

## License

Public domain / free to use and modify.
