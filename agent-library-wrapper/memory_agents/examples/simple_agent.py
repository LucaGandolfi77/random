"""Basic memory-enabled assistant example."""

from __future__ import annotations

from pathlib import Path

from memory_agents import Agent, JsonFileMemoryStore, MemoryConfig, OpenRouterConfig, load_environment


def main() -> None:
    load_environment()
    store = JsonFileMemoryStore(Path(__file__).with_name("simple_agent_memories.json"))
    agent = Agent(
        name="SimpleAssistant",
        system_prompt="You are a concise and helpful memory-enabled assistant.",
        llm=OpenRouterConfig(
            model="google/gemini-2.0-flash-exp:free",
            fallback_model="openrouter/free",
        ),
        memory=MemoryConfig(short_term_messages=10, long_term_top_k=4, auto_store=True),
        store=store,
    )

    response = agent.ask("My name is Taylor and I prefer Python over JavaScript.")
    print(response.text)


if __name__ == "__main__":
    main()
