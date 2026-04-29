"""Example showing the OpenRouter free router."""

from __future__ import annotations

from pathlib import Path

from memory_agents import Agent, JsonFileMemoryStore, MemoryConfig, OpenRouterConfig, load_environment


def main() -> None:
    load_environment()
    agent = Agent(
        name="FreeRouterAgent",
        system_prompt="You are a memory-enabled assistant optimized for low-cost experimentation.",
        llm=OpenRouterConfig(
            model="openrouter/free",
            fallback_model="google/gemini-2.0-flash-exp:free",
        ),
        memory=MemoryConfig(short_term_messages=8, long_term_top_k=3),
        store=JsonFileMemoryStore(Path(__file__).with_name("free_router_memories.json")),
    )

    response = agent.ask("Remember that I deploy my side projects on fly.io and prefer SQLite for prototypes.")
    print(response.text)


if __name__ == "__main__":
    main()
