from __future__ import annotations

from collections import defaultdict

from .models import AGENT_DISPLAY_NAMES, AgentMessage, StoredCase, Verdict


def render_markdown_report(
    case: StoredCase,
    messages: list[AgentMessage],
    verdict: Verdict,
) -> str:
    grouped = defaultdict(list)
    for message in messages:
        grouped[message.agent_role].append(message)

    def render_role(role: str) -> str:
        parts = []
        for msg in grouped.get(role, []):
            parts.append(f"**{msg.stage.title()}**\n\n{msg.content}")
        return "\n\n".join(parts) if parts else "No content recorded."

    alternatives = "\n".join(f"- {item}" for item in case.alternatives) or "- None"
    risks = "\n".join(f"- {item}" for item in verdict.key_risks)
    best_alternatives = "\n".join(f"- {item}" for item in verdict.best_alternatives)
    action_plan = "\n".join(f"- {item}" for item in verdict.action_plan)
    missing_evidence = "\n".join(f"- {item}" for item in verdict.missing_evidence)
    follow_up = "\n".join(f"- {item}" for item in verdict.follow_up_questions)
    change_conditions = "\n".join(f"- {item}" for item in verdict.change_conditions)

    return f"""# {case.title}

## Case title

{case.title}

## User dilemma

{case.dilemma}

## Context summary

- Category: {case.category}
- Budget: {case.budget or 'Not provided'}
- Time horizon: {case.time_horizon or 'Not provided'}
- Risk tolerance: {case.risk_tolerance}/100
- Constraints: {case.constraints or 'None provided'}
- Existing context: {case.existing_context or 'None provided'}

## Alternatives already considered

{alternatives}

## Agent arguments

### Case intake

{render_role('case_intake')}

### Pro case

{render_role('pro_advocate')}

### Contra case

{render_role('contra_advocate')}

### Technical assessment

{render_role('technical_expert')}

### Financial assessment

{render_role('financial_expert')}

### Skeptical review

{render_role('skeptic')}

### Future scenarios

{render_role('futurist')}

### Judge summary

{render_role('judge')}

## Final verdict

**Verdict:** {verdict.verdict}

## Reasoning

{verdict.reasoning}

## Main risks

{risks}

## Best alternatives

{best_alternatives}

## Recommended action plan

{action_plan}

## What evidence is still missing

{missing_evidence}

## Confidence score

{verdict.confidence}/100

## Conditions under which the verdict should change

{change_conditions}

## Follow-up questions for the user

{follow_up}

## Disclaimer

- This tool is a decision-support system only.
- It does not provide legal, financial, medical, or professional advice.
- The user remains responsible for the final decision.
"""