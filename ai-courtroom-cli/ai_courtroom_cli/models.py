from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


AGENT_DISPLAY_NAMES = {
    "case_intake": "Case Intake Agent",
    "pro_advocate": "Pro Advocate",
    "contra_advocate": "Contra Advocate",
    "technical_expert": "Technical Expert",
    "financial_expert": "Financial Expert",
    "skeptic": "Skeptic",
    "futurist": "Futurist",
    "judge": "Judge",
}


DEBATE_ROLE_ORDER = [
    "pro_advocate",
    "contra_advocate",
    "technical_expert",
    "financial_expert",
    "skeptic",
    "futurist",
    "judge",
]


CROSS_EXAM_ROLE_ORDER = [
    "pro_advocate",
    "contra_advocate",
    "technical_expert",
    "financial_expert",
    "skeptic",
    "futurist",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass(slots=True)
class CaseInput:
    title: str
    dilemma: str
    category: str
    budget: str | None = None
    time_horizon: str | None = None
    constraints: str = ""
    risk_tolerance: int = 50
    existing_context: str = ""
    alternatives: list[str] = field(default_factory=list)


@dataclass(slots=True)
class StoredCase(CaseInput):
    id: int = 0
    status: str = "draft"
    created_at: str = field(default_factory=utc_now)


@dataclass(slots=True)
class AgentMessage:
    case_id: int
    agent_role: str
    stage: str
    content: str
    round_index: int = 1
    id: int = 0
    created_at: str = field(default_factory=utc_now)

    @property
    def display_name(self) -> str:
        return AGENT_DISPLAY_NAMES.get(self.agent_role, self.agent_role)


@dataclass(slots=True)
class Verdict:
    case_id: int
    verdict: str
    reasoning: str
    key_risks: list[str]
    best_alternatives: list[str]
    action_plan: list[str]
    confidence: int
    change_conditions: list[str]
    missing_evidence: list[str]
    follow_up_questions: list[str]
    id: int = 0
    created_at: str = field(default_factory=utc_now)
