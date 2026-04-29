"""Structured logging helpers."""

from __future__ import annotations

import json
import logging
from typing import Any


class JsonFormatter(logging.Formatter):
    """Small JSON log formatter with consistent English keys."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "event"):
            payload["event"] = getattr(record, "event")
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def get_logger(name: str = "memory_agents", level: int = logging.INFO) -> logging.Logger:
    """Return a library logger configured with a JSON formatter."""

    logger = logging.getLogger(name)
    if logger.handlers:
        logger.setLevel(level)
        return logger

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    return logger
