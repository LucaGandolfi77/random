from __future__ import annotations

import re
from collections.abc import Sequence

from .models import AgentMessage, StoredCase, Verdict
from .templates import FINANCIAL_DISCLAIMER


class MockAgentProvider:
    def generate_intake(self, case: StoredCase) -> str:
        missing = self._missing_info(case)
        assumptions = self._assumptions(case)
        return (
            f"Decision classification: {self._domain_label(case)}.\n"
            f"Primary question before the court: {case.dilemma}\n\n"
            f"Constraints extracted: budget={case.budget or 'unknown'}; "
            f"time_horizon={case.time_horizon or 'unknown'}; risk_tolerance={case.risk_tolerance}/100.\n"
            f"Known context: {case.existing_context or 'No additional context supplied.'}\n"
            f"Alternatives already surfaced: {self._alternatives(case)}\n\n"
            f"Working assumptions: {assumptions}\n"
            f"Missing evidence: {missing}"
        )

    def generate_opening(self, case: StoredCase, role: str) -> str:
        domain = self._domain(case)
        if role == "pro_advocate":
            return self._pro_opening(case, domain)
        if role == "contra_advocate":
            return self._contra_opening(case, domain)
        if role == "technical_expert":
            return self._technical_opening(case, domain)
        if role == "financial_expert":
            return self._financial_opening(case, domain)
        if role == "skeptic":
            return self._skeptic_opening(case, domain)
        if role == "futurist":
            return self._futurist_opening(case, domain)
        if role == "judge":
            return self._judge_opening(case)
        raise ValueError(f"Unsupported role: {role}")

    def generate_cross_exam(
        self,
        case: StoredCase,
        role: str,
        openings: dict[str, str],
    ) -> str:
        if role == "pro_advocate":
            return (
                "Cross-examination response: the strongest objection is uncertainty around price and hardware condition, "
                "but this is a reversible decision if purchase criteria are strict: verified seller history, stress tests, "
                "and a pre-defined walk-away price. Waiting preserves optionality, but acting now may preserve execution speed."
            )
        if role == "contra_advocate":
            return (
                "Cross-examination response: the pro case assumes immediate value capture, yet that only holds if the machine is "
                "deployment-ready and the workload is real, not aspirational. If the user cannot verify PSU headroom, thermal "
                "stability, and actual near-term usage, the current purchase is speculation rather than disciplined execution."
            )
        if role == "technical_expert":
            return (
                "Cross-examination response: technical feasibility is the gating factor. If system power delivery, cooling, chassis "
                "clearance, and workload software stack are not validated first, both the pro and contra positions overstate certainty."
            )
        if role == "financial_expert":
            return (
                f"Cross-examination response: the financial question is not simply price versus delay; it is total cost of ownership "
                f"versus the value of immediate compute. {FINANCIAL_DISCLAIMER}"
            )
        if role == "skeptic":
            return (
                "Cross-examination response: several claims are still narrative-heavy. The court lacks hard evidence on seller quality, "
                "warranty coverage, real workload urgency, and the expected benefit of owning versus renting capacity."
            )
        if role == "futurist":
            return (
                "Cross-examination response: the decision is highly timing-sensitive. A short delay could improve prices, but a short delay "
                "could also postpone learning, delivery, or research throughput if the user's demand is immediate and credible."
            )
        raise ValueError(f"Unsupported cross-exam role: {role}")

    def generate_judge_summary(
        self,
        case: StoredCase,
        messages: Sequence[AgentMessage],
    ) -> str:
        direction = self._recommended_direction(case)
        return (
            "The court identifies three decisive dimensions: evidence quality, reversibility, and timing. "
            "The pro side is strongest on immediate utility and reversibility through resale or staged adoption. "
            "The contra side is strongest on hidden condition risk, uncertain near-term necessity, and price timing. "
            f"At this stage the evidence leans toward a {direction} outcome, but only under disciplined conditions rather than impulse."
        )

    def generate_verdict(
        self,
        case: StoredCase,
        messages: Sequence[AgentMessage],
    ) -> Verdict:
        direction = self._recommended_direction(case)
        confidence = self._confidence(case)
        if direction == "conditional_buy":
            verdict = "Proceed now, but only under strict purchase conditions"
            reasoning = (
                "The court favors a conditional purchase because the decision is moderately reversible, the user has a near-term need for "
                "compute, and used RTX 3090 cards can still offer attractive VRAM-per-euro value. However, that conclusion depends on verifying "
                "hardware condition, system compatibility, and a price ceiling that preserves downside protection."
            )
            action_plan = [
                "Set a maximum total buy price before negotiating.",
                "Verify seller credibility, card history, and stress-test results before payment.",
                "Confirm PSU capacity, cooling, physical clearance, and connector requirements.",
                "If one card meets the threshold and two do not, buy one first and reassess.",
            ]
            alternatives = [
                "Buy one GPU now and delay the second purchase.",
                "Rent cloud GPUs for short bursts while watching the used market.",
                "Wait 2-6 weeks if local urgency is weaker than expected.",
            ]
        elif direction == "wait":
            verdict = "Wait and gather stronger evidence before committing capital"
            reasoning = (
                "The court favors waiting because the unknowns currently dominate the upside. The lack of hard evidence on hardware condition, "
                "actual urgency, and system readiness makes the purchase too assumption-sensitive for a disciplined decision."
            )
            action_plan = [
                "Verify the real compute need over the next 30-60 days.",
                "Track used market prices and seller quality for a short observation window.",
                "Benchmark the cloud-rental alternative against ownership cost.",
                "Re-open the case when condition data and platform readiness are confirmed.",
            ]
            alternatives = [
                "Delay the purchase and re-evaluate after new listings appear.",
                "Rent GPUs temporarily for urgent work.",
                "Reduce scope and buy a single card only if one exceptional deal appears.",
            ]
        else:
            verdict = "Buy now"
            reasoning = (
                "The court favors immediate action because the user's near-term execution value outweighs the likely benefit of waiting, and "
                "the downside remains manageable if the purchase is made at a disciplined price with verification checks."
            )
            action_plan = [
                "Negotiate a disciplined price and require a short functional test window.",
                "Validate workstation compatibility before exchange.",
                "Install, benchmark, and monitor thermals immediately after purchase.",
                "Document the decision assumptions and revisit in 30 days.",
            ]
            alternatives = [
                "Buy one card if the second unit is weaker or overpriced.",
                "Use rented GPUs only for overflow workloads.",
            ]

        return Verdict(
            case_id=case.id,
            verdict=verdict,
            reasoning=reasoning,
            key_risks=self._key_risks(case),
            best_alternatives=alternatives,
            action_plan=action_plan,
            confidence=confidence,
            change_conditions=self._change_conditions(case),
            missing_evidence=self._missing_evidence_list(case),
            follow_up_questions=self._follow_up_questions(case),
        )

    def _domain(self, case: StoredCase) -> str:
        text = f"{case.category} {case.dilemma}".lower()
        if any(keyword in text for keyword in ["gpu", "rtx", "hardware", "pc", "server"]):
            return "hardware_purchase"
        if any(keyword in text for keyword in ["architecture", "stack", "microservice", "backend"]):
            return "software_architecture"
        if any(keyword in text for keyword in ["phd", "thesis", "research"]):
            return "research_decision"
        if any(keyword in text for keyword in ["career", "job", "startup"]):
            return "career_decision"
        return "general_decision"

    def _domain_label(self, case: StoredCase) -> str:
        labels = {
            "hardware_purchase": "Technology purchase / hardware acquisition",
            "software_architecture": "Software architecture decision",
            "research_decision": "Research or thesis decision",
            "career_decision": "Career or startup decision",
            "general_decision": "General strategic decision",
        }
        return labels[self._domain(case)]

    def _pro_opening(self, case: StoredCase, domain: str) -> str:
        if domain == "hardware_purchase":
            return (
                "Opening statement: buying now can be rational if the cards close a real short-term compute bottleneck. Two used RTX 3090s "
                "still offer strong VRAM-per-euro economics for local AI experimentation, fine-tuning, and workstation throughput. If the user has "
                "a near-term workload, the value of execution now may exceed the uncertain benefit of waiting for a slightly better market entry."
            )
        return (
            "Opening statement: the strongest case for action is strategic momentum. Acting now can create learning, reduce indecision cost, and "
            "generate new evidence quickly if the downside is reasonably reversible."
        )

    def _contra_opening(self, case: StoredCase, domain: str) -> str:
        if domain == "hardware_purchase":
            return (
                "Opening statement: used flagship GPUs carry non-trivial hidden downside: wear from heavy prior usage, missing warranty, high power draw, "
                "and the possibility of market softening. If the purchase is made without proof of condition and without verifying real urgency, the user is "
                "paying for optionality they may not actually need yet."
            )
        return (
            "Opening statement: the strongest argument against acting now is that premature commitment can lock capital, attention, and time into a path that "
            "has not yet cleared the evidence threshold."
        )

    def _technical_opening(self, case: StoredCase, domain: str) -> str:
        if domain == "hardware_purchase":
            return (
                "Technical assessment: the cards themselves may be capable, but feasibility depends on the host system. The user must confirm PSU headroom, "
                "12V rail stability, cooling, physical slot clearance, connector availability, driver support, and whether the actual workloads benefit from two cards "
                "rather than one."
            )
        return (
            "Technical assessment: the main technical question is implementation feasibility under current constraints, not only theoretical fit. The court should prefer "
            "options that reduce integration complexity and preserve recoverability."
        )

    def _financial_opening(self, case: StoredCase, domain: str) -> str:
        budget = case.budget or "no explicit budget"
        if domain == "hardware_purchase":
            return (
                f"Financial assessment: the case should be evaluated on total cost of ownership, not sticker price alone. Budget context is {budget}. "
                "The court should weigh acquisition cost, electricity, possible replacement risk, resale value, and the opportunity cost of delaying useful output. "
                f"{FINANCIAL_DISCLAIMER}"
            )
        return (
            f"Financial assessment: the court should compare capital spent, downside exposure, expected return, and opportunity cost within the stated budget context of {budget}. "
            f"{FINANCIAL_DISCLAIMER}"
        )

    def _skeptic_opening(self, case: StoredCase, domain: str) -> str:
        return (
            "Skeptical review: this case still contains assumption risk. The current record lacks full evidence on reversibility, hidden downside, and the quality of the user's "
            "near-term need. Any recommendation should remain conditional until those uncertainties are narrowed."
        )

    def _futurist_opening(self, case: StoredCase, domain: str) -> str:
        if domain == "hardware_purchase":
            return (
                "Future scenarios: best case, the user acquires undervalued compute capacity and accelerates learning or delivery immediately. Worst case, the market softens, the cards "
                "underperform expectations, or hidden defects turn a discounted purchase into an expensive distraction. Most likely, the right answer depends on whether the next 30-90 days "
                "contain real GPU-bound work."
            )
        return (
            "Future scenarios: the court should model best-case upside, worst-case regret, and the most likely medium-term path. Timing matters because some decisions gain value from speed, "
            "while others gain value from waiting for better evidence."
        )

    def _judge_opening(self, case: StoredCase) -> str:
        return (
            "The court will weigh arguments by evidence strength, opportunity cost, reversibility, risk exposure, timing, and strategic alignment. The final verdict will not average opinions; "
            "it will rank them by what is actually supported under the user's stated constraints."
        )

    def _assumptions(self, case: StoredCase) -> str:
        return (
            "the user has a real decision window now; the stated constraints are materially relevant; and missing context may change the result if it alters urgency, reversibility, or downside exposure"
        )

    def _alternatives(self, case: StoredCase) -> str:
        return ", ".join(case.alternatives) if case.alternatives else "no explicit alternatives provided"

    def _missing_info(self, case: StoredCase) -> str:
        items = self._missing_evidence_list(case)
        return "; ".join(items)

    def _missing_evidence_list(self, case: StoredCase) -> list[str]:
        domain = self._domain(case)
        items: list[str] = []
        if not case.budget:
            items.append("explicit purchase budget or acceptable downside threshold")
        if not case.time_horizon:
            items.append("explicit time horizon")
        if not case.existing_context:
            items.append("operating context and existing assets")
        if domain == "hardware_purchase":
            items.extend(
                [
                    "seller reputation, warranty status, and proof of card history",
                    "stress-test evidence and thermals under sustained load",
                    "PSU, cooling, and workstation compatibility confirmation",
                ]
            )
        return items

    def _key_risks(self, case: StoredCase) -> list[str]:
        domain = self._domain(case)
        risks = [
            "The current evidence base is incomplete, so confidence is conditional rather than absolute.",
            "Opportunity cost may be misestimated if the real workload is weaker than stated.",
        ]
        if domain == "hardware_purchase":
            risks.extend(
                [
                    "Used GPU condition risk: prior mining, degraded memory, or unstable thermals.",
                    "Platform readiness risk: insufficient PSU, cooling, physical clearance, or cabling.",
                    "Market timing risk: better prices or better alternatives may appear soon.",
                ]
            )
        return risks

    def _follow_up_questions(self, case: StoredCase) -> list[str]:
        questions = [
            "What concrete outcome becomes possible only if you act now?",
            "How reversible is this decision in practice after 30 days?",
            "Which assumption, if proven false, would most change the verdict?",
        ]
        if self._domain(case) == "hardware_purchase":
            questions.extend(
                [
                    "Can the seller provide benchmark logs, temperatures, and proof of ownership history?",
                    "What is your all-in system readiness for two 3090 cards today?",
                ]
            )
        return questions

    def _change_conditions(self, case: StoredCase) -> list[str]:
        conditions = [
            "The verdict should change if new evidence materially changes urgency.",
            "The verdict should change if reversibility becomes much weaker than assumed.",
        ]
        if self._domain(case) == "hardware_purchase":
            conditions.extend(
                [
                    "Change to wait if seller verification or stress-test evidence is weak.",
                    "Change to buy immediately if price drops below the defined threshold and system compatibility is confirmed.",
                ]
            )
        return conditions

    def _recommended_direction(self, case: StoredCase) -> str:
        urgency = self._has_near_term_urgency(case)
        low_risk = case.risk_tolerance <= 35
        high_risk = case.risk_tolerance >= 70
        if low_risk and not urgency:
            return "wait"
        if urgency and case.risk_tolerance >= 45:
            return "conditional_buy"
        if high_risk and urgency:
            return "buy"
        return "wait"

    def _confidence(self, case: StoredCase) -> int:
        base = 63
        if self._has_near_term_urgency(case):
            base += 6
        if case.budget:
            base += 4
        if case.existing_context:
            base += 3
        if case.risk_tolerance <= 30:
            base -= 4
        return max(45, min(base, 84))

    def _has_near_term_urgency(self, case: StoredCase) -> bool:
        text = " ".join(
            [
                case.dilemma.lower(),
                (case.time_horizon or "").lower(),
                case.existing_context.lower(),
            ]
        )
        return any(keyword in text for keyword in ["30 days", "urgent", "now", "immediate", "next month", "deadline", "need usable compute"])


def extract_first_number(text: str | None) -> int | None:
    if not text:
        return None
    match = re.search(r"(\d+)", text.replace(",", ""))
    return int(match.group(1)) if match else None
