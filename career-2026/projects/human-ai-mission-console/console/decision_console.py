"""Mission Operator AI Decision Console (decision support model).

Simulated FDIR-assistant / landing-cage scenarios. The AI recommends; the
operator holds authority (accept/reject/defer/veto/request-evidence). No
recommendation is ever treated as an automatic command. Audit trail + workload
metrics recorded locally.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Recommendation:
    rec_id: str
    scenario: str
    action: str
    rationale: str
    confidence: float            # 0..1 (always accompanied by explanation)
    uncertainty_note: str
    evidence: list[str]
    ood_warning: bool
    deadline_s: float            # seconds to respond
    consequences_accept: str
    consequences_reject: str
    safe_default: str
    fallback_available: bool
    system_mode: str
    issued_ts: float = field(default_factory=time.monotonic)

    def expired(self, now: float | None = None) -> bool:
        now = now if now is not None else time.monotonic()
        return now - self.issued_ts > self.deadline_s


ACTIONS = ("accept", "reject", "defer", "veto", "request_evidence")

PROHIBITED_AUTOMATIC = (
    "autonomous engine throttle change",
    "autonomous landing mode switch",
    "autonomous FDIR reconfiguration",
)


class Authority:
    """Defines what the AI may do automatically vs operator-only actions."""

    def __init__(self) -> None:
        self.ai_automatic = {"log_alert", "raise_warning", "set_mode_review"}
        self.operator_only = {"accept_guidance_change", "landing_abort", "mode_switch", "veto"}
        self.prohibited_automatic = list(PROHIBITED_AUTOMATIC)

    def can_automatic(self, action: str) -> bool:
        return action in self.ai_automatic

    def assert_not_prohibited(self, action: str) -> bool:
        return action not in self.prohibited_automatic


@dataclass
class OperatorDecision:
    rec_id: str
    action: str
    reason: str
    operator: str
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    final_outcome: str = ""
    unresolved: bool = False


class MissionConsole:
    def __init__(self, authority: Authority | None = None) -> None:
        self.authority = authority or Authority()
        self.recommendations: dict[str, Recommendation] = {}
        self.decisions: list[OperatorDecision] = []
        self.audit: list[dict] = []
        self.workload = {
            "alert_count": 0, "critical_alert_count": 0, "ack_seconds": [], "decide_seconds": [],
            "override_count": 0, "deferred": 0, "explanation_opened": 0, "repeated_alerts": 0,
        }
        self._ack: dict[str, float] = {}
        self._seen_repeat: dict[str, int] = {}

    def issue(self, rec: Recommendation) -> Recommendation:
        self.recommendations[rec.rec_id] = rec
        self.workload["alert_count"] += 1
        self.workload["critical_alert_count"] += 1 if rec.ood_warning or rec.deadline_s < 15 else 0
        self._seen_repeat[rec.action] = self._seen_repeat.get(rec.action, 0) + 1
        if self._seen_repeat[rec.action] > 1:
            self.workload["repeated_alerts"] += 1
        self.audit.append({"event": "RECOMMENDED", "rec_id": rec.rec_id, "ts": rec.issued_ts,
                           "action": rec.action, "confidence": rec.confidence,
                           "evidence": rec.evidence, "ood": rec.ood_warning})
        return rec

    def acknowledge(self, rec_id: str) -> None:
        if rec_id in self._ack:
            return
        rec = self.recommendations[rec_id]
        self._ack[rec_id] = time.monotonic()
        self.workload["ack_seconds"].append(max(0.0, time.monotonic() - rec.issued_ts))

    def decide(self, rec_id: str, action: str, reason: str, operator: str = "OP-01",
               now: float | None = None) -> OperatorDecision:
        rec = self.recommendations.get(rec_id)
        if rec is None:
            raise KeyError("unknown recommendation")
        if action not in ACTIONS:
            raise ValueError(f"invalid operator action {action}")
        if action == "veto" and not self.authority.can_automatic(rec.action) and rec.action in self.authority.operator_only:
            pass  # veto is always operator-only
        outcome = "EXECUTED"
        if rec.expired(now):
            outcome = "TIMEOUT_DEFAULT"
        if action == "reject":
            outcome = "REJECTED"
        elif action == "defer":
            outcome = "DEFERRED"
            self.workload["deferred"] += 1
        elif action == "veto":
            outcome = "VETOED"
        decision = OperatorDecision(rec_id=rec_id, action=action, reason=reason, operator=operator,
                                    final_outcome=outcome)
        self.decisions.append(decision)
        if action == "override":
            self.workload["override_count"] += 1
        self.audit.append({"event": "OPERATOR_ACTION", "rec_id": rec_id, "action": action,
                           "reason": reason, "operator": operator, "outcome": outcome,
                           "timestamp": datetime.now(timezone.utc).isoformat()})
        return decision

    def timeout_default(self, rec_id: str) -> OperatorDecision:
        rec = self.recommendations[rec_id]
        decision = OperatorDecision(rec_id=rec_id, action="defer", reason="timeout",
                                    operator="SYSTEM", final_outcome="SAFE_DEFAULT",
                                    unresolved=True)
        self.decisions.append(decision)
        self.audit.append({"event": "TIMEOUT", "rec_id": rec_id,
                           "safe_default": rec.safe_default})
        return decision

    def record(self, kind: str) -> None:
        if kind == "explanation_opened":
            self.workload["explanation_opened"] += 1

    def time_to_decide(self, rec_id: str) -> float:
        decision = next((d for d in self.decisions if d.rec_id == rec_id), None)
        rec = self.recommendations.get(rec_id)
        if not decision or not rec:
            return float("nan")
        return float(max(0.0, time.monotonic() - rec.issued_ts))

    def export_audit(self, path) -> None:
        path.write_text(json.dumps({"authority": {
            "ai_automatic": sorted(self.authority.ai_automatic),
            "operator_only": sorted(self.authority.operator_only),
            "prohibited_automatic": sorted(self.authority.prohibited_automatic),
        }, "audit": self.audit, "workload": self.workload}, indent=2, sort_keys=True))


def demo_landing_scenario() -> MissionConsole:
    console = MissionConsole()
    console.issue(Recommendation(
        rec_id="REC-LLS-01", scenario="lunar-landing-cage",
        action="mode_switch_to_review", rationale="ML/physics divergence above limit",
        confidence=0.62, uncertainty_note="Sensor preprocessing shared between models",
        evidence=["EV-LLS-001", "EV-LLS-002"], ood_warning=True, deadline_s=12.0,
        consequences_accept="Guidance switched to review mode; cage still active",
        consequences_reject="Cage remains active; risk of delayed review",
        safe_default="Keep current mode; cage continues to block unsafe commands",
        fallback_available=True, system_mode="CAGE_ACTIVE"))
    console.issue(Recommendation(
        rec_id="REC-TLM-01", scenario="telemetry-anomaly",
        action="raise_warning", rationale="Drift indicator above threshold",
        confidence=0.78, uncertainty_note="Drift subset partially covered",
        evidence=["EV-TLM-01"], ood_warning=False, deadline_s=60.0,
        consequences_accept="Ground analyst notified",
        consequences_reject="No immediate action; monitoring continues",
        safe_default="Continue monitoring", fallback_available=True,
        system_mode="MONITORING"))
    return console
