"""Placeholder peripheral used for complex subsystems not yet modeled."""

from __future__ import annotations

from polarfire_vp.peripherals.base import Peripheral


class StubPeripheral(Peripheral):
    def __init__(self, *, name: str, size: int, irq: int | None = None, label: str | None = None):
        super().__init__(name=name, size=size, irq=irq)
        self.label = label or name
        self.registers: dict[int, int] = {}

    def reset(self) -> None:
        self.registers.clear()

    def read(self, offset: int, size: int) -> bytes:
        value = self.registers.get(offset, 0)
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        self.registers[offset] = value
