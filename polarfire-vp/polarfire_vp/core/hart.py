"""Per-hart metadata and execution state."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


class HartState:
    RESET = "reset"
    RUNNING = "running"
    HALTED = "halted"
    WFI = "waiting-for-interrupt"
    STOPPED = "stopped"
    FAULTED = "faulted"


@dataclass(slots=True)
class HartContext:
    hart_id: int
    name: str
    kind: str
    role: str
    cpu: Any
    reset_pc: int
    start_mode: str = "running"
    state: str = field(default=HartState.RESET)
    last_stop_reason: str = field(default="reset")
    last_symbol_name: str | None = field(default=None)

    @property
    def runnable(self) -> bool:
        return self.state == HartState.RUNNING

    def reset(self, entry_point: int | None = None) -> None:
        self.cpu.reset(entry_point if entry_point is not None else self.reset_pc)
        if self.start_mode == "halted":
            self.state = HartState.HALTED
        elif self.start_mode == "wfi":
            self.state = HartState.WFI
        else:
            self.state = HartState.RUNNING
        self.last_stop_reason = "reset"
        self.last_symbol_name = None
