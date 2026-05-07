"""UART peripheral used for console output."""

from __future__ import annotations

from collections.abc import Callable

from polarfire_vp.peripherals.base import Peripheral


class UARTPeripheral(Peripheral):
    TXDATA = 0x00
    RXDATA = 0x04
    STATUS = 0x08
    CTRL = 0x0C

    STATUS_TX_READY = 1 << 0
    STATUS_RX_READY = 1 << 1

    def __init__(
        self,
        *,
        name: str,
        size: int,
        irq: int | None = None,
        sink: Callable[[str], None] | None = None,
    ):
        super().__init__(name=name, size=size, irq=irq)
        self.sink = sink or (lambda text: None)
        self.tx_buffer: list[str] = []
        self.rx_fifo: list[int] = []
        self.control = 0

    def reset(self) -> None:
        self.tx_buffer.clear()
        self.rx_fifo.clear()
        self.control = 0

    def inject_rx(self, data: bytes) -> None:
        self.rx_fifo.extend(data)

    def read(self, offset: int, size: int) -> bytes:
        if offset == self.RXDATA:
            value = self.rx_fifo.pop(0) if self.rx_fifo else 0
        elif offset == self.STATUS:
            value = self.STATUS_TX_READY
            if self.rx_fifo:
                value |= self.STATUS_RX_READY
        elif offset == self.CTRL:
            value = self.control
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if offset == self.TXDATA:
            char = chr(value & 0xFF)
            self.tx_buffer.append(char)
            self.sink(char)
        elif offset == self.CTRL:
            self.control = value

    def collected_output(self) -> str:
        return "".join(self.tx_buffer)
