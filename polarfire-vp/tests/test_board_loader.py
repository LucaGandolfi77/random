from pathlib import Path

import pytest

from polarfire_vp.boards import load_board_from_file, load_board_from_mapping
from polarfire_vp.exceptions import ConfigurationError


def test_load_board_from_mapping() -> None:
    config = load_board_from_mapping(
        {
            "name": "PolarFire VK",
            "vendor": "Microchip",
            "description": "Functional abstraction for firmware bring-up.",
            "cpu": {
                "name": "mss",
                "backend": "riscv64-functional",
                "reset_pc": "0x20200000",
            },
            "memory": [
                {"name": "boot_rom", "kind": "rom", "base": "0x20200000", "size": "0x1000"},
                {"name": "ddr", "kind": "ram", "base": "0x80000000", "size": "0x10000"},
            ],
            "peripherals": [
                {"name": "uart0", "kind": "uart", "base": "0x20100000", "size": "0x1000", "irq": 3},
            ],
        }
    )

    assert config.name == "PolarFire VK"
    assert config.cpu.reset_pc == 0x20200000
    assert config.memories[0].end == 0x20201000
    assert config.peripherals[0].irq == 3


def test_load_board_from_file(tmp_path: Path) -> None:
    board_file = tmp_path / "polarfire.yaml"
    board_file.write_text(
        """
name: PolarFire VK
vendor: Microchip
description: Test board
cpu:
  name: mss
  backend: riscv64-functional
  hart_count: 1
  reset_pc: 0x20200000
memory:
  - name: boot_rom
    kind: rom
    base: 0x20200000
    size: 0x1000
peripherals:
  - name: uart0
    kind: uart
    base: 0x20100000
    size: 0x1000
""",
        encoding="utf-8",
    )

    config = load_board_from_file(board_file)
    assert config.source == board_file


def test_reject_overlapping_regions() -> None:
    with pytest.raises(ConfigurationError):
        load_board_from_mapping(
            {
                "name": "Bad board",
                "vendor": "Microchip",
                "description": "Invalid overlap",
                "cpu": {"name": "mss", "backend": "riscv64-functional"},
                "memory": [
                    {"name": "ram0", "kind": "ram", "base": 0x0, "size": 0x1000},
                ],
                "peripherals": [
                    {"name": "uart0", "kind": "uart", "base": 0x800, "size": 0x1000},
                ],
            }
        )
