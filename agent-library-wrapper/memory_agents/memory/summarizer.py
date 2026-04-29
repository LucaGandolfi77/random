"""Deterministic summarization helpers for conversation compaction."""

from __future__ import annotations

from typing import Sequence

from memory_agents.models import ChatMessage


class RollingConversationSummarizer:
    """Simple deterministic summarizer for old conversation turns."""

    def __init__(self, *, max_messages: int = 8, max_chars_per_message: int = 180) -> None:
        self.max_messages = max_messages
        self.max_chars_per_message = max_chars_per_message

    def summarize(self, messages: Sequence[ChatMessage]) -> str:
        """Create a compact English summary from historical messages."""

        if not messages:
            return ""

        lines = ["Conversation summary:"]
        for message in list(messages)[-self.max_messages :]:
            role = message.role.capitalize()
            content = " ".join(message.content.split())
            if len(content) > self.max_chars_per_message:
                content = f"{content[: self.max_chars_per_message - 3].rstrip()}..."
            lines.append(f"- {role}: {content}")
        return "\n".join(lines)
