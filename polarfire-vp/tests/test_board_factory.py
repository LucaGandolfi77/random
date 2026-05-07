from polarfire_vp.boards import build_virtual_machine, load_board_from_mapping


def test_build_virtual_machine_from_board_config() -> None:
    board = load_board_from_mapping(
        {
            "name": "PolarFire VK",
            "vendor": "Microchip",
            "description": "VP test",
            "cpu": {
                "name": "mss",
                "backend": "riscv64-functional",
                "reset_pc": 0x2020_0000,
            },
            "memory": [
                {"name": "boot_rom", "kind": "rom", "base": 0x2020_0000, "size": 0x1000},
                {"name": "ddr", "kind": "ram", "base": 0x8000_0000, "size": 0x2000},
            ],
            "peripherals": [
                {"name": "plic", "kind": "interrupt-controller", "base": 0x0C00_0000, "size": 0x1000},
                {"name": "uart0", "kind": "uart", "base": 0x2010_0000, "size": 0x1000, "irq": 3},
                {"name": "timer0", "kind": "timer", "base": 0x2012_0000, "size": 0x1000, "irq": 7},
            ],
        }
    )

    chars: list[str] = []
    machine = build_virtual_machine(board, uart_sink=chars.append)
    machine.reset()

    assert machine.name == "PolarFire VK"
    assert machine.cpu.pc == 0x2020_0000
    assert set(machine.peripherals) == {"plic", "uart0", "timer0"}