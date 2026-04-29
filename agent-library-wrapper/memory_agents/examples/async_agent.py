"""Concurrent async agent example using the SQLite memory store."""

from __future__ import annotations

import asyncio
from pathlib import Path

from memory_agents import AsyncAgent, MemoryConfig, OpenRouterConfig, SQLiteMemoryStore, load_environment


async def main() -> None:
    load_environment()
    store = SQLiteMemoryStore(Path(__file__).with_name("async_agent_memories.sqlite3"))

    async with AsyncAgent(
        name="AsyncCompanion",
        system_prompt="You are a helpful memory-enabled assistant for concurrent conversations.",
        llm=OpenRouterConfig(
            model="google/gemini-2.0-flash-exp:free",
            fallback_model="openrouter/free",
        ),
        memory=MemoryConfig(short_term_messages=10, long_term_top_k=4, auto_store=True),
        store=store,
    ) as agent:
        await asyncio.gather(
            agent.ask("Remember that user alpha prefers Python.", session_id="alpha"),
            agent.ask("Remember that user beta prefers Rust.", session_id="beta"),
        )

        alpha_response, beta_response = await asyncio.gather(
            agent.ask("What does user alpha prefer?", session_id="alpha"),
            agent.ask("What does user beta prefer?", session_id="beta"),
        )

        print(alpha_response.text)
        print(beta_response.text)


if __name__ == "__main__":
    asyncio.run(main())