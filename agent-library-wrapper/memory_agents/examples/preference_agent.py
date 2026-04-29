"""Personal preference memory example."""

from __future__ import annotations

from pathlib import Path

from memory_agents import Agent, JsonFileMemoryStore, MemoryConfig, OpenRouterConfig, load_environment


def main() -> None:
    load_environment()
    agent = Agent(
        name="PreferenceAgent",
        system_prompt="You are a personal preference assistant. Track likes, dislikes, and recurring habits.",
        llm=OpenRouterConfig(
            model="google/gemini-2.0-flash-exp:free",
            fallback_model="meta-llama/llama-3.3-70b-instruct:free",
        ),
        memory=MemoryConfig(long_term_top_k=6, auto_store=True),
        store=JsonFileMemoryStore(Path(__file__).with_name("preference_agent_memories.json")),
    )

    agent.ask("My favorite editor is Neovim and I prefer dark blue themes.", session_id="user-42")
    response = agent.ask("What interface preferences do I have?", session_id="user-42")
    print(response.text)


if __name__ == "__main__":
    main()
