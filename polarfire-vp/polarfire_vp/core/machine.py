"""Virtual machine orchestration layer."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from polarfire_vp.core.clock import LogicalClock
from polarfire_vp.core.hart import HartContext, HartState


@dataclass(slots=True)
class RunResult:
    reason: str
    steps: int
    pc: int
    hart_id: int | None = None


class VirtualMachine:
    def __init__(
        self,
        *,
        name: str,
        bus: Any,
        cpu: Any | None = None,
        harts: list[HartContext] | None = None,
        clock: LogicalClock | None = None,
        peripherals: dict[str, Any] | None = None,
        boot_hart_id: int | None = None,
    ):
        self.name = name
        self.bus = bus
        self.clock = clock or LogicalClock()
        self.peripherals = peripherals or {}
        self.running = False
        self.stop_requested = False
        self.last_stop_reason = "reset"
        self.entry_point = 0
        self.symbol_table: Any = None
        self._schedule_cursor = 0

        if harts is None:
            if cpu is None:
                raise ValueError("VirtualMachine requires either a cpu or a list of harts")
            harts = [
                HartContext(
                    hart_id=getattr(cpu, "hart_id", 0),
                    name=getattr(cpu, "name", "hart0"),
                    kind=getattr(cpu, "hart_kind", "generic-rv64"),
                    role=getattr(cpu, "role", "boot"),
                    cpu=cpu,
                    reset_pc=getattr(cpu, "reset_pc", 0),
                    start_mode=getattr(cpu, "start_mode", "running"),
                )
            ]

        ordered_harts = sorted(harts, key=lambda item: item.hart_id)
        self._harts = {hart.hart_id: hart for hart in ordered_harts}
        self._scheduler_order = [hart.hart_id for hart in ordered_harts]
        self.boot_hart_id = boot_hart_id if boot_hart_id is not None else ordered_harts[0].hart_id
        self.selected_hart_id = self.boot_hart_id

        for hart in ordered_harts:
            hart.cpu.attach_machine(self)
        for peripheral in self.peripherals.values():
            peripheral.attach_machine(self)
            if hasattr(peripheral, "on_tick"):
                self.clock.register(peripheral)

    @property
    def cpu(self) -> Any:
        return self._harts[self.selected_hart_id].cpu

    @property
    def harts(self) -> tuple[HartContext, ...]:
        return tuple(self._harts[hart_id] for hart_id in self._scheduler_order)

    def hart(self, hart_id: int) -> HartContext:
        return self._harts[hart_id]

    def hart_ids(self) -> tuple[int, ...]:
        return tuple(self._scheduler_order)

    def select_hart(self, hart_id: int) -> HartContext:
        hart = self.hart(hart_id)
        self.selected_hart_id = hart_id
        return hart

    def release_hart(self, hart_id: int, pc: int | None = None) -> HartContext:
        hart = self.hart(hart_id)
        if pc is not None:
            hart.cpu.reset(pc)
        hart.state = HartState.RUNNING
        hart.last_stop_reason = "released"
        return hart

    def halt_hart(self, hart_id: int) -> HartContext:
        hart = self.hart(hart_id)
        hart.state = HartState.HALTED
        hart.last_stop_reason = "halted"
        return hart

    def set_entry_point(self, address: int, hart_id: int | None = None) -> None:
        self.entry_point = address
        if hart_id is None:
            for hart in self.harts:
                hart.reset_pc = address
        else:
            self.hart(hart_id).reset_pc = address

    def set_symbol_table(self, symbol_table: Any) -> None:
        self.symbol_table = symbol_table
        resolver = symbol_table.lookup if symbol_table else None
        for hart in self.harts:
            hart.cpu.set_symbol_resolver(resolver)

    def reset(self) -> None:
        self.stop_requested = False
        self.running = False
        self.clock.reset()
        for peripheral in self.peripherals.values():
            peripheral.reset()
        for hart in self.harts:
            hart.reset(self.entry_point or hart.reset_pc or hart.cpu.reset_pc)
        self.last_stop_reason = "reset"
        self.selected_hart_id = self.boot_hart_id
        self._schedule_cursor = 0

    def request_stop(self) -> None:
        self.stop_requested = True

    def add_breakpoint(self, address: int, hart_id: int | None = None) -> None:
        if hart_id is None:
            for hart in self.harts:
                hart.cpu.add_breakpoint(address)
            return
        self.hart(hart_id).cpu.add_breakpoint(address)

    def remove_breakpoint(self, address: int, hart_id: int | None = None) -> None:
        if hart_id is None:
            for hart in self.harts:
                hart.cpu.remove_breakpoint(address)
            return
        self.hart(hart_id).cpu.remove_breakpoint(address)

    def resolve_symbol(self, name: str) -> int | None:
        if self.symbol_table is None:
            return None
        return self.symbol_table.address_of(name)

    def step(
        self,
        count: int = 1,
        *,
        ignore_current_breakpoint: bool = False,
        hart_id: int | None = None,
    ) -> RunResult:
        executed = 0
        self.running = True
        while executed < count:
            hart = self._select_next_hart(hart_id)
            if hart is None:
                self.last_stop_reason = "idle"
                self.running = False
                return RunResult(reason="idle", steps=executed, pc=self.cpu.pc, hart_id=self.selected_hart_id)

            result = self._step_hart(
                hart,
                ignore_current_breakpoint=ignore_current_breakpoint and executed == 0,
            )
            executed += result.steps

            if result.reason == "running":
                continue
            if result.reason == "wfi":
                if hart_id is not None or executed >= count:
                    self.last_stop_reason = "wfi"
                    self.running = False
                    return RunResult(reason="wfi", steps=executed, pc=result.pc, hart_id=result.hart_id)
                continue

            self.last_stop_reason = result.reason
            self.running = False
            return RunResult(reason=result.reason, steps=executed, pc=result.pc, hart_id=result.hart_id)

        self.last_stop_reason = "step"
        self.running = False
        return RunResult(reason="step", steps=executed, pc=self.cpu.pc, hart_id=self.selected_hart_id)

    def run(self, *, max_steps: int = 100_000, hart_id: int | None = None) -> RunResult:
        executed = 0
        self.running = True
        while executed < max_steps:
            result = self.step(1, ignore_current_breakpoint=(executed == 0), hart_id=hart_id)
            executed += result.steps
            if result.reason != "step":
                self.running = False
                return RunResult(reason=result.reason, steps=executed, pc=result.pc, hart_id=result.hart_id)
        self.running = False
        self.last_stop_reason = "max-steps"
        return RunResult(reason="max-steps", steps=executed, pc=self.cpu.pc, hart_id=self.selected_hart_id)

    def read_memory(self, address: int, length: int) -> bytes:
        return self.bus.read(address, length)

    def write_memory(self, address: int, data: bytes) -> None:
        self.bus.write(address, data)

    def registers(self, hart_id: int | None = None) -> dict[str, int]:
        selected = self.hart(hart_id) if hart_id is not None else self.hart(self.selected_hart_id)
        return selected.cpu.registers()

    def hart_states(self) -> dict[int, str]:
        return {hart.hart_id: hart.state for hart in self.harts}

    def set_software_interrupt(self, hart_id: int, pending: bool) -> None:
        self.hart(hart_id).cpu.set_interrupt_pending("software", pending)
        for peripheral in self.peripherals.values():
            if hasattr(peripheral, "on_software_interrupt"):
                peripheral.on_software_interrupt(hart_id, pending)

    def set_timer_interrupt(self, hart_id: int, pending: bool) -> None:
        self.hart(hart_id).cpu.set_interrupt_pending("timer", pending)

    def set_external_interrupt(self, hart_id: int, pending: bool) -> None:
        self.hart(hart_id).cpu.set_interrupt_pending("external", pending)

    def _select_next_hart(self, forced_hart_id: int | None) -> HartContext | None:
        if forced_hart_id is not None:
            hart = self.hart(forced_hart_id)
            if hart.state == HartState.WFI and hart.cpu.has_enabled_interrupt(require_global_enable=False):
                hart.state = HartState.RUNNING
            self.selected_hart_id = hart.hart_id
            return hart if hart.runnable else None

        for _ in range(len(self._scheduler_order)):
            hart_id = self._scheduler_order[self._schedule_cursor]
            self._schedule_cursor = (self._schedule_cursor + 1) % len(self._scheduler_order)
            hart = self.hart(hart_id)
            if hart.state == HartState.WFI and hart.cpu.has_enabled_interrupt(require_global_enable=False):
                hart.state = HartState.RUNNING
            if hart.runnable:
                self.selected_hart_id = hart_id
                return hart
        return None

    def _step_hart(self, hart: HartContext, *, ignore_current_breakpoint: bool = False) -> RunResult:
        current_pc = hart.cpu.pc
        if hart.cpu.has_breakpoint(current_pc) and not ignore_current_breakpoint:
            hart.state = HartState.STOPPED
            hart.last_stop_reason = "breakpoint"
            return RunResult(reason="breakpoint", steps=0, pc=current_pc, hart_id=hart.hart_id)

        reason = hart.cpu.step()
        self.clock.advance(1)
        self._trace_symbol_transition(hart)

        if reason == "running":
            hart.state = HartState.RUNNING
            hart.last_stop_reason = "running"
            if self.stop_requested:
                hart.state = HartState.STOPPED
                hart.last_stop_reason = "stopped"
                return RunResult(reason="stopped", steps=1, pc=hart.cpu.pc, hart_id=hart.hart_id)
            if hart.cpu.has_breakpoint(hart.cpu.pc):
                hart.state = HartState.STOPPED
                hart.last_stop_reason = "breakpoint"
                return RunResult(reason="breakpoint", steps=1, pc=hart.cpu.pc, hart_id=hart.hart_id)
            return RunResult(reason="running", steps=1, pc=hart.cpu.pc, hart_id=hart.hart_id)

        if reason == "wfi":
            hart.state = HartState.WFI
            hart.last_stop_reason = "wfi"
            return RunResult(reason="wfi", steps=1, pc=hart.cpu.pc, hart_id=hart.hart_id)

        hart.state = HartState.STOPPED
        hart.last_stop_reason = reason
        return RunResult(reason=reason, steps=1, pc=hart.cpu.pc, hart_id=hart.hart_id)

    def _trace_symbol_transition(self, hart: HartContext) -> None:
        if self.symbol_table is None:
            return
        symbol = self.symbol_table.lookup(hart.cpu.pc)
        symbol_name = symbol.name if symbol else None
        if symbol_name != hart.last_symbol_name:
            hart.last_symbol_name = symbol_name
            if symbol_name:
                hart.cpu.logger.debug("entered symbol %s @ 0x%016x", symbol_name, hart.cpu.pc)
