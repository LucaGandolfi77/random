"""Retrieval helpers for ranking long-term memories."""

from __future__ import annotations

import math
import re
from datetime import UTC, datetime
from typing import Iterable

from memory_agents.models import MemoryItem, MemoryQuery, RetrievalResult

TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9_'-]+")


def tokenize(text: str) -> set[str]:
    """Tokenize text into normalized lexical units."""

    return {token.lower() for token in TOKEN_PATTERN.findall(text)}


def rank_memory_items(items: Iterable[MemoryItem], query: MemoryQuery) -> list[RetrievalResult]:
    """Rank memory items with a lightweight lexical and heuristic scorer."""

    query_tokens = tokenize(query.text)
    results: list[RetrievalResult] = []

    for item in items:
        score, reasons = score_memory_item(item, query, query_tokens)
        if score >= query.min_score:
            results.append(RetrievalResult(item=item, score=score, reasons=reasons))

    results.sort(key=lambda result: result.score, reverse=True)
    return results[: query.top_k]


def score_memory_item(item: MemoryItem, query: MemoryQuery, query_tokens: set[str] | None = None) -> tuple[float, list[str]]:
    """Score a single memory item against a retrieval query."""

    tokens = tokenize(item.text)
    query_tokens = query_tokens if query_tokens is not None else tokenize(query.text)
    overlap = len(tokens & query_tokens)
    token_score = overlap / max(len(query_tokens), 1)
    tag_overlap = len({tag.lower() for tag in item.tags} & {tag.lower() for tag in query.tags})
    tag_score = tag_overlap / max(len(query.tags), 1) if query.tags else 0.0

    session_bonus = 0.0
    reasons: list[str] = []

    if query.session_id and item.session_id == query.session_id:
        session_bonus = 0.2
        reasons.append("same-session")
    elif query.session_id and item.session_id is None:
        session_bonus = 0.08
        reasons.append("global-memory")

    if overlap:
        reasons.append(f"token-overlap:{overlap}")
    if tag_overlap:
        reasons.append(f"tag-overlap:{tag_overlap}")

    age_seconds = max((datetime.now(tz=UTC) - item.updated_at).total_seconds(), 0.0)
    recency_score = 1.0 / (1.0 + math.log1p(age_seconds / 3600.0))
    importance_score = item.importance * 0.2
    persistent_score = item.score * 0.1

    final_score = (
        token_score * 0.5
        + tag_score * 0.12
        + session_bonus
        + recency_score * 0.08
        + importance_score
        + persistent_score
    )
    return final_score, reasons
