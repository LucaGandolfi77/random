from __future__ import annotations

import textwrap

from ai_courtroom_cli.models import AgentMessage, TrialResult


LINE = "=" * 88
SUBLINE = "-" * 88


def print_banner() -> None:
    print(LINE)
    print("AI COURTROOM CLI")
    print("Decision-support courtroom with mocked agents, local storage, and Markdown exports")
    print(LINE)


def print_case_summary(result: TrialResult) -> None:
    case = result.case
    print(SUBLINE)
    print(f"Case ID      : {case.case_id}")
    print(f"Title        : {case.title}")
    print(f"Category     : {case.category}")
    print(f"Risk profile : {case.risk_tolerance}/100")
    print(f"Budget       : {case.budget or 'not provided'}")
    print(f"Horizon      : {case.time_horizon or 'not provided'}")
    print(SUBLINE)
    print(wrap_block(f"Dilemma: {case.dilemma}"))
    if case.constraints:
        print(wrap_block(f"Constraints: {case.constraints}"))
    if case.existing_context:
        print(wrap_block(f"Context: {case.existing_context}"))
    if case.alternatives_considered:
        print(wrap_block(f"Alternatives considered: {case.alternatives_considered}"))
    print(SUBLINE)


def print_agent_message(message: AgentMessage) -> None:
    label = f"{message.role} [{message.phase}]"
    print(label)
    print("~" * len(label))
    print(wrap_multiline(message.content))
    print(SUBLINE)


def print_trial(result: TrialResult) -> None:
    print_case_summary(result)
    for message in result.messages:
        print_agent_message(message)
    print_verdict(result)


def print_verdict(result: TrialResult) -> None:
    verdict = result.verdict
    print(LINE)
    print("FINAL VERDICT")
    print(LINE)
    print(f"Verdict      : {verdict.verdict_label}")
    print(f"Confidence   : {verdict.confidence_score}/100")
    print(SUBLINE)
    print(wrap_block(verdict.reasoning))
    print(section("Main risks", verdict.main_risks))
    print(section("Alternatives", verdict.alternatives))
    print(section("Recommended action plan", verdict.action_plan))
    print(section("Missing evidence", verdict.missing_evidence))
    print(section("Conditions that should change the verdict", verdict.change_conditions))
    print(section("Follow-up questions", verdict.follow_up_questions))
    print(LINE)


def print_history(rows: list[dict]) -> None:
    if not rows:
        print("No saved cases found.")
        return
    print(LINE)
    print("SESSION HISTORY")
    print(LINE)
    for row in rows:
        verdict = row["verdict_label"] or "pending"
        confidence = row["confidence_score"] if row["confidence_score"] is not None else "--"
        print(
            f"{row['case_id']} | {row['category']} | verdict={verdict} | confidence={confidence} | {row['title']}"
        )
    print(LINE)


def build_markdown_report(result: TrialResult) -> str:
    case = result.case
    verdict = result.verdict
    by_role = {message.role: message for message in result.messages if message.phase == "opening"}
    lines = [
        f"# {case.title}",
        "",
        "## Case summary",
        "",
        f"- Case ID: {case.case_id}",
        f"- Category: {case.category}",
        f"- Risk tolerance: {case.risk_tolerance}/100",
        f"- Budget: {case.budget or 'not provided'}",
        f"- Time horizon: {case.time_horizon or 'not provided'}",
        "",
        "## User dilemma",
        "",
        case.dilemma,
        "",
        "## Context summary",
        "",
        result.intake.context_summary,
        "",
        "## Agent arguments",
        "",
    ]
    for message in result.messages:
        lines.extend([f"### {message.role} ({message.phase})", "", message.content, ""])
    lines.extend(
        [
            "## Pro case",
            "",
            by_role.get("Pro Advocate", _empty_message()).content,
            "",
            "## Contra case",
            "",
            by_role.get("Contra Advocate", _empty_message()).content,
            "",
            "## Technical assessment",
            "",
            by_role.get("Technical Expert", _empty_message()).content,
            "",
            "## Financial assessment",
            "",
            by_role.get("Financial Expert", _empty_message()).content,
            "",
            "## Skeptical review",
            "",
            by_role.get("Skeptic", _empty_message()).content,
            "",
            "## Future scenarios",
            "",
            by_role.get("Futurist", _empty_message()).content,
            "",
            "## Final verdict",
            "",
            f"**{verdict.verdict_label}**",
            "",
            "## Reasoning",
            "",
            verdict.reasoning,
            "",
            _markdown_list("Main risks", verdict.main_risks),
            _markdown_list("Alternatives", verdict.alternatives),
            _markdown_list("Recommended action plan", verdict.action_plan),
            _markdown_list("What evidence is still missing", verdict.missing_evidence),
            _markdown_list("Conditions under which the verdict should change", verdict.change_conditions),
            _markdown_list("Follow-up questions", verdict.follow_up_questions),
            "## Confidence score",
            "",
            f"{verdict.confidence_score}/100",
            "",
            "## Disclaimer",
            "",
            "This report is a decision-support artifact and not legal, financial, medical, or professional advice.",
            "The user remains responsible for the final decision.",
            "",
        ]
    )
    return "\n".join(lines)


def wrap_block(text: str, width: int = 86) -> str:
    return textwrap.fill(text, width=width)


def wrap_multiline(text: str, width: int = 84) -> str:
    blocks = []
    for raw_line in text.splitlines():
        if not raw_line.strip():
            blocks.append("")
            continue
        indent = "  " if raw_line.lstrip().startswith("-") else ""
        blocks.append(textwrap.fill(raw_line, width=width, subsequent_indent=indent))
    return "\n".join(blocks)


def section(title: str, items: list[str]) -> str:
    lines = [title + ":"]
    lines.extend([f"- {item}" for item in items])
    return wrap_multiline("\n".join(lines))


def _markdown_list(title: str, items: list[str]) -> str:
    lines = [f"## {title}", ""]
    lines.extend([f"- {item}" for item in items])
    lines.append("")
    return "\n".join(lines)


def _empty_message() -> AgentMessage:
    return AgentMessage(case_id="", role="", phase="opening", content="No message available.", order_index=0)
