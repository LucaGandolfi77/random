"""Categorical checks: cardinality, dominant and rare categories."""

from app.analyzers.context import AnalysisContext, CheckResult, fmt
from app.schemas.enums import FindingStatus, Severity


def _categorical_checks(ctx: AnalysisContext) -> list[CheckResult]:
    results: list[CheckResult] = []
    rare_threshold = float(ctx.config.get("rare_category_threshold_pct", 1.0))
    dominant_threshold = float(ctx.config.get("dominant_category_threshold_pct", 90.0))
    cardinality_ratio = float(ctx.config.get("high_cardinality_ratio", 0.5))
    categorical = [p for p in ctx.profiles if p.categorical]
    for p in categorical:
        series = ctx.df[p.name]
        counts = series.value_counts(dropna=True)
        rare = int((counts / p.non_null_count * 100.0 < rare_threshold).sum()) if p.non_null_count else 0
        issues: list[str] = []
        evidence: dict = {
            "column": p.name,
            "category_count": p.category_count,
            "dominant_pct": p.dominant_pct,
            "rare_category_count": rare,
        }
        if p.dominant_pct >= dominant_threshold:
            issues.append("dominant")
            evidence["dominant_value"] = p.dominant_value
        if rare:
            issues.append("rare")
        if p.unique_ratio >= cardinality_ratio or p.category_count >= 1000:
            issues.append("cardinality")
            evidence["unique_ratio"] = p.unique_ratio
        if issues:
            results.append(
                CheckResult(
                    check_id="categorical.quality",
                    category="Statistical Quality",
                    title=f"Categorical quality: {p.name}",
                    description=(
                        "High dominance, rare categories or high cardinality detected in the categorical column."
                    ),
                    status=FindingStatus.WARNING,
                    severity=Severity.LOW,
                    observed_value=(
                        f"{p.category_count} categories; dominant {p.dominant_pct:.2f}%; "
                        f"{rare} rare (< {fmt(rare_threshold, 0)}%)"
                    ),
                    threshold=(
                        f"dominant < {fmt(dominant_threshold, 0)}%; "
                        f"rare < {fmt(rare_threshold, 0)}%; unique ratio < {fmt(cardinality_ratio, 2)}"
                    ),
                    columns=[p.name],
                    evidence={"columns": [evidence], "flags": issues},
                    risk="Extreme categorical distributions can hide rare events or leak identifiers.",
                    recommendation=(
                        "Engineering review: decide on category merging, rare-class handling or dropping the column."
                    ),
                )
            )
        else:
            top = counts.head(3).to_dict()
            results.append(
                CheckResult(
                    check_id="categorical.profile",
                    category="Statistical Quality",
                    title=f"Categorical profile: {p.name}",
                    description="Category counts look balanced enough for this stage.",
                    status=FindingStatus.PASS,
                    severity=Severity.INFO,
                    observed_value=f"{p.category_count} categories",
                    threshold="informational",
                    columns=[p.name],
                    evidence={
                        "column": p.name,
                        "category_count": p.category_count,
                        "top_categories": {str(k): int(v) for k, v in top.items()},
                    },
                    risk="",
                    recommendation="",
                )
            )
    if not categorical:
        results.append(
            CheckResult(
                check_id="categorical.profile",
                category="Statistical Quality",
                title="Categorical columns",
                description="No categorical column found in the dataset.",
                status=FindingStatus.NOT_APPLICABLE,
                severity=Severity.INFO,
                observed_value="0 categorical columns",
                threshold="",
                columns=[],
                evidence={"categorical_columns": 0},
                risk="",
                recommendation="",
            )
        )
    return results


def run(ctx: AnalysisContext) -> list[CheckResult]:
    return _categorical_checks(ctx)
