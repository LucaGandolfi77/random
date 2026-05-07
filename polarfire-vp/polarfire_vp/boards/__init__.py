"""Board description parsing and platform instantiation helpers."""

from .factory import build_virtual_machine
from .loader import load_board_from_file, load_board_from_mapping
from .model import BoardConfig, CpuConfig, HartConfig, MemoryRegionConfig, PeripheralConfig

__all__ = [
    "BoardConfig",
    "CpuConfig",
    "HartConfig",
    "MemoryRegionConfig",
    "PeripheralConfig",
    "build_virtual_machine",
    "load_board_from_file",
    "load_board_from_mapping",
]

