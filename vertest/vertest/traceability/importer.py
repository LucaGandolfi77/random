from __future__ import annotations

import csv
from pathlib import Path
from typing import Optional

from vertest.traceability.model import Requirement


class RequirementImporter:
    """Imports requirements from CSV and other formats."""

    @staticmethod
    def from_csv(file_path: str | Path) -> list[Requirement]:
        reqs: list[Requirement] = []
        with open(file_path, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                req = Requirement(
                    req_id=row.get("id", row.get("req_id", "")),
                    title=row.get("title", row.get("name", "")),
                    description=row.get("description", row.get("desc", "")),
                )
                reqs.append(req)
        return reqs

    @staticmethod
    def from_yaml(file_path: str | Path) -> list[Requirement]:
        import yaml
        with open(file_path) as f:
            data = yaml.safe_load(f)
        reqs: list[Requirement] = []
        if isinstance(data, list):
            for item in data:
                req = Requirement(
                    req_id=item.get("id", ""),
                    title=item.get("title", ""),
                    description=item.get("description", ""),
                )
                reqs.append(req)
        return reqs
