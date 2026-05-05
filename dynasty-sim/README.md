# Dynasty Sim

A multi-generational family and dynasty simulator powered by large language models via [OpenRouter](https://openrouter.ai).

Simulate hundreds of years of births, deaths, marriages, rivalries, scandals, and inheritance — then read the chronicle of what happened.

---

## Features

- **Biological inheritance** — traits blend across generations with dominant/recessive genes, polygenic effects, grandparent modifiers, and random mutations
- **Relationship engine** — characters meet, bond, fall in love, marry, feud, and drift apart based on trait compatibility and shared history
- **Memory system** — each character retains up to 120 memories with emotional valence and time-decay
- **Dynasty tracking** — founding families accumulate prestige, known traits, and a living chronicle
- **LLM narration** — optional GPT/Gemini-powered yearly summaries and character biographies (falls back to rich templates when disabled)
- **Checkpoint saves** — auto-save JSON snapshots every N years; resume any prior run
- **Rich CLI** — `run`, `status`, `story`, `tree`, `checkpoints` commands with colourful output

---

## Quick Start

```bash
# 1. Install
cd dynasty-sim
pip install -e .

# 2. Configure (optional — only needed for LLM narration)
cp .env.example .env
# edit .env and add your OPENROUTER_API_KEY

# 3. Run a 50-year simulation
dynasty-sim run --years 50 --verbose

# 4. Check world status
dynasty-sim status

# 5. Read the full story
dynasty-sim story

# 6. View a character's family tree
dynasty-sim tree "Edmund Ashford" --depth 4

# 7. Export an interactive HTML report
dynasty-sim html --output report.html
```

---

## Architecture

```
dynasty_sim/
├── models.py         # All Pydantic data models (WorldState, Character, Relationship, …)
├── client.py         # OpenRouter HTTP client with fallback and JSON extraction
├── inheritance.py    # Biological trait inheritance engine
├── memory.py         # Per-character memory store with time-decay and recall
├── relationships.py  # Meeting, interacting, marriage, parent-child registration
├── generator.py      # Character and child generation; upbringing trait evolution
├── engine.py         # Yearly simulation tick: births, aging, deaths, marriages, scandals
├── reporter.py       # Template and LLM-powered narrative generation
├── persistence.py    # JSON save/load and checkpoint management
├── seeds.py          # Three founding families (Ashford, Blackwood, Drake)
└── cli.py            # Typer CLI entry point
```

### Data flow (one tick)

```
engine.tick_year(world)
  ├─ generator.apply_upbringing()       ← environment shapes learned traits
  ├─ new encounters → relationships.first_meeting() / interact()
  ├─ romance → relationships.eligible_couples() → form_marriage()
  ├─ births → generator.generate_child() → inheritance.combine()
  ├─ aging → char.update_life_stage()
  ├─ deaths (age, health, random)
  ├─ scandals (LLM or template)
  ├─ relationships.apply_relationship_decay()
  └─ YearSummary appended → reporter.generate_year_narrative() (optional)
```

---

## Configuration

All settings are controlled via environment variables. Copy `.env.example` to `.env`:

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | *(required for LLM)* | Your OpenRouter API key |
| `DYNASTY_PRIMARY_MODEL` | `google/gemini-2.0-flash-exp:free` | Primary LLM model |
| `DYNASTY_FALLBACK_MODEL` | `mistralai/mistral-7b-instruct:free` | Fallback if primary fails |
| `DYNASTY_LLM_TIMEOUT` | `45` | HTTP timeout in seconds |
| `DYNASTY_SAVE_DIR` | `saves` | Directory for checkpoint files |
| `DYNASTY_MAX_POPULATION` | `200` | Hard population cap |
| `DYNASTY_LOG_LEVEL` | *(unset)* | Set to `INFO` or `DEBUG` to log OpenRouter calls |

**Log levels:**
- `INFO` — one line per API call with model name, attempt number, latency, and OK/FAIL result
- `DEBUG` — adds prompt character count, HTTP error bodies, and all intermediate attempts

```
15:32:01 [INFO] dynasty_sim.client: LLM OK | model=google/gemini-2.0-flash-exp:free | attempt=1 | 3.42s | response_chars=187
15:32:05 [WARNING] dynasty_sim.client: LLM FAIL | model=google/gemini-2.0-flash-exp:free | attempt=1 | 30.00s | error=OpenRouter request timed out
15:32:07 [INFO] dynasty_sim.client: LLM OK | model=openrouter/free | attempt=2 | 2.10s | response_chars=203
```

Within the code, `SimulationConfig` holds all simulation constants (birth/death probabilities, encounter rates, etc.).

---

## CLI Reference

```
dynasty-sim run       [--years N] [--seed-file FILE] [--save-dir DIR]
                      [--verbose] [--autosave N] [--report/--no-report]
                      [--llm/--no-llm]

dynasty-sim status    [--save-file FILE] [--save-dir DIR]

dynasty-sim story     [--save-file FILE] [--save-dir DIR]
                      [--character NAME] [--dynasty NAME] [--llm/--no-llm]

dynasty-sim tree      CHARACTER [--save-file FILE] [--save-dir DIR]
                      [--depth N]

dynasty-sim html      [--save-file FILE] [--save-dir DIR]
                      [--output FILE]      (default: report.html)

dynasty-sim checkpoints [--save-dir DIR]
```

---

## Example Output

```
╔══════════════════════════════════════════╗
║      DYNASTY SIM — SIMULATION REPORT     ║
╚══════════════════════════════════════════╝

Years simulated: 1000 – 1049
Total characters ever created: 41
Living at end: 18
Dynasties: 3
Total events logged: 312

=== YEAR BY YEAR SUMMARIES ===

[1000] The year 1000 passed quietly. 6 souls called the land home. The seasons turned and life went on.
[1001] Year 1001 will be remembered for Elara Ashford entered the world. The population stood at 7.
...

=== DYNASTY CHRONICLES ===

=== Chronicle of House Ashford ===
Founded in year 1000.
Founder: Edmund Ashford (Nobleman).
Total members across generations: 14.
Living members: 8. Deceased: 6.
The dynasty is known for: diplomacy, charisma, wealth.

--- Notable Members ---

Edmund Ashford (b.962):
  Edmund Ashford lives as a Nobleman. Known for diplomacy, ambition, vanity. They are a parent of 3.
...
```

---

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

---

## Extending

- **Add a trait** → update `InheritedTraitSet` or `LearnedTraitSet` in `models.py`; `inheritance.py` automatically picks up all numeric fields
- **New event type** → add to `EventType` enum and handle in `engine.tick_year()`
- **Custom seed families** → add a `_build_*` function in `seeds.py` following the existing pattern
- **Different models** → set `DYNASTY_PRIMARY_MODEL` in `.env`

---

## License

MIT
