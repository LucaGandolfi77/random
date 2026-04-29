"""Retry helpers with exponential backoff."""

from __future__ import annotations

import asyncio
import time
from typing import Awaitable, Callable, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def call_with_retry(
    operation: Callable[P, R],
    *args: P.args,
    retries: int,
    backoff_seconds: float,
    retry_on: tuple[type[BaseException], ...],
    on_retry: Callable[[int, float, BaseException], None] | None = None,
    **kwargs: P.kwargs,
) -> R:
    """Execute an operation with exponential backoff."""

    attempt = 0
    while True:
        try:
            return operation(*args, **kwargs)
        except retry_on as error:
            if attempt >= retries:
                raise
            delay = backoff_seconds * (2**attempt)
            attempt += 1
            if on_retry is not None:
                on_retry(attempt, delay, error)
            time.sleep(delay)


async def async_call_with_retry(
    operation: Callable[P, Awaitable[R]],
    *args: P.args,
    retries: int,
    backoff_seconds: float,
    retry_on: tuple[type[BaseException], ...],
    on_retry: Callable[[int, float, BaseException], None] | None = None,
    **kwargs: P.kwargs,
) -> R:
    """Execute an async operation with exponential backoff."""

    attempt = 0
    while True:
        try:
            return await operation(*args, **kwargs)
        except retry_on as error:
            if attempt >= retries:
                raise
            delay = backoff_seconds * (2**attempt)
            attempt += 1
            if on_retry is not None:
                on_retry(attempt, delay, error)
            await asyncio.sleep(delay)
