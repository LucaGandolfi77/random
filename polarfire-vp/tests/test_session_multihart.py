from rich.console import Console

from polarfire_vp.boards import build_virtual_machine, load_board_from_mapping
from polarfire_vp.core import HartState
from polarfire_vp.session import SimulationSession


def test_session_can_select_and_release_harts() -> None:
    board = load_board_from_mapping(
        {
            "name": "PolarFire MultiHart",
            "vendor": "Microchip",
            "description": "Session test",
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
    session = SimulationSession(console=Console(record=True))
    session.machine = build_virtual_machine(board)
    session.machine.reset()

    session.select_hart(0)
    session.release_hart(1)

    assert session.machine.selected_hart_id == 0
    assert session.machine.hart(1).state == HartState.RUNNING