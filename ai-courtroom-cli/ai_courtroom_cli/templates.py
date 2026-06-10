from __future__ import annotations

from .models import AGENT_DISPLAY_NAMES, CaseInput


FINANCIAL_DISCLAIMER = (
    "Financial assessment is informational only and is not professional financial advice."
)


def build_role_prompt(role: str, case: CaseInput) -> str:
    role_name = AGENT_DISPLAY_NAMES.get(role, role)
    alternatives = ", ".join(case.alternatives) if case.alternatives else "No explicit alternatives provided"
    return (
        f"Role: {role_name}\n"
        f"Case title: {case.title}\n"
        f"Dilemma: {case.dilemma}\n"
        f"Category: {case.category}\n"
        f"Budget: {case.budget or 'Not provided'}\n"
        f"Time horizon: {case.time_horizon or 'Not provided'}\n"
        f"Risk tolerance: {case.risk_tolerance}/100\n"
        f"Constraints: {case.constraints or 'None stated'}\n"
        f"Existing context: {case.existing_context or 'None stated'}\n"
        f"Alternatives: {alternatives}\n"
    )