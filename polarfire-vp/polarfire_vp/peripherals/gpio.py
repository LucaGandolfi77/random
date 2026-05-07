"""GPIO peripheral with simple direction and output state."""

from __future__ import annotations

from polarfire_vp.peripherals.base import Peripheral


class GPIOPeripheral(Peripheral):
    VALUE = 0x00
    DIRECTION = 0x04
    INPUT = 0x08

    def __init__(self, *, name: str, size: int, irq: int | None = None):
        super().__init__(name=name, size=size, irq=irq)
        self.value = 0
        self.direction = 0
        self.input_value = 0

    def reset(self) -> None:
        self.value = 0
        self.direction = 0
        self.input_value = 0

    def read(self, offset: int, size: int) -> bytes:
        if offset == self.VALUE:
            value = self.value
        elif offset == self.DIRECTION:
            value = self.direction
        elif offset == self.INPUT:
            value = self.input_value
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if offset == self.VALUE:
            self.value = value
        elif offset == self.DIRECTION:
            self.direction = value
