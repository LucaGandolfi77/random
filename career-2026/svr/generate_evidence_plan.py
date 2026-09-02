#!/usr/bin/env python3
"""Week 2 (SVR roadmap): Verification Evidence Plan generator.

Reads the real repository, inventories artefacts (with SHA-256), maps them to a
fixed evidence taxonomy, and generates Markdown/JSON/CSV outputs under
/career-2026/svr/. Deterministic; nothing is invented — artefacts are classified
as Candidate/Available evidence and gaps are explicit. Authoritative ECSS SVerP
and Week-1 SVR Preparation Baseline were NOT found in the repository: recorded
as P0 precondition gaps; the gate is therefore Not Assessable (automatic) until
human input is provided.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # /career-2026
WB = ROOT / "ecss-ml-assurance-workbench"
OUT = ROOT / "svr"
PLAN_DIR = OUT / "planning"
DOCS = OUT / "docs"

TAXONOMY = [
    "Planning Evidence", "Requirements Verification Evidence", "Architecture Verification Evidence",
    "Detailed Design Verification Evidence", "Source Code Verification Evidence",
    "Static Analysis Evidence", "Unit Test Evidence", "Coverage Evidence",
    "Integration Test Evidence", "Regression Test Evidence", "Software Validation Evidence",
    "Operational Scenario Evidence", "Timing Evidence", "Sizing Evidence",
    "Resource Budget Evidence", "Interface Verification Evidence",
    "Tool Qualification or Tool Confidence Evidence", "Configuration Management Evidence",
    "Review Evidence", "Inspection Evidence", "Anomaly and Problem Report Evidence",
    "Verification Closure Evidence", "Independence Evidence", "Acceptance and Approval Evidence",
    "DJF Index Evidence",
]
METHODS = ("Review", "Analysis", "Inspection", "Test", "Demonstration", "Similarity",
           "Combination of Methods", "Method Pending Definition")
STATES = ("Planned", "Requested", "In Preparation", "Available", "Validated", "Reviewed",
          "Accepted", "Rejected", "Obsolete", "Superseded", "Missing", "Not Applicable",
          "Applicability Pending")

# Real artefact scan rules: (glob relative to WB, category, default method, level)
SCAN_RULES = [
    ("backend/tests/**/*.py", "Unit Test Evidence", "Test", "Software Component"),
    ("frontend/src/**/__tests__/**/*.tsx", "Unit Test Evidence", "Test", "Software Component"),
    ("backend/app/portfolio/**/*.py", "Source Code Verification Evidence", "Analysis", "Software Component"),
    ("backend/app/assurance_engine/**/*.py", "Source Code Verification Evidence", "Analysis", "Software Component"),
    ("backend/app/continuous/**/*.py", "Source Code Verification Evidence", "Analysis", "Software Component"),
    ("projects/real-time-embedded-ai/src/*.cpp", "Source Code Verification Evidence", "Analysis", "Software Component"),
    ("projects/real-time-embedded-ai/tests*", "Unit Test Evidence", "Test", "Software Component"),
    ("projects/gnc-sensor-fusion-safety-cage/tests/*.py", "Unit Test Evidence", "Test", "Software Component"),
    ("release/quality-gate-report.json", "Verification Closure Evidence", "Test", "Process"),
    ("release/quality-gate-report.md", "Verification Closure Evidence", "Test", "Process"),
    ("docs/*.md", "Review Evidence", "Review", "Document"),
    ("portfolio/*.md", "Review Evidence", "Review", "Document"),
    ("security/sbom.json", "Tool Qualification or Tool Confidence Evidence", "Analysis", "Tool or Environment"),
    ("docs/ARCHITECTURE_WEEK6.md", "Architecture Verification Evidence", "Review", "Document"),
    ("docs/adr/*.md", "Architecture Verification Evidence", "Review", "Document"),
    ("docs/PORTFOLIO_READINESS.md", "Acceptance and Approval Evidence", "Review", "Document"),
    ("release/backup-*.zip", "Configuration Management Evidence", "Test", "Process"),
    ("projects/real-time-embedded-ai/docs/BENCHMARK_REPORT.md", "Timing Evidence", "Test", "Software Item"),
    ("docs/PERFORMANCE.md", "Resource Budget Evidence", "Analysis", "Software Item"),
]


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def artefact_scan() -> list[dict]:
    found: dict[str, dict] = {}
    for pattern, category, method, level in SCAN_RULES:
        matches = list(WB.glob(pattern))
        if not matches:
            matches = list(WB.glob(pattern.replace("**", "*")))
        for path in matches:
            if not path.is_file() or path.stat().st_size == 0:
                continue
            rel = path.relative_to(ROOT)
            key = str(rel)
            found[key] = {
                "path": str(rel), "category": category, "method": method, "level": level,
                "checksum": sha256(path), "size_bytes": path.stat().st_size,
            }
    return sorted(found.values(), key=lambda r: r["path"])


def make_evidence_records(artefacts: list[dict]) -> list[dict]:
    prefix_by_category = {
        "Planning Evidence": "EVD-PLAN", "Requirements Verification Evidence": "EVD-REQ",
        "Architecture Verification Evidence": "EVD-ARCH", "Detailed Design Verification Evidence": "EVD-DES",
        "Source Code Verification Evidence": "EVD-CODE", "Static Analysis Evidence": "EVD-STAT",
        "Unit Test Evidence": "EVD-UT", "Coverage Evidence": "EVD-COV",
        "Integration Test Evidence": "EVD-INT", "Regression Test Evidence": "EVD-REG",
        "Software Validation Evidence": "EVD-VAL", "Operational Scenario Evidence": "EVD-SCEN",
        "Timing Evidence": "EVD-TIM", "Sizing Evidence": "EVD-SIZ",
        "Resource Budget Evidence": "EVD-RES", "Interface Verification Evidence": "EVD-IF",
        "Tool Qualification or Tool Confidence Evidence": "EVD-TOOL",
        "Configuration Management Evidence": "EVD-CM", "Review Evidence": "EVD-RVW",
        "Inspection Evidence": "EVD-INS", "Anomaly and Problem Report Evidence": "EVD-ANM",
        "Verification Closure Evidence": "EVD-CLS", "Independence Evidence": "EVD-IND",
        "Acceptance and Approval Evidence": "EVD-APP", "DJF Index Evidence": "EVD-DJF",
    }
    counts: dict[str, int] = {}
    records = []
    for art in artefacts:
        prefix = prefix_by_category[art["category"]]
        counts[prefix] = counts.get(prefix, 0) + 1
        eid = f"{prefix}-{counts[prefix]:03d}"
        status = "Available"  # file exists; acceptance/review still pending (see gaps)
        records.append({
            "Evidence ID": eid,
            "Title": f"{art['category']} — {art['path'].split('/')[-1]}",
            "Category": art["category"],
            "Description": f"Repository artefact at {art['path']}",
            "Purpose": "Supports SVR verification evidence set (candidate; acceptance criteria pending review).",
            "Software item": "ecss-ml-assurance-workbench" if str(art["path"]).startswith(("backend", "frontend", "release", "security", "docs", "portfolio"))
            else str(art["path"]).split("/")[1],
            "SVerP activity ID": "PENDING_SVERP",
            "SVerP reference": "Not identified",
            "Verification method": art["method"],
            "Verification level": art["level"],
            "Verified product": art["path"],
            "Required baseline": "Not defined",
            "Actual baseline": "repository main (untracked)",
            "Planned producer": "Not assigned",
            "Reviewer": "Not assigned",
            "Independence": "Not assessed",
            "Planned availability": "Not defined",
            "Status": status,
            "Approval status": "Pending",
            "Checksum": art["checksum"],
            "SVR destination": "SVR Section TBD",
            "DJF destination": "Not indexed",
            "Source path": art["path"],
            "Priority": "P1",
        })
    return records


def write_csv(path: Path, header: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=header)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in header})


def gap_and_action(records: list[dict]) -> tuple[list[dict], list[dict]]:
    gaps: list[dict] = []
    actions: list[dict] = []
    gap_map = [
        ("SVERP-MISSING", "SVerP non identificato", "Authoritative ECSS SVerP not found in repository.", "P0", True, "Register/provide authoritative SVerP (document ID, version, approval)."),
        ("WEEK1-MISSING", "SVR Preparation Baseline non disponibile", "Week-1 SVR Preparation Baseline not found.", "P0", True, "Provide Week-1 baseline or confirm scope elsewhere."),
    ]
    for i, (code, title, desc, prio, blocking, action) in enumerate(gap_map, start=1):
        gaps.append({"Gap ID": f"GAP-{code}-{i:03d}", "Category": "Prerequisite", "Description": f"{title}: {desc}",
                     "Priority": prio, "Blocking": blocking, "Recommended action": action,
                     "Owner": "Not assigned", "Status": "Open", "Closure evidence": "To be provided"})
        actions.append({"Action ID": f"ACT-SVR2-{i:03d}", "Source": "gap", "Description": action, "Priority": prio,
                        "Owner": "Not assigned", "Due date": "Not defined", "Status": "Open",
                        "Closure criteria": "Authoritative artefact provided and referenced."})
    return gaps, actions


def main() -> int:
    PLAN_DIR.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    artefacts = artefact_scan()
    evidence = make_evidence_records(artefacts)
    gaps, actions = gap_and_action(evidence)

    header_ev = list(evidence[0].keys()) if evidence else ["Evidence ID"]
    write_csv(PLAN_DIR / "VERIFICATION_EVIDENCE_MATRIX.csv", header_ev, evidence)
    write_csv(PLAN_DIR / "EVIDENCE_INVENTORY.csv",
              ["path", "category", "method", "level", "checksum", "size_bytes"], artefacts)
    write_csv(PLAN_DIR / "EVIDENCE_GAPS.csv", list(gaps[0].keys()), gaps)
    write_csv(PLAN_DIR / "EVIDENCE_ACTION_REGISTER.csv", list(actions[0].keys()), actions)

    counts: dict[str, int] = {}
    for e in evidence:
        counts[e["Category"]] = counts.get(e["Category"], 0) + 1

    plan = {
        "document_id": "SVR-W2-EVIDENCE-PLAN",
        "status": "Draft",
        "svp_reference": "Not identified",
        "week1_baseline": "Not found",
        "evidence_records": evidence,
        "evidence_count": len(evidence),
        "gap_count": len(gaps),
        "action_count": len(actions),
        "gate": {
            "criterion": "Evidenze identificate",
            "automatic_assessment": "Not Assessable",
            "human_decision": "Not recorded",
            "approver": "Not assigned",
            "rationale": "Authoritative SVerP and Week-1 baseline are not present in the repository; "
                         "evidence identification is possible but cannot be baselined without human input.",
        },
    }
    (PLAN_DIR / "VERIFICATION_EVIDENCE_PLAN.json").write_text(json.dumps(plan, indent=2, sort_keys=True))

    md = [
        "# Verification Evidence Plan", "",
        "## 1. Document Control",
        "| Field | Value |", "|---|---|",
        "| Document ID | SVR-W2-EVIDENCE-PLAN |", "| Status | Draft |",
        "| SVerP reference | Not identified (P0 blocker) |", "| Week-1 baseline | Not found (P0 blocker) |",
        "| Owner / reviewers | Not assigned |", "",
        "> This is a repository-grounded engineering plan. It does not replace formal review and does "
        "> not certify ECSS compliance.", "",
        "## 2. Purpose", "",
        "Identify verification evidence needed for the SVR, link SVerP activities to evidence, support "
        "the DJF index, and expose gaps. Planning/available/accepted remain distinct; no artefact is "
        "auto-accepted.", "",
        "## 3. Scope", "",
        "Software items in scope (repository evidence): ML Assurance Workbench (backend, frontend, "
        "release, security, docs, portfolio), real-time-embedded-ai (C++), gnc-sensor-fusion-safety-cage "
        "(Python). Lifecycle phase: SVR evidence planning (Week 2). Excluded: any artefact outside "
        f"`{ROOT}`.", "",
        "## 4. Applicable and Reference Documents", "",
        "- SVerP: **Not identified** (see gap GAP-SVERP).",
        "- Week-1 SVR Preparation Baseline: **Not found** (see gap GAP-WEEK1).",
        "- Repository references: README.md, docs/ (incl. quality-gate and release artefacts).", "",
        "## 5. Evidence Planning Method", "",
        "Evidence was identified by scanning the repository with deterministic rules, computing SHA-256 "
        "for every artefact, classifying by the taxonomy below, and assigning explicit states. Gaps are "
        "generated by rule, not by opinion.", "",
        "## 6. SVerP Analysis Summary", "",
        "Authoritative SVerP not identified. Activity extraction is therefore **Pending SVerP**. "
        "Evidence disposition for P0 SVerP activities cannot be confirmed until an authoritative plan is "
        "provided.", "",
        "## 7. Evidence Taxonomy", "",
        "25 categories defined (see docs/EVIDENCE_TAXONOMY.md). Methods: "
        + ", ".join(METHODS) + ". Levels: Software System/Item/Component/Unit/Interface/Process/Document/"
        "Tool or Environment. States: " + ", ".join(STATES) + ".", "",
        "## 8. Verification Evidence Matrix", "",
        "See `VERIFICATION_EVIDENCE_MATRIX.csv` (columns per the data model). Summary by category:",
        "", "| Category | Evidence records |", "|---|---|",
    ]
    for cat, n in sorted(counts.items()):
        md.append(f"| {cat} | {n} |")
    md += [
        "", "## 9. Evidence Inventory", "",
        f"Artefacts scanned and hashed: {len(artefacts)} (see EVIDENCE_INVENTORY.csv). All are classified "
        "as Available/Candidate evidence; none is auto-accepted (acceptance criteria and reviewer pending).", "",
        "## 10. Evidence Acceptance Criteria", "",
        "Document/test/coverage/static-analysis/review acceptance criteria are defined in "
        "docs/EVIDENCE_ACCEPTANCE_CRITERIA.md and applied by human review only.", "",
        "## 11. Roles and Responsibilities", "",
        "Not assigned (no repository data). Assignments are open actions.", "",
        "## 12. Evidence Schedule / 13. Configuration and Baseline Management", "",
        "Milestones, actual baseline (repository main, untracked) and checksum policy are recorded per "
        "evidence; acceptance/approval remain pending.", "",
        "## 14. Evidence Gaps / 15. Risks", "",
        "See EVIDENCE_GAPS.csv. Key risks: missing authoritative SVerP; missing Week-1 baseline; "
        "unassigned owners/reviewers; undefined acceptance reviews.", "",
        "## 16. Inputs to the SVR / 17. Inputs to the DJF", "",
        "SVR and DJF destinations are mapped per evidence (SVR section and DJF inclusion pending "
        "authoritative references).", "",
        "## 18. Open Actions", "",
        "See EVIDENCE_ACTION_REGISTER.csv (all actions have closure criteria).", "",
        "## 19. Gate Assessment", "",
        "Criterion: *Evidenze identificate*. Automatic assessment: **Not Assessable** (SVerP and Week-1 "
        "baseline missing). Human decision: not recorded. Conditions: register authoritative SVerP and "
        "Week-1 baseline before re-assessment.", "",
        "## 20. Conclusion", "",
        f"{len(evidence)} evidence records identified from real repository artefacts; {len(gaps)} gaps "
        "(P0: 2) and {len(actions)} actions registered. Readiness for Week 3 (requirements traceability) "
        "is conditional on resolving the P0 prerequisite gaps.", "",
        "## Appendices",
        "- Complete matrix: VERIFICATION_EVIDENCE_MATRIX.csv",
        "- Inventory: EVIDENCE_INVENTORY.csv", "- Gaps: EVIDENCE_GAPS.csv",
        "- Actions: EVIDENCE_ACTION_REGISTER.csv",
    ]
    (PLAN_DIR / "VERIFICATION_EVIDENCE_PLAN.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    # Week-3 inputs + short method/taxonomy docs
    (DOCS / "WEEK_3_INPUTS.md").write_text(
        "# Week 3 inputs\n\nDocuments to analyse once available: authoritative SVerP, requirements "
        "specification, Week-1 baseline. Requirements source: not identified in repository; readiness: "
        "conditional on Week-2 P0 gaps closure. Evidence references: see planning CSV outputs.\n",
        encoding="utf-8")
    (DOCS / "SVERP_ANALYSIS_METHOD.md").write_text(
        "# SVerP analysis method\n\nCandidates classified by document ID/version/status/software item; "
        "selection considers approval state and references. Current repository: no candidate found; "
        "recorded as P0 blocker (Not Applicable status applied to activity extraction).\n", encoding="utf-8")
    (DOCS / "EVIDENCE_TAXONOMY.md").write_text(
        "# Evidence taxonomy\n\n" + "\n".join(f"- {c}" for c in TAXONOMY) +
        "\n\nMethods and levels as in the plan. States: " + ", ".join(STATES) + ".\n", encoding="utf-8")
    (DOCS / "EVIDENCE_ACCEPTANCE_CRITERIA.md").write_text(
        "# Evidence acceptance criteria\n\nDocument: identified, versioned, linked to baseline, readable, "
        "not superseded, required review/approval present. Test report: item/version/objective/"
        "environment/config/precondition/procedure/expected vs actual/status/anomaly/date/executor/"
        "evidence/tool version. Coverage and static-analysis reports: baseline, tool+version, scope, "
        "results, exclusions, residual findings. Review record: artefact, version, reviewer, date, "
        "checklist, findings, actions, conclusion. Acceptance is a human decision; criteria only support "
        "it.\n", encoding="utf-8")
    (DOCS / "EVIDENCE_STATUS_MODEL.md").write_text(
        "# Evidence status model\n\nPlanned < Requested < In Preparation < Available < Validated < "
        "Reviewed < Accepted; Rejected/Obsolete/Superseded/Missing/Not Applicable/Applicability Pending "
        "are independent states. A file existing is never automatically Accepted.\n", encoding="utf-8")
    (DOCS / "SVR_EVIDENCE_MAPPING.md").write_text(
        "# SVR evidence mapping\n\nEach evidence row carries an SVR destination (currently 'SVR Section "
        "TBD' until authoritative SVR structure is provided). Mapping approach: category -> SVR section "
        "per ECSS-informed templates; pending authoritative references.\n", encoding="utf-8")
    (DOCS / "DJF_EVIDENCE_MAPPING.md").write_text(
        "# DJF evidence mapping\n\nDJF destinations are per-evidence (currently 'Not indexed'); the DJF "
        "index is generated only after authoritative documents are identified.\n", encoding="utf-8")
    (DOCS / "WEEK_2_IMPLEMENTATION_REPORT.md").write_text(
        f"# Week 2 implementation report\n\nGenerated Verification Evidence Plan + matrices + "
        f"inventory ({len(artefacts)} artefacts, SHA-256), gaps ({len(gaps)}), actions "
        f"({len(actions)}). Gate: automatic Not Assessable due to missing authoritative SVerP and "
        "Week-1 baseline. No evidence auto-accepted; no source documents modified.\n", encoding="utf-8")

    print(json.dumps({
        "artefacts": len(artefacts), "evidence": len(evidence), "gaps": len(gaps),
        "actions": len(actions), "gate": "Not Assessable", "output": str(PLAN_DIR),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
