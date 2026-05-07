"""Abstract block-device model for simple storage tests."""

from __future__ import annotations

from pathlib import Path

from polarfire_vp.peripherals.base import Peripheral


class BlockDevicePeripheral(Peripheral):
    CMD = 0x00
    STATUS = 0x04
    LBA = 0x08
    BUFFER_ADDR = 0x10
    SECTOR_COUNT = 0x18

    CMD_NOP = 0
    CMD_READ = 1

    STATUS_IDLE = 0
    STATUS_DONE = 1
    STATUS_ERROR = 2

    def __init__(
        self,
        *,
        name: str,
        size: int,
        irq: int | None = None,
        sector_size: int = 512,
        sectors: int = 1024,
        backing_file: str | None = None,
    ):
        super().__init__(name=name, size=size, irq=irq)
        self.sector_size = sector_size
        self.sectors = sectors
        self.backing_file = Path(backing_file) if backing_file else None
        self.status = self.STATUS_IDLE
        self.lba = 0
        self.buffer_addr = 0
        self.sector_count = 1
        self._image = bytearray(self.sector_size * self.sectors)
        if self.backing_file and self.backing_file.exists():
            data = self.backing_file.read_bytes()
            self._image[: len(data)] = data[: len(self._image)]

    def reset(self) -> None:
        self.status = self.STATUS_IDLE
        self.lba = 0
        self.buffer_addr = 0
        self.sector_count = 1

    def read(self, offset: int, size: int) -> bytes:
        if offset == self.STATUS:
            value = self.status
        elif offset == self.LBA:
            value = self.lba
        elif offset == self.BUFFER_ADDR:
            value = self.buffer_addr
        elif offset == self.SECTOR_COUNT:
            value = self.sector_count
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if offset == self.CMD:
            self._execute_command(value)
        elif offset == self.LBA:
            self.lba = value
        elif offset == self.BUFFER_ADDR:
            self.buffer_addr = value
        elif offset == self.SECTOR_COUNT:
            self.sector_count = value

    def _execute_command(self, command: int) -> None:
        if command == self.CMD_NOP:
            self.status = self.STATUS_IDLE
            return
        if command != self.CMD_READ or self.machine is None:
            self.status = self.STATUS_ERROR
            return
        start = self.lba * self.sector_size
        end = start + (self.sector_count * self.sector_size)
        if end > len(self._image):
            self.status = self.STATUS_ERROR
            return
        self.machine.write_memory(self.buffer_addr, bytes(self._image[start:end]))
        self.status = self.STATUS_DONE
        if self.irq is not None:
            controller = self.machine.peripherals.get("plic")
            if controller is not None:
                controller.raise_irq(self.irq)
