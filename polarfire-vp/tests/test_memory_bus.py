import pytest

from polarfire_vp.exceptions import MemoryAccessError
from polarfire_vp.memory import MMIORegion, MemoryBus, RAMRegion, ROMRegion


def test_memory_bus_reads_and_writes_ram() -> None:
    bus = MemoryBus()
    bus.map_region(RAMRegion("ram", 0x8000_0000, 0x1000))

    bus.write_u32(0x8000_0000, 0x1234_5678)
    assert bus.read_u32(0x8000_0000) == 0x1234_5678


def test_memory_bus_rejects_invalid_access() -> None:
    bus = MemoryBus()
    bus.map_region(ROMRegion("rom", 0x2020_0000, 0x1000))

    with pytest.raises(MemoryAccessError):
        bus.write_u32(0x2020_0000, 0x1)

    with pytest.raises(MemoryAccessError):
        bus.read_u8(0x3000_0000)


def test_mmio_region_invokes_callbacks() -> None:
    bus = MemoryBus()
    observed: list[tuple[str, int, bytes | int]] = []

    def on_read(offset: int, size: int) -> bytes:
        observed.append(("read", offset, size))
        return bytes([0xA5] * size)

    def on_write(offset: int, data: bytes) -> None:
        observed.append(("write", offset, data))

    bus.map_region(
        MMIORegion(
            "uart0",
            0x2010_0000,
            0x1000,
            read_callback=on_read,
            write_callback=on_write,
        )
    )

    bus.write_u8(0x2010_0000, 0x41)
    assert bus.read_u16(0x2010_0000) == 0xA5A5
    assert observed == [
        ("write", 0, b"A"),
        ("read", 0, 2),
    ]