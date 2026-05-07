"""Logical timer peripheral."""

from __future__ import annotations

from polarfire_vp.peripherals.base import Peripheral


class TimerPeripheral(Peripheral):
    COUNTER = 0x00
    COMPARE = 0x08
    CONTROL = 0x10
    STATUS = 0x14

    CTRL_ENABLE = 1 << 0
    STATUS_PENDING = 1 << 0

    def __init__(self, *, name: str, size: int, irq: int | None = None):
        super().__init__(name=name, size=size, irq=irq)
        self.counter = 0
        self.compare = 0
        self.control = 0
        self.status = 0

    def reset(self) -> None:
        self.counter = 0
        self.compare = 0
        self.control = 0
        self.status = 0

    def on_tick(self, delta: int, now: int) -> None:
        if not (self.control & self.CTRL_ENABLE):
            return
        self.counter = (self.counter + delta) & 0xFFFF_FFFF_FFFF_FFFF
        if self.compare and self.counter >= self.compare:
            self.status |= self.STATUS_PENDING
            self._raise_irq()

    def read(self, offset: int, size: int) -> bytes:
        if offset == self.COUNTER:
            value = self.counter
        elif offset == self.COMPARE:
            value = self.compare
        elif offset == self.CONTROL:
            value = self.control
        elif offset == self.STATUS:
            value = self.status
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if offset == self.COUNTER:
            self.counter = value
        elif offset == self.COMPARE:
            self.compare = value
            self.status &= ~self.STATUS_PENDING
        elif offset == self.CONTROL:
            self.control = value
        elif offset == self.STATUS:
            self.status &= ~value
            if value & self.STATUS_PENDING:
                self._clear_irq()

    def _raise_irq(self) -> None:
        if self.machine is None or self.irq is None:
            return
        controller = self.machine.peripherals.get("plic")
        if controller is not None:
            controller.raise_irq(self.irq)

    def _clear_irq(self) -> None:
        if self.machine is None or self.irq is None:
            return
        controller = self.machine.peripherals.get("plic")
        if controller is not None:
            controller.clear_irq(self.irq)
