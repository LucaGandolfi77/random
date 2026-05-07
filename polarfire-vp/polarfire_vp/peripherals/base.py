"""Peripheral base classes."""

from __future__ import annotations

import logging
from typing import Any


class Peripheral:
    def __init__(self, *, name: str, size: int, irq: int | None = None):
        self.name = name
        self.size = size
        self.irq = irq
        self.machine = None
        self.logger = logging.getLogger(f"polarfire_vp.peripherals.{name}")
        self.log_accesses = False

    def attach_machine(self, machine: Any) -> None:
        self.machine = machine

    def reset(self) -> None:
        """Reset internal registers to power-on values."""

    def enable_access_logging(self, enabled: bool = True) -> None:
        self.log_accesses = enabled

    def _trace_read(self, offset: int, size: int, value: int) -> None:
        if self.log_accesses:
            self.logger.info("read offset=0x%04x size=%d -> 0x%x", offset, size, value)

    def _trace_write(self, offset: int, size: int, value: int) -> None:
        if self.log_accesses:
            self.logger.info("write offset=0x%04x size=%d value=0x%x", offset, size, value)

    def read(self, offset: int, size: int) -> bytes:
        raise NotImplementedError

    def write(self, offset: int, data: bytes) -> None:
        raise NotImplementedError
