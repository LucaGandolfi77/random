"""Data models for Interview Coach sessions."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)


class Message(BaseModel):
    """A single turn in the interview conversation."""

    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=_utc_now)


class InterviewSession(BaseModel):
    """Full state of one interview session."""

    session_id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=_utc_now)
    messages: list[Message] = Field(default_factory=list)
