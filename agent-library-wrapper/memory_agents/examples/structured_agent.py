"""Structured output example using a Pydantic schema."""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field

from memory_agents import Agent, JsonFileMemoryStore, OpenRouterConfig, load_environment


class TaskPlan(BaseModel):
    """Structured plan returned by the model."""

    summary: str = Field(description="A one-sentence overview.")
    steps: list[str] = Field(description="Ordered action steps.")
    risks: list[str] = Field(description="Major execution risks.")


def main() -> None:
    load_environment()
    agent = Agent(
        name="Planner",
        system_prompt="You are a planning assistant that returns clean JSON objects.",
        llm=OpenRouterConfig(
            model="google/gemini-2.0-flash-exp:free",
            fallback_model="openrouter/free",
        ),
        store=JsonFileMemoryStore(Path(__file__).with_name("structured_agent_memories.json")),
    )

    response = agent.ask(
        "Plan a lightweight migration from Flask to FastAPI for a small internal service.",
        response_model=TaskPlan,
    )
    print(response.data.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
