"""Dataset service: validation, parsing, metadata and previews."""

import io
from datetime import date, datetime
from typing import Any

import pandas as pd

from app.analyzers.context import build_column_profile
from app.core.config import Settings
from app.schemas.api import ColumnInfo
from app.schemas.enums import OperatingContext  # noqa: F401  (re-export for tests)
from app.services.storage import StoredFile

_ACCEPTED_MIME = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/octet-stream",
}
_PREVIEW_MAX_LIMIT = 500
_ENCODINGS = ("utf-8-sig", "utf-8", "latin-1")


class DatasetValidationError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _expected_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_upload(filename: str, content_type: str | None, settings: Settings) -> None:
    ext = _expected_extension(filename)
    if ext not in settings.allowed_upload_extensions_set:
        raise DatasetValidationError(
            "INVALID_EXTENSION", f"Only {', '.join(sorted(settings.allowed_upload_extensions_set))} files are accepted."
        )
    if content_type and content_type.split(";")[0].strip() not in _ACCEPTED_MIME:
        raise DatasetValidationError("INVALID_CONTENT_TYPE", f"Content type '{content_type}' is not accepted.")
    if not filename or not filename.strip():
        raise DatasetValidationError("INVALID_FILENAME", "The uploaded file has no name.")


def read_csv_bytes(data: bytes) -> pd.DataFrame:
    """Parse CSV bytes. Never executes content; no formulas are evaluated."""
    if b"\x00" in data:
        raise DatasetValidationError("INVALID_CSV", "File contains binary content and cannot be parsed as CSV.")
    last_error: Exception | None = None
    for encoding in _ENCODINGS:
        try:
            df = pd.read_csv(io.BytesIO(data), encoding=encoding, engine="python")
            return df
        except (UnicodeDecodeError, pd.errors.ParserError) as exc:
            last_error = exc
            continue
    raise DatasetValidationError("INVALID_CSV", f"File could not be parsed as CSV ({last_error.__class__.__name__}).")


def validate_dataset_content(df: pd.DataFrame) -> None:
    if len(df.columns) == 0:
        raise DatasetValidationError("EMPTY_DATASET", "The CSV has no columns.")
    if len(df) == 0:
        raise DatasetValidationError("EMPTY_DATASET", "The CSV has no data rows.")
    if df.shape[1] > 5000:
        raise DatasetValidationError("TOO_MANY_COLUMNS", "The CSV exceeds the supported column count (5000).")


def build_columns_metadata(df: pd.DataFrame) -> tuple[list[ColumnInfo], list[dict]]:
    """Return Pydantic column infos and JSON-safe raw dicts for persistence."""
    infos: list[ColumnInfo] = []
    for idx, col in enumerate(df.columns):
        profile = build_column_profile(str(col), idx, df[col])
        info = ColumnInfo(
            name=str(col),
            index=idx,
            inferred_type=profile.inferred_type,
            missing_count=profile.missing_count,
            missing_pct=profile.missing_pct,
            unique_count=profile.unique_count,
            non_null_count=profile.non_null_count,
        )
        infos.append(info)
    raw = [info.model_dump() for info in infos]
    return infos, raw


def stored_to_df(path: Any) -> pd.DataFrame:
    """Read a stored dataset file back into a DataFrame (same rules as upload)."""
    from pathlib import Path

    data = Path(path).read_bytes()
    return read_csv_bytes(data)


def _json_safe(value: Any) -> Any:
    """Convert numpy/pandas scalar values to JSON-safe primitives."""
    if value is None:
        return None
    if isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, pd.Timestamp):
        return None if value is pd.NaT else value.isoformat()
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    import numpy as np

    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return str(value)


def build_preview(
    df: pd.DataFrame, infos: list[ColumnInfo], limit: int = 100
) -> tuple[list[list[Any]], bool, dict[str, int]]:
    cap = max(1, min(limit, _PREVIEW_MAX_LIMIT))
    truncated = len(df) > cap
    head = df.head(cap)
    rows: list[list[Any]] = []
    for _, row in head.iterrows():
        rows.append([_json_safe(value) for value in row.tolist()])
    dtypes_summary: dict[str, int] = {}
    for info in infos:
        dtypes_summary[info.inferred_type] = dtypes_summary.get(info.inferred_type, 0) + 1
    return rows, truncated, dtypes_summary


def describe_upload(stored: StoredFile) -> dict[str, Any]:
    """Persistence-friendly dataset metadata from a parsed upload."""
    df = read_csv_bytes(stored.path.read_bytes())
    validate_dataset_content(df)
    infos, raw = build_columns_metadata(df)
    return {
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns_raw": raw,
    }
