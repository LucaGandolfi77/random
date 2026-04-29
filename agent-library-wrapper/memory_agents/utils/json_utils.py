"""JSON parsing and validation helpers."""

from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

SchemaT = TypeVar("SchemaT", bound=BaseModel)


def safe_json_dumps(value: Any) -> str:
    """Serialize arbitrary Python values into pretty JSON."""

    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


def extract_json_object(text: str) -> str:
    """Extract the first likely JSON object from model output."""

    stripped = text.strip()
    if not stripped:
        raise ValueError("Cannot parse JSON from an empty response.")

    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped

    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1).strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        return stripped[start : end + 1]

    raise ValueError("Could not extract a JSON object from the response.")


def parse_model_response(text: str, model: type[SchemaT]) -> SchemaT:
    """Parse a model response into a validated Pydantic model."""

    try:
        return model.model_validate_json(text)
    except ValidationError:
        payload = json.loads(extract_json_object(text))
        return model.model_validate(payload)
    except json.JSONDecodeError as error:
        raise ValueError(f"Failed to decode structured response: {error}") from error
