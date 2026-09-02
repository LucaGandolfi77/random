"""Deterministic check registry.

Checks are pure functions ``(AnalysisContext) -> list[CheckResult]`` executed
in the order below. Run-to-run and machine-to-machine ordering stability is
guaranteed by this fixed registry plus stable result sorting in the service.
"""

from collections.abc import Callable

from app.analyzers.context import SCORE_CATEGORIES, AnalysisContext, CheckResult

CheckFunction = Callable[[AnalysisContext], list[CheckResult]]

_CATEGORY_ORDER = {name: idx for idx, name in enumerate(SCORE_CATEGORIES)}


def category_rank(category: str) -> int:
    return _CATEGORY_ORDER.get(category, len(_CATEGORY_ORDER))


def _structure(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import structure

    return structure.run(ctx)


def _completeness(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import completeness

    return completeness.run(ctx)


def _duplicates(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import duplicates

    return duplicates.run(ctx)


def _numerical(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import numerical

    return numerical.run(ctx)


def _categorical(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import categorical

    return categorical.run(ctx)


def _target(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import target

    return target.run(ctx)


def _temporal(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import temporal

    return temporal.run(ctx)


def _leakage(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import leakage

    return leakage.run(ctx)


def _traceability(ctx: AnalysisContext) -> list[CheckResult]:
    from app.analyzers import traceability

    return traceability.run(ctx)


REGISTRY: list[CheckFunction] = [
    _structure,
    _completeness,
    _duplicates,
    _numerical,
    _categorical,
    _target,
    _temporal,
    _leakage,
    _traceability,
]
