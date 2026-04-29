# Memory Agents

Memory Agents is a production-minded Python 3.11+ library for building memory-enabled AI agents on top of OpenRouter. It is designed to make free-model usage first-class, including explicit `:free` model IDs and the `openrouter/free` router, while still providing a clean path for structured outputs, robust fallbacks, and persistent long-term memory.

## Architecture Overview

The library is split into a few focused layers:

- `OpenRouterClient` handles chat completion requests, retries, fallback models, strict JSON Schema requests, and prompt-based structured output fallback.
- `AsyncOpenRouterClient` mirrors the same model routing and structured output logic for concurrent async workloads.
- `MemoryStore` implementations persist long-term memories in memory, JSON files, or SQLite while keeping the same interface.
- `MemoryManager` handles short-term memory trimming, session summarization, long-term retrieval, and controlled memory injection.
- `Agent` exposes the ergonomic developer API for multi-session memory-aware conversations.
- `AsyncAgent` adds per-session async execution while preserving the same high-level ergonomics.
- `utils` contains reusable helpers for config loading, logging, retry logic, JSON parsing, and prompt assembly.

## Folder Tree

```text
agent-library-wrapper/
├── .env.example
├── pyproject.toml
├── requirements.txt
├── README.md
├── memory_agents/
│   ├── __init__.py
│   ├── agent.py
│   ├── async_agent.py
│   ├── client.py
│   ├── config.py
│   ├── models.py
│   ├── examples/
│   │   ├── __init__.py
│   │   ├── async_agent.py
│   │   ├── free_model_agent.py
│   │   ├── free_router_agent.py
│   │   ├── preference_agent.py
│   │   ├── simple_agent.py
│   │   └── structured_agent.py
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   ├── retrieval.py
│   │   ├── stores.py
│   │   └── summarizer.py
│   └── utils/
│       ├── __init__.py
│       ├── json_utils.py
│       ├── logger.py
│       ├── prompts.py
│       └── retry.py
└── tests/
	├── test_agent.py
	├── test_async_agent.py
	├── test_client_config.py
	├── test_memory_store.py
	└── test_structured_output.py
```

## What the Library Does

- Builds conversational agents with short-term and long-term memory.
- Uses OpenRouter chat completions as the model backend.
- Supports explicit free models such as `google/gemini-2.0-flash-exp:free`.
- Supports the `openrouter/free` router as a low-friction fallback or primary model.
- Stores and retrieves memory per session.
- Persists long-term memory to JSON files.
- Persists long-term memory to SQLite with the same store interface.
- Attempts strict structured outputs through JSON Schema when a Pydantic response model is provided.
- Falls back to JSON prompting and local validation when strict schema mode is unavailable.
- Supports both synchronous and asynchronous agent/client APIs.

## Installation

Create a virtual environment and install the project locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

For editable installs:

```bash
pip install -e .
```

## OpenRouter Setup

Copy `.env.example` to `.env` and set your key:

```bash
cp .env.example .env
```

Example `.env` values:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=Memory Agents
OPENROUTER_HTTP_REFERER=https://localhost
```

Load the environment before constructing the agent:

```python
from memory_agents import load_environment

load_environment()
```

## Quick Start

```python
from memory_agents import Agent, JsonFileMemoryStore, MemoryConfig, OpenRouterConfig

store = JsonFileMemoryStore("memories.json")

agent = Agent(
	name="Companion",
	system_prompt="You are a helpful memory-enabled assistant.",
	llm=OpenRouterConfig(
		api_key_env="OPENROUTER_API_KEY",
		model="google/gemini-2.0-flash-exp:free",
		fallback_model="openrouter/free",
	),
	memory=MemoryConfig(
		short_term_messages=12,
		long_term_top_k=5,
		auto_store=True,
	),
	store=store,
)

response = agent.ask("My favorite programming language is Python.")
print(response.text)
```

## SQLite Long-Term Memory

Use the same store contract with a SQLite backend:

```python
from memory_agents import Agent, MemoryConfig, OpenRouterConfig, SQLiteMemoryStore

store = SQLiteMemoryStore("memories.sqlite3")

agent = Agent(
	name="Companion",
	system_prompt="You are a memory-enabled assistant.",
	llm=OpenRouterConfig(model="google/gemini-2.0-flash-exp:free", fallback_model="openrouter/free"),
	memory=MemoryConfig(auto_store=True, long_term_top_k=5),
	store=store,
)
```

The SQLite backend uses the same `upsert`, `query`, `list`, `delete`, and `clear_session` methods as the in-memory and JSON-backed stores.

## Async Usage

Use `AsyncOpenRouterClient` and `AsyncAgent` when you need many concurrent conversations:

```python
import asyncio

from memory_agents import AsyncAgent, MemoryConfig, OpenRouterConfig, SQLiteMemoryStore


async def main() -> None:
	agent = AsyncAgent(
		name="AsyncCompanion",
		system_prompt="You are a helpful async assistant.",
		llm=OpenRouterConfig(
			model="openrouter/free",
			fallback_model="google/gemini-2.0-flash-exp:free",
		),
		memory=MemoryConfig(auto_store=True, long_term_top_k=4),
		store=SQLiteMemoryStore("async_memories.sqlite3"),
	)

	await asyncio.gather(
		agent.ask("Remember that alpha prefers Python.", session_id="alpha"),
		agent.ask("Remember that beta prefers Rust.", session_id="beta"),
	)

	await agent.aclose()


asyncio.run(main())
```

`AsyncAgent` serializes access per session to keep conversation state consistent while still allowing different sessions to run concurrently.

## Free Model Usage

Free models are a first-class part of the API.

### Explicit `:free` models

```python
from memory_agents import OpenRouterConfig

config = OpenRouterConfig(
	model="google/gemini-2.0-flash-exp:free",
	fallback_model="meta-llama/llama-3.3-70b-instruct:free",
)
```

### OpenRouter free router

```python
from memory_agents import OpenRouterConfig

config = OpenRouterConfig(
	model="openrouter/free",
	fallback_model="google/gemini-2.0-flash-exp:free",
)
```

Free model availability can change over time. Keep a fallback model configured when building anything user-facing or automated.

## Memory Model

### Short-term memory

Short-term memory is stored per session in the active `ConversationSession` and trimmed by:

- message count
- character budget
- optional summary compaction of old conversation chunks

### Long-term memory

Long-term memory uses a `MemoryStore` interface. This release ships with:

- `InMemoryStore`
- `JsonFileMemoryStore`
- `SQLiteMemoryStore`

Retrieval uses a lightweight ranking strategy that blends lexical overlap, tags, importance, session affinity, and recency. The design is intentionally simple so it can be replaced later with a vector database or embedding-powered retriever.

### Multi-session separation

Long-term retrieval is session-aware by default. Each session can maintain separate conversation history and session-scoped memories while still allowing future cross-session policies.

## Structured Outputs

If you pass a Pydantic model as `response_model`, the client will:

1. Try strict JSON Schema mode through `response_format`.
2. If the model rejects strict schema mode, fall back to JSON prompting.
3. Parse the model output locally.
4. Validate it with Pydantic.
5. Surface a validated Python object in `StructuredAgentResponse.data`.

Example:

```python
from pydantic import BaseModel
from memory_agents import Agent, OpenRouterConfig


class ShoppingList(BaseModel):
	summary: str
	items: list[str]


agent = Agent(
	name="Planner",
	system_prompt="You are a structured planning assistant.",
	llm=OpenRouterConfig(model="google/gemini-2.0-flash-exp:free"),
)

response = agent.ask("Create a grocery plan for three pasta dinners.", response_model=ShoppingList)
print(response.data.model_dump())
```

## Examples

Example scripts are located in `memory_agents/examples/`:

- `simple_agent.py`
- `preference_agent.py`
- `structured_agent.py`
- `free_model_agent.py`
- `free_router_agent.py`
- `async_agent.py`

## Testing

Run the test suite with:

```bash
pytest
```

The included tests cover:

- client configuration and header/model routing
- async client and async agent behavior
- structured output fallback behavior
- memory store persistence and retrieval, including SQLite
- high-level agent memory behavior

## Limitations

- Retrieval is lexical and heuristic, not embedding-based.
- The long-term memory interface is synchronous, even when used through `AsyncAgent`.
- Streaming support is implemented only for plain text responses.
- Tool support is a placeholder interface, not a full execution framework.
- Short-term memory summarization is deterministic and does not call a model.

## Future Improvements

- Dedicated async memory store protocol for high-latency persistence backends.
- Vector store integrations.
- Pluggable memory scoring policies.
- LLM-based summarization policies.
- Full tool execution and tool result memory.
- Built-in observability hooks and tracing.

