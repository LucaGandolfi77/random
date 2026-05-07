"""Memory region implementations for RAM, ROM and MMIO."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from polarfire_vp.exceptions import MemoryAccessError

ReadCallback = Callable[[int, int], bytes]
WriteCallback = Callable[[int, bytes], None]


@dataclass(slots=True)
class MemoryRegion:
    name: str
    base: int
    size: int
    permissions: str = "rw"

    @property
    def end(self) -> int:
        return self.base + self.size

    def contains(self, address: int, length: int = 1) -> bool:
        return self.base <= address and address + length <= self.end

    def offset(self, address: int) -> int:
        return address - self.base

    def check_read(self, address: int, length: int) -> None:
        if not self.contains(address, length):
            raise MemoryAccessError(
                f"Read outside region {self.name}: addr=0x{address:016x} size={length}"
            )
        if "r" not in self.permissions:
            raise MemoryAccessError(f"Region {self.name} is not readable")

    def check_write(self, address: int, length: int) -> None:
        if not self.contains(address, length):
            raise MemoryAccessError(
                f"Write outside region {self.name}: addr=0x{address:016x} size={length}"
            )
        if "w" not in self.permissions:
            raise MemoryAccessError(f"Region {self.name} is not writable")

    def read(self, address: int, length: int) -> bytes:
        raise NotImplementedError

    def write(self, address: int, data: bytes) -> None:
        raise NotImplementedError


class RAMRegion(MemoryRegion):
    def __init__(self, name: str, base: int, size: int, *, permissions: str = "rw", fill: int = 0):
        super().__init__(name=name, base=base, size=size, permissions=permissions)
        self._storage = bytearray([fill & 0xFF] * size)

    def read(self, address: int, length: int) -> bytes:
        self.check_read(address, length)
        start = self.offset(address)
        return bytes(self._storage[start:start + length])

    def write(self, address: int, data: bytes) -> None:
        self.check_write(address, len(data))
        start = self.offset(address)
        self._storage[start:start + len(data)] = data

    def load(self, address: int, data: bytes) -> None:
        if not self.contains(address, len(data)):
            raise MemoryAccessError(
                f"Cannot load blob outside region {self.name}: addr=0x{address:016x}"
            )
        start = self.offset(address)
        self._storage[start:start + len(data)] = data


class ROMRegion(RAMRegion):
    def __init__(self, name: str, base: int, size: int, *, fill: int = 0):
        super().__init__(name=name, base=base, size=size, permissions="r", fill=fill)

    def write(self, address: int, data: bytes) -> None:
        raise MemoryAccessError(f"Region {self.name} is read-only")


class MMIORegion(MemoryRegion):
    def __init__(
        self,
        name: str,
        base: int,
        size: int,
        *,
        read_callback: ReadCallback,
        write_callback: WriteCallback,
    ):
        super().__init__(name=name, base=base, size=size, permissions="rw")
        self._read_callback = read_callback
        self._write_callback = write_callback

    def read(self, address: int, length: int) -> bytes:
        self.check_read(address, length)
        return self._read_callback(self.offset(address), length)

    def write(self, address: int, data: bytes) -> None:
        self.check_write(address, len(data))
        self._write_callback(self.offset(address), data)
