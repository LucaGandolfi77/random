"""Prompt assembly helpers for system prompts and memory injection."""

from __future__ import annotations

from typing import Any, Sequence

from pydantic import BaseModel

from memory_agents.models import ChatMessage, MemoryItem
from memory_agents.utils.json_utils import safe_json_dumps


def build_memory_context(session_summary: str | None, memories: Sequence[MemoryItem]) -> str:
    """Build a compact memory context block to inject into the system prompt."""

    sections: list[str] = []

    if session_summary:
        sections.append(f"Session summary:\n{session_summary}")

    if memories:
        memory_lines = [
            f"- [{item.category}] {item.text}"
            for item in memories
        ]
        sections.append("Relevant long-term memory:\n" + "\n".join(memory_lines))

    if not sections:
        return ""

    return "Memory context:\n" + "\n\n".join(sections)


def build_structured_output_instructions(
    response_model: type[BaseModel],
    strict_schema_error: Exception | None = None,
) -> str:
    """Build fallback instructions for structured JSON output."""

    schema = response_model.model_json_schema()
    details = [
        "Return JSON only.",
        "Do not wrap the payload in Markdown fences.",
        "Ensure the output validates against this JSON Schema:",
        safe_json_dumps(schema),
    ]

    if strict_schema_error is not None:
        details.insert(
            0,
            f"Strict JSON Schema mode was not accepted by the model ({strict_schema_error}). Fallback to schema-guided JSON prompting.",
        )

    return "\n".join(details)


def assemble_prompt_messages(
    *,
    system_prompt: str,
    session_messages: Sequence[ChatMessage],
    new_messages: Sequence[ChatMessage],
    memory_context: str | None = None,
    session_summary: str | None = None,
    tools: Sequence[Any] | None = None,
) -> list[ChatMessage]:
    """Assemble a clean OpenRouter message list for a single agent turn."""

    system_sections = [system_prompt.strip()]

    tool_lines = []
    for tool in tools or []:
        name = getattr(tool, "name", None)
        description = getattr(tool, "description", None)
        if name and description:
            tool_lines.append(f"- {name}: {description}")
    if tool_lines:
        system_sections.append("Available tools (placeholder only):\n" + "\n".join(tool_lines))

    if session_summary and not memory_context:
        system_sections.append(f"Session summary:\n{session_summary}")
    elif memory_context:
        system_sections.append(memory_context)

    assembled = [ChatMessage(role="system", content="\n\n".join(system_sections))]
    assembled.extend(session_messages)
    assembled.extend(new_messages)
    return assembled
