"""Abstract CPU backend contract."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any


class CpuBackend(ABC):
    def __init__(
        self,
        *,
        name: str,
        bus: Any,
        reset_pc: int = 0,
        hart_id: int = 0,
        hart_kind: str = "generic-rv64",
        role: str = "application",
        start_mode: str = "running",
    ):
        self.name = name
        self.bus = bus
        self.reset_pc = reset_pc
        self.hart_id = hart_id
        self.hart_kind = hart_kind
        self.role = role
        self.start_mode = start_mode
        self.machine = None
        self.breakpoints: set[int] = set()
        self._symbol_resolver: Callable[[int], Any | None] | None = None
        self.logger = logging.getLogger(f"polarfire_vp.cpu.{name}")

    def attach_machine(self, machine: Any) -> None:
        self.machine = machine

    def set_symbol_resolver(self, resolver: Callable[[int], Any | None] | None) -> None:
        self._symbol_resolver = resolver

    def add_breakpoint(self, address: int) -> None:
        self.breakpoints.add(address)

    def remove_breakpoint(self, address: int) -> None:
        self.breakpoints.discard(address)

    def has_breakpoint(self, address: int) -> bool:
        return address in self.breakpoints

    @property
    @abstractmethod
    def pc(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def reset(self, pc: int | None = None) -> None:
        raise NotImplementedError

    @abstractmethod
    def step(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def registers(self) -> dict[str, int]:
        raise NotImplementedError

    @abstractmethod
    def read_registers_for_gdb(self) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def write_registers_from_gdb(self, payload: bytes) -> None:
        raise NotImplementedError

    @abstractmethod
    def set_pc(self, pc: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def set_interrupt_pending(self, kind: str, pending: bool) -> None:
        raise NotImplementedError

    @abstractmethod
    def has_enabled_interrupt(self, *, require_global_enable: bool = True) -> bool:
        raise NotImplementedError
