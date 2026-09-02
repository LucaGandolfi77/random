"""Week-3 demo project content registry (synthetic)."""

from app.portfolio.datadefs.lls import PROJECT as LLS
from app.portfolio.datadefs.qnt import PROJECT as QNT
from app.portfolio.datadefs.seu import PROJECT as SEU
from app.portfolio.datadefs.tad import PROJECT as TAD

PROJECTS: list[dict] = [TAD, QNT, SEU, LLS]

__all__ = ["PROJECTS"]
