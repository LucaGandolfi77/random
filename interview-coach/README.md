# Interview Coach

AI-powered interview coach backed by OpenRouter free models.

## Setup

```bash
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
pip install -e .
```

## Usage

```bash
interview-coach
```

### Commands during the session

| Command | Description |
|---|---|
| `/save` | Save the transcript to a JSON file |
| `/report` | Ask the coach to generate the evaluation report immediately |
| `/quit` | End the session (transcript is auto-saved) |
| `/help` | Show available commands |

Session transcripts are saved to `~/.interview-coach/sessions/`.
