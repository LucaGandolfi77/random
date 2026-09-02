"""Shared builders for week-3 synthetic demonstration content.

Helpers keep the per-project data files compact and guarantee that every
record carries the fields required by the normalized model. All content is
explicitly synthetic; values are fixed constants (no runtime randomness).
"""


def R(
    rid: str,
    title: str,
    category: str,
    description: str,
    verification: str,
    acceptance: str,
    priority: str = "MEDIUM",
    status: str = "APPROVED",
    rationale: str = "",
    source: str = "Project engineering (synthetic)",
    parent: str | None = None,
) -> dict:
    return {
        "requirement_id": rid,
        "title": title,
        "description": description,
        "rationale": rationale,
        "category": category,
        "source": source,
        "verification_method": verification,
        "acceptance_criteria": acceptance,
        "priority": priority,
        "status": status,
        "parent_requirement_id": parent,
    }


def TC(
    test_id: str,
    title: str,
    test_type: str,
    objective: str,
    expected_result: str,
    reqs: list[str],
    severity_on_failure: str = "MEDIUM",
    automation: str = "AUTOMATED",
    preconditions: str = "",
    input_description: str = "",
    procedure: str = "",
) -> dict:
    return {
        "test_id": test_id,
        "title": title,
        "test_type": test_type,
        "objective": objective,
        "expected_result": expected_result,
        "related_requirement_ids": reqs,
        "severity_on_failure": severity_on_failure,
        "automation_status": automation,
        "preconditions": preconditions,
        "input_description": input_description,
        "procedure": procedure,
    }


def TR(
    test_id: str,
    verdict: str,
    run_id: str,
    environment: str,
    model_version: str,
    dataset_version: str,
    actual_result: str,
    metrics: dict | None = None,
    failure_reason: str = "",
    reviewer_notes: str = "",
    evidence_ids: list[str] | None = None,
    configuration: str = "",
    execution_timestamp: str = "2026-08-01T09:00:00Z",
) -> dict:
    return {
        "result": {
            "test_id": test_id,
            "verdict": verdict,
            "test_run_id": run_id,
            "environment": environment,
            "configuration": configuration,
            "model_version": model_version,
            "dataset_version": dataset_version,
            "execution_timestamp": execution_timestamp,
            "actual_result": actual_result,
            "measured_metrics": metrics or {},
            "failure_reason": failure_reason,
            "reviewer_notes": reviewer_notes,
            "evidence_ids": evidence_ids or [],
        }
    }


def E(
    eid: str,
    title: str,
    etype: str,
    description: str,
    reqs: list[str],
    tests: list[str] | None = None,
    source: str = "Verification run (synthetic)",
    status: str = "VALID",
    tool: str = "workbench-week3-demo",
    tool_version: str = "0.1.0",
    generated_at: str = "2026-08-01T09:30:00Z",
    attachment: str | None = None,
    limitations: str = "",
    author: str = "Demo verification team",
) -> dict:
    return {
        "evidence_id": eid,
        "title": title,
        "evidence_type": etype,
        "description": description,
        "source": source,
        "status": status,
        "tool_name": tool,
        "tool_version": tool_version,
        "generated_at": generated_at,
        "collected_at": generated_at,
        "author": author,
        "related_requirement_ids": reqs,
        "related_test_ids": tests or [],
        "attachment": attachment,  # synthetic text content written to a real file
        "limitations": limitations,
    }


def RISK(
    rid: str,
    title: str,
    hazard: str,
    cause: str,
    effect: str,
    initial_sev: int,
    initial_like: int,
    mitigation: str,
    verification: str,
    residual_sev: int,
    residual_like: int,
    acceptance: str,
    rationale: str,
    reqs: list[str] | None = None,
    tests: list[str] | None = None,
    fmea_items: list[str] | None = None,
    owner: str = "Demo risk owner",
    review_date: str = "2026-08-10T00:00:00Z",
) -> dict:
    return {
        "risk_id": rid,
        "title": title,
        "hazardous_condition": hazard,
        "cause": cause,
        "possible_effect": effect,
        "initial_severity": initial_sev,
        "initial_likelihood": initial_like,
        "mitigation": mitigation,
        "verification_evidence": verification,
        "residual_severity": residual_sev,
        "residual_likelihood": residual_like,
        "acceptance_status": acceptance,
        "acceptance_rationale": rationale,
        "owner": owner,
        "review_date": review_date,
        "related_requirement_ids": reqs or [],
        "related_test_ids": tests or [],
        "related_fmea_item_ids": fmea_items or [],
    }


def LIM(
    lid: str,
    title: str,
    description: str,
    affected_scope: str,
    impact: str,
    workaround: str,
    constraint: str,
    severity: str = "MEDIUM",
    status: str = "OPEN",
    reqs: list[str] | None = None,
    risks: list[str] | None = None,
) -> dict:
    return {
        "limitation_id": lid,
        "title": title,
        "description": description,
        "affected_scope": affected_scope,
        "impact": impact,
        "workaround": workaround,
        "operational_constraint": constraint,
        "severity": severity,
        "status": status,
        "related_requirement_ids": reqs or [],
        "related_risk_ids": risks or [],
    }


def FM(
    fid: str,
    function: str,
    failure_mode: str,
    local_effect: str,
    system_effect: str,
    cause: str,
    detection: str,
    control: str,
    sev: int,
    occ: int,
    det: int,
    action: str,
    mitigation: str,
    residual: str,
    reqs: list[str] | None = None,
    tests: list[str] | None = None,
    evidence: list[str] | None = None,
) -> dict:
    return {
        "fmea_item_id": fid,
        "function": function,
        "failure_mode": failure_mode,
        "local_effect": local_effect,
        "system_effect": system_effect,
        "possible_cause": cause,
        "detection_method": detection,
        "existing_control": control,
        "severity": sev,
        "occurrence": occ,
        "detectability": det,
        "recommended_action": action,
        "mitigation": mitigation,
        "residual_risk": residual,
        "related_requirement_ids": reqs or [],
        "related_test_ids": tests or [],
        "evidence_ids": evidence or [],
    }


def DEC(
    decision_id: str,
    decision: str,
    summary: str,
    rationale: str,
    blocking: list[str] | None = None,
    accepted: list[str] | None = None,
    mitigations: list[str] | None = None,
    constraints: list[str] | None = None,
    monitoring: list[str] | None = None,
    rollback: str = "",
    approver: str = "Demo review board",
    date: str = "2026-08-15T00:00:00Z",
) -> dict:
    return {
        "decision_id": decision_id,
        "decision": decision,
        "decision_date": date,
        "decision_summary": summary,
        "rationale": rationale,
        "blocking_findings": blocking or [],
        "accepted_risks": accepted or [],
        "required_mitigations": mitigations or [],
        "operational_constraints": constraints or [],
        "monitoring_requirements": monitoring or [],
        "rollback_strategy": rollback,
        "approver": approver,
        "review_status": "APPROVED",
    }
