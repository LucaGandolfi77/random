"""Example showing explicit :free model IDs with a fallback chain."""

from __future__ import annotations

from pathlib import Path

from memory_agents import Agent, JsonFileMemoryStore, OpenRouterConfig, load_environment


def main() -> None:
    load_environment()
    agent = Agent(
        name="FreeModelAgent",
        system_prompt="You are a practical coding companion.",
        llm=OpenRouterConfig(
            model="google/gemini-2.0-flash-exp:free",
            fallback_model="meta-llama/llama-3.3-70b-instruct:free",
        ),
        store=JsonFileMemoryStore(Path(__file__).with_name("free_model_memories.json")),
    )

    response = agent.ask("Suggest three ideas for a weekend Python automation project.")
    print(response.text)


if __name__ == "__main__":
    main()
