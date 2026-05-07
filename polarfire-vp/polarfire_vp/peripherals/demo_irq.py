"""Clock-driven external IRQ source used by the example demo."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from polarfire_vp.peripherals.base import Peripheral


@dataclass(slots=True)
class DemoIrqEvent:
    tick: int
    irq: int
    target_harts: set[int]
    fired: bool = False


class DemoIrqPeripheral(Peripheral):
    CURRENT_TICK = 0x00
    FIRED_MASK = 0x08
    EVENT_COUNT = 0x0C

    def __init__(self, *, name: str, size: int, events: Iterable[dict] | None = None):
        super().__init__(name=name, size=size, irq=None)
        raw_events = list(events or ())
        self._events = [
            DemoIrqEvent(
                tick=int(item.get("tick", 0)),
                irq=int(item["irq"]),
                target_harts={int(hart_id) for hart_id in item.get("target_harts", [])},
            )
            for item in raw_events
        ]
        self.current_tick = 0
        self.fired_mask = 0

    def reset(self) -> None:
        self.current_tick = 0
        self.fired_mask = 0
        for event in self._events:
            event.fired = False

    def on_tick(self, delta: int, now: int) -> None:
        self.current_tick = now
        controller = self.machine.peripherals.get("plic") if self.machine is not None else None
        if controller is None:
            return
        for index, event in enumerate(self._events):
            if event.fired or now < event.tick:
                continue
            event.fired = True
            self.fired_mask |= 1 << index
            controller.raise_irq(event.irq, target_harts=event.target_harts)
            if self.log_accesses:
                self.logger.info(
                    "event %d fired tick=%d irq=%d targets=%s",
                    index,
                    now,
                    event.irq,
                    sorted(event.target_harts),
                )

    def read(self, offset: int, size: int) -> bytes:
        if offset == self.CURRENT_TICK:
            value = self.current_tick
        elif offset == self.FIRED_MASK:
            value = self.fired_mask
        elif offset == self.EVENT_COUNT:
            value = len(self._events)
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if offset == self.FIRED_MASK:
            self.fired_mask &= ~value
