from polarfire_vp.boards import build_virtual_machine, load_board_from_mapping
from polarfire_vp.cpu.riscv import MIP_MSIP
from polarfire_vp.peripherals.boot import BootControllerPeripheral


def test_boot_controller_uses_hss_style_launch_record_and_msip_release() -> None:
    board = load_board_from_mapping(
        {
            "name": "BootControl",
            "vendor": "Microchip",
            "description": "Boot handoff test",
            "cpu": {
                "name": "mss",
                "backend": "riscv64-functional",
                "boot_hart": 0,
                "reset_pc": 0x8000_0000,
                "harts": [
                    {"hart_id": 0, "name": "e51", "kind": "e51", "start_mode": "running"},
                    {"hart_id": 1, "name": "u54_1", "kind": "u54", "start_mode": "wfi"},
                ],
            },
            "memory": [
                {"name": "ddr", "kind": "ram", "base": 0x8000_0000, "size": 0x2000},
            ],
            "peripherals": [
                {"name": "clint0", "kind": "clint", "base": 0x0200_0000, "size": 0x10000},
                {"name": "bootctrl", "kind": "boot-controller", "base": 0x0170_0000, "size": 0x5000},
            ],
        }
    )

    machine = build_virtual_machine(board)
    machine.reset()

    entry_address = 0x8000_0100
    hart1_base = 0x0170_0000 + BootControllerPeripheral.HART_STRIDE
    machine.write_memory(
        hart1_base + BootControllerPeripheral.LAUNCH_ENTRY_POINT,
        entry_address.to_bytes(8, "little"),
    )
    machine.write_memory(
        hart1_base + BootControllerPeripheral.LAUNCH_FLAGS,
        (BootControllerPeripheral.LAUNCH_FLAG_VALID).to_bytes(4, "little"),
    )
    machine.write_memory(
        0x0200_0000 + 0x4,
        (1).to_bytes(4, "little"),
    )

    assert machine.hart(1).state == "running"
    assert machine.hart(1).cpu.pc == entry_address
    assert machine.hart(1).cpu.csrs[0x344] & MIP_MSIP == MIP_MSIP
    assert machine.read_memory(hart1_base + BootControllerPeripheral.HLS_IN_WFI_INDICATOR, 4) == (
        BootControllerPeripheral.HLS_OTHER_HART_PASSED_WFI
    ).to_bytes(4, "little")


def test_boot_controller_exposes_board_handoff_mailbox_for_u54_code() -> None:
    board = load_board_from_mapping(
        {
            "name": "BoardMailbox",
            "vendor": "Microchip",
            "description": "Board handoff test",
            "cpu": {
                "name": "mss",
                "backend": "riscv64-functional",
                "boot_hart": 0,
                "reset_pc": 0x8000_0000,
                "harts": [
                    {"hart_id": 0, "name": "e51", "kind": "e51", "start_mode": "running"},
                    {"hart_id": 1, "name": "u54_1", "kind": "u54", "start_mode": "wfi"},
                ],
            },
            "memory": [
                {"name": "ddr", "kind": "ram", "base": 0x8000_0000, "size": 0x2000},
            ],
            "peripherals": [
                {"name": "clint0", "kind": "clint", "base": 0x0200_0000, "size": 0x10000},
                {"name": "bootctrl", "kind": "boot-controller", "base": 0x0170_0000, "size": 0x5000},
            ],
        }
    )

    machine = build_virtual_machine(board)
    machine.reset()

    hart1_base = 0x0170_0000 + BootControllerPeripheral.HART_STRIDE
    shared_ptr = int.from_bytes(
        machine.read_memory(hart1_base + BootControllerPeripheral.HLS_SHARED_MEM_PTR, 8),
        "little",
    )

    assert shared_ptr == hart1_base + BootControllerPeripheral.BOARD_HANDOFF_BASE

    machine.write_memory(
        hart1_base + BootControllerPeripheral.BOARD_JUMP_DDR_ADDR,
        (0x8000_0400).to_bytes(8, "little"),
    )
    machine.write_memory(
        hart1_base + BootControllerPeripheral.BOARD_JUMP_DDR_VALUE,
        (1234).to_bytes(8, "little"),
    )

    assert machine.read_memory(hart1_base + BootControllerPeripheral.BOARD_JUMP_DDR_ADDR, 8) == (
        0x8000_0400
    ).to_bytes(8, "little")
    assert machine.read_memory(hart1_base + BootControllerPeripheral.BOARD_JUMP_DDR_VALUE, 8) == (
        1234
    ).to_bytes(8, "little")