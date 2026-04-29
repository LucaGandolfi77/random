"""Memory orchestration for short-term and long-term memory."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Sequence

from memory_agents.memory.stores import MemoryStore
from memory_agents.memory.summarizer import RollingConversationSummarizer
from memory_agents.models import ChatMessage, ConversationSession, MemoryConfig, MemoryItem, MemoryQuery
from memory_agents.utils.prompts import build_memory_context

PREFERENCE_PATTERNS = [
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in (
        r"\bmy favorite\b",
        r"\bi prefer\b",
        r"\bi like\b",
        r"\bi love\b",
        r"\bi dislike\b",
        r"\bi hate\b",
    )
]

FACT_PATTERNS = [
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in (
        r"\bmy name is\b",
        r"\bi am\b",
        r"\bi work\b",
        r"\bi live\b",
        r"\bi use\b",
        r"\bremember that\b",
    )
]

EVENT_PATTERNS = [
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in (
        r"\btomorrow\b",
        r"\bnext week\b",
        r"\bmeeting\b",
        r"\bdeadline\b",
        r"\bbirthday\b",
        r"\bappointment\b",
    )
]


class MemoryManager:
    """Coordinate retrieval, summarization, and memory persistence."""

    def __init__(
        self,
        *,
        config: MemoryConfig,
        store: MemoryStore,
        summarizer: RollingConversationSummarizer | None = None,
    ) -> None:
        self.config = config
        self.store = store
        self.summarizer = summarizer or RollingConversationSummarizer()

    def prepare_context(self, session: ConversationSession, user_input: str) -> tuple[str, list[MemoryItem]]:
        """Compact the session and return a safe memory injection block."""

        self._compact_session(session)
        results = self.store.query(
            MemoryQuery(
                text=user_input,
                session_id=None if self.config.allow_cross_session_search else session.id,
                top_k=self.config.long_term_top_k,
                min_score=self.config.long_term_min_score,
            )
        )
        items = [result.item for result in results[: self.config.max_injected_memories]]
        return build_memory_context(session.summary, items), items

    def retrieve(self, *, session_id: str | None, query_text: str) -> list[MemoryItem]:
        """Return retrieved long-term memory items without prompt assembly."""

        results = self.store.query(
            MemoryQuery(
                text=query_text,
                session_id=None if self.config.allow_cross_session_search else session_id,
                top_k=self.config.long_term_top_k,
                min_score=self.config.long_term_min_score,
            )
        )
        return [result.item for result in results]

    def record_turn(
        self,
        *,
        session: ConversationSession,
        incoming_messages: Sequence[ChatMessage],
        assistant_message: ChatMessage,
    ) -> None:
        """Update short-term state and auto-store important long-term memories."""

        session.messages.extend(incoming_messages)
        session.messages.append(assistant_message)
        session.updated_at = datetime.now(tz=UTC)

        if self.config.auto_store:
            for message in incoming_messages:
                if message.role != "user":
                    continue
                for item in self._extract_memory_items(message.content, session.id):
                    self.store.upsert(item)

        self._compact_session(session)

    def _compact_session(self, session: ConversationSession) -> None:
        if len(session.messages) > self.config.summarize_threshold:
            keep_count = min(self.config.short_term_messages, len(session.messages))
            to_summarize = session.messages[:-keep_count]
            if to_summarize:
                summary = self.summarizer.summarize(to_summarize)
                session.summary = self._merge_summary(session.summary, summary)
                session.messages = session.messages[-keep_count:]

                if self.config.auto_store and summary:
                    self.store.upsert(
                        MemoryItem(
                            session_id=session.id,
                            text=summary,
                            category="summary",
                            importance=0.7,
                            source="summarizer",
                            tags=["summary"],
                        )
                    )

        self._trim_short_term_window(session)

    def _trim_short_term_window(self, session: ConversationSession) -> None:
        if len(session.messages) > self.config.short_term_messages:
            session.messages = session.messages[-self.config.short_term_messages :]

        while self._total_characters(session.messages) > self.config.short_term_max_characters and len(session.messages) > 1:
            session.messages.pop(0)

    def _total_characters(self, messages: Sequence[ChatMessage]) -> int:
        return sum(len(message.content) for message in messages)

    def _merge_summary(self, existing: str | None, new_summary: str) -> str:
        if not existing:
            return new_summary
        merged = f"{existing}\n{new_summary}".strip()
        if len(merged) > 4_000:
            return merged[-4_000:]
        return merged

    def _extract_memory_items(self, text: str, session_id: str) -> list[MemoryItem]:
        normalized = " ".join(text.split())
        if not normalized:
            return []

        category = self._classify_text(normalized)
        importance = self._importance_for_category(category, normalized)
        if importance < self.config.memory_importance_threshold:
            return []

        return [
            MemoryItem(
                session_id=session_id,
                text=normalized,
                category=category,
                importance=importance,
                tags=self._extract_tags(normalized, category),
                score=importance,
                source="user",
            )
        ]

    def _classify_text(self, text: str) -> str:
        if any(pattern.search(text) for pattern in PREFERENCE_PATTERNS):
            return "preference"
        if any(pattern.search(text) for pattern in FACT_PATTERNS):
            return "fact"
        if any(pattern.search(text) for pattern in EVENT_PATTERNS):
            return "event"
        return "note"

    def _importance_for_category(self, category: str, text: str) -> float:
        base = {
            "preference": 0.9,
            "fact": 0.8,
            "event": 0.75,
            "note": 0.55,
        }.get(category, 0.55)
        if "remember" in text.lower():
            base += 0.1
        if len(text) > 140:
            base += 0.05
        return min(base, 1.0)

    def _extract_tags(self, text: str, category: str) -> list[str]:
        words = [word.lower() for word in re.findall(r"[A-Za-z0-9_'-]+", text) if len(word) > 4]
        unique_words = []
        for word in words:
            if word not in unique_words:
                unique_words.append(word)
        return [category, *unique_words[:5]]
