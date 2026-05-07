"""HSS-style boot mailbox for PolarFire secondary harts.

This model is still simplified, but it is closer to real PolarFire software
conventions than the previous custom release register block:

- per-hart launch metadata is exposed as HLS/HSS-like mailbox records;
- WFI status markers mirror values used by the bare-metal HAL startup code;
- wake-up is driven by CLINT MSIP, not by a synthetic release register.
"""

from __future__ import annotations

from polarfire_vp.core.hart import HartState
from polarfire_vp.peripherals.base import Peripheral


class BootControllerPeripheral(Peripheral):
    HART_STRIDE = 0x1000

    HLS_IN_WFI_INDICATOR = 0x20
    HLS_HART_ID = 0x24
    HLS_SHARED_MEM_MARKER = 0x28
    HLS_SHARED_MEM_STATUS = 0x2C
    HLS_SHARED_MEM_PTR = 0x30

    LAUNCH_ENTRY_POINT = 0x40
    LAUNCH_PRIV_MODE = 0x48
    LAUNCH_FLAGS = 0x4C
    LAUNCH_STATUS = 0x50

    BOARD_HANDOFF_BASE = 0x100
    BOARD_JUMP_DDR_ADDR = 0x100
    BOARD_JUMP_DDR_VALUE = 0x108

    HLS_MAIN_HART_STARTED = 0x12344321
    HLS_MAIN_HART_FIN_INIT = 0x55555555
    HLS_OTHER_HART_IN_WFI = 0x12345678
    HLS_OTHER_HART_PASSED_WFI = 0x87654321

    SHARED_MEM_INITALISED_MARKER = 0xA1A2A3A4
    SHARED_MEM_DEFAULT_STATUS = 0x00000000

    LAUNCH_FLAG_VALID = 1 << 0
    LAUNCH_FLAG_CONSUMED = 1 << 1

    LAUNCH_STATUS_EMPTY = 0
    LAUNCH_STATUS_ARMED = 1
    LAUNCH_STATUS_RELEASED = 2
    LAUNCH_STATUS_CONSUMED = 3

    def __init__(
        self,
        *,
        name: str,
        size: int,
        irq: int | None = None,
        clint_name: str = "clint0",
    ):
        super().__init__(name=name, size=size, irq=irq)
        self.clint_name = clint_name
        self._entry_points: dict[int, int] = {}
        self._priv_modes: dict[int, int] = {}
        self._flags: dict[int, int] = {}
        self._shared_mem_ptrs: dict[int, int] = {}
        self._board_jump_addresses: dict[int, int] = {}
        self._board_jump_values: dict[int, int] = {}

    def on_software_interrupt(self, hart_id: int, pending: bool) -> None:
        if not pending or self.machine is None or hart_id == self.machine.boot_hart_id:
            return
        flags = self._flags.get(hart_id, 0)
        if not (flags & self.LAUNCH_FLAG_VALID):
            return
        entry_point = self._entry_points.get(hart_id)
        if entry_point is None:
            return
        self.machine.release_hart(hart_id, pc=entry_point)
        self.machine.hart(hart_id).cpu.set_interrupt_pending("software", True)
        self._flags[hart_id] = (flags | self.LAUNCH_FLAG_CONSUMED)

    def attach_machine(self, machine):
        super().attach_machine(machine)
        self._initialize_harts()

    def reset(self) -> None:
        self._initialize_harts()

    def read(self, offset: int, size: int) -> bytes:
        hart_id, field_offset = self._decode_offset(offset)
        value = 0
        if field_offset == self.HLS_IN_WFI_INDICATOR:
            value = self._wfi_indicator_for_hart(hart_id)
        elif field_offset == self.HLS_HART_ID:
            value = hart_id
        elif field_offset == self.HLS_SHARED_MEM_MARKER:
            value = self.SHARED_MEM_INITALISED_MARKER
        elif field_offset == self.HLS_SHARED_MEM_STATUS:
            value = self.SHARED_MEM_DEFAULT_STATUS
        elif field_offset == self.HLS_SHARED_MEM_PTR:
            value = self._shared_mem_ptrs.get(hart_id, 0)
        elif field_offset == self.LAUNCH_ENTRY_POINT:
            value = self._entry_points.get(hart_id, 0)
        elif field_offset == self.LAUNCH_PRIV_MODE:
            value = self._priv_modes.get(hart_id, 0)
        elif field_offset == self.LAUNCH_FLAGS:
            value = self._flags.get(hart_id, 0)
        elif field_offset == self.LAUNCH_STATUS:
            value = self._launch_status_for_hart(hart_id)
        elif field_offset == self.BOARD_JUMP_DDR_ADDR:
            value = self._board_jump_addresses.get(hart_id, 0)
        elif field_offset == self.BOARD_JUMP_DDR_VALUE:
            value = self._board_jump_values.get(hart_id, 0)
        self._trace_read(offset, size, value)
        return value.to_bytes(size, "little")

    def write(self, offset: int, data: bytes) -> None:
        value = int.from_bytes(data, "little")
        self._trace_write(offset, len(data), value)
        hart_id, field_offset = self._decode_offset(offset)
        if hart_id == self.machine.boot_hart_id if self.machine is not None else False:
            return
        if field_offset == self.LAUNCH_ENTRY_POINT:
            self._entry_points[hart_id] = value
            return
        if field_offset == self.LAUNCH_PRIV_MODE:
            self._priv_modes[hart_id] = value & 0xFF
            return
        if field_offset == self.LAUNCH_FLAGS:
            self._flags[hart_id] = value & 0xFFFF_FFFF
            return
        if field_offset == self.HLS_SHARED_MEM_PTR:
            self._shared_mem_ptrs[hart_id] = value
            return
        if field_offset == self.BOARD_JUMP_DDR_ADDR:
            self._board_jump_addresses[hart_id] = value
            return
        if field_offset == self.BOARD_JUMP_DDR_VALUE:
            self._board_jump_values[hart_id] = value

    def _initialize_harts(self) -> None:
        if self.machine is None:
            return
        self._entry_points = {hart.hart_id: 0 for hart in self.machine.harts}
        self._priv_modes = {hart.hart_id: 3 for hart in self.machine.harts}
        self._flags = {hart.hart_id: 0 for hart in self.machine.harts}
        self._shared_mem_ptrs = {
            hart.hart_id: self._mailbox_absolute_address(hart.hart_id, self.BOARD_HANDOFF_BASE)
            for hart in self.machine.harts
        }
        self._board_jump_addresses = {hart.hart_id: 0 for hart in self.machine.harts}
        self._board_jump_values = {hart.hart_id: 0 for hart in self.machine.harts}

    def _wfi_indicator_for_hart(self, hart_id: int) -> int:
        if self.machine is None:
            return self.HLS_MAIN_HART_STARTED
        hart = self.machine.hart(hart_id)
        if hart.hart_id == self.machine.boot_hart_id:
            return self.HLS_MAIN_HART_STARTED if hart.state == HartState.RUNNING else self.HLS_MAIN_HART_FIN_INIT
        if hart.state == HartState.WFI:
            return self.HLS_OTHER_HART_IN_WFI
        if hart.state in {HartState.RUNNING, HartState.STOPPED, HartState.HALTED, HartState.FAULTED}:
            return self.HLS_OTHER_HART_PASSED_WFI
        return 0

    def _launch_status_for_hart(self, hart_id: int) -> int:
        flags = self._flags.get(hart_id, 0)
        if flags & self.LAUNCH_FLAG_CONSUMED:
            return self.LAUNCH_STATUS_CONSUMED
        if flags & self.LAUNCH_FLAG_VALID:
            if self.machine is not None and self.machine.hart(hart_id).state == HartState.RUNNING:
                return self.LAUNCH_STATUS_RELEASED
            return self.LAUNCH_STATUS_ARMED
        return self.LAUNCH_STATUS_EMPTY

    def _decode_offset(self, offset: int) -> tuple[int, int]:
        hart_id = offset // self.HART_STRIDE
        field_offset = offset % self.HART_STRIDE
        return hart_id, field_offset

    def _mailbox_absolute_address(self, hart_id: int, field_offset: int) -> int:
        base_address = getattr(self, "base_address", 0)
        return base_address + (hart_id * self.HART_STRIDE) + field_offset
