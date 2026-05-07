"""Simplified interrupt controller."""

from __future__ import annotations

from polarfire_vp.peripherals.base import Peripheral


class SimpleInterruptController(Peripheral):
    PENDING = 0x00
    ENABLE_BASE = 0x100
    CLAIM_BASE = 0x200
    CONTEXT_STRIDE = 0x10

    def __init__(self, *, name: str, size: int, irq: int | None = None):
        super().__init__(name=name, size=size, irq=irq)
        self.pending_mask = 0
        self.enable_masks: dict[int, int] = {}
        self.targets: dict[int, set[int]] = {}

    def attach_machine(self, machine):
        super().attach_machine(machine)
        self._initialize_contexts()

    def reset(self) -> None:
        self.pending_mask = 0
        self._initialize_contexts()
        self._sync_machine_interrupts()

    def raise_irq(self, line: int, *, target_harts: set[int] | None = None) -> None:
        self.pending_mask |= 1 << line
        self.targets[line] = set(target_harts or (self.machine.hart_ids() if self.machine is not None else []))
        self._sync_machine_interrupts()
        self.logger.debug("IRQ %d pending", line)

    def clear_irq(self, line: int) -> None:
        self.pending_mask &= ~(1 << line)
        self._sync_machine_interrupts()

    def read(self, offset: int, size: int) -> bytes:
        if offset == self.PENDING:
            value = self.pending_mask
        elif self.ENABLE_BASE <= offset < self.CLAIM_BASE:
            hart_id = (offset - self.ENABLE_BASE) // self.CONTEXT_STRIDE
            value = self.enable_masks.get(hart_id, 0)
        elif offset >= self.CLAIM_BASE:
            hart_id = (offset - self.CLAIM_BASE) // self.CONTEXT_STRIDE
            value = self._first_pending_irq(hart_id)
        else:
            value = 0
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        if self.ENABLE_BASE <= offset < self.CLAIM_BASE:
            hart_id = (offset - self.ENABLE_BASE) // self.CONTEXT_STRIDE
            self.enable_masks[hart_id] = value
            self._sync_machine_interrupts()
        elif offset >= self.CLAIM_BASE:
            if value:
                self.clear_irq(value)

    def _initialize_contexts(self) -> None:
        hart_ids = self.machine.hart_ids() if self.machine is not None else ()
        self.enable_masks = {hart_id: 0xFFFF_FFFF for hart_id in hart_ids}

    def _first_pending_irq(self, hart_id: int) -> int:
        masked = self._pending_for_hart(hart_id) & self.enable_masks.get(hart_id, 0)
        if masked == 0:
            return 0
        return (masked & -masked).bit_length() - 1

    def _pending_for_hart(self, hart_id: int) -> int:
        mask = 0
        for line in range(64):
            if not (self.pending_mask & (1 << line)):
                continue
            if hart_id in self.targets.get(line, set()):
                mask |= 1 << line
        return mask

    def _sync_machine_interrupts(self) -> None:
        if self.machine is None:
            return
        for hart_id in self.machine.hart_ids():
            pending = self._pending_for_hart(hart_id) & self.enable_masks.get(hart_id, 0)
            self.machine.set_external_interrupt(hart_id, bool(pending))
