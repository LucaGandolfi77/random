"""Top-level address bus used by the virtual machine and CPU backends."""

from __future__ import annotations

from bisect import bisect_right

from polarfire_vp.exceptions import MemoryAccessError
from polarfire_vp.memory.regions import MemoryRegion


class MemoryBus:
    def __init__(self) -> None:
        self._regions: list[MemoryRegion] = []
        self._region_bases: list[int] = []

    @property
    def regions(self) -> tuple[MemoryRegion, ...]:
        return tuple(self._regions)

    def map_region(self, region: MemoryRegion) -> None:
        index = bisect_right(self._region_bases, region.base)
        previous = self._regions[index - 1] if index > 0 else None
        following = self._regions[index] if index < len(self._regions) else None
        if previous and previous.end > region.base:
            raise MemoryAccessError(f"Region overlap: {previous.name} -> {region.name}")
        if following and region.end > following.base:
            raise MemoryAccessError(f"Region overlap: {region.name} -> {following.name}")
        self._regions.insert(index, region)
        self._region_bases.insert(index, region.base)

    def resolve(self, address: int, length: int = 1) -> MemoryRegion:
        index = bisect_right(self._region_bases, address) - 1
        if index < 0:
            raise MemoryAccessError(f"Unmapped access at 0x{address:016x}")
        region = self._regions[index]
        if not region.contains(address, length):
            raise MemoryAccessError(
                f"Cross-region or unmapped access at 0x{address:016x} size={length}"
            )
        return region

    def read(self, address: int, length: int) -> bytes:
        return self.resolve(address, length).read(address, length)

    def write(self, address: int, data: bytes) -> None:
        self.resolve(address, len(data)).write(address, data)

    def load_blob(self, address: int, data: bytes) -> None:
        region = self.resolve(address, len(data))
        if not hasattr(region, "load"):
            raise MemoryAccessError(
                f"Region {region.name} does not support direct image loading"
            )
        region.load(address, data)

    def read_u8(self, address: int) -> int:
        return self.read(address, 1)[0]

    def read_u16(self, address: int) -> int:
        return int.from_bytes(self.read(address, 2), "little")

    def read_u32(self, address: int) -> int:
        return int.from_bytes(self.read(address, 4), "little")

    def read_u64(self, address: int) -> int:
        return int.from_bytes(self.read(address, 8), "little")

    def write_u8(self, address: int, value: int) -> None:
        self.write(address, value.to_bytes(1, "little"))

    def write_u16(self, address: int, value: int) -> None:
        self.write(address, value.to_bytes(2, "little"))

    def write_u32(self, address: int, value: int) -> None:
        self.write(address, value.to_bytes(4, "little"))

    def write_u64(self, address: int, value: int) -> None:
        self.write(address, value.to_bytes(8, "little"))

