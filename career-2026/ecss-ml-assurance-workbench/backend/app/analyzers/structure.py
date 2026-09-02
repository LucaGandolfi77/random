"""Structure checks: shape, empty cells/columns, names, constant columns."""

from app.analyzers.context import (
    TYPE_BOOLEAN,
    TYPE_CATEGORICAL,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_TEXT,
    AnalysisContext,
    CheckResult,
    fmt,
    pct_str,
)
from app.schemas.enums import FindingStatus, Severity

_EMPTY_NAME_PREFIXES = ("unnamed",)
_CONSTANT_SEVERITY = Severity.LOW
_QUASI_CONSTANT_SEVERITY = Severity.LOW


def _empty_columns(ctx: AnalysisContext) -> CheckResult:
    empty = [p.name for p in ctx.profiles if p.non_null_count == 0]
    if empty:
        return CheckResult(
            check_id="struct.empty_columns",
            category="Structure",
            title="Fully empty columns",
            description="One or more columns contain no values at all.",
            status=FindingStatus.FAIL,
            severity=Severity.MEDIUM,
            observed_value=", ".join(empty),
            threshold="0 empty columns expected",
            columns=empty,
            evidence={"empty_columns": empty},
            risk="Empty columns carry no information and may indicate parsing or acquisition faults.",
            recommendation="Review acquisition; drop the column or fix the source export.",
        )
    return CheckResult(
        check_id="struct.empty_columns",
        category="Structure",
        title="Fully empty columns",
        description="No column is completely empty.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0",
        threshold="0",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def _empty_rows(ctx: AnalysisContext) -> CheckResult:
    df = ctx.df
    all_na = df.isna().all(axis=1).sum()
    pct = all_na / ctx.row_count if ctx.row_count else 0.0
    if all_na:
        return CheckResult(
            check_id="struct.empty_rows",
            category="Structure",
            title="Fully empty rows",
            description="Rows where every column is missing.",
            status=FindingStatus.WARNING,
            severity=Severity.MEDIUM,
            observed_value=f"{all_na} rows ({pct_str(pct)})",
            threshold="0 fully empty rows expected",
            columns=[p.name for p in ctx.profiles],
            evidence={"empty_row_count": int(all_na), "empty_row_pct": round(100 * pct, 2)},
            risk="Empty rows usually indicate export problems or sensor dropouts.",
            recommendation="Remove or repair fully empty rows after confirming the source.",
        )
    return CheckResult(
        check_id="struct.empty_rows",
        category="Structure",
        title="Fully empty rows",
        description="No row is completely empty.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0",
        threshold="0",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def _duplicate_column_names(ctx: AnalysisContext) -> CheckResult:
    df = ctx.df
    original = df.columns.tolist()
    seen: dict[str, int] = {}
    duplicates: list[str] = []
    for name in original:
        seen[name] = seen.get(name, 0) + 1
    duplicates = [name for name, count in seen.items() if count > 1]
    if duplicates:
        return CheckResult(
            check_id="struct.duplicate_column_names",
            category="Structure",
            title="Duplicate column names",
            description="The file contains columns with identical names; pandas disambiguated them with suffixes.",
            status=FindingStatus.WARNING,
            severity=Severity.MEDIUM,
            observed_value=", ".join(duplicates),
            threshold="unique column names expected",
            columns=duplicates,
            evidence={"duplicated_names": duplicates},
            risk="Duplicate names break traceability between schema and downstream consumers.",
            recommendation="Rename columns to unique identifiers before ingestion.",
        )
    return CheckResult(
        check_id="struct.duplicate_column_names",
        category="Structure",
        title="Duplicate column names",
        description="All column names are unique.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0 duplicates",
        threshold="0",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def _invalid_column_names(ctx: AnalysisContext) -> CheckResult:
    bad: list[str] = []
    for p in ctx.profiles:
        name = p.name.strip().lower()
        if not name or p.name.strip() != p.name or name.startswith(_EMPTY_NAME_PREFIXES):
            bad.append(p.name)
    if bad:
        return CheckResult(
            check_id="struct.invalid_column_names",
            category="Structure",
            title="Empty or invalid column names",
            description="Columns with empty, whitespace-padded or auto-generated names were found.",
            status=FindingStatus.WARNING,
            severity=Severity.LOW,
            observed_value=", ".join(bad),
            threshold="well-formed non-empty names expected",
            columns=bad,
            evidence={"invalid_names": bad},
            risk="Ambiguous names complicate schemas and automated tooling.",
            recommendation="Rename columns explicitly in the source file.",
        )
    return CheckResult(
        check_id="struct.invalid_column_names",
        category="Structure",
        title="Empty or invalid column names",
        description="All column names are non-empty and well-formed.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0",
        threshold="0",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def _constant_columns(ctx: AnalysisContext) -> CheckResult:
    constant = [p.name for p in ctx.profiles if p.non_null_count > 0 and p.unique_count == 1]
    if constant:
        return CheckResult(
            check_id="struct.constant_columns",
            category="Structure",
            title="Constant columns",
            description="Columns that take a single value provide no discriminative information.",
            status=FindingStatus.WARNING,
            severity=_CONSTANT_SEVERITY,
            observed_value=", ".join(constant),
            threshold="0 constant columns expected",
            columns=constant,
            evidence={"constant_columns": constant},
            risk="Constant features add no information and can mislead downstream feature selection.",
            recommendation="Confirm the column is truly constant in the operational domain; otherwise remove it.",
        )
    return CheckResult(
        check_id="struct.constant_columns",
        category="Structure",
        title="Constant columns",
        description="No constant column detected.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0",
        threshold="0",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def _quasi_constant_columns(ctx: AnalysisContext) -> CheckResult:
    threshold = float(ctx.config.get("quasi_constant_threshold_pct", 98.0))
    quasi: list[str] = []
    evidence: list[dict] = []
    for p in ctx.profiles:
        if p.categorical and p.unique_count > 1 and p.dominant_pct >= threshold:
            quasi.append(p.name)
            evidence.append({"column": p.name, "dominant_value": p.dominant_value, "dominant_pct": p.dominant_pct})
    if quasi:
        return CheckResult(
            check_id="struct.quasi_constant_columns",
            category="Structure",
            title="Quasi-constant columns",
            description=f"Columns where a single category represents at least {fmt(threshold, 0)}% of values.",
            status=FindingStatus.WARNING,
            severity=_QUASI_CONSTANT_SEVERITY,
            observed_value=", ".join(quasi),
            threshold=f"dominant category < {fmt(threshold, 0)}%",
            columns=quasi,
            evidence={"columns": evidence, "dominant_threshold_pct": threshold},
            risk="Near-constant features can hide rare events or dominate learning trivially.",
            recommendation="Engineering review required: confirm whether rare categories are expected in this regime.",
        )
    return CheckResult(
        check_id="struct.quasi_constant_columns",
        category="Structure",
        title="Quasi-constant columns",
        description="No quasi-constant column detected.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0",
        threshold=f"dominant category < {fmt(threshold, 0)}%",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def _type_compat(ctx: AnalysisContext) -> CheckResult:
    """Values not compatible with the prevailing column type (Consistency)."""
    issues: list[dict] = []
    for p in ctx.profiles:
        if p.type_compat_issues:
            issues.append(
                {
                    "column": p.name,
                    "incompatible_count": p.type_compat_issues,
                    "examples": p.sample_type_issue_values,
                }
            )
    if issues:
        cols = [i["column"] for i in issues]
        return CheckResult(
            check_id="consistency.type_compat_values",
            category="Consistency",
            title="Values incompatible with the inferred type",
            description="Columns whose prevailing type is numeric contain non-numeric tokens.",
            status=FindingStatus.WARNING,
            severity=Severity.MEDIUM,
            observed_value=", ".join(f"{i['column']}: {i['incompatible_count']}" for i in issues),
            threshold="0 incompatible values expected",
            columns=cols,
            evidence={"columns": issues},
            risk="Type mismatches often encode acquisition errors, calibration flags or missing-value sentinels.",
            recommendation="Inspect examples and replace sentinels with explicit missing-value handling.",
        )
    return CheckResult(
        check_id="consistency.type_compat_values",
        category="Consistency",
        title="Values incompatible with the inferred type",
        description="No value is incompatible with its inferred column type.",
        status=FindingStatus.PASS,
        severity=Severity.INFO,
        observed_value="0",
        threshold="0",
        columns=[],
        evidence={},
        risk="",
        recommendation="",
    )


def run(ctx: AnalysisContext) -> list[CheckResult]:
    checks: list[CheckResult] = []
    type_counts: dict[str, int] = {}
    for p in ctx.profiles:
        type_counts[p.inferred_type] = type_counts.get(p.inferred_type, 0) + 1
    checks.append(
        CheckResult(
            check_id="struct.row_count",
            category="Structure",
            title="Dataset row count",
            description="Number of rows in the dataset.",
            status=FindingStatus.PASS if ctx.row_count else FindingStatus.FAIL,
            severity=Severity.INFO if ctx.row_count else Severity.HIGH,
            observed_value=str(ctx.row_count),
            threshold="> 0 rows",
            columns=[],
            evidence={"row_count": ctx.row_count},
            risk="An empty dataset cannot support model verification.",
            recommendation="Provide a dataset with at least one data row.",
        )
    )
    checks.append(
        CheckResult(
            check_id="struct.column_count",
            category="Structure",
            title="Dataset column count",
            description="Number of columns in the dataset.",
            status=FindingStatus.PASS if ctx.column_count else FindingStatus.FAIL,
            severity=Severity.INFO if ctx.column_count else Severity.HIGH,
            observed_value=str(ctx.column_count),
            threshold="> 0 columns",
            columns=[],
            evidence={"column_count": ctx.column_count},
            risk="A dataset without columns cannot be analysed.",
            recommendation="Verify the CSV header is present.",
        )
    )
    type_counts_display = {
        TYPE_INTEGER: type_counts.get(TYPE_INTEGER, 0),
        TYPE_FLOAT: type_counts.get(TYPE_FLOAT, 0),
        TYPE_BOOLEAN: type_counts.get(TYPE_BOOLEAN, 0),
        TYPE_CATEGORICAL: type_counts.get(TYPE_CATEGORICAL, 0),
        TYPE_TEXT: type_counts.get(TYPE_TEXT, 0),
        TYPE_DATETIME: type_counts.get(TYPE_DATETIME, 0),
    }
    checks.append(
        CheckResult(
            check_id="struct.inferred_types",
            category="Structure",
            title="Inferred column types",
            description="Distribution of automatically inferred column types.",
            status=FindingStatus.PASS,
            severity=Severity.INFO,
            observed_value=str(type_counts_display),
            threshold="informational",
            columns=[p.name for p in ctx.profiles],
            evidence={"type_counts": type_counts_display},
            risk="Inferred types are a starting point and must be confirmed by engineering.",
            recommendation="Review inferred types on the Dataset page before analysis.",
        )
    )
    checks.append(_empty_columns(ctx))
    checks.append(_empty_rows(ctx))
    checks.append(_duplicate_column_names(ctx))
    checks.append(_invalid_column_names(ctx))
    checks.append(_constant_columns(ctx))
    checks.append(_quasi_constant_columns(ctx))
    checks.append(_type_compat(ctx))
    return checks
