"""Leakage heuristics.

Every finding in this module is explicitly heuristic: it flags candidates for
engineering review and never claims that leakage is certain.

No raw dataset row is ever stored in evidence — only column names, counts and
derived statistics.
"""

import difflib

import pandas as pd

from app.analyzers.context import AnalysisContext, CheckResult
from app.schemas.enums import FindingStatus, Severity

POST_EVENT_HINTS = (
    "result",
    "outcome",
    "prediction",
    "occurred",
    "after_event",
    "diagnosis",
    "fault_flag",
    "maintenance_flag",
    "label_final",
    "is_failure",
    "has_failed",
)

_HEURISTIC_NOTE = "Potential leakage indicator requiring engineering review."


def _target_not_configured(ctx: AnalysisContext) -> CheckResult:
    return CheckResult(
        check_id="leakage.target_not_configured",
        category="Consistency",
        title="Leakage heuristics require a target",
        description="Target-based leakage heuristics were not evaluated because no target column is configured.",
        status=FindingStatus.NOT_APPLICABLE,
        severity=Severity.INFO,
        observed_value="",
        threshold="",
        columns=[],
        evidence={},
        risk="",
        recommendation="Select a target column to enable leakage screening.",
    )


def _excluded_columns(ctx: AnalysisContext) -> set[str]:
    excluded = {ctx.target_column, ctx.id_column, ctx.timestamp_column}
    return {c for c in excluded if c}


def _identical_to_target(ctx: AnalysisContext) -> list[CheckResult]:
    target = ctx.target_column
    if not target or target not in ctx.df.columns:
        return []
    results: list[CheckResult] = []
    target_series = ctx.df[target]
    target_clean = pd.to_numeric(target_series, errors="coerce")
    target_is_numeric = target_clean.notna().mean() >= 0.99
    for p in ctx.profiles:
        if p.name == target or p.name in _excluded_columns(ctx):
            continue
        other = ctx.df[p.name]
        try:
            if target_is_numeric and (p.inferred_type == "integer" or p.inferred_type == "float"):
                other_clean = pd.to_numeric(other, errors="coerce")
                mask = target_clean.notna() & other_clean.notna()
                if int(mask.sum()) == 0:
                    continue
                exact_ratio = float((target_clean[mask] == other_clean[mask]).mean())
            else:
                mask = target_series.notna() & other.notna()
                if int(mask.sum()) == 0:
                    continue
                exact_ratio = float((target_series[mask].astype(str) == other[mask].astype(str)).mean())
        except (TypeError, ValueError):
            continue
        if exact_ratio >= 0.9999:
            results.append(
                CheckResult(
                    check_id="leakage.identical_to_target",
                    category="Consistency",
                    title=f"Column nearly identical to target: {p.name}",
                    description="A feature column matches the target column on essentially every row.",
                    status=FindingStatus.FAIL,
                    severity=Severity.HIGH,
                    observed_value=f"match ratio {exact_ratio:.4f}",
                    threshold="< 0.9999",
                    columns=[p.name],
                    evidence={"column": p.name, "match_ratio": round(exact_ratio, 4), "heuristic": True},
                    risk="A feature that already contains the answer makes verification results meaningless.",
                    recommendation=_HEURISTIC_NOTE + " Remove or re-label the column before modelling.",
                )
            )
        elif exact_ratio >= 0.99:
            results.append(
                CheckResult(
                    check_id="leakage.near_identical_to_target",
                    category="Consistency",
                    title=f"Column almost identical to target: {p.name}",
                    description="A feature column matches the target on almost every row.",
                    status=FindingStatus.WARNING,
                    severity=Severity.HIGH,
                    observed_value=f"match ratio {exact_ratio:.4f}",
                    threshold="< 0.99",
                    columns=[p.name],
                    evidence={"column": p.name, "match_ratio": round(exact_ratio, 4), "heuristic": True},
                    risk="Near-identical features can still encode the target.",
                    recommendation=_HEURISTIC_NOTE,
                )
            )
    return results


def _name_similar_to_target(ctx: AnalysisContext) -> list[CheckResult]:
    target = ctx.target_column or ""
    if not target or target not in ctx.df.columns:
        return []
    results: list[CheckResult] = []
    normalized_target = target.lower().replace("_", " ").strip()
    for p in ctx.profiles:
        if p.name == target:
            continue
        name = p.name.lower().replace("_", " ").strip()
        if name == normalized_target:
            continue
        contained = normalized_target in name or name in normalized_target
        ratio = difflib.SequenceMatcher(None, normalized_target, name).ratio()
        if contained or ratio >= 0.85:
            results.append(
                CheckResult(
                    check_id="leakage.name_similar_to_target",
                    category="Consistency",
                    title=f"Column name resembles target: {p.name}",
                    description="A column name is similar to or contains the target name.",
                    status=FindingStatus.WARNING,
                    severity=Severity.HIGH,
                    observed_value=f"similarity {ratio:.2f}" if not contained else "name contains target",
                    threshold="< 0.85 similarity and no overlap",
                    columns=[p.name],
                    evidence={
                        "column": p.name,
                        "similarity": round(ratio, 2),
                        "contained": contained,
                        "heuristic": True,
                    },
                    risk="The column may carry post-event information about the target.",
                    recommendation=_HEURISTIC_NOTE,
                )
            )
    return results


def _post_event_columns(ctx: AnalysisContext) -> CheckResult:
    target = ctx.target_column or ""
    flagged: list[str] = []
    for p in ctx.profiles:
        name = p.name.lower()
        if p.name in _excluded_columns(ctx):
            continue
        if any(hint in name for hint in POST_EVENT_HINTS):
            flagged.append(p.name)
    if not flagged:
        return CheckResult(
            check_id="leakage.post_event_columns",
            category="Consistency",
            title="Post-event / result-like columns",
            description="No column name suggests post-event outcome information.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0",
            threshold="0",
            columns=[],
            evidence={"flagged_columns": [], "heuristic": True, "target": target},
            risk="",
            recommendation="",
        )
    return CheckResult(
        check_id="leakage.post_event_columns",
        category="Consistency",
        title="Possible post-event / result-like columns",
        description="Column names suggest outcomes that may be known only after the event to predict.",
        status=FindingStatus.WARNING,
        severity=Severity.HIGH,
        observed_value=", ".join(flagged),
        threshold="no result-like column names",
        columns=flagged,
        evidence={"flagged_columns": flagged, "heuristic": True, "target": target},
        risk="Such columns may encode the future answer.",
        recommendation=_HEURISTIC_NOTE,
    )


def _unique_identifier_features(ctx: AnalysisContext) -> CheckResult:
    flagged: list[dict] = []
    for p in ctx.profiles:
        if p.name in _excluded_columns(ctx):
            continue
        if p.non_null_count >= 100 and p.unique_count / p.non_null_count >= 0.99:
            flagged.append({"column": p.name, "unique_ratio": round(p.unique_count / p.non_null_count, 4)})
    if not flagged:
        return CheckResult(
            check_id="leakage.unique_identifier_features",
            category="Consistency",
            title="Unique-identifier-like features",
            description="No feature looks like a row-unique identifier.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value="0",
            threshold="0",
            columns=[],
            evidence={"flagged_columns": [], "heuristic": True},
            risk="",
            recommendation="",
        )
    return CheckResult(
        check_id="leakage.unique_identifier_features",
        category="Consistency",
        title="Unique-identifier-like features",
        description="Features that are unique per row may be row identifiers rather than predictive signals.",
        status=FindingStatus.WARNING,
        severity=Severity.LOW,
        observed_value=", ".join(f["column"] for f in flagged),
        threshold="unique ratio < 0.99",
        columns=[f["column"] for f in flagged],
        evidence={"flagged_columns": flagged, "heuristic": True},
        risk="Identifier columns used as features can memorise training rows.",
        recommendation="Move such columns to metadata or exclude them from modelling.",
    )


def _high_correlation_with_numeric_target(ctx: AnalysisContext) -> list[CheckResult]:
    target = ctx.target_column or ""
    if not target or target not in ctx.df.columns:
        return []
    target_series = pd.to_numeric(ctx.df[target], errors="coerce")
    if target_series.notna().mean() < 0.99:
        return []
    flagged: list[dict] = []
    numeric_cols = [p.name for p in ctx.profiles if p.inferred_type in ("integer", "float") and p.name != target]
    if not numeric_cols:
        return []
    matrix = ctx.df[[target, *numeric_cols]].apply(pd.to_numeric, errors="coerce")
    corr = matrix.corr()[target].drop(labels=[target]).abs()
    for col, value in corr.items():
        value = float(value)
        if value >= 0.99:
            flagged.append({"column": str(col), "abs_correlation": round(value, 4)})
    if not flagged:
        return [
            CheckResult(
                check_id="leakage.high_correlation_target",
                category="Consistency",
                title="High correlation with numeric target",
                description="No numeric feature is almost perfectly correlated with the target.",
                status=FindingStatus.PASS,
                severity=Severity.INFO,
                observed_value="0",
                threshold="abs(corr) < 0.99",
                columns=[],
                evidence={"flagged_columns": [], "heuristic": True},
                risk="",
                recommendation="",
            )
        ]
    return [
        CheckResult(
            check_id="leakage.high_correlation_target",
            category="Consistency",
            title="Very high correlation with numeric target",
            description="One or more numeric features are almost perfectly correlated with the target.",
            status=FindingStatus.WARNING,
            severity=Severity.HIGH,
            observed_value=", ".join(f["column"] for f in flagged),
            threshold="abs(correlation) < 0.99",
            columns=[f["column"] for f in flagged],
            evidence={"flagged_columns": flagged, "heuristic": True},
            risk="Nearly perfect correlation may indicate the feature is derived from the target.",
            recommendation=_HEURISTIC_NOTE,
        )
    ]


def run(ctx: AnalysisContext) -> list[CheckResult]:
    if not ctx.target_column:
        results: list[CheckResult] = [_target_not_configured(ctx)]
        results.append(_post_event_columns(ctx))
        results.append(_unique_identifier_features(ctx))
        return results
    target_results: list[CheckResult] = []
    target_results.extend(_identical_to_target(ctx))
    target_results.extend(_name_similar_to_target(ctx))
    target_results.append(_post_event_columns(ctx))
    target_results.append(_unique_identifier_features(ctx))
    target_results.extend(_high_correlation_with_numeric_target(ctx))
    return target_results
