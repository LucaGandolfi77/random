"""Core-local interrupt controller providing per-hart software and timer interrupts."""

from __future__ import annotations

from polarfire_vp.peripherals.base import Peripheral


class CoreLocalInterruptController(Peripheral):
    MSIP_BASE = 0x0000
    MTIMECMP_BASE = 0x4000
    MTIME = 0xBFF8

    def __init__(self, *, name: str, size: int, irq: int | None = None):
        super().__init__(name=name, size=size, irq=irq)
        self.mtime = 0
        self.msip: dict[int, int] = {}
        self.mtimecmp: dict[int, int] = {}

    def attach_machine(self, machine):
        super().attach_machine(machine)
        self._initialize_harts()

    def reset(self) -> None:
        self.mtime = 0
        self._initialize_harts()
        self._sync_all_harts()

    def on_tick(self, delta: int, now: int) -> None:
        self.mtime = (self.mtime + delta) & 0xFFFF_FFFF_FFFF_FFFF
        self._sync_all_harts()

    def read(self, offset: int, size: int) -> bytes:
        if self.MSIP_BASE <= offset < self.MSIP_BASE + (len(self.msip) * 4):
            hart_id = (offset - self.MSIP_BASE) // 4
            value = self.msip.get(hart_id, 0)
        elif self.MTIMECMP_BASE <= offset < self.MTIMECMP_BASE + (len(self.mtimecmp) * 8):
            hart_id = (offset - self.MTIMECMP_BASE) // 8
            value = self.mtimecmp.get(hart_id, 0xFFFF_FFFF_FFFF_FFFF)
        elif offset == self.MTIME:
            value = self.mtime
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if self.MSIP_BASE <= offset < self.MSIP_BASE + (len(self.msip) * 4):
            hart_id = (offset - self.MSIP_BASE) // 4
            self.msip[hart_id] = value & 0x1
            if self.machine is not None:
                self.machine.set_software_interrupt(hart_id, bool(self.msip[hart_id]))
            return
        if self.MTIMECMP_BASE <= offset < self.MTIMECMP_BASE + (len(self.mtimecmp) * 8):
            hart_id = (offset - self.MTIMECMP_BASE) // 8
            self.mtimecmp[hart_id] = value & 0xFFFF_FFFF_FFFF_FFFF
            self._sync_timer_interrupt(hart_id)
            return
        if offset == self.MTIME:
            self.mtime = value & 0xFFFF_FFFF_FFFF_FFFF
            self._sync_all_harts()

    def _initialize_harts(self) -> None:
        hart_ids = self.machine.hart_ids() if self.machine is not None else ()
        self.msip = {hart_id: 0 for hart_id in hart_ids}
        self.mtimecmp = {hart_id: 0xFFFF_FFFF_FFFF_FFFF for hart_id in hart_ids}

    def _sync_all_harts(self) -> None:
        for hart_id in self.msip:
            if self.machine is not None:
                self.machine.set_software_interrupt(hart_id, bool(self.msip[hart_id]))
            self._sync_timer_interrupt(hart_id)

    def _sync_timer_interrupt(self, hart_id: int) -> None:
        pending = self.mtime >= self.mtimecmp.get(hart_id, 0xFFFF_FFFF_FFFF_FFFF)
        if self.machine is not None:
            self.machine.set_timer_interrupt(hart_id, pending)
