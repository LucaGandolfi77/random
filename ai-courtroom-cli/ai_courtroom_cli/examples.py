from __future__ import annotations

from .models import CaseInput


RTX_3090_EXAMPLE = CaseInput(
    title="Buy 2 used RTX 3090 GPUs now or wait",
    dilemma="Should I buy 2 used RTX 3090 GPUs now, or should I wait?",
    category="Technology purchase",
    budget="EUR 1600 total budget, preferred ceiling EUR 1400",
    time_horizon="Need usable compute capacity within the next 30 days",
    constraints=(
        "I need enough VRAM for local AI workloads, I want to avoid unstable hardware, "
        "and I do not want to overpay right before a market drop."
    ),
    risk_tolerance=58,
    existing_context=(
        "I already have a workstation with adequate CPU and motherboard space, but I still "
        "need to confirm PSU headroom, cooling, and seller reliability."
    ),
    alternatives=[
        "Wait 1-3 months for better used prices",
        "Buy one GPU now and defer the second purchase",
        "Rent cloud GPUs for short-term experiments",
    ],
)


EXAMPLE_CASES = [RTX_3090_EXAMPLE]