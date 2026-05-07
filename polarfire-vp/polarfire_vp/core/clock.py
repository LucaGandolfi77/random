"""Logical clock and tick subscription support."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


class TickSubscriber(Protocol):
    def on_tick(self, delta: int, now: int) -> None:
        """Receive a logical-time update."""


@dataclass(slots=True)
class LogicalClock:
    ticks: int = 0
    _subscribers: list[TickSubscriber] = field(init=False, default_factory=list)

    def register(self, subscriber: TickSubscriber) -> None:
        if subscriber not in self._subscribers:
            self._subscribers.append(subscriber)

    def reset(self) -> None:
        self.ticks = 0

    def advance(self, delta: int = 1) -> int:
        self.ticks += delta
        for subscriber in tuple(self._subscribers):
            subscriber.on_tick(delta, self.ticks)
        return self.ticks
