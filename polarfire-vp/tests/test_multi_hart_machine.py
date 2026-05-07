from polarfire_vp.boards import build_virtual_machine, load_board_from_mapping
from polarfire_vp.core import HartState
from polarfire_vp.memory import RAMRegion


def test_multihart_board_builds_e51_and_u54_cluster() -> None:
    board = load_board_from_mapping(
        {
            "name": "PolarFire MultiHart",
            "vendor": "Microchip",
            "description": "Cluster test",
            "cpu": {
                "name": "mss",
                "backend": "riscv64-functional",
                "boot_hart": 0,
                "reset_pc": 0x8000_0000,
                "harts": [
                    {"hart_id": 0, "name": "e51", "kind": "e51", "role": "monitor", "start_mode": "running"},
                    {"hart_id": 1, "name": "u54_1", "kind": "u54", "role": "application", "start_mode": "halted"},
                    {"hart_id": 2, "name": "u54_2", "kind": "u54", "role": "application", "start_mode": "halted"},
                    {"hart_id": 3, "name": "u54_3", "kind": "u54", "role": "application", "start_mode": "halted"},
                    {"hart_id": 4, "name": "u54_4", "kind": "u54", "role": "application", "start_mode": "halted"},
                ],
            },
            "memory": [
                {"name": "ddr", "kind": "ram", "base": 0x8000_0000, "size": 0x2000},
            ],
            "peripherals": [],
        }
    )

    machine = build_virtual_machine(board)
    machine.reset()

    assert [hart.name for hart in machine.harts] == ["e51", "u54_1", "u54_2", "u54_3", "u54_4"]
    assert machine.hart_states() == {
        0: HartState.RUNNING,
        1: HartState.HALTED,
        2: HartState.HALTED,
        3: HartState.HALTED,
        4: HartState.HALTED,
    }


def test_scheduler_round_robins_released_harts() -> None:
    board = load_board_from_mapping(
        {
            "name": "RoundRobin",
            "vendor": "Microchip",
            "description": "Scheduler test",
            "cpu": {
                "name": "mss",
                "backend": "riscv64-functional",
                "boot_hart": 0,
                "reset_pc": 0x8000_0000,
                "harts": [
                    {"hart_id": 0, "name": "e51", "kind": "e51", "start_mode": "running"},
                    {"hart_id": 1, "name": "u54_1", "kind": "u54", "start_mode": "halted"},
                ],
            },
            "memory": [
                {"name": "ddr", "kind": "ram", "base": 0x8000_0000, "size": 0x2000},
            ],
            "peripherals": [],
        }
    )

    machine = build_virtual_machine(board)
    machine.reset()
    machine.release_hart(1)

    ram_region = next(region for region in machine.bus.regions if isinstance(region, RAMRegion))
    addi_x0_x0_0 = 0x0000_0013
    for index in range(4):
        ram_region.load(0x8000_0000 + (index * 4), addi_x0_x0_0.to_bytes(4, "little"))

    result = machine.step(2)

    assert result.reason == "step"
    assert machine.hart(0).cpu.pc == 0x8000_0004
    assert machine.hart(1).cpu.pc == 0x8000_0004