from __future__ import annotations

import textwrap

from .models import AgentMessage, StoredCase, Verdict


WIDTH = 92


def _rule(char: str = "=") -> str:
    return char * WIDTH


def _wrap(text: str) -> str:
    lines = []
    for raw_line in text.splitlines():
        if not raw_line.strip():
            lines.append("")
            continue
        if raw_line.lstrip().startswith("- "):
            lines.append(textwrap.fill(raw_line, width=WIDTH, subsequent_indent="  "))
        else:
            lines.append(textwrap.fill(raw_line, width=WIDTH))
    return "\n".join(lines)


def banner() -> str:
    return (
        _rule()
        + "\nAI COURTROOM CLI\n"
        + _rule()
        + "\nA terminal-only decision courtroom with modular agents and local storage.\n"
    )


def format_case_summary(case: StoredCase) -> str:
    return _wrap(
        f"Case #{case.id}: {case.title}\n"
        f"Category: {case.category}\n"
        f"Dilemma: {case.dilemma}\n"
        f"Budget: {case.budget or 'Not provided'}\n"
        f"Time horizon: {case.time_horizon or 'Not provided'}\n"
        f"Risk tolerance: {case.risk_tolerance}/100\n"
        f"Status: {case.status}\n"
    )


def format_message(message: AgentMessage) -> str:
    header = f"[{message.display_name}] stage={message.stage} round={message.round_index}"
    return f"{_rule('-')}\n{header}\n{_rule('-')}\n{_wrap(message.content)}\n"


def format_history(cases: list[StoredCase]) -> str:
    if not cases:
        return "No sessions saved yet.\n"
    rows = ["Saved sessions:"]
    for case in cases:
        rows.append(
            f"- #{case.id} | {case.created_at} | {case.status:<8} | {case.category} | {case.title}"
        )
    return "\n".join(rows) + "\n"


def format_verdict(case: StoredCase, verdict: Verdict) -> str:
    risks = "\n".join(f"- {item}" for item in verdict.key_risks)
    alternatives = "\n".join(f"- {item}" for item in verdict.best_alternatives)
    actions = "\n".join(f"- {item}" for item in verdict.action_plan)
    missing = "\n".join(f"- {item}" for item in verdict.missing_evidence)
    questions = "\n".join(f"- {item}" for item in verdict.follow_up_questions)
    changes = "\n".join(f"- {item}" for item in verdict.change_conditions)
    return _wrap(
        f"VERDICT FOR CASE #{case.id}: {verdict.verdict}\n\n"
        f"Reasoning: {verdict.reasoning}\n\n"
        f"Confidence: {verdict.confidence}/100\n\n"
        f"Main risks:\n{risks}\n\n"
        f"Best alternatives:\n{alternatives}\n\n"
        f"Recommended action plan:\n{actions}\n\n"
        f"Missing evidence:\n{missing}\n\n"
        f"Change conditions:\n{changes}\n\n"
        f"Follow-up questions:\n{questions}"
    )


def format_full_report(
    case: StoredCase,
    messages: list[AgentMessage],
    verdict: Verdict,
) -> str:
    parts = [banner(), format_case_summary(case)]
    for message in messages:
        parts.append(format_message(message))
    parts.append(_rule())
    parts.append(format_verdict(case, verdict))
    parts.append(_rule())
    return "\n".join(parts)