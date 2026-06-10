from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from .models import AgentMessage, StoredCase, Verdict


class AgentProvider(Protocol):
    def generate_intake(self, case: StoredCase) -> str:
        ...

    def generate_opening(self, case: StoredCase, role: str) -> str:
        ...

    def generate_cross_exam(
        self,
        case: StoredCase,
        role: str,
        openings: dict[str, str],
    ) -> str:
        ...

    def generate_judge_summary(
        self,
        case: StoredCase,
        messages: Sequence[AgentMessage],
    ) -> str:
        ...

    def generate_verdict(
        self,
        case: StoredCase,
        messages: Sequence[AgentMessage],
    ) -> Verdict:
        ...


class FutureLLMProvider:
    def __init__(self, *_args, **_kwargs) -> None:
        raise NotImplementedError(
            "Implement AgentProvider with real API calls and inject it into the CLI."
        )