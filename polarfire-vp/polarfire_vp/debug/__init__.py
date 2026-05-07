"""Debug support including a lightweight GDB remote stub."""

from .gdb_stub import GdbRemoteStub

__all__ = [
    "GdbRemoteStub",
]
